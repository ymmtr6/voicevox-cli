import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VoiceVoxClient } from "./client.js";

// Mock fetch (stubbed in beforeEach)
const mockFetch = vi.fn();

describe("VoiceVoxClient", () => {
  let client: VoiceVoxClient;

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    client = new VoiceVoxClient({ host: "localhost", port: 50021 });
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("creates client with default options", () => {
      const c = new VoiceVoxClient({ host: "localhost", port: 50021 });
      expect(c).toBeDefined();
    });

    it("accepts custom timeout settings", () => {
      const c = new VoiceVoxClient({
        host: "localhost",
        port: 50021,
        timeoutMs: 60000,
        retryCount: 3,
        retryDelayMs: 2000,
      });
      expect(c).toBeDefined();
    });
  });

  describe("getVersion", () => {
    it("returns version string on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => "0.25.1",
      });

      const version = await client.getVersion();
      expect(version).toBe("0.25.1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:50021/version",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it("throws error on HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(client.getVersion()).rejects.toThrow("HTTP 500");
    });
  });

  describe("getSpeakers", () => {
    it("returns speakers array on success", async () => {
      const mockSpeakers = [
        {
          name: "四国めたん",
          speaker_uuid: "uuid-1",
          styles: [{ name: "ノーマル", id: 1 }],
          version: "0.0.1",
        },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSpeakers,
      });

      const speakers = await client.getSpeakers();
      expect(speakers).toEqual(mockSpeakers);
    });

    it("throws error on HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(client.getSpeakers()).rejects.toThrow("HTTP 404");
    });
  });

  describe("createAudioQuery", () => {
    it("creates audio query with correct parameters", async () => {
      const mockQuery = {
        accent_phrases: [],
        speedScale: 1.0,
        pitchScale: 0.0,
        intonationScale: 1.0,
        volumeScale: 1.0,
        prePhonemeLength: 0.1,
        postPhonemeLength: 0.1,
        outputSamplingRate: 24000,
        outputStereo: false,
        kana: "",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuery,
      });

      const query = await client.createAudioQuery("テスト", 1);
      expect(query).toEqual(mockQuery);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:50021/audio_query?text=%E3%83%86%E3%82%B9%E3%83%88&speaker=1",
        expect.objectContaining({
          method: "POST",
          signal: expect.any(AbortSignal),
        })
      );
    });
  });

  describe("synthesis", () => {
    it("returns buffer on success", async () => {
      const mockBuffer = new ArrayBuffer(8);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockBuffer,
      });

      const query = {
        accent_phrases: [],
        speedScale: 1.0,
        pitchScale: 0.0,
        intonationScale: 1.0,
        volumeScale: 1.0,
        prePhonemeLength: 0.1,
        postPhonemeLength: 0.1,
        outputSamplingRate: 24000,
        outputStereo: false,
        kana: "",
      };

      const result = await client.synthesis(query, 1);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe("retry behavior", () => {
    it("retries on network error when retryCount > 0", async () => {
      const retryClient = new VoiceVoxClient({
        host: "localhost",
        port: 50021,
        retryCount: 2,
        retryDelayMs: 10, // Short delay for tests
      });

      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => "0.25.1",
        });

      const version = await retryClient.getVersion();
      expect(version).toBe("0.25.1");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("throws after all retries exhausted", async () => {
      const retryClient = new VoiceVoxClient({
        host: "localhost",
        port: 50021,
        retryCount: 1,
        retryDelayMs: 10,
      });

      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(retryClient.getVersion()).rejects.toThrow("Network error");
      expect(mockFetch).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
    });

    it("does not retry on HTTP error (only network errors)", async () => {
      const retryClient = new VoiceVoxClient({
        host: "localhost",
        port: 50021,
        retryCount: 2,
        retryDelayMs: 10,
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(retryClient.getVersion()).rejects.toThrow("HTTP 500");
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retry on HTTP error
    });
  });
});
