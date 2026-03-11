import { appendFile, mkdir } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { runSpeak } from "./speak.js";
import { resolveConfig } from "../config.js";

const NOTIFICATION_LOG = join(homedir(), ".config", "voicevox-cli", "notification-log.jsonl");

interface HookInput {
  hook_event_name?: string;
  stop_hook_active?: boolean;
  transcript_path?: string;
  last_assistant_message?: string;
  "last-assistant-message"?: string;
  type?: string;
  // Notification hook fields
  message?: string;
  notification_type?: string;
  // UserPromptSubmit fields
  user_message?: string;
  // PreToolUse / PostToolUse / PostToolUseFailure fields
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_result?: unknown;
  error_message?: string;
  // SubagentStart / SubagentStop fields
  agent_type?: string;
  agent_description?: string;
  // TaskCompleted fields
  task_id?: string;
  task_description?: string;
  // WorktreeCreate / WorktreeRemove fields
  worktree_path?: string;
  worktree_name?: string;
  // PermissionRequest fields
  permission_type?: string;
  requested_tool?: string;
  // ConfigChange fields
  config_file?: string;
  // TeammateIdle fields
  teammate_name?: string;
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

export function firstLine(text: string): string {
  return text.split("\n").find((line) => line.trim()) ?? text;
}

/** Notification メッセージを JSONL ログに追記して実際のパターンを収集する (VOICEVOX_DEBUG=1 時のみ) */
async function collectNotificationMessage(hookData: HookInput): Promise<void> {
  if (process.env.VOICEVOX_DEBUG !== "1") return;
  if (hookData.hook_event_name !== "Notification" || !hookData.message?.trim()) return;
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    notification_type: hookData.notification_type ?? null,
    message: hookData.message,
  });
  try {
    await mkdir(join(homedir(), ".config", "voicevox-cli"), { recursive: true });
    await appendFile(NOTIFICATION_LOG, entry + "\n", "utf-8");
  } catch {
    // ログ失敗はサイレントに無視
  }
}

export function translateNotificationMessage(message: string, notificationType?: string): string {
  // permission_prompt: "Claude needs your permission to use {Tool}"
  if (notificationType === "permission_prompt") {
    const toolMatch = message.match(/permission to use (.+)$/i);
    const tool = toolMatch?.[1] ?? "ツール";
    return `クロードが ${tool} 権限を要求しています`;
  }

  // idle_prompt: "Claude is waiting for your input"
  if (notificationType === "idle_prompt") {
    return "入力を待っています";
  }

  // auth_success
  if (notificationType === "auth_success") {
    return "認証が完了しました";
  }

  return message;
}

export function transformUrls(text: string): string {
  // https://github.com/foo/bar → URL: github.com
  return text.replace(/https?:\/\/([^/\s]+)[^\s]*/g, "URL: $1");
}

/** 各Hookイベントに対応する読み上げテキストを生成 */
function getTextForHookEvent(eventName: string | undefined, hookData: HookInput, fallback: string): string {
  if (!eventName) {
    return fallback;
  }

  switch (eventName) {
    case "Notification":
      if (hookData.message?.trim()) {
        return translateNotificationMessage(
          firstLine(hookData.message),
          hookData.notification_type
        );
      }
      return "通知がありました";

    case "Stop":
    case "SubagentStop":
      if (hookData.last_assistant_message?.trim()) {
        return "タスクが完了しました。" + firstLine(hookData.last_assistant_message);
      }
      return "タスクが完了しました。";

    case "SessionStart":
      return "セッションを開始しました";

    case "SessionEnd":
      return "セッションを終了します";

    case "UserPromptSubmit":
      if (hookData.user_message?.trim()) {
        return "受信: " + firstLine(hookData.user_message);
      }
      return "メッセージを受信しました";

    case "PreToolUse":
      if (hookData.tool_name) {
        return `${hookData.tool_name}を実行します`;
      }
      return "ツールを実行します";

    case "PostToolUse":
      // 成功時は静かに（ノイズ削減）
      return "";

    case "PostToolUseFailure":
      if (hookData.tool_name && hookData.error_message) {
        return `${hookData.tool_name}でエラーが発生しました。${firstLine(hookData.error_message)}`;
      }
      if (hookData.tool_name) {
        return `${hookData.tool_name}でエラーが発生しました`;
      }
      return "ツールの実行に失敗しました";

    case "PermissionRequest":
      if (hookData.requested_tool) {
        return `${hookData.requested_tool}の権限を要求しています`;
      }
      return "権限を要求しています";

    case "SubagentStart":
      if (hookData.agent_description) {
        return `サブエージェントを起動: ${firstLine(hookData.agent_description)}`;
      }
      if (hookData.agent_type) {
        return `${hookData.agent_type}エージェントを起動します`;
      }
      return "サブエージェントを起動します";

    case "TeammateIdle":
      if (hookData.teammate_name) {
        return `${hookData.teammate_name}が待機中です`;
      }
      return "チームメイトが待機中です";

    case "TaskCompleted":
      if (hookData.task_description) {
        return `タスク完了: ${firstLine(hookData.task_description)}`;
      }
      return "タスクが完了しました";

    case "ConfigChange":
      if (hookData.config_file) {
        return `設定を変更しました: ${hookData.config_file}`;
      }
      return "設定を変更しました";

    case "WorktreeCreate":
      if (hookData.worktree_name) {
        return `ワークツリーを作成しました: ${hookData.worktree_name}`;
      }
      return "ワークツリーを作成しました";

    case "WorktreeRemove":
      if (hookData.worktree_name) {
        return `ワークツリーを削除しました: ${hookData.worktree_name}`;
      }
      return "ワークツリーを削除しました";

    case "PreCompact":
      return "コンテキストを圧縮します";

    default:
      return fallback;
  }
}


export async function runSpeakHooks(options: {
  host: string;
  port: number;
  speaker?: number;
  speed?: number;
  timeoutMs?: number;
  retryCount?: number;
  retryDelayMs?: number;
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

  const { speaker, speed, timeoutMs, retryCount, retryDelayMs } = await resolveConfig({
    cliSpeaker: options.speaker,
    cliSpeed: options.speed,
    cliTimeoutMs: options.timeoutMs,
    cliRetryCount: options.retryCount,
    cliRetryDelayMs: options.retryDelayMs,
  });

  const eventName = hookData.hook_event_name;

  // Notification hook: ログ収集
  if (eventName === "Notification") {
    void collectNotificationMessage(hookData);
  }

  let text: string;

  if (hookData.type === "agent-turn-complete") {
    // Codex notify: last-assistant-message (kebab-case)
    const codexMessage = hookData["last-assistant-message"];
    if (codexMessage?.trim()) {
      text = firstLine(codexMessage);
    } else {
      text = options.fallback;
    }
  } else {
    text = getTextForHookEvent(eventName, hookData, options.fallback);
  }

  // 空文字の場合は読み上げをスキップ（ノイズ削減）
  if (!text.trim()) {
    return;
  }

  await runSpeak(transformUrls(text), options.host, options.port, speaker, speed, timeoutMs, retryCount, retryDelayMs);
}
