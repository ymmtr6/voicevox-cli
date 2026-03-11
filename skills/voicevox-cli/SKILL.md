---
name: voicevox-cli
description: VoiceVox音声合成CLIツール。テキスト読み上げ、話者管理、Claude Code hooks連携を提供します。Use when the user wants to use VoiceVox text-to-speech, manage speakers, or configure voice notifications for Claude Code.
allowed-tools: Bash(voicevox-cli:*), mcp__voicevox__voicevox_speak, mcp__voicevox__voicevox_test, mcp__voicevox__voicevox_speakers
---

# VoiceVox CLI - 音声合成ツール

VoiceVox エンジンと連携してテキスト読み上げを行う CLI ツールです。

## Quick start

```bash
# VoiceVox エンジンの接続確認
voicevox-cli test
# テキストを読み上げ
voicevox-cli speak "こんにちは"
# 話者一覧を取得
voicevox-cli speakers
```

## Commands

### 接続確認

```bash
voicevox-cli test
voicevox-cli test --host 192.168.1.100 --port 50021
```

### テキスト読み上げ

```bash
voicevox-cli speak "読み上げたいテキスト"
voicevox-cli speak "速い読み上げ" --speed 1.5
voicevox-cli speak "別の話者" --speaker 3
voicevox-cli speak "タイムアウト付き" --timeout 10000
voicevox-cli speak "リトライ付き" --retry-count 3 --retry-delay 1000
```

### 話者管理

```bash
# 話者一覧
voicevox-cli speakers
# 現在の話者を表示 (ステータスバー用)
voicevox-cli current-speaker
voicevox-cli current-speaker --json
# ランダムに話者を選択
voicevox-cli pick-speaker
voicevox-cli pick-speaker --from 1,3,8
voicevox-cli pick-speaker --list
```

### 設定管理

```bash
# 設定を表示
voicevox-cli config get
# 設定を変更
voicevox-cli config set speaker 3
voicevox-cli config set speed 1.5
voicevox-cli config set speaker-pool 1,3,8,10
voicevox-cli config set timeoutMs 15000
voicevox-cli config set retryCount 2
voicevox-cli config set retryDelayMs 500
```

### MCP サーバー

```bash
# stdio 形式の MCP サーバーを起動
voicevox-cli mcp-server
```

### Claude Code Hooks

```bash
# hooks を設定 (デフォルト: Stop, SubagentStop, Notification)
voicevox-cli setup-hooks
voicevox-cli setup-hooks --scope user
voicevox-cli setup-hooks --all
voicevox-cli setup-hooks --events Stop,Notification
voicevox-cli setup-hooks --dry-run
```

### Skills インストール

```bash
# プロジェクトにスキルをインストール
voicevox-cli install --skills
# ユーザーレベルにインストール
voicevox-cli install --skills --scope user
```

## 設定の優先順位

speaker と speed は以下の優先順位で解決されます:

1. CLI フラグ (`--speaker`, `--speed`)
2. 環境変数 (`VOICEVOX_SPEAKER`, `VOICEVOX_SPEED`)
3. 設定ファイル (`~/.config/voicevox-cli/config.json`)
4. デフォルト値 (speaker=1, speed=1.3)

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `VOICEVOX_SPEAKER` | デフォルト話者ID |
| `VOICEVOX_SPEED` | デフォルト話速 |
| `VOICEVOX_TIMEOUT_MS` | リクエストタイムアウト (ms) |
| `VOICEVOX_RETRY_COUNT` | リトライ回数 |
| `VOICEVOX_RETRY_DELAY_MS` | リトライ間隔 (ms) |

## Specific tasks

* **Hooks 設定** [references/hooks-setup.md](references/hooks-setup.md)
* **MCP サーバー連携** [references/mcp-integration.md](references/mcp-integration.md)
* **話者カスタマイズ** [references/speaker-customization.md](references/speaker-customization.md)
