[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

---

# openclaw-aai-gateway-plugin

[![npm version](https://img.shields.io/npm/v/openclaw-aai-gateway-plugin)](https://www.npmjs.com/package/openclaw-aai-gateway-plugin)
[![license](https://img.shields.io/npm/l/openclaw-aai-gateway-plugin)](./LICENSE)

[OpenClaw](https://openclaw.ai) 的 [AAI Gateway](https://github.com/gybob/aai-gateway) 插件 — 一次导入，处处可用。

---

## 功能

本插件将 **AAI Gateway** 桥接到 OpenClaw，将网关管理的所有工具（MCP 服务器、Skills、ACP 代理）作为原生 OpenClaw 代理工具暴露。

- **零配置** — 安装即用，开箱即用
- **动态工具更新** — 通过 AAI Gateway 导入新的 MCP 服务器或 Skill，下次代理运行时自动可用，无需重启 OpenClaw
- **节省 99% 上下文 Token** — AAI Gateway 按需加载工具详情，而非预先注入全部 Schema

> 了解更多 AAI Gateway 及其解决的问题，请查看 [AAI Gateway README](https://github.com/gybob/aai-gateway)。

## 安装

```bash
openclaw plugin install openclaw-aai-gateway-plugin
```

就这样。插件会自动通过 `npx -y aai-gateway` 启动。

## 使用

安装后，所有 AAI Gateway 工具对 OpenClaw 代理自动可用。试试：

- **"列出所有 AAI 应用"** — 查看已导入的应用
- **"用 AAI 搜索一个浏览器自动化工具"** — 发现并安装新工具
- **"导入这个 MCP 服务器: ..."** — 通过 `mcp:import` 添加 MCP 服务器

## 配置（可选）

在 `~/.openclaw/openclaw.json` 的 `plugins.entries.aai-gateway.config` 下添加：

```jsonc
{
  // 覆盖启动命令（默认: npx -y aai-gateway）
  "command": "aai-gateway"  // 例如全局安装时可用
}
```

## 环境要求

- [OpenClaw](https://openclaw.ai) >= 2026.1.0
- [Node.js](https://nodejs.org) >= 18
- npm（用于 `npx`）

## 许可证

[Apache-2.0](./LICENSE)
