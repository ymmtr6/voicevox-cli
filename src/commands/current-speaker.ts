import { resolveConfig, readSpeakersCache, writeSpeakersCache } from "../config.js";
import { VoiceVoxClient } from "../voicevox/client.js";

async function resolveSpeakerName(
  speakerId: number,
  host: string,
  port: number
): Promise<string | undefined> {
  // キャッシュから取得
  const cache = await readSpeakersCache();
  if (cache) {
    return cache.speakers.find((s) => s.id === speakerId)?.name;
  }

  // キャッシュ期限切れ or 未作成 → VoiceVox から取得してキャッシュ更新
  try {
    const client = new VoiceVoxClient({ host, port });
    const allSpeakers = await client.getSpeakers();
    const flat = allSpeakers.flatMap((s) =>
      s.styles.map((st) => ({ id: st.id, name: `${s.name}（${st.name}）` }))
    );
    await writeSpeakersCache(flat);
    return flat.find((s) => s.id === speakerId)?.name;
  } catch {
    return undefined;
  }
}

export async function runCurrentSpeaker(options: {
  host: string;
  port: number;
  json: boolean;
}): Promise<void> {
  const { speaker } = await resolveConfig({});
  const name = await resolveSpeakerName(speaker, options.host, options.port);
  const label = name ?? `Speaker ${speaker}`;

  if (options.json) {
    console.log(JSON.stringify({ status: "ok", speaker, name: label }));
  } else {
    console.log(`🎤 ${label}`);
  }
}
