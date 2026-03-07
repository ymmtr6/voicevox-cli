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
            "command": "VOICEVOX_SPEAKER=3 bash ~/.claude/hooks/stop-speak.sh"
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

#### 1. フックスクリプトを作成

```bash
mkdir -p ~/.claude/hooks
```

`~/.claude/hooks/stop-speak.sh` を作成します。

```bash
#!/bin/bash
# Claude Code Stop hook — 作業完了を VoiceVox で読み上げる

INPUT=$(cat)

# stop_hook_active が true の場合はフック自体がトリガーなので無限ループを防ぐためスキップ
STOP_HOOK_ACTIVE=$(echo "$INPUT" | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print(d.get('stop_hook_active', False))" 2>/dev/null)

if [ "$STOP_HOOK_ACTIVE" = "True" ]; then
  exit 0
fi

voicevox-cli speak "クロードの作業が完了しました" --speaker 1 --speed 1.3
```

```bash
chmod +x ~/.claude/hooks/stop-speak.sh
```

#### 2. `~/.claude/settings.json` に Stop hook を登録

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/stop-speak.sh"
          }
        ]
      }
    ]
  }
}
```

#### 応用例: 最後のメッセージを要約して読み上げる

`transcript_path` から Claude の最後のメッセージを取得して読み上げます。

```bash
#!/bin/bash
INPUT=$(cat)

STOP_HOOK_ACTIVE=$(echo "$INPUT" | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print(d.get('stop_hook_active', False))" 2>/dev/null)

if [ "$STOP_HOOK_ACTIVE" = "True" ]; then
  exit 0
fi

TRANSCRIPT=$(echo "$INPUT" | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print(d.get('transcript_path', ''))" 2>/dev/null)

if [ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ]; then
  voicevox-cli speak "クロードの作業が完了しました" --speaker 1
  exit 0
fi

# 最後の assistant メッセージの先頭100文字を読み上げ
LAST_MSG=$(python3 -c "
import json, sys
with open('$TRANSCRIPT') as f:
    data = json.load(f)
messages = [m for m in data.get('messages', []) if m.get('role') == 'assistant']
if messages:
    content = messages[-1].get('content', '')
    if isinstance(content, list):
        content = ' '.join(c.get('text', '') for c in content if c.get('type') == 'text')
    print(content[:100])
else:
    print('作業が完了しました')
" 2>/dev/null || echo "作業が完了しました")

voicevox-cli speak "$LAST_MSG" --speaker 1 --speed 1.3
```

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
