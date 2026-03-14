import { search, select } from "@inquirer/prompts";
import { VoiceVoxClient } from "../voicevox/client.js";
import { readConfig, writeConfig, getCurrentTty } from "../config.js";
import type { Speaker } from "../voicevox/types.js";

export async function runSpeaker(options: {
  host: string;
  port: number;
}): Promise<void> {
  const client = new VoiceVoxClient({ host: options.host, port: options.port });

  // 話者一覧を取得
  let speakers: Speaker[];
  try {
    speakers = await client.getSpeakers();
  } catch (err) {
    console.log(
      JSON.stringify({
        status: "error",
        message: err instanceof Error ? err.message : "VoiceVoxに接続できません",
      })
    );
    process.exit(1);
  }

  // 現在の設定を取得
  const config = await readConfig();
  const tty = getCurrentTty();
  const currentSpeaker =
    tty && config.speakerByTty?.[tty]
      ? config.speakerByTty[tty]
      : config.speaker ?? 1;

  // 現在の話者が属するキャラクターを特定
  const currentSpeakerInfo = speakers
    .flatMap((s) => s.styles.map((st) => ({ speaker: s, style: st })))
    .find((item) => item.style.id === currentSpeaker);
  const defaultCharacterName = currentSpeakerInfo?.speaker.name;

  // メインループ
  while (true) {
    // 第1段階: キャラクターを検索・選択
    const selectedCharacter = await search<string>({
      message: "キャラクターを検索・選択してください",
      default: defaultCharacterName,
      source: async (input) => {
        const searchStr = (input ?? "").toLowerCase();
        const filtered = speakers.filter((s) =>
          s.name.toLowerCase().includes(searchStr)
        );
        return filtered.map((s) => ({ value: s.name, name: s.name }));
      },
    });

    // 選択されたキャラクターのスタイルを取得
    const selectedSpeaker = speakers.find((s) => s.name === selectedCharacter);
    if (!selectedSpeaker) {
      continue; // 再度選択
    }

    // 「← 戻る」用の特別な値（負の値を使用）
    const BACK_VALUE = -1;

    const styleChoices = [
      { value: BACK_VALUE, name: "← 戻る" },
      ...selectedSpeaker.styles.map((st) => ({
        value: st.id,
        name: st.name,
      })),
    ];

    // 現在のスタイルが選択キャラクターのものか確認
    const defaultStyleId =
      currentSpeakerInfo?.speaker.name === selectedCharacter
        ? currentSpeaker
        : selectedSpeaker.styles[0]?.id;

    // 第2段階: スタイルを選択
    const selectedStyleId = await select<number>({
      message: `${selectedCharacter} のスタイルを選択してください (ESC: 戻る)`,
      choices: styleChoices,
      default: defaultStyleId,
    });

    // 戻るが選択された場合は第1段階に戻る
    if (selectedStyleId === BACK_VALUE) {
      continue;
    }

    // 設定を保存
    if (!tty) {
      console.log(
        JSON.stringify({
          status: "error",
          message: "TTYが検出できません。ターミナル内で実行してください。",
        })
      );
      process.exit(1);
    }

    // TTYごとの設定として保存
    await writeConfig({
      ...config,
      speakerByTty: {
        ...config.speakerByTty,
        [tty]: selectedStyleId,
      },
    });
    console.log(
      JSON.stringify({
        status: "ok",
        speaker: selectedStyleId,
        character: selectedCharacter,
        tty,
        message: `このターミナル (${tty}) のデフォルト話者を ${selectedCharacter} (ID: ${selectedStyleId}) に設定しました`,
      })
    );
    break;
  }
}
