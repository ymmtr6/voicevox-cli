import { VoiceVoxClient } from "../voicevox/client.js";
import type { TestResult } from "../voicevox/types.js";

export async function runTest(host: string, port: number): Promise<void> {
  const client = new VoiceVoxClient({ host, port });
  const result: TestResult = { status: "ok", host, port };

  try {
    const version = await client.getVersion();
    result.version = version;
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
