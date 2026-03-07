import { VoiceVoxClient } from "../voicevox/client.js";
import { writeSpeakersCache } from "../config.js";
import type { SpeakResult, SpeakersResult } from "../voicevox/types.js";

export async function runSpeak(
  text: string,
  host: string,
  port: number,
  speaker: number,
  speed: number
): Promise<void> {
  const client = new VoiceVoxClient({ host, port });
  const result: SpeakResult = { status: "ok", speaker, speed, text };

  try {
    await client.speak(text, speaker, speed);
    result.status = "ok";
  } catch (err) {
    result.status = "error";
    result.message =
      err instanceof Error ? err.message : "Unknown error";
  }

  console.log(JSON.stringify(result, null, 2));
  if (result.status === "error") {
    process.exit(1);
  }
}

export async function runSpeakers(host: string, port: number): Promise<void> {
  const client = new VoiceVoxClient({ host, port });
  const result: SpeakersResult = { status: "ok" };

  try {
    const speakers = await client.getSpeakers();
    result.speakers = speakers;
    // キャッシュを更新（current-speaker コマンドで名前解決に使用）
    const flat = speakers.flatMap((s) =>
      s.styles.map((st) => ({ id: st.id, name: `${s.name}（${st.name}）` }))
    );
    await writeSpeakersCache(flat);
  } catch (err) {
    result.status = "error";
    result.message =
      err instanceof Error ? err.message : "Unknown error";
  }

  console.log(JSON.stringify(result, null, 2));
  if (result.status === "error") {
    process.exit(1);
  }
}
