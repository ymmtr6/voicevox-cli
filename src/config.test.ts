import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  validateNonNegativeMs,
  validateRetryCount,
  validateFinite,
  resolveConfig,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_RETRY_COUNT,
  DEFAULT_RETRY_DELAY_MS,
} from "./config.js";

describe("validateNonNegativeMs", () => {
  it("returns default value when input is undefined", () => {
    expect(validateNonNegativeMs(undefined, 1000)).toBe(1000);
  });

  it("returns input value when valid", () => {
    expect(validateNonNegativeMs(5000, 1000)).toBe(5000);
  });

  it("returns default value when input is NaN", () => {
    expect(validateNonNegativeMs(NaN, 1000)).toBe(1000);
  });

  it("returns default value when input is negative", () => {
    expect(validateNonNegativeMs(-100, 1000)).toBe(1000);
  });

  it("returns default value when input is Infinity", () => {
    expect(validateNonNegativeMs(Infinity, 1000)).toBe(1000);
    expect(validateNonNegativeMs(-Infinity, 1000)).toBe(1000);
  });

  it("accepts zero as valid value", () => {
    expect(validateNonNegativeMs(0, 1000)).toBe(0);
  });

  it("accepts decimal values", () => {
    expect(validateNonNegativeMs(1.5, 1000)).toBe(1.5);
  });
});

describe("validateRetryCount", () => {
  it("returns default value when input is undefined", () => {
    expect(validateRetryCount(undefined, 0)).toBe(0);
  });

  it("returns input value when valid", () => {
    expect(validateRetryCount(3, 0)).toBe(3);
  });

  it("returns default value when input is NaN", () => {
    expect(validateRetryCount(NaN, 0)).toBe(0);
  });

  it("returns default value when input is negative", () => {
    expect(validateRetryCount(-1, 0)).toBe(0);
  });

  it("returns default value when input is Infinity", () => {
    expect(validateRetryCount(Infinity, 0)).toBe(0);
  });

  it("accepts zero as valid value", () => {
    expect(validateRetryCount(0, 1)).toBe(0);
  });

  it("floors decimal values", () => {
    expect(validateRetryCount(2.9, 0)).toBe(2);
    expect(validateRetryCount(2.1, 0)).toBe(2);
  });
});

describe("default values", () => {
  it("has correct DEFAULT_TIMEOUT_MS", () => {
    expect(DEFAULT_TIMEOUT_MS).toBe(30000);
  });

  it("has correct DEFAULT_RETRY_COUNT", () => {
    expect(DEFAULT_RETRY_COUNT).toBe(0);
  });

  it("has correct DEFAULT_RETRY_DELAY_MS", () => {
    expect(DEFAULT_RETRY_DELAY_MS).toBe(1000);
  });
});

describe("validateFinite", () => {
  it("returns default value when input is undefined", () => {
    expect(validateFinite(undefined, 42)).toBe(42);
  });

  it("returns input value when valid", () => {
    expect(validateFinite(100, 42)).toBe(100);
  });

  it("returns default value when input is NaN", () => {
    expect(validateFinite(NaN, 42)).toBe(42);
  });

  it("returns default value when input is Infinity", () => {
    expect(validateFinite(Infinity, 42)).toBe(42);
    expect(validateFinite(-Infinity, 42)).toBe(42);
  });

  it("accepts negative values", () => {
    expect(validateFinite(-10, 42)).toBe(-10);
  });

  it("accepts decimal values", () => {
    expect(validateFinite(1.5, 42)).toBe(1.5);
  });
});

describe("resolveConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("speaker priority", () => {
    it("uses CLI speaker when provided", async () => {
      process.env.VOICEVOX_SPEAKER = "10";
      const result = await resolveConfig({ cliSpeaker: 5 });
      expect(result.speaker).toBe(5);
    });

    it("uses env speaker when CLI not provided", async () => {
      process.env.VOICEVOX_SPEAKER = "10";
      const result = await resolveConfig({});
      expect(result.speaker).toBe(10);
    });

    it("uses default speaker when env is invalid", async () => {
      process.env.VOICEVOX_SPEAKER = "invalid";
      const result = await resolveConfig({});
      // Falls back to config file or default (1)
      expect(result.speaker).toBeGreaterThanOrEqual(1);
    });

    it("falls back to config or default when env not set", async () => {
      delete process.env.VOICEVOX_SPEAKER;
      const result = await resolveConfig({});
      // Uses config file if set, otherwise default (1)
      expect(result.speaker).toBeGreaterThanOrEqual(1);
    });
  });

  describe("speed priority", () => {
    it("uses CLI speed when provided", async () => {
      process.env.VOICEVOX_SPEED = "2.0";
      const result = await resolveConfig({ cliSpeed: 1.5 });
      expect(result.speed).toBe(1.5);
    });

    it("uses env speed when CLI not provided", async () => {
      process.env.VOICEVOX_SPEED = "2.0";
      const result = await resolveConfig({});
      expect(result.speed).toBe(2.0);
    });

    it("uses default speed when env is invalid", async () => {
      process.env.VOICEVOX_SPEED = "invalid";
      const result = await resolveConfig({});
      // Falls back to config file or default (1.3)
      expect(result.speed).toBeGreaterThanOrEqual(1.0);
    });

    it("falls back to config or default when env not set", async () => {
      delete process.env.VOICEVOX_SPEED;
      const result = await resolveConfig({});
      // Uses config file if set, otherwise default (1.3)
      expect(result.speed).toBeGreaterThanOrEqual(1.0);
    });
  });
});
