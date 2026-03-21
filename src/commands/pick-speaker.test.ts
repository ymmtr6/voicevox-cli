import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  pickRandom,
  defaultPoolFromSpeakers,
  buildNameMap,
} from "./pick-speaker.js";
import type { Speaker } from "../voicevox/types.js";

// エクスポートされていない関数をテストするために再エクスポートが必要
// まずはモック設定
vi.mock("../config.js", () => ({
  readConfig: vi.fn().mockResolvedValue({}),
}));

vi.mock("../voicevox/client.js", () => ({
  VoiceVoxClient: vi.fn().mockImplementation(() => ({
    getSpeakers: vi.fn().mockResolvedValue([]),
  })),
}));

// pick-speaker.ts から内部関数をエクスポートする必要があるため、
// ここでは公開されている関数のテストに集中する

describe("pick-speaker internal functions", () => {
  describe("pickRandom", () => {
    it("returns an element from the pool", () => {
      const pool = [1, 2, 3, 4, 5];
      const result = pickRandom(pool);
      expect(pool).toContain(result);
    });

    it("returns the only element when pool has one item", () => {
      expect(pickRandom([42])).toBe(42);
    });

    it("handles various distributions over multiple calls", () => {
      const pool = [1, 2, 3];
      const results = new Set();
      for (let i = 0; i < 100; i++) {
        results.add(pickRandom(pool));
      }
      // 100回実行して3つとも選ばれる可能性が高い
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe("defaultPoolFromSpeakers", () => {
    it("picks normal style when available", () => {
      const speakers: Speaker[] = [
        {
          name: "ずんだもん",
          speaker_uuid: "uuid-1",
          version: "0.0.1",
          styles: [
            { name: "あまあま", id: 1 },
            { name: "ノーマル", id: 2 },
            { name: "セクシー", id: 3 },
          ],
        },
      ];
      expect(defaultPoolFromSpeakers(speakers)).toEqual([2]);
    });

    it("picks first style when normal is not available", () => {
      const speakers: Speaker[] = [
        {
          name: "四国めたん",
          speaker_uuid: "uuid-2",
          version: "0.0.1",
          styles: [
            { name: "あまあま", id: 0 },
            { name: "クール", id: 2 },
          ],
        },
      ];
      expect(defaultPoolFromSpeakers(speakers)).toEqual([0]);
    });

    it("handles multiple speakers", () => {
      const speakers: Speaker[] = [
        {
          name: "ずんだもん",
          speaker_uuid: "uuid-1",
          version: "0.0.1",
          styles: [{ name: "ノーマル", id: 3 }],
        },
        {
          name: "四国めたん",
          speaker_uuid: "uuid-2",
          version: "0.0.1",
          styles: [{ name: "あまあま", id: 0 }],
        },
      ];
      expect(defaultPoolFromSpeakers(speakers)).toEqual([3, 0]);
    });

    it("returns empty array for speakers without styles", () => {
      const speakers: Speaker[] = [
        {
          name: "テスト",
          speaker_uuid: "uuid-3",
          version: "0.0.1",
          styles: [],
        },
      ];
      expect(defaultPoolFromSpeakers(speakers)).toEqual([]);
    });
  });

  describe("buildNameMap", () => {
    it("builds map of style id to full name", () => {
      const speakers: Speaker[] = [
        {
          name: "ずんだもん",
          speaker_uuid: "uuid-1",
          version: "0.0.1",
          styles: [
            { name: "ノーマル", id: 3 },
            { name: "あまあま", id: 1 },
          ],
        },
      ];
      const map = buildNameMap(speakers);
      expect(map.get(3)).toBe("ずんだもん（ノーマル）");
      expect(map.get(1)).toBe("ずんだもん（あまあま）");
    });

    it("handles multiple speakers", () => {
      const speakers: Speaker[] = [
        {
          name: "ずんだもん",
          speaker_uuid: "uuid-1",
          version: "0.0.1",
          styles: [{ name: "ノーマル", id: 3 }],
        },
        {
          name: "四国めたん",
          speaker_uuid: "uuid-2",
          version: "0.0.1",
          styles: [{ name: "ノーマル", id: 2 }],
        },
      ];
      const map = buildNameMap(speakers);
      expect(map.size).toBe(2);
      expect(map.get(3)).toBe("ずんだもん（ノーマル）");
      expect(map.get(2)).toBe("四国めたん（ノーマル）");
    });
  });
});
