import { readConfig, writeConfig } from "../config.js";
import type { ConfigResult } from "../voicevox/types.js";

export async function runConfigGet(): Promise<void> {
  const config = await readConfig();
  const result: ConfigResult = { status: "ok", config };
  console.log(JSON.stringify(result, null, 2));
}

export async function runConfigSet(key: string, value: string): Promise<void> {
  const current = await readConfig();

  if (key === "speaker-pool") {
    const ids = value
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n) && n >= 0);
    if (ids.length === 0) {
      const result: ConfigResult = {
        status: "error",
        message: `Invalid value: "${value}". Must be comma-separated speaker IDs (e.g. "1,2,3")`,
      };
      console.log(JSON.stringify(result, null, 2));
      process.exit(1);
    }
    const updated = { ...current, speakerPool: ids };
    await writeConfig(updated);
    const result: ConfigResult = { status: "ok", config: updated };
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (key !== "speaker" && key !== "speed") {
    const result: ConfigResult = {
      status: "error",
      message: `Invalid key: "${key}". Valid keys are: speaker, speed, speaker-pool`,
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const num = Number(value);
  if (isNaN(num)) {
    const result: ConfigResult = {
      status: "error",
      message: `Invalid value: "${value}". Must be a number`,
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const updated = { ...current, [key]: num };
  await writeConfig(updated);

  const result: ConfigResult = { status: "ok", config: updated };
  console.log(JSON.stringify(result, null, 2));
}
