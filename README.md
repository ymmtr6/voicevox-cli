# voicevox-cli

ローカルで起動した [VoiceVox](https://voicevox.hiroshiba.jp/) エンジンを操作する CLI ツールです。
Claude Code からの MCP サーバー利用、および Stop hooks による音声通知に対応しています。

## 前提条件

- Node.js 18 以上
- [VoiceVox](https://voicevox.hiroshiba.jp/) がローカル (デフォルト: `localhost:50021`) で起動していること
- macOS (`afplay` コマンドで音声再生)

## インストール

```bash
git clone https://github.com/yourname/voicevox-cli
cd voicevox-cli
npm install
npm run build
npm link   # グローバルコマンドとして登録
```

## コマンド一覧

すべてのコマンドは JSON 形式で結果を出力します。

### `test` — 接続確認

VoiceVox エンジンが起動しているか確認します。

```bash
voicevox-cli test
```

```json
{
  "status": "ok",
  "host": "localhost",
  "port": 50021,
  "version": "0.25.1"
}
```

### `speak <text>` — テキスト読み上げ

```bash
voicevox-cli speak "おはようございます"

# 話者・速度を指定
voicevox-cli speak "こんにちは" --speaker 3 --speed 1.5
```

| オプション | 説明 | デフォルト |
|---|---|---|
| `-s, --speaker <id>` | 話者 ID | `1` |
| `--speed <speed>` | 話速 | `1.3` |
| `--host <host>` | VoiceVox ホスト | `localhost` |
| `--port <port>` | VoiceVox ポート | `50021` |

```json
{
  "status": "ok",
  "speaker": 1,
  "speed": 1.3,
  "text": "おはようございます"
}
```

### `speakers` — 話者一覧取得

利用可能な話者と ID の一覧を取得します。

```bash
voicevox-cli speakers
```

```json
{
  "status": "ok",
  "speakers": [
    {
      "name": "四国めたん",
      "styles": [
        { "name": "ノーマル", "id": 2 },
        { "name": "あまあま", "id": 0 }
      ]
    }
  ]
}
```

### `current-speaker` — 現在の speaker を表示

現在の speaker 設定 (ID + キャラクター名) を表示します。Claude Code のステータスバー向けに改行なしのシンプルなテキストを出力します。

```bash
voicevox-cli current-speaker
# 🎤 ずんだもん（ノーマル）

voicevox-cli current-speaker --json
# {"status":"ok","speaker":3,"name":"ずんだもん（ノーマル）"}
```

speaker 名の解決には `~/.config/voicevox-cli/speakers-cache.json` を使います（有効期限24時間）。
キャッシュ未作成時のみ VoiceVox に接続し、以後はキャッシュから高速に返します。
`voicevox-cli speakers` を実行するとキャッシュが更新されます。

### `pick-speaker` — ランダムに話者IDを選択

`speaker-pool` からランダムに話者IDを1つ選んで出力します。シェルスクリプトへの埋め込みに使います。

```bash
# デフォルト: VoiceVox から全話者を取得してランダム選択 (数値のみ出力)
voicevox-cli pick-speaker

# プールを直接指定
voicevox-cli pick-speaker --from "1,2,3,8"

# JSON 形式で出力
voicevox-cli pick-speaker --from "1,2,3" --json
```

```json
{ "status": "ok", "speaker": 2, "pool": [1, 2, 3] }
```

### `speak-hooks` — hook 用読み上げ

Claude Code の Stop hook (stdin) または Codex CLI の notify (コマンドライン引数) から受け取った JSON を解析し、最後の assistant メッセージを読み上げます。

```bash
# Claude Code: stdin から JSON を受け取る
voicevox-cli speak-hooks

# Codex CLI: JSON をコマンドライン引数で渡す
voicevox-cli speak-hooks '{"type":"agent-turn-complete","last-assistant-message":"完了しました"}'
```

テキストの優先順位:
1. `last_assistant_message` フィールド (Claude Code Notification hook)
2. `last-assistant-message` フィールド (Codex notify)
3. `transcript_path` の JSONL を解析 (Claude Code Stop hook)
4. `--fallback` テキスト

- `stop_hook_active: true` のときはスキップ（Claude Code の無限ループ防止）

| オプション | 説明 | デフォルト |
|---|---|---|
| `-s, --speaker <id>` | 話者 ID | (設定ファイル/環境変数) |
| `--speed <speed>` | 話速 | (設定ファイル/環境変数) |
| `--fallback <text>` | transcript がない場合のメッセージ | `"クロードの作業が完了しました"` |
| `--host <host>` | VoiceVox ホスト | `localhost` |
| `--port <port>` | VoiceVox ポート | `50021` |

### `mcp-server` — MCP サーバー起動

stdio 形式の MCP サーバーを起動します。

```bash
voicevox-cli mcp-server
```

---

## 設定

speaker と speed のデフォルト値は以下の優先順位で決定されます。

```
CLI 引数 > 環境変数 (VOICEVOX_SPEAKER / VOICEVOX_SPEED) > 設定ファイル (~/.config/voicevox-cli/config.json) > ビルトインデフォルト (speaker=1, speed=1.3)
```

### 環境変数によるターミナルセッション別切り替え

ターミナルタブ・ウィンドウごとにキャラクターを切り替えたい場合は環境変数を使います。

```bash
export VOICEVOX_SPEAKER=3
export VOICEVOX_SPEED=1.5

# これ以降の speak コマンドは speaker=3, speed=1.5 で動作
voicevox-cli speak "こんにちは"
```

`~/.zshrc` に書けば永続化できます。[direnv](https://direnv.net/) の `.envrc` に書けばディレクトリ単位での切り替えも可能です。

### 設定ファイル (`config` コマンド)

グローバルなデフォルト値を `~/.config/voicevox-cli/config.json` に保存できます。

```bash
# speaker を 3 に設定
voicevox-cli config set speaker 3

# speed を 1.5 に設定
voicevox-cli config set speed 1.5

# 現在の設定を確認
voicevox-cli config get
```

```json
{
  "status": "ok",
  "config": {
    "speaker": 3,
    "speed": 1.5
  }
}
```

### セッションごとに speaker をランダム自動割り当て

`pick-speaker` を使うと、セッションを開くたびにキャラクターが自動で決まります。

#### パターン1: ターミナルタブ/ウィンドウごと

`~/.zshrc` に追加するだけで、新しいターミナルを開くたびに自動でランダムな speaker が設定されます。

```bash
# ~/.zshrc
# 好きなキャラのIDをプールに登録しておく
voicevox-cli config set speaker-pool "1,2,3,8,14"

# ターミナル起動時に pick-speaker でランダム選択して環境変数にセット
export VOICEVOX_SPEAKER=$(voicevox-cli pick-speaker)
```

特定のキャラだけを使いたい場合は `--from` でその場だけ指定できます。

```bash
export VOICEVOX_SPEAKER=$(voicevox-cli pick-speaker --from "1,2,3")
```

#### パターン2: Claude Code の会話セッションごと

Claude Code の `SessionStart` hook と `CLAUDE_ENV_FILE` を使うと、会話を開始するたびにランダムな speaker が設定されます。

**フックスクリプトを作成**

`~/.claude/hooks/session-start-speaker.sh`:

```bash
#!/bin/bash
# Claude Code SessionStart hook — 会話ごとにランダムな speaker を設定

INPUT=$(cat)

# CLAUDE_ENV_FILE にキーバリューを書くとセッション環境変数として設定される
if [ -n "$CLAUDE_ENV_FILE" ]; then
  SPEAKER=$(voicevox-cli pick-speaker)
  echo "VOICEVOX_SPEAKER=$SPEAKER" >> "$CLAUDE_ENV_FILE"
fi
```

```bash
chmod +x ~/.claude/hooks/session-start-speaker.sh
```

**`~/.claude/settings.json` に SessionStart hook を登録**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/session-start-speaker.sh"
          }
        ]
      }
    ]
  }
}
```

これで会話を開くたびに `VOICEVOX_SPEAKER` が自動でランダム設定され、Stop hook や MCP ツールで使われます。

### Stop hook でターミナルごとに speaker を手動指定する

手動で特定の speaker を固定したい場合は環境変数か `settings.json` のインライン指定を使います。

```bash
# ターミナルAの ~/.zshrc
export VOICEVOX_SPEAKER=1   # ずんだもん

