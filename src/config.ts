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
}): Promise<{ speaker: number; speed: number }> {
  const file = await readConfig();

  const envSpeaker = process.env.VOICEVOX_SPEAKER
    ? Number(process.env.VOICEVOX_SPEAKER)
    : undefined;
  const envSpeed = process.env.VOICEVOX_SPEED
    ? Number(process.env.VOICEVOX_SPEED)
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

  return { speaker, speed };
}
