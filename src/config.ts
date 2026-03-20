import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { execSync } from "node:child_process";
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
 * Parses a non-negative integer from a string value.
 * Exits with error message if the value is invalid (NaN, negative, or not an integer).
 */
function parseNonNegativeInt(
  value: string | undefined,
  envName: string
): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    console.error(`Error: ${envName} must be a non-negative integer, got: ${value}`);
    process.exit(1);
  }
  return n;
}

/**
 * Parses a positive number from a string value.
 * Exits with error message if the value is invalid (NaN, Infinity, zero, or negative).
 */
function parsePositiveNumber(
  value: string | undefined,
  envName: string
): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    console.error(`Error: ${envName} must be a positive number, got: ${value}`);
    process.exit(1);
  }
  return n;
}

/**
 * Parses a non-negative number from a string value.
 * Exits with error message if the value is invalid (NaN, Infinity, or negative).
 */
function parseNonNegativeNumber(
  value: string | undefined,
  envName: string
): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    console.error(`Error: ${envName} must be a non-negative number, got: ${value}`);
    process.exit(1);
  }
  return n;
}

/**
 * Validates and returns a valid timeout/delay value in milliseconds.
 * Returns default value if input is invalid (NaN, negative, or not finite).
 */
export function validateNonNegativeMs(
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
export function validateRetryCount(
  value: number | undefined,
  defaultValue: number
): number {
  if (value === undefined) return defaultValue;
  if (!Number.isFinite(value) || value < 0) return defaultValue;
  return Math.floor(value);
}

/**
 * Validates and returns a valid finite number.
 * Returns default value if input is invalid (NaN, Infinity, or undefined).
 */
export function validateFinite(
  value: number | undefined,
  defaultValue: number
): number {
  if (value === undefined) return defaultValue;
  if (!Number.isFinite(value)) return defaultValue;
  return value;
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

// TTY名のキャッシュ（プロセス内で1回だけ判定）
let cachedTty: string | null | undefined = undefined;

/**
 * 現在のTTY名を取得する（例: /dev/ttys001）
 * TTYでない場合は null を返す
 * 結果はモジュールスコープでメモ化され、プロセス内で1回だけ判定される
 *
 * `tty` コマンド（stdin依存）ではなく `ps` でプロセスの制御端末を取得することで、
 * stdin がパイプになっている場合（Claude Code hook など）でも正しく検出できる。
 */
export function getCurrentTty(): string | null {
  if (cachedTty !== undefined) return cachedTty;
  try {
    // ps でプロセス自身の制御端末を取得（stdin/stdout/stderrのリダイレクト状態に依存しない）
    const raw = execSync(`ps -p ${process.pid} -o tty=`, { encoding: "utf-8" }).trim();
    // 制御端末なし（デーモン等）の場合は "?" または "??" が返る
    if (!raw || raw === "?" || raw === "??") {
      cachedTty = null;
      return null;
    }
    // macOS: "ttys001" → "/dev/ttys001", Linux: "pts/0" → "/dev/pts/0"
    const tty = raw.startsWith("/") ? raw : `/dev/${raw}`;
    cachedTty = tty;
    return tty;
  } catch {
    cachedTty = null;
    return null;
  }
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
  statusLineEmoji: string | undefined;
}> {
  const file = await readConfig();

  // Parse and validate environment variables
  const envSpeaker = parseNonNegativeInt(process.env.VOICEVOX_SPEAKER, "VOICEVOX_SPEAKER");
  const envSpeed = parsePositiveNumber(process.env.VOICEVOX_SPEED, "VOICEVOX_SPEED");
  const envTimeoutMs = parseNonNegativeNumber(process.env.VOICEVOX_TIMEOUT_MS, "VOICEVOX_TIMEOUT_MS");
  const envRetryCount = parseNonNegativeInt(process.env.VOICEVOX_RETRY_COUNT, "VOICEVOX_RETRY_COUNT");
  const envRetryDelayMs = parseNonNegativeNumber(process.env.VOICEVOX_RETRY_DELAY_MS, "VOICEVOX_RETRY_DELAY_MS");

  // TTYごとの話者設定を取得（不正値は undefined として扱う）
  const tty = getCurrentTty();
  const rawTtySpeaker = tty ? file.speakerByTty?.[tty] : undefined;
  // 不正値（NaN、非有限数）の場合は undefined として扱い、次の優先順位へフォールバック
  const ttySpeaker =
    rawTtySpeaker !== undefined && Number.isFinite(rawTtySpeaker)
      ? rawTtySpeaker
      : undefined;

  // Validate all values with appropriate validators
  // 優先順位: CLI > TTYごとの設定 > 環境変数 > グローバル設定 > デフォルト
  const speaker = validateFinite(
    options.cliSpeaker ?? ttySpeaker ?? envSpeaker ?? file.speaker,
    DEFAULT_SPEAKER
  );

  const speed = validateFinite(
    options.cliSpeed ?? envSpeed ?? file.speed,
    DEFAULT_SPEED
  );

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

  return { speaker, speed, timeoutMs, retryCount, retryDelayMs, statusLineEmoji: file.statusLineEmoji };
}