# ターミナルBの ~/.zshrc
export VOICEVOX_SPEAKER=3   # 四国めたん（ノーマル）
```

または `settings.json` の hook 設定にインラインで指定する方法もあります。

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "voicevox-cli speak-hooks --speaker 3"
          }
        ]
      }
    ]
  }
}
```

---

## Claude Code での利用

### ステータスバーに現在の speaker を表示

`~/.claude/settings.json` の `statusLine` に `current-speaker` コマンドを設定すると、
Claude Code のステータスバーにリアルタイムで現在の speaker が表示されます。

```json
{
  "statusLine": {
    "type": "command",
    "command": "voicevox-cli current-speaker"
  }
}
```

表示例:
```
🎤 ずんだもん（ノーマル）
```

`SessionStart` hook でランダム割り当てを組み合わせると、会話を開くたびに speaker が変わり、
ステータスバーで現在のキャラクターを確認できます。

### MCP サーバーとして登録

`~/.claude/claude_desktop_config.json` に以下を追加します。

```json
{
  "mcpServers": {
    "voicevox-cli": {
      "command": "voicevox-cli",
      "args": ["mcp-server"]
    }
  }
}
```

登録後は Claude Code から以下の MCP ツールが利用できます。

| ツール名 | 説明 |
|---|---|
| `voicevox_test` | 接続確認 |
| `voicevox_speak` | テキスト読み上げ |
| `voicevox_speakers` | 話者一覧取得 |

