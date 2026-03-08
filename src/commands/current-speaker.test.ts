import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveSpeakerName } from "./current-speaker.js";
import * as config from "../config.js";

// Mock dependencies - use importActual to preserve other exports
vi.mock("../config.js", async () => {
  const actual = await vi.importActual<typeof import("../config.js")>("../config.js");
  return {
    ...actual,
    readSpeakersCache: vi.fn(),
    writeSpeakersCache: vi.fn(),
  };
});

vi.mock("../voicevox/client.js", () => ({
  VoiceVoxClient: vi.fn(),
}));

const mockReadSpeakersCache = vi.mocked(config.readSpeakersCache);

describe("resolveSpeakerName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns name from cache when available", async () => {
    mockReadSpeakersCache.mockResolvedValueOnce({
      timestamp: Date.now(),
      speakers: [
        { id: 1, name: "四国めたん（ノーマル）" },
        { id: 2, name: "四国めたん（あまあま）" },
      ],
    });

    const name = await resolveSpeakerName(1, "localhost", 50021);
    expect(name).toBe("四国めたん（ノーマル）");
  });

  it("returns undefined when speaker ID not in cache", async () => {
    mockReadSpeakersCache.mockResolvedValueOnce({
      timestamp: Date.now(),
      speakers: [{ id: 1, name: "四国めたん（ノーマル）" }],
    });

    const name = await resolveSpeakerName(999, "localhost", 50021);
    expect(name).toBeUndefined();
  });

  it("returns undefined when cache is null and API fails", async () => {
    mockReadSpeakersCache.mockResolvedValueOnce(null);

    // VoiceVoxClient mock throws on construction or getSpeakers
    const { VoiceVoxClient } = await import("../voicevox/client.js");
    vi.mocked(VoiceVoxClient).mockImplementationOnce(() => {
      throw new Error("Connection refused");
    });

    const name = await resolveSpeakerName(1, "localhost", 50021);
    expect(name).toBeUndefined();
  });
});
