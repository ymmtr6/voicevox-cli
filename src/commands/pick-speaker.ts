import { readConfig } from "../config.js";
import { VoiceVoxClient } from "../voicevox/client.js";
import type { Speaker } from "../voicevox/types.js";

function pickRandom(pool: number[]): number {
  return pool[Math.floor(Math.random() * pool.length)];
}

/** キャラクターごとに「ノーマル」または先頭スタイルを1つ選んだIDリストを返す */
function defaultPoolFromSpeakers(speakers: Speaker[]): number[] {
  return speakers
    .map((s) => {
      const normal = s.styles.find((st) => st.name === "ノーマル");
      return (normal ?? s.styles[0])?.id;
    })
    .filter((id): id is number => id !== undefined);
}

async function fetchSpeakers(host: string, port: number): Promise<Speaker[]> {
  const client = new VoiceVoxClient({ host, port });
  return client.getSpeakers();
}

function buildNameMap(speakers: Speaker[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const s of speakers) {
    for (const st of s.styles) {
      map.set(st.id, `${s.name}（${st.name}）`);
    }
  }
  return map;
}

export async function runPickSpeakerList(options: {
  host: string;
  port: number;
  from?: string;
}): Promise<void> {
  let allSpeakers: Speaker[];
  try {
    allSpeakers = await fetchSpeakers(options.host, options.port);
  } catch {
    console.log(
      JSON.stringify({ status: "error", message: "VoiceVoxに接続できません。" })
    );
    process.exit(1);
  }

  const nameMap = buildNameMap(allSpeakers);

  let ids: number[];
  if (options.from) {
    ids = options.from
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n) && n >= 0);
  } else {
    const config = await readConfig();
    if (config.speakerPool && config.speakerPool.length > 0) {
      ids = config.speakerPool;
    } else {
      // デフォルト: 1キャラ1スタイル（ノーマル優先、なければ先頭）
      ids = defaultPoolFromSpeakers(allSpeakers);
    }
  }

  const list = ids.map((id) => ({
    id,
    name: nameMap.get(id) ?? `Unknown (id=${id})`,
  }));

  console.log(JSON.stringify({ status: "ok", speakers: list }, null, 2));
}

export async function runPickSpeaker(options: {
  host: string;
  port: number;
  from?: string;
  list: boolean;
  json: boolean;
}): Promise<void> {
  if (options.list) {
    await runPickSpeakerList(options);
    return;
  }

  let pool: number[];

  if (options.from) {
    pool = options.from
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n) && n >= 0);
  } else {
    const config = await readConfig();
    if (config.speakerPool && config.speakerPool.length > 0) {
      pool = config.speakerPool;
    } else {
      try {
        const speakers = await fetchSpeakers(options.host, options.port);
        pool = defaultPoolFromSpeakers(speakers);
      } catch {
        if (options.json) {
          console.log(
            JSON.stringify({
              status: "error",
              message:
                "VoiceVoxに接続できません。--from または config set speaker-pool でプールを設定してください。",
            })
          );
        } else {
          process.stderr.write(
            "VoiceVoxに接続できません。--from または config set speaker-pool でプールを設定してください。\n"
          );
        }
        process.exit(1);
      }
    }
  }

  if (pool.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ status: "error", message: "speaker pool が空です" }));
    } else {
      process.stderr.write("speaker pool が空です\n");
    }
    process.exit(1);
  }

  const picked = pickRandom(pool);

  if (options.json) {
    console.log(JSON.stringify({ status: "ok", speaker: picked, pool }));
  } else {
    console.log(picked);
  }
}