### Stop hooks で作業完了を読み上げる

Claude Code の Stop hooks を使うと、Claude が応答を完了したタイミングで自動的に音声通知できます。

`speak-hooks` コマンドを `~/.claude/settings.json` の Stop hook に登録するだけで、シェルスクリプト不要で利用できます。

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "voicevox-cli speak-hooks"
          }
        ]
      }
    ]
  }
}
```

`speak-hooks` は以下の処理をすべて内包しています。

- `stop_hook_active: true` のときはスキップ（無限ループ防止）
- `transcript_path` から最後の assistant メッセージの**最初の1行**を読み上げ
- transcript がない場合は `"クロードの作業が完了しました"` を読み上げ

フォールバックメッセージはオプションで変更できます。

```json
{
  "command": "voicevox-cli speak-hooks --fallback 完了しました"
}
```

---

## Codex CLI での利用

OpenAI の [Codex CLI](https://github.com/openai/codex) でも `notify` 設定を通じて voicevox-cli による音声通知が利用できます。

### notify でターン完了を読み上げる

`~/.codex/config.toml` の `notify` に `voicevox-cli speak-hooks` を設定すると、Codex がターンを完了するたびに最後の返答を読み上げます。

```toml
# ~/.codex/config.toml
notify = ["voicevox-cli", "speak-hooks"]
```

Codex は `agent-turn-complete` イベント時にペイロード JSON をコマンドライン引数として渡します。`speak-hooks` は `last-assistant-message` フィールドを自動的に読み取ります。

ペイロード例（Codex が渡すもの）:

```json
{
  "type": "agent-turn-complete",
  "last-assistant-message": "作業が完了しました。",
  "thread-id": "abc123",
  "cwd": "/path/to/project"
}
```

オプションも同様に指定できます。

```toml
notify = ["voicevox-cli", "speak-hooks", "--speaker", "3"]
```

| オプション | 説明 | デフォルト |
|---|---|---|
| `-s, --speaker <id>` | 話者 ID | (設定ファイル/環境変数) |
| `--fallback <text>` | メッセージがない場合のテキスト | `"クロードの作業が完了しました"` |

### TUI デスクトップ通知との併用

Codex には OSC 9 などのターミナルエスケープシーケンスを使った組み込み通知機能があります。voicevox-cli の音声通知と独立して設定できます。

```toml
[tui]
# ターミナルからフォーカスが外れたときにデスクトップ通知を送る
notifications = ["agent-turn-complete", "approval-requested"]
notification_method = "osc9"  # auto | osc9 | bel
```

### ステータスバーについて

Codex の `tui.status_line` はビルトインの識別子（`model-with-reasoning`、`context-remaining`、`git-branch` など）のリストのみ対応しており、外部コマンドの実行には対応していません。Claude Code の `statusLine` のようなカスタムコマンド表示は Codex では利用できません。

```toml
[tui]
# ビルトイン項目の順序変更のみ可能（カスタムコマンド不可）
status_line = ["model-with-reasoning", "context-remaining", "git-branch"]
```

### Claude Code との対応表

| 機能 | Claude Code | Codex CLI |
|---|---|---|
| ターン完了通知 | `hooks.Stop` / `hooks.Notification` (stdin JSON) | `notify` (argv JSON) |
| ステータスバーカスタム | `statusLine.command` で外部コマンド対応 | ビルトイン識別子のみ |
| セッション開始フック | `hooks.SessionStart` | なし |
| JSON 受け渡し方式 | stdin | コマンドライン引数 |

---

## ビルド

```bash
npm run build   # dist/ に出力
npm run dev     # tsx でソース直実行
```

## エラー時の出力例

VoiceVox が起動していない場合は `status: "error"` を返してプロセスを終了コード 1 で終了します。

```json
{
  "status": "error",
  "host": "localhost",
  "port": 50021,
  "message": "fetch failed"
}
```
