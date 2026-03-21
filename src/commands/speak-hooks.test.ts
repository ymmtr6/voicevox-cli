import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  firstLine,
  transformUrls,
  translateNotificationMessage,
  runSpeakHooks,
} from "./speak-hooks.js";

vi.mock("./speak.js", () => ({
  runSpeak: vi.fn(),
}));

vi.mock("../config.js", () => ({
  resolveConfig: vi.fn().mockResolvedValue({
    speaker: 1,
    speed: 1.3,
    timeoutMs: 5000,
    retryCount: 3,
    retryDelayMs: 1000,
  }),
}));

describe("firstLine", () => {
  it("returns first non-empty line", () => {
    expect(firstLine("hello\nworld")).toBe("hello");
  });

  it("skips leading empty lines", () => {
    expect(firstLine("\n\nhello\nworld")).toBe("hello");
  });

  it("returns original text when no newlines", () => {
    expect(firstLine("hello")).toBe("hello");
  });

  it("returns original text when all lines are empty", () => {
    expect(firstLine("\n\n")).toBe("\n\n");
  });

  it("handles empty string", () => {
    expect(firstLine("")).toBe("");
  });

  it("handles lines with only whitespace", () => {
    expect(firstLine("  \n  \nhello")).toBe("hello");
  });
});

describe("transformUrls", () => {
  it("transforms https URL to short format", () => {
    expect(transformUrls("Visit https://github.com/foo/bar")).toBe(
      "Visit URL: github.com"
    );
  });

  it("transforms http URL to short format", () => {
    expect(transformUrls("See http://example.com/path")).toBe(
      "See URL: example.com"
    );
  });

  it("handles multiple URLs", () => {
    expect(
      transformUrls("Check https://github.com and https://npmjs.com/pkg")
    ).toBe("Check URL: github.com and URL: npmjs.com");
  });

  it("preserves text without URLs", () => {
    expect(transformUrls("No URLs here")).toBe("No URLs here");
  });

  it("handles URL with port", () => {
    expect(transformUrls("API at http://localhost:3000/api")).toBe(
      "API at URL: localhost:3000"
    );
  });

  it("handles URL without path", () => {
    expect(transformUrls("Go to https://example.com")).toBe(
      "Go to URL: example.com"
    );
  });
});

describe("translateNotificationMessage", () => {
  describe("permission_prompt", () => {
    it("translates permission request message", () => {
      expect(
        translateNotificationMessage(
          "Claude needs your permission to use Bash",
          "permission_prompt"
        )
      ).toBe("クロードが Bash 権限を要求しています");
    });

    it("uses default tool name when pattern doesn't match", () => {
      expect(
        translateNotificationMessage("Some message", "permission_prompt")
      ).toBe("クロードが ツール 権限を要求しています");
    });
  });

  describe("idle_prompt", () => {
    it("translates idle prompt message", () => {
      expect(
        translateNotificationMessage(
          "Claude is waiting for your input",
          "idle_prompt"
        )
      ).toBe("入力を待っています");
    });
  });

  describe("auth_success", () => {
    it("translates auth success message", () => {
      expect(
        translateNotificationMessage("Authenticated!", "auth_success")
      ).toBe("認証が完了しました");
    });
  });

  describe("unknown type", () => {
    it("returns original message for unknown notification type", () => {
      expect(
        translateNotificationMessage("Some message", "unknown_type")
      ).toBe("Some message");
    });

    it("returns original message when notification type is undefined", () => {
      expect(translateNotificationMessage("Some message")).toBe("Some message");
    });
  });
});

