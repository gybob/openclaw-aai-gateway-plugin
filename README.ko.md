[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

---

# openclaw-aai-gateway-plugin

[![npm version](https://img.shields.io/npm/v/openclaw-aai-gateway-plugin)](https://www.npmjs.com/package/openclaw-aai-gateway-plugin)
[![license](https://img.shields.io/npm/l/openclaw-aai-gateway-plugin)](./LICENSE)

[OpenClaw](https://openclaw.ai)용 [AAI Gateway](https://github.com/gybob/aai-gateway) 플러그인 — 한 번 가져오면 어디서나 사용 가능.

---

## 기능

이 플러그인은 **AAI Gateway**를 OpenClaw에 브릿지하여, 게이트웨이가 관리하는 모든 도구(MCP 서버, Skills, ACP 에이전트)를 네이티브 OpenClaw 에이전트 도구로 노출합니다.

- **설정 불필요** — 설치하면 바로 사용 가능
- **동적 도구 업데이트** — AAI Gateway에서 새 MCP 서버나 Skill을 가져오면, OpenClaw 재시작 없이 다음 에이전트 실행 시 자동으로 사용 가능
- **컨텍스트 토큰 99% 절감** — AAI Gateway는 모든 스키마를 미리 주입하는 대신 필요할 때 도구 세부정보를 로드

> AAI Gateway에 대한 자세한 내용은 [AAI Gateway README](https://github.com/gybob/aai-gateway)를 참조하세요.

## 설치

```bash
openclaw plugin install openclaw-aai-gateway-plugin
```

끝입니다. 플러그인이 자동으로 `npx -y aai-gateway`를 실행합니다.

## 사용법

설치 후 모든 AAI Gateway 도구를 OpenClaw 에이전트에서 사용할 수 있습니다. 시도해 보세요:

- **"모든 AAI 앱 목록 보기"** — 가져온 앱 확인
- **"AAI로 브라우저 자동화 도구 검색"** — 새 도구 검색 및 설치
- **"이 MCP 서버 가져오기: ..."** — `mcp:import`로 MCP 서버 추가

## 설정 (선택사항)

`~/.openclaw/openclaw.json`의 `plugins.entries.aai-gateway.config`에 추가:

```jsonc
{
  // 실행 명령어 재정의 (기본값: npx -y aai-gateway)
  "command": "aai-gateway"  // 예: 전역 설치 시
}
```

## 요구사항

- [OpenClaw](https://openclaw.ai) >= 2026.1.0
- [Node.js](https://nodejs.org) >= 18
- npm (`npx`용)

## 라이선스

[Apache-2.0](./LICENSE)
