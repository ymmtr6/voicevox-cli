import { readFile } from "fs/promises";
import { runSpeak } from "./speak.js";
import { resolveConfig } from "../config.js";

interface HookInput {
  hook_event_name?: string;
  stop_hook_active?: boolean;
  transcript_path?: string;
  last_assistant_message?: string;
  // Notification hook fields
  message?: string;
  notification_type?: string;
}

interface TranscriptEntry {
  type: string;
  message?: {
    role: string;
    content: string | Array<{ type: string; text?: string }>;
  };
}

function readStdin(): Promise<string> {
  // TTY から直接実行された場合はハングを防ぐため空 JSON を即時返す
  if (process.stdin.isTTY) {
    return Promise.resolve("{}");
  }
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => { resolve(data); });
  });
}

async function extractFromTranscript(transcriptPath: string, chars: number): Promise<string | null> {
  try {
    const raw = await readFile(transcriptPath, "utf-8");
    const entries = raw
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => { try { return JSON.parse(line) as TranscriptEntry; } catch { return null; } })
      .filter((e): e is TranscriptEntry => e !== null && e.type === "assistant" && e.message != null);
    if (entries.length > 0) {
      const last = entries[entries.length - 1];
      let content = last.message!.content;
      if (Array.isArray(content)) {
        content = content
          .filter((c) => c.type === "text")
          .map((c) => c.text ?? "")
          .join(" ");
      }
      if (typeof content === "string" && content.trim()) {
        return content.slice(0, chars);
      }
    }
  } catch {
    // transcript が読めない場合は null を返す
  }
  return null;
}

export async function runSpeakHooks(options: {
  host: string;
  port: number;
  speaker?: number;
  speed?: number;
  chars: number;
  fallback: string;
}): Promise<void> {
  const input = await readStdin();

  let hookData: HookInput = {};
  try {
    hookData = JSON.parse(input);
  } catch {
    // JSON でなければ空オブジェクトとして扱う
  }

  // stop_hook_active が true の場合はスキップ（無限ループ防止）
  if (hookData.stop_hook_active) {
    process.exit(0);
  }

  const { speaker, speed } = await resolveConfig({
    cliSpeaker: options.speaker,
    cliSpeed: options.speed,
  });

  const chars = Number.isFinite(options.chars) && options.chars > 0 ? options.chars : 100;
  const eventName = hookData.hook_event_name;
  let text = options.fallback;

  if (eventName === "Notification") {
    // Notification hook: message フィールドを直接使用
    if (hookData.message?.trim()) {
      text = hookData.message.slice(0, chars);
    }
  } else {
    // Stop / SubagentStop: last_assistant_message を優先、なければ transcript を解析
    if (hookData.last_assistant_message?.trim()) {
      text = hookData.last_assistant_message.slice(0, chars);
    } else if (hookData.transcript_path) {
      const extracted = await extractFromTranscript(hookData.transcript_path, chars);
      if (extracted) text = extracted;
    }
  }

  await runSpeak(text, options.host, options.port, speaker, speed);
}
