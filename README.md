[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

---

# openclaw-aai-gateway-plugin

[![npm version](https://img.shields.io/npm/v/openclaw-aai-gateway-plugin)](https://www.npmjs.com/package/openclaw-aai-gateway-plugin)
[![license](https://img.shields.io/npm/l/openclaw-aai-gateway-plugin)](./LICENSE)

[OpenClaw](https://openclaw.ai) plugin for [AAI Gateway](https://github.com/gybob/aai-gateway) — import once, use everywhere.

---

## What It Does

This plugin bridges **AAI Gateway** into OpenClaw, exposing all gateway-managed tools (MCP servers, Skills, ACP agents) as native OpenClaw agent tools.

- **Zero config** — installs and works out of the box
- **Dynamic tool updates** — import a new MCP server or Skill via AAI Gateway, and it appears in your next agent run without restarting OpenClaw
- **99% context token savings** — AAI Gateway loads tool details on demand instead of injecting all schemas upfront

> For more about AAI Gateway and what problems it solves, see the [AAI Gateway README](https://github.com/gybob/aai-gateway).

## Install

```bash
openclaw plugin install openclaw-aai-gateway-plugin
```

That's it. The plugin spawns `npx -y aai-gateway` automatically.

## Usage

Once installed, all AAI Gateway tools are available to your OpenClaw agents. Try:

- **"List all AAI apps"** — see what's imported
- **"Use AAI to search for a browser automation tool"** — discover and install new tools
- **"Import this MCP server: ..."** — add an MCP server via `mcp:import`

## Configuration (Optional)

Add to `~/.openclaw/openclaw.json` under `plugins.entries.aai-gateway.config`:

```jsonc
{
  // Override the launch command (default: npx -y aai-gateway)
  "command": "aai-gateway"  // e.g. if installed globally
}
```

## Requirements

- [OpenClaw](https://openclaw.ai) >= 2026.1.0
- [Node.js](https://nodejs.org) >= 18
- npm (for `npx`)

## License

[Apache-2.0](./LICENSE)
