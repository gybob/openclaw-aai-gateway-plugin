/**
 * openclaw-aai-gateway-plugin
 *
 * Bridges OpenClaw to the AAI Gateway by spawning aai-gateway as a child
 * process, connecting via MCP stdio protocol, and registering a tool factory
 * that returns the current aai-gateway tool set on every agent run.
 *
 * Architecture notes:
 * - register() MUST be synchronous — OpenClaw ignores promise return values.
 * - All async setup (MCP connect, tool discovery) runs in registerService.start().
 * - The tool factory reads cachedTools on each agent run, so it reflects the
 *   latest tool list after any tools/listChanged notification.
 */

import fs from 'node:fs';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ToolListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';

// ---------------------------------------------------------------------------
// Minimal OpenClaw plugin SDK types (structural — no external import needed)
// These mirror the real types in openclaw/dist/plugin-sdk/plugins/types.d.ts
// ---------------------------------------------------------------------------

interface PluginLogger {
  debug?: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

interface ServiceContext {
  config: unknown;
  workspaceDir?: string;
  stateDir: string;
  logger: PluginLogger;
}

interface AgentToolResult {
  content: Array<{ type: 'text'; text: string }>;
  details: unknown;
}

interface AnyAgentTool {
  name: string;
  label: string;
  description: string;
  parameters: unknown;
  execute: (
    toolCallId: string,
    params: Record<string, unknown>,
    signal?: AbortSignal,
    onUpdate?: (partial: AgentToolResult) => void,
  ) => Promise<AgentToolResult>;
  ownerOnly?: boolean;
}

/** Context passed to plugin tool factories on each agent run. */
interface PluginToolContext {
  agentId?: string;
  sessionKey?: string;
  sessionId?: string;
  messageChannel?: string;
  agentAccountId?: string;
  senderIsOwner?: boolean;
  sandboxed?: boolean;
}

type PluginToolFactory = (ctx: PluginToolContext) => AnyAgentTool | AnyAgentTool[] | null | undefined;

interface RegisterToolOptions {
  name?: string;
  names?: string[];
  optional?: boolean;
}

interface OpenClawConfig {
  tools?: {
    profile?: string;
    allow?: string[];
    alsoAllow?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface OpenClawPluginApi {
  id: string;
  name: string;
  version?: string;
  pluginConfig?: Record<string, unknown>;
  config: OpenClawConfig;
  logger: PluginLogger;
  runtime: {
    config: {
      writeConfigFile(cfg: OpenClawConfig): Promise<void>;
    };
  };
  registerTool(tool: AnyAgentTool | PluginToolFactory, opts?: RegisterToolOptions): void;
  registerService(service: {
    id: string;
    start: (ctx: ServiceContext) => void | Promise<void>;
    stop?: (ctx: ServiceContext) => void | Promise<void>;
  }): void;
  resolvePath(input: string): string;
}

// ---------------------------------------------------------------------------
// Plugin config
// ---------------------------------------------------------------------------

interface PluginConfig {
  /**
   * Custom command to launch aai-gateway (overrides the default `npx -y aai-gateway`).
   * Examples:
   *   "aai-gateway"                            — if installed globally
   *   "/usr/local/bin/node /path/to/cli.js"    — explicit node path
   */
  command?: string;
}

// ---------------------------------------------------------------------------
// Resolve npx path — LaunchAgent PATH is minimal (/usr/bin:/bin), so we
// need the full path to npx.  Try the same directory as the current node
// binary first (covers Homebrew, nvm, fnm, etc.), then fall back to "npx".
// ---------------------------------------------------------------------------

function resolveNpxPath(): string {
  const nodeDir = path.dirname(process.execPath);
  const candidate = path.join(nodeDir, 'npx');
  try {
    if (fs.existsSync(candidate)) return candidate;
  } catch {
    // existsSync may fail in edge cases — fall back
  }
  return 'npx';
}


// ---------------------------------------------------------------------------
// Module-level state shared between the factory and the service
// ---------------------------------------------------------------------------

interface McpToolDesc {
  name: string;
  description?: string;
  inputSchema: unknown;
}

let cachedTools: McpToolDesc[] = [];
let activeClient: Client | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * LLM function names must match [a-zA-Z0-9_-] (Anthropic / OpenAI constraint).
 * Replace any other character with "__".
 *
 *   aai:exec        → aai__exec
 *   mcp:import      → mcp__import
 *   search:discover → search__discover
 *   app:claude      → app__claude
 */
function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '__');
}

/**
 * Wrap a tool from the MCP tools/list response as an AnyAgentTool.
 * The original MCP tool name is captured in the closure for use in callTool.
 */
function buildTool(client: Client, desc: McpToolDesc): AnyAgentTool {
  return {
    name: sanitizeName(desc.name),
    label: desc.name,
    description: desc.description || desc.name,
    parameters: desc.inputSchema ?? {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },

    async execute(_toolCallId, params, signal) {
      const result = await client.callTool(
        { name: desc.name, arguments: params ?? {} },
        undefined,
        signal ? { signal } : undefined,
      );

      type RawItem = { type: string; text?: string };
      const content = ((result.content ?? []) as RawItem[]).map((item) =>
        item.type === 'text'
          ? { type: 'text' as const, text: item.text ?? '' }
          : { type: 'text' as const, text: JSON.stringify(item) },
      );

      return {
        content: content.length > 0 ? content : [{ type: 'text' as const, text: '' }],
        details: result,
      };
    },
  };
}

/**
 * Ensure "aai-gateway" is present in tools.allow so plugin tools are visible
 * to agents even when a restrictive tools.profile (e.g. "coding") is active.
 * Idempotent — skipped if already configured.
 */
async function ensureAllowlisted(api: OpenClawPluginApi): Promise<void> {
  // tools.alsoAllow is merged INTO the profile allowlist, so plugin tools
  // survive the profile filter (e.g. "coding").  tools.allow alone does NOT
  // work — the profile filter runs first and blocks unknown tools.
  const alsoAllow: string[] = api.config.tools?.alsoAllow ?? [];
  if (alsoAllow.includes('aai-gateway')) return;

  const newConfig: OpenClawConfig = {
    ...api.config,
    tools: { ...api.config.tools, alsoAllow: [...alsoAllow, 'aai-gateway'] },
  };

  try {
    await api.runtime.config.writeConfigFile(newConfig);
    api.logger.info('[aai-gateway] added "aai-gateway" to tools.alsoAllow');
  } catch (err) {
    api.logger.warn(
      `[aai-gateway] could not auto-update tools.alsoAllow: ${err instanceof Error ? err.message : String(err)}`,
    );
    api.logger.warn(
      '[aai-gateway] run manually: openclaw config set tools.alsoAllow \'["aai-gateway"]\'',
    );
  }
}

// ---------------------------------------------------------------------------
// Plugin entry point — MUST be synchronous
// OpenClaw calls register() synchronously and ignores any returned promise.
// All async work goes into registerService.start().
// ---------------------------------------------------------------------------

/** Resolve the command + args to spawn aai-gateway. */
function resolveSpawn(cfg: PluginConfig): { command: string; args: string[] } {
  if (cfg.command) {
    const parts = cfg.command.trim().split(/\s+/);
    return { command: parts[0], args: parts.slice(1) };
  }
  return { command: resolveNpxPath(), args: ['-y', 'aai-gateway'] };
}

export default function registerAaiGateway(api: OpenClawPluginApi): void {
  const log = api.logger;
  const cfg = (api.pluginConfig ?? {}) as PluginConfig;

  // Register the tool factory synchronously.
  // OpenClaw calls this on every agent run, so it always returns the latest
  // snapshot from cachedTools (populated/refreshed in service.start).
  api.registerTool((_ctx: PluginToolContext) => {
    if (!activeClient) return null;
    return cachedTools.map((desc) => buildTool(activeClient!, desc));
  });

  // All async setup happens in the service lifecycle, which OpenClaw does await.
  api.registerService({
    id: 'aai-gateway-connection',

    start: async (_ctx) => {
      // Auto-configure tools.allow on first install and every gateway start
      await ensureAllowlisted(api);

      const { command, args } = resolveSpawn(cfg);
      log.info(`[aai-gateway] spawning: ${command} ${args.join(' ')}`);

      const transport = new StdioClientTransport({
        command,
        args,
        stderr: 'ignore',
      });

      const client = new Client(
        { name: 'openclaw', version: api.version ?? '0.0.0' },
        { capabilities: {} },
      );

      try {
        await client.connect(transport);
      } catch (err) {
        log.error(
          `[aai-gateway] failed to connect: ${err instanceof Error ? err.message : String(err)}`,
        );
        log.error('[aai-gateway] hint: run `npm run build` inside the aai-gateway directory');
        return;
      }

      log.info('[aai-gateway] connected');

      const refreshTools = async (): Promise<void> => {
        const result = await client.listTools();
        cachedTools = result.tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        }));
        log.info(`[aai-gateway] tool list refreshed: ${cachedTools.length} tool(s)`);
      };

      try {
        await refreshTools();
      } catch (err) {
        log.error(
          `[aai-gateway] listTools failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        await client.close().catch(() => undefined);
        return;
      }

      // Refresh cache on tools/listChanged (e.g. after mcp:import).
      // Next agent run the factory returns the updated list automatically.
      client.setNotificationHandler(ToolListChangedNotificationSchema, async () => {
        try {
          await refreshTools();
        } catch (err) {
          log.error(
            `[aai-gateway] tool list refresh failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      });

      activeClient = client;
    },

    stop: async (_ctx) => {
      log.info('[aai-gateway] closing MCP connection');
      await activeClient?.close().catch(() => undefined);
      activeClient = null;
      cachedTools = [];
    },
  });
}
