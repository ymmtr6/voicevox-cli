import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import type { Config } from "./voicevox/types.js";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24時間

interface SpeakersCache {
  timestamp: number;
  speakers: { id: number; name: string }[];
}

function getSpeakersCachePath(): string {
  return join(homedir(), ".config", "voicevox-cli", "speakers-cache.json");
}

export async function readSpeakersCache(): Promise<SpeakersCache | null> {
  try {
    const raw = await readFile(getSpeakersCachePath(), "utf-8");
    const cache = JSON.parse(raw) as SpeakersCache;
    if (Date.now() - cache.timestamp > CACHE_TTL_MS) return null;
    return cache;
  } catch {
    return null;
  }
}

export async function writeSpeakersCache(
  speakers: { id: number; name: string }[]
): Promise<void> {
  const path = getSpeakersCachePath();
  await mkdir(dirname(path), { recursive: true });
  const cache: SpeakersCache = { timestamp: Date.now(), speakers };
  await writeFile(path, JSON.stringify(cache, null, 2));
}

const DEFAULT_SPEAKER = 1;
const DEFAULT_SPEED = 1.3;
export const DEFAULT_TIMEOUT_MS = 30000;
export const DEFAULT_RETRY_COUNT = 0;
export const DEFAULT_RETRY_DELAY_MS = 1000;

/**
 * Validates and returns a valid timeout/delay value in milliseconds.
 * Returns default value if input is invalid (NaN, negative, or not finite).
 */
function validateNonNegativeMs(
  value: number | undefined,
  defaultValue: number
): number {
  if (value === undefined) return defaultValue;
  if (!Number.isFinite(value) || value < 0) return defaultValue;
  return value;
}

/**
 * Validates and returns a valid retry count (non-negative integer).
 * Returns default value if input is invalid.
 */
function validateRetryCount(
  value: number | undefined,
  defaultValue: number
): number {
  if (value === undefined) return defaultValue;
  if (!Number.isFinite(value) || value < 0) return defaultValue;
  return Math.floor(value);
}

function getConfigPath(): string {
  return join(homedir(), ".config", "voicevox-cli", "config.json");
}

export async function readConfig(): Promise<Config> {
  try {
    const raw = await readFile(getConfigPath(), "utf-8");
    return JSON.parse(raw) as Config;
  } catch {
    return {};
  }
}

export async function writeConfig(config: Config): Promise<void> {
  const path = getConfigPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(config, null, 2));
}

export async function resolveConfig(options: {
  cliSpeaker?: number;
  cliSpeed?: number;
  cliTimeoutMs?: number;
  cliRetryCount?: number;
  cliRetryDelayMs?: number;
}): Promise<{
  speaker: number;
  speed: number;
  timeoutMs: number;
  retryCount: number;
  retryDelayMs: number;
}> {
  const file = await readConfig();

  const envSpeaker = process.env.VOICEVOX_SPEAKER
    ? Number(process.env.VOICEVOX_SPEAKER)
    : undefined;
  const envSpeed = process.env.VOICEVOX_SPEED
    ? Number(process.env.VOICEVOX_SPEED)
    : undefined;
  const envTimeoutMs = process.env.VOICEVOX_TIMEOUT_MS
    ? Number(process.env.VOICEVOX_TIMEOUT_MS)
    : undefined;
  const envRetryCount = process.env.VOICEVOX_RETRY_COUNT
    ? Number(process.env.VOICEVOX_RETRY_COUNT)
    : undefined;
  const envRetryDelayMs = process.env.VOICEVOX_RETRY_DELAY_MS
    ? Number(process.env.VOICEVOX_RETRY_DELAY_MS)
    : undefined;

  const speaker =
    options.cliSpeaker ??
    envSpeaker ??
    file.speaker ??
    DEFAULT_SPEAKER;

  const speed =
    options.cliSpeed ??
    envSpeed ??
    file.speed ??
    DEFAULT_SPEED;

  // Apply validation for timeout/retry settings
  const timeoutMs = validateNonNegativeMs(
    options.cliTimeoutMs ?? envTimeoutMs ?? file.timeoutMs,
    DEFAULT_TIMEOUT_MS
  );

  const retryCount = validateRetryCount(
    options.cliRetryCount ?? envRetryCount ?? file.retryCount,
    DEFAULT_RETRY_COUNT
  );

  const retryDelayMs = validateNonNegativeMs(
    options.cliRetryDelayMs ?? envRetryDelayMs ?? file.retryDelayMs,
    DEFAULT_RETRY_DELAY_MS
  );

  return { speaker, speed, timeoutMs, retryCount, retryDelayMs };
}
