# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # TypeScript compile → dist/
npm run dev -- <args>  # Run via tsx without building (e.g. npm run dev -- speak "テスト")
npm test               # Run vitest
npm run test:watch     # Run vitest in watch mode
```

Manual testing requires a running VoiceVox engine on localhost:50021. After editing, rebuild with `npm run build` and verify with `voicevox-cli test`.

## Architecture

**Entry point:** `src/index.ts` — registers all commander subcommands, resolves config via `resolveConfig()`, then delegates to command modules.

**Command modules** (`src/commands/`): each exports a `run*` function. Commands output JSON to stdout and call `process.exit(1)` on error.

**VoiceVox client** (`src/voicevox/client.ts`): wraps the HTTP API. The `speak()` method calls `/audio_query` then `/synthesis`, writes a temp WAV, plays it with `afplay` (macOS only), then deletes the file.

**Config resolution** (`src/config.ts`): priority order for settings is CLI flag > env vars (`VOICEVOX_SPEAKER`/`VOICEVOX_SPEED`/`VOICEVOX_TIMEOUT_MS`/`VOICEVOX_RETRY_COUNT`/`VOICEVOX_RETRY_DELAY_MS`) > `~/.config/voicevox-cli/config.json` > defaults. The speakers cache (`~/.config/voicevox-cli/speakers-cache.json`) has a 24h TTL and is used by `current-speaker` for name resolution without hitting the API.

**speak-hooks** (`src/commands/speak-hooks.ts`): designed for Claude Code Stop/SubagentStop/Notification hooks. Reads JSON from stdin (skips if TTY). Text priority: `last_assistant_message` field → parse JSONL transcript at `transcript_path` → `--fallback` text. Exits immediately if `stop_hook_active` is true (prevents infinite loops).

**MCP server** (`src/commands/mcp-server.ts`): stdio MCP server exposing `voicevox_test`, `voicevox_speak`, `voicevox_speakers` tools.

**dict/preset commands**: manage VoiceVox user dictionary and presets via API endpoints.

## Module system

ESM with `"type": "module"` and `moduleResolution: NodeNext`. All internal imports must use `.js` extensions (e.g. `import { foo } from "./bar.js"`).
