import { readFile } from "fs/promises";
import { runSpeak } from "./speak.js";
import { resolveConfig } from "../config.js";

interface HookInput {
  stop_hook_active?: boolean;
  transcript_path?: string;
  last_assistant_message?: string;
  "last-assistant-message"?: string;
  type?: string;
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

function firstLine(text: string): string {
  return text.split("\n").find((line) => line.trim()) ?? text;
}

export async function runSpeakHooks(options: {
  host: string;
  port: number;
  speaker?: number;
  speed?: number;
  fallback: string;
  payload?: string;
}): Promise<void> {
  // Codex は JSON をコマンドライン引数で渡す。Claude Code は stdin で渡す。
  const input = options.payload ?? await readStdin();

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

  // 1. last_assistant_message (Claude Code Notification hook / snake_case)
  // 2. last-assistant-message (Codex notify / kebab-case)
  const directMessage = hookData.last_assistant_message ?? hookData["last-assistant-message"];
  if (directMessage && directMessage.trim()) {
    text = firstLine(directMessage);
  } else if (hookData.transcript_path) {
    try {
      const raw = await readFile(hookData.transcript_path, "utf-8");
      // Claude Code のトランスクリプトは JSONL 形式（1行1JSON）
      // 各行は { type: "assistant", message: { role, content } } の構造
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
            .join("\n");
        }
        if (typeof content === "string" && content.trim()) {
          text = firstLine(content);
        }
      }
    } catch {
      // transcript が読めない場合はフォールバックメッセージを使用
    }
  }

  await runSpeak(text, options.host, options.port, speaker, speed);
}