describe("runSpeakHooks", () => {
  const baseOptions = {
    host: "localhost",
    port: 50021,
    fallback: "フォールバック",
  };

  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  describe("Stop/SubagentStop", () => {
    it("prefixes last_assistant_message with タスクが完了しました。", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({
        hook_event_name: "Stop",
        last_assistant_message: "ファイルを修正しました",
      });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "タスクが完了しました。ファイルを修正しました",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });

    it("uses fixed message when last_assistant_message is absent", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({ hook_event_name: "Stop" });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "タスクが完了しました。",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });

    it("uses firstLine of multi-line last_assistant_message", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({
        hook_event_name: "SubagentStop",
        last_assistant_message: "1行目\n2行目\n3行目",
      });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "タスクが完了しました。1行目",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });
  });

  describe("Notification", () => {
    it("translates permission_prompt message", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({
        hook_event_name: "Notification",
        notification_type: "permission_prompt",
        message: "Claude needs your permission to use Bash",
      });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "クロードが Bash 権限を要求しています",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });

    it("uses default message when notification has no message", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({
        hook_event_name: "Notification",
      });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "通知がありました",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });
  });

  describe("SessionStart/SessionEnd", () => {
    it("speaks session start message", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({ hook_event_name: "SessionStart" });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "セッションを開始しました",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });

    it("speaks session end message", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({ hook_event_name: "SessionEnd" });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "セッションを終了します",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });
  });

  describe("UserPromptSubmit", () => {
    it("speaks received prompt", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({
        hook_event_name: "UserPromptSubmit",
        prompt: "ファイルを修正して",
      });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "受信: ファイルを修正して",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });

    it("uses default message when prompt is empty", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({ hook_event_name: "UserPromptSubmit" });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "メッセージを受信しました",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });
  });

  describe("PreToolUse", () => {
    it("speaks tool execution", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({
        hook_event_name: "PreToolUse",
        tool_name: "Read",
      });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "Readを実行します",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });

    it("uses default message when tool_name is absent", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({ hook_event_name: "PreToolUse" });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "ツールを実行します",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });
  });

  describe("PostToolUse", () => {
    it("skips speaking on success (returns empty string)", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({
        hook_event_name: "PostToolUse",
        tool_name: "Read",
      });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).not.toHaveBeenCalled();
    });
  });

  describe("PostToolUseFailure", () => {
    it("speaks error with tool name and message", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({
        hook_event_name: "PostToolUseFailure",
        tool_name: "Bash",
        error_message: "Command not found",
      });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "Bashでエラーが発生しました。Command not found",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });

    it("speaks error with tool name only", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({
        hook_event_name: "PostToolUseFailure",
        tool_name: "Bash",
      });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "Bashでエラーが発生しました",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });

    it("uses default message when no tool info", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({ hook_event_name: "PostToolUseFailure" });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "ツールの実行に失敗しました",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });
  });

  describe("PermissionRequest", () => {
    it("speaks permission request with tool name", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({
        hook_event_name: "PermissionRequest",
        requested_tool: "Bash",
      });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "Bashの権限を要求しています",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });

    it("uses default message when no tool info", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({ hook_event_name: "PermissionRequest" });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "権限を要求しています",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });
  });

  describe("SubagentStart", () => {
    it("speaks subagent start with description", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({
        hook_event_name: "SubagentStart",
        agent_description: "ファイルを検索",
      });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "サブエージェントを起動: ファイルを検索",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });

    it("speaks subagent start with agent type", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({
        hook_event_name: "SubagentStart",
        agent_type: "Explore",
      });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "Exploreエージェントを起動します",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });

    it("uses default message when no info", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({ hook_event_name: "SubagentStart" });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "サブエージェントを起動します",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });
  });

  describe("TeammateIdle", () => {
    it("speaks teammate idle with name", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({
        hook_event_name: "TeammateIdle",
        teammate_name: "Claude",
      });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "Claudeが待機中です",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });

    it("uses default message when no name", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({ hook_event_name: "TeammateIdle" });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "チームメイトが待機中です",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });
  });

  describe("TaskCompleted", () => {
    it("speaks task completion with description", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({
        hook_event_name: "TaskCompleted",
        task_description: "テストを実行",
      });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "タスク完了: テストを実行",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });

    it("uses default message when no description", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({ hook_event_name: "TaskCompleted" });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "タスクが完了しました",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });
  });

  describe("ConfigChange", () => {
    it("speaks config change with file", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({
        hook_event_name: "ConfigChange",
        config_file: "settings.json",
      });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "設定を変更しました: settings.json",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });

    it("uses default message when no file", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({ hook_event_name: "ConfigChange" });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "設定を変更しました",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });
  });

  describe("WorktreeCreate/WorktreeRemove", () => {
    it("speaks worktree creation with name", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({
        hook_event_name: "WorktreeCreate",
        worktree_name: "feature-branch",
      });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "ワークツリーを作成しました: feature-branch",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });

    it("speaks worktree removal with name", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({
        hook_event_name: "WorktreeRemove",
        worktree_name: "feature-branch",
      });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "ワークツリーを削除しました: feature-branch",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });

    it("uses default message when no name", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({ hook_event_name: "WorktreeCreate" });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "ワークツリーを作成しました",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });
  });

  describe("PreCompact", () => {
    it("speaks compact message", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({ hook_event_name: "PreCompact" });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "コンテキストを圧縮します",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });
  });

  describe("Codex CLI (agent-turn-complete)", () => {
    it("speaks last-assistant-message from Codex", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({
        type: "agent-turn-complete",
        "last-assistant-message": "タスクを完了しました",
      });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "タスクを完了しました",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });

    it("uses fallback when Codex message is empty", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({
        type: "agent-turn-complete",
      });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "フォールバック",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });
  });

  describe("stop_hook_active", () => {
    it("exits immediately when stop_hook_active is true", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({
        hook_event_name: "Stop",
        stop_hook_active: true,
        last_assistant_message: "このメッセージは読み上げられない",
      });
      await expect(runSpeakHooks({ ...baseOptions, payload })).rejects.toThrow("process.exit");
      expect(runSpeak).not.toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe("unknown event", () => {
    it("uses fallback for unknown event", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({ hook_event_name: "UnknownEvent" });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "フォールバック",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });

    it("uses fallback when no event name", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({});
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "フォールバック",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });
  });

  describe("URL transformation", () => {
    it("transforms URLs in messages", async () => {
      const { runSpeak } = await import("./speak.js");
      const payload = JSON.stringify({
        hook_event_name: "Stop",
        last_assistant_message: "https://github.com/foo/bar を参照",
      });
      await runSpeakHooks({ ...baseOptions, payload });
      expect(runSpeak).toHaveBeenCalledWith(
        "タスクが完了しました。URL: github.com を参照",
        "localhost", 50021, 1, 1.3, 5000, 3, 1000,
      );
    });
  });
});
