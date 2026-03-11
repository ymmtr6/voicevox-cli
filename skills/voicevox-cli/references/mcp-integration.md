# MCP サーバー連携

voicevox-cli は stdio 形式の MCP (Model Context Protocol) サーバーを提供し、Claude Code などの AI エージェントから直接音声合成を利用できます。

## MCP サーバーの起動

```bash
voicevox-cli mcp-server
voicevox-cli mcp-server --host 192.168.1.100 --port 50021
```

## 提供ツール

### voicevox_test

VoiceVox エンジンの接続確認を行います。

```json
{
  "name": "voicevox_test",
  "arguments": {}
}
```

### voicevox_speak

テキストを読み上げます。speaker と speed は省略可能で、設定ファイルや環境変数から自動解決されます。

```json
{
  "name": "voicevox_speak",
  "arguments": {
    "text": "読み上げるテキスト",
    "speaker": 3,
    "speed": 1.5
  }
}
```

### voicevox_speakers

利用可能な話者一覧を取得します。

```json
{
  "name": "voicevox_speakers",
  "arguments": {}
}
```

## Claude Code での設定

`~/.claude/settings.json` または `.claude/settings.json` に以下を追加:

```json
{
  "mcpServers": {
    "voicevox": {
      "command": "voicevox-cli",
      "args": ["mcp-server"]
    }
  }
}
```

## 環境変数によるカスタマイズ

MCP サーバー経由で使用する場合も、環境変数で話者やスピードを制御できます:

```json
{
  "mcpServers": {
    "voicevox": {
      "command": "voicevox-cli",
      "args": ["mcp-server"],
      "env": {
        "VOICEVOX_SPEAKER": "3",
        "VOICEVOX_SPEED": "1.5"
      }
    }
  }
}
```
