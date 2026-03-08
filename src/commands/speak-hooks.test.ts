import { describe, it, expect, vi, beforeEach } from "vitest";
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

describe("runSpeakHooks (Stop/SubagentStop)", () => {
  const baseOptions = {
    host: "localhost",
    port: 50021,
    fallback: "フォールバック",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

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
