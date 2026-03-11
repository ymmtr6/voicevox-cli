# 話者カスタマイズ

voicevox-cli では話者の選択やランダム切り替えをカスタマイズできます。

## 話者一覧の取得

```bash
voicevox-cli speakers
```

出力例:
```json
{
  "status": "ok",
  "speakers": [
    {
      "name": "四国めたん",
      "speaker_uuid": "...",
      "styles": [
        { "name": "ノーマル", "id": 2 },
        { "name": "あまあま", "id": 0 },
        { "name": "ツンツン", "id": 6 },
        { "name": "セクシー", "id": 4 }
      ]
    }
  ]
}
```

## デフォルト話者の設定

```bash
# 設定ファイルで指定
voicevox-cli config set speaker 3

# 環境変数で指定
export VOICEVOX_SPEAKER=3

# CLI フラグで一時的に変更
voicevox-cli speak "テスト" --speaker 3
```

## 話者プール (ランダム選択)

複数の話者からランダムに選択する機能です。

```bash
# プールを設定
voicevox-cli config set speaker-pool 1,3,8,10

# ランダムに1つ選択
voicevox-cli pick-speaker

# 候補一覧を表示
voicevox-cli pick-speaker --list

# 一時的に別のプールを使用
voicevox-cli pick-speaker --from 2,4,6

# シェルで動的に話者を切り替えて読み上げ
voicevox-cli speak "ランダム話者" --speaker $(voicevox-cli pick-speaker)
```

## 現在の話者を確認

```bash
# ステータスバー用テキスト出力
voicevox-cli current-speaker
# 出力例: 🎙️ VOICEVOX:四国めたん(ノーマル)

# JSON 形式
voicevox-cli current-speaker --json
```

## 話速の設定

```bash
# 設定ファイルで指定 (デフォルト: 1.3)
voicevox-cli config set speed 1.5

# 環境変数で指定
export VOICEVOX_SPEED=1.5

# CLI フラグで一時的に変更
voicevox-cli speak "速い読み上げ" --speed 2.0
```
