# voicevox-dict-suggest

Claude Codeの会話履歴を分析し、VoiceVoxが正しく読めない英単語の辞書登録用JSONを生成するskillです。

## 使い方

```bash
/voicevox-dict-suggest [file_path]
```

- `file_path` (省略可): 分析するテキストファイル。省略時は会話履歴のtranscriptを使用。

## 実行手順

以下の手順で辞書提案を作成してください：

### 1. テキストの取得

- 引数でファイルパスが指定された場合: そのファイルを読み込む
- 引数がない場合: 環境変数 `CLAUDE_CODE_TRANSCRIPT_PATH` または `CLAUDE_TRANSCRIPT_PATH` からtranscriptファイルのパスを取得して読み込む

### 2. 英単語の抽出

テキストから以下の条件で英単語を抽出：
- 3文字以上のアルファベット列
- 一般的な英単語、技術用語、固有名詞を含む
- 重複は除外

### 3. VoiceVoxでの読み確認

抽出した各英単語について、`mcp__voicevox__voicevox_speak` ツールを使用して読みを確認：

```
mcp__voicevox__voicevox_speak で text: "<単語>" を送信し、実際に音声合成されるか確認
```

※ 音声が出力されるため、必要に応じてユーザーに事前通知してください。

### 4. 問題のある単語を特定

以下のような読み間違いがある単語を特定：
- アルファベットをそのまま読んでいる（例: "API" → "エーピーアイ" ではなく文字読み）
- 日本語話者が期待する読みと異なる
- 一般的に使われるカタカナ読みと異なる

### 5. 辞書登録用JSONの生成

`voicevox dict import` でインポート可能な形式でJSONを生成：

```json
{
  "auto-generated-uuid-1": {
    "surface": "Claude",
    "pronunciation": "クロード",
    "accent_type": 1,
    "word_type": "PROPER_NOUN",
    "priority": 5
  }
}
```

### 6. 出力

1. 検出された問題のある単語の一覧を表示（表形式）
2. 辞書登録用JSONを表示
3. JSONをファイルに保存するか確認（デフォルト: `~/.config/voicevox-cli/suggested-dict.json`）

## 出力例

```
## 検出された読み間違い単語

| 単語 | 現在の読み | 提案する読み |
|------|-----------|-------------|
| Claude | クラウド(不正確) | クロード |
| npm | エヌピーエム | エヌピーエム |

## 辞書登録用JSON

(上記のJSON形式)

## 次のステップ

以下のコマンドで辞書にインポートできます：
voicevox dict import ~/.config/voicevox-cli/suggested-dict.json
```

## 注意事項

- VoiceVoxエンジンが起動している必要があります（localhost:50021）
- 音声が再生されるため、ヘッドフォン推奨
- 提案された読みは目安です。必要に応じて修正してください
