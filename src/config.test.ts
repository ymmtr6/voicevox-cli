import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  validateNonNegativeMs,
  validateRetryCount,
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
