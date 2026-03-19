import { VoiceVoxClient } from "../voicevox/client.js";
import type {
  NewPreset,
  Preset,
  PresetListResult,
  PresetAddResult,
  PresetOperationResult,
} from "../voicevox/types.js";

export async function runPresetList(host: string, port: number, json: boolean): Promise<void> {
  const client = new VoiceVoxClient({ host, port });
  const result: PresetListResult = { status: "ok" };

  try {
    const presets = await client.getPresets();
    result.presets = presets;

    if (!json) {
      if (presets.length === 0) {
        console.log("登録されているプリセットはありません。");
        return;
      }
      for (const p of presets) {
        console.log(
          `${p.id}\t${p.name}\tstyle:${p.style_id}\t速度:${p.speedScale}\t音高:${p.pitchScale}\t抑揚:${p.intonationScale}\t音量:${p.volumeScale}`,
        );
      }
      return;
    }
  } catch (err) {
    result.status = "error";
    result.message = err instanceof Error ? err.message : "Unknown error";
  }

  console.log(JSON.stringify(result, null, 2));
  if (result.status === "error") {
    process.exit(1);
  }
}

export async function runPresetAdd(
  host: string,
  port: number,
  params: {
    name: string;
    speakerUuid: string;
    styleId: number;
    speedScale: number;
    pitchScale: number;
    intonationScale: number;
    volumeScale: number;
    prePhonemeLength: number;
    postPhonemeLength: number;
    pauseLength?: number;
    pauseLengthScale?: number;
  },
): Promise<void> {
  const client = new VoiceVoxClient({ host, port });
  const result: PresetAddResult = { status: "ok" };

  try {
    const newPreset: NewPreset = {
      name: params.name,
      speaker_uuid: params.speakerUuid,
      style_id: params.styleId,
      speedScale: params.speedScale,
      pitchScale: params.pitchScale,
      intonationScale: params.intonationScale,
      volumeScale: params.volumeScale,
      prePhonemeLength: params.prePhonemeLength,
      postPhonemeLength: params.postPhonemeLength,
    };
    if (params.pauseLength !== undefined) {
      newPreset.pauseLength = params.pauseLength;
    }
    if (params.pauseLengthScale !== undefined) {
      newPreset.pauseLengthScale = params.pauseLengthScale;
    }
    const id = await client.addPreset(newPreset);
    result.id = id;
  } catch (err) {
    result.status = "error";
    result.message = err instanceof Error ? err.message : "Unknown error";
  }

  console.log(JSON.stringify(result, null, 2));
  if (result.status === "error") {
    process.exit(1);
  }
}

export async function runPresetUpdate(
  host: string,
  port: number,
  params: {
    id: number;
    name: string;
    speakerUuid: string;
    styleId: number;
    speedScale: number;
    pitchScale: number;
    intonationScale: number;
    volumeScale: number;
    prePhonemeLength: number;
    postPhonemeLength: number;
    pauseLength?: number;
    pauseLengthScale?: number;
  },
): Promise<void> {
  const client = new VoiceVoxClient({ host, port });
  const result: PresetOperationResult = { status: "ok" };

  try {
    const preset: Preset = {
      id: params.id,
      name: params.name,
      speaker_uuid: params.speakerUuid,
      style_id: params.styleId,
      speedScale: params.speedScale,
      pitchScale: params.pitchScale,
      intonationScale: params.intonationScale,
      volumeScale: params.volumeScale,
      prePhonemeLength: params.prePhonemeLength,
      postPhonemeLength: params.postPhonemeLength,
    };
    if (params.pauseLength !== undefined) {
      preset.pauseLength = params.pauseLength;
    }
    if (params.pauseLengthScale !== undefined) {
      preset.pauseLengthScale = params.pauseLengthScale;
    }
    await client.updatePreset(preset);
  } catch (err) {
    result.status = "error";
    result.message = err instanceof Error ? err.message : "Unknown error";
  }

  console.log(JSON.stringify(result, null, 2));
  if (result.status === "error") {
    process.exit(1);
  }
}

export async function runPresetRemove(host: string, port: number, id: number): Promise<void> {
  const client = new VoiceVoxClient({ host, port });
  const result: PresetOperationResult = { status: "ok" };

  try {
    await client.deletePreset(id);
  } catch (err) {
    result.status = "error";
    result.message = err instanceof Error ? err.message : "Unknown error";
  }

  console.log(JSON.stringify(result, null, 2));
  if (result.status === "error") {
    process.exit(1);
  }
}
