import { readFile, writeFile } from "node:fs/promises";
import { VoiceVoxClient } from "../voicevox/client.js";
import type {
  DictListResult,
  DictAddResult,
  DictOperationResult,
  UserDictWord,
  WordType,
} from "../voicevox/types.js";

export async function runDictList(host: string, port: number, json: boolean): Promise<void> {
  const client = new VoiceVoxClient({ host, port });

  if (!json) {
    try {
      const words = await client.getUserDict();
      const entries = Object.entries(words);
      if (entries.length === 0) {
        console.log("登録されている単語はありません。");
        return;
      }
      for (const [uuid, word] of entries) {
        console.log(`${uuid}\t${word.surface}\t${word.pronunciation}\tアクセント:${word.accent_type}\t優先度:${word.priority}`);
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : "Unknown error");
      process.exit(1);
    }
    return;
  }

  const result: DictListResult = { status: "ok" };
  try {
    result.words = await client.getUserDict();
  } catch (err) {
    result.status = "error";
    result.message = err instanceof Error ? err.message : "Unknown error";
  }

  console.log(JSON.stringify(result, null, 2));
  if (result.status === "error") {
    process.exit(1);
  }
}

export async function runDictAdd(
  host: string,
  port: number,
  params: {
    surface: string;
    pronunciation: string;
    accentType: number;
    wordType?: WordType;
    priority?: number;
  },
): Promise<void> {
  const client = new VoiceVoxClient({ host, port });
  const result: DictAddResult = { status: "ok" };

  try {
    const uuid = await client.addUserDictWord({
      surface: params.surface,
      pronunciation: params.pronunciation,
      accent_type: params.accentType,
      word_type: params.wordType,
      priority: params.priority,
    });
    result.uuid = uuid;
  } catch (err) {
    result.status = "error";
    result.message = err instanceof Error ? err.message : "Unknown error";
  }

  console.log(JSON.stringify(result, null, 2));
  if (result.status === "error") {
    process.exit(1);
  }
}

export async function runDictUpdate(
  host: string,
  port: number,
  wordUuid: string,
  params: {
    surface: string;
    pronunciation: string;
    accentType: number;
    wordType?: WordType;
    priority?: number;
  },
): Promise<void> {
  const client = new VoiceVoxClient({ host, port });
  const result: DictOperationResult = { status: "ok" };

  try {
    await client.updateUserDictWord(wordUuid, {
      surface: params.surface,
      pronunciation: params.pronunciation,
      accent_type: params.accentType,
      word_type: params.wordType,
      priority: params.priority,
    });
  } catch (err) {
    result.status = "error";
    result.message = err instanceof Error ? err.message : "Unknown error";
  }

  console.log(JSON.stringify(result, null, 2));
  if (result.status === "error") {
    process.exit(1);
  }
}

export async function runDictRemove(host: string, port: number, wordUuid: string): Promise<void> {
  const client = new VoiceVoxClient({ host, port });
  const result: DictOperationResult = { status: "ok" };

  try {
    await client.deleteUserDictWord(wordUuid);
  } catch (err) {
    result.status = "error";
    result.message = err instanceof Error ? err.message : "Unknown error";
  }

  console.log(JSON.stringify(result, null, 2));
  if (result.status === "error") {
    process.exit(1);
  }
}

export async function runDictExport(host: string, port: number, output?: string): Promise<void> {
  const client = new VoiceVoxClient({ host, port });

  try {
    const words = await client.getUserDict();
    const json = JSON.stringify(words, null, 2);

    if (output) {
      await writeFile(output, json, "utf-8");
      const result: DictOperationResult = { status: "ok", message: `エクスポート先: ${output}` };
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(json);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : "Unknown error");
    process.exit(1);
  }
}

export async function runDictImport(
  host: string,
  port: number,
  file: string,
  override: boolean,
): Promise<void> {
  const result: DictOperationResult = { status: "ok" };

  try {
    const content = await readFile(file, "utf-8");
    const parsed: unknown = JSON.parse(content);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid dict file: top-level value must be a JSON object.");
    }
    const dictData = parsed as Record<string, UserDictWord>;
    const client = new VoiceVoxClient({ host, port });
    await client.importUserDict(dictData, override);
  } catch (err) {
    result.status = "error";
    result.message = err instanceof Error ? err.message : "Unknown error";
  }

  console.log(JSON.stringify(result, null, 2));
  if (result.status === "error") {
    process.exit(1);
  }
}
