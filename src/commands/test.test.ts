import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGetVersion = vi.fn();

vi.mock("../voicevox/client.js", () => ({
  VoiceVoxClient: class MockVoiceVoxClient {
    getVersion = mockGetVersion;
  },
}));

describe("test command", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    // モック後にインポート
    await import("./test.js");
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("outputs success result with version", async () => {
    const { runTest } = await import("./test.js");
    mockGetVersion.mockResolvedValue("0.25.1");

    await runTest("localhost", 50021);

    expect(consoleSpy).toHaveBeenCalledWith(
      JSON.stringify(
        {
          status: "ok",
          host: "localhost",
          port: 50021,
          version: "0.25.1",
        },
        null,
        2
      )
    );
  });

  it("outputs error result on connection failure", async () => {
    const { runTest } = await import("./test.js");
    mockGetVersion.mockRejectedValue(new Error("fetch failed"));

    await expect(runTest("localhost", 50021)).rejects.toThrow("process.exit");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"status": "error"')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("fetch failed")
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("uses custom host and port", async () => {
    const { runTest } = await import("./test.js");
    mockGetVersion.mockResolvedValue("0.25.1");

    await runTest("192.168.1.1", 50022);

    expect(consoleSpy).toHaveBeenCalledWith(
      JSON.stringify(
        {
          status: "ok",
          host: "192.168.1.1",
          port: 50022,
          version: "0.25.1",
        },
        null,
        2
      )
    );
  });
});
