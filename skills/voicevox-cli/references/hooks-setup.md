# Claude Code Hooks 設定

voicevox-cli は Claude Code の hooks システムと連携して、各種イベント発生時に音声通知を行えます。

## セットアップ

```bash
# デフォルト (Stop, SubagentStop, Notification の3イベント)
voicevox-cli setup-hooks

# プロジェクトスコープ (デフォルト)
voicevox-cli setup-hooks --scope project

# ユーザースコープ (全プロジェクト共通)
voicevox-cli setup-hooks --scope user

# 全13イベントを設定
voicevox-cli setup-hooks --all

# 特定のイベントのみ
voicevox-cli setup-hooks --events Stop,Notification,SessionStart

# 設定内容をプレビュー
voicevox-cli setup-hooks --dry-run
```

## 対応イベント (Claude Code v2.1.86 settings.json バリデーション準拠)

| イベント | 説明 |
|---------|------|
| `SessionStart` | セッション開始 |
| `SessionEnd` | セッション終了 |
| `UserPromptSubmit` | ユーザープロンプト送信 |
| `PreToolUse` | ツール実行前 |
| `PostToolUse` | ツール実行後 |
| `Notification` | 通知 |
| `SubagentStop` | サブエージェント終了 |
| `Stop` | タスク完了 |
| `PreCompact` | コンパクト前 |
| `PostCompact` | コンパクト後 |
| `TeammateIdle` | チームメイトアイドル |
| `TaskCreated` | タスク作成 |
| `TaskCompleted` | タスク完了 |

## speak-hooks の動作

`speak-hooks` コマンドは hook イベントの JSON ペイロードを解析して読み上げます。

- stdin または引数でペイロードを受け取る
- `stop_hook_active=true` の場合は無限ループ防止のためスキップ
- イベントタイプに応じたメッセージを生成
- Notification メッセージは日本語に変換
- URL は短縮表示 (`https://github.com/foo` -> `URL: github.com`)

## 設定例

`.claude/settings.json` に以下のように設定されます:

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
