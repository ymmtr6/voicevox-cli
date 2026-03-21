import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockSpeak = vi.fn();
const mockGetSpeakers = vi.fn();

vi.mock("../voicevox/client.js", () => ({
  VoiceVoxClient: class MockVoiceVoxClient {
    speak = mockSpeak;
    getSpeakers = mockGetSpeakers;
  },
}));

vi.mock("../config.js", () => ({
  writeSpeakersCache: vi.fn(),
}));

describe("speak command", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    // モック後にインポート
    await import("./speak.js");
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    exitSpy.mockRestore();
  });

  describe("runSpeak", () => {
    it("outputs success result on successful speak", async () => {
      const { runSpeak } = await import("./speak.js");
      mockSpeak.mockResolvedValue(undefined);

      await runSpeak("テスト", "localhost", 50021, 1, 1.3);

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify(
          {
            status: "ok",
            speaker: 1,
            speed: 1.3,
            text: "テスト",
          },
          null,
          2
        )
      );
    });

    it("outputs error result on failure", async () => {
      const { runSpeak } = await import("./speak.js");
      mockSpeak.mockRejectedValue(new Error("Connection failed"));

      await expect(
        runSpeak("テスト", "localhost", 50021, 1, 1.3)
      ).rejects.toThrow("process.exit");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"status": "error"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Connection failed")
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("runSpeakers", () => {
    it("outputs speakers list and updates cache", async () => {
      const { runSpeakers } = await import("./speak.js");
      const { writeSpeakersCache } = await import("../config.js");

      const mockSpeakers = [
        {
          name: "ずんだもん",
          speaker_uuid: "uuid-1",
          styles: [
            { name: "ノーマル", id: 3 },
            { name: "あまあま", id: 1 },
          ],
        },
      ];

      mockGetSpeakers.mockResolvedValue(mockSpeakers);

      await runSpeakers("localhost", 50021);

      expect(writeSpeakersCache).toHaveBeenCalledWith([
        { id: 3, name: "ずんだもん（ノーマル）" },
        { id: 1, name: "ずんだもん（あまあま）" },
      ]);

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify(
          {
            status: "ok",
            speakers: mockSpeakers,
          },
          null,
          2
        )
      );
    });

    it("outputs error on failure", async () => {
      const { runSpeakers } = await import("./speak.js");
      mockGetSpeakers.mockRejectedValue(new Error("Network error"));

      await expect(runSpeakers("localhost", 50021)).rejects.toThrow(
        "process.exit"
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"status": "error"')
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
