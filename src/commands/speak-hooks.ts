import { readFile } from "fs/promises";
import { runSpeak } from "./speak.js";
import { resolveConfig } from "../config.js";

interface HookInput {
  stop_hook_active?: boolean;
  transcript_path?: string;
}

interface TranscriptMessage {
  role: string;
  content: string | Array<{ type: string; text?: string }>;
}

interface Transcript {
  messages?: TranscriptMessage[];
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => { resolve(data); });
  });
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

  let text = options.fallback;

  if (hookData.transcript_path) {
    try {
      const raw = await readFile(hookData.transcript_path, "utf-8");
      const transcript: Transcript = JSON.parse(raw);
      const messages = (transcript.messages ?? []).filter(
        (m) => m.role === "assistant"
      );
      if (messages.length > 0) {
        const last = messages[messages.length - 1];
        let content = last.content;
        if (Array.isArray(content)) {
          content = content
            .filter((c) => c.type === "text")
            .map((c) => c.text ?? "")
            .join(" ");
        }
        if (typeof content === "string" && content.trim()) {
          text = content.slice(0, options.chars);
        }
      }
    } catch {
      // transcript が読めない場合はフォールバックメッセージを使用
    }
  }

  await runSpeak(text, options.host, options.port, speaker, speed);
}
