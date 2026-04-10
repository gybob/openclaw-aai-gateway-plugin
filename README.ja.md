[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

---

# openclaw-aai-gateway-plugin

[![npm version](https://img.shields.io/npm/v/openclaw-aai-gateway-plugin)](https://www.npmjs.com/package/openclaw-aai-gateway-plugin)
[![license](https://img.shields.io/npm/l/openclaw-aai-gateway-plugin)](./LICENSE)

[OpenClaw](https://openclaw.ai) 用 [AAI Gateway](https://github.com/gybob/aai-gateway) プラグイン — 一度インポートすれば、どこでも使える。

---

## 機能

このプラグインは **AAI Gateway** を OpenClaw にブリッジし、ゲートウェイが管理するすべてのツール（MCP サーバー、Skills、ACP エージェント）をネイティブの OpenClaw エージェントツールとして公開します。

- **設定不要** — インストールするだけですぐに使える
- **動的ツール更新** — AAI Gateway で新しい MCP サーバーや Skill をインポートすると、OpenClaw を再起動せずに次のエージェント実行時に自動的に利用可能
- **コンテキストトークン 99% 削減** — AAI Gateway はすべてのスキーマを事前に注入するのではなく、オンデマンドでツール詳細を読み込む

> AAI Gateway の詳細については、[AAI Gateway README](https://github.com/gybob/aai-gateway) をご覧ください。

## インストール

```bash
openclaw plugin install openclaw-aai-gateway-plugin
```

以上です。プラグインは自動的に `npx -y aai-gateway` で起動します。

## 使い方

インストール後、すべての AAI Gateway ツールが OpenClaw エージェントで利用可能になります。試してみてください：

- **「すべての AAI アプリを一覧表示」** — インポート済みのアプリを確認
- **「AAI でブラウザ自動化ツールを検索」** — 新しいツールを発見してインストール
- **「この MCP サーバーをインポート: ...」** — `mcp:import` で MCP サーバーを追加

## 設定（オプション）

`~/.openclaw/openclaw.json` の `plugins.entries.aai-gateway.config` に追加：

```jsonc
{
  // 起動コマンドを上書き（デフォルト: npx -y aai-gateway）
  "command": "aai-gateway"  // 例: グローバルインストール時
}
```

## 要件

- [OpenClaw](https://openclaw.ai) >= 2026.1.0
- [Node.js](https://nodejs.org) >= 18
- npm（`npx` 用）

## ライセンス

[Apache-2.0](./LICENSE)
