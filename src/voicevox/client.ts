import { execFile } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type {
  AudioQuery,
  Speaker,
  VoiceVoxClientOptions,
} from "./types.js";
import {
  DEFAULT_TIMEOUT_MS,
  DEFAULT_RETRY_COUNT,
  DEFAULT_RETRY_DELAY_MS,
} from "../config.js";

const execFileAsync = promisify(execFile);

/**
 * Returns the audio player command and arguments for the current platform.
 * - macOS: afplay
 * - Windows: PowerShell with System.Media.SoundPlayer
 * - Linux: paplay (PulseAudio)
 * - Other: returns null (unsupported)
 */
function getAudioPlayer(): { cmd: string; args: (path: string) => string[] } | null {
  switch (process.platform) {
    case "darwin":
      return { cmd: "afplay", args: (p) => [p] };
    case "win32":
      return {
        cmd: "powershell",
        args: (p) => [
          "-NoProfile",
          "-Command",
          "param([string]$p) $player = New-Object System.Media.SoundPlayer($p); $player.PlaySync()",
          p,
        ],
      };
    case "linux":
      return { cmd: "paplay", args: (p) => [p] };
    default:
      return null;
  }
}

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

export class VoiceVoxClient {
  private baseUrl: string;
  private timeoutMs: number;
  private retryCount: number;
  private retryDelayMs: number;

  constructor(options: VoiceVoxClientOptions) {
    this.baseUrl = `http://${options.host}:${options.port}`;
    this.timeoutMs = validateNonNegativeMs(options.timeoutMs, DEFAULT_TIMEOUT_MS);
    this.retryCount = validateRetryCount(options.retryCount, DEFAULT_RETRY_COUNT);
    this.retryDelayMs = validateNonNegativeMs(options.retryDelayMs, DEFAULT_RETRY_DELAY_MS);
  }

  /**
   * Fetches a URL with timeout and retry support.
   * Note: Retry only applies to network errors and timeouts, not HTTP errors (4xx/5xx).
   * The timeout covers both the initial request and body reading.
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    let lastError: Error | null = null;
    const attempts = this.retryCount + 1;

    for (let i = 0; i < attempts; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.timeoutMs
        );

        let fetchSucceeded = false;
        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
          });

          fetchSucceeded = true;

          // Wrap body-reading methods so that the timeout remains in effect
          // until the body has been fully read.
          const wrapBodyReader = <T extends (...args: unknown[]) => Promise<unknown>>(
            original: T
          ): T => {
            const wrapped = (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
              try {
                return (await original.apply(response, args)) as ReturnType<T>;
              } finally {
                clearTimeout(timeoutId);
              }
            }) as T;
            return wrapped;
          };

          // Rebind and wrap json/arrayBuffer/text
          const responseAny = response as unknown as Record<string, unknown>;
          if (typeof response.json === "function") {
            responseAny.json = wrapBodyReader(response.json.bind(response) as (...args: unknown[]) => Promise<unknown>);
          }
          if (typeof response.arrayBuffer === "function") {
            responseAny.arrayBuffer = wrapBodyReader(response.arrayBuffer.bind(response) as (...args: unknown[]) => Promise<unknown>);
          }
          if (typeof response.text === "function") {
            responseAny.text = wrapBodyReader(response.text.bind(response) as (...args: unknown[]) => Promise<unknown>);
          }

          return response;
        } finally {
          // If fetch failed, clear the timeout
          if (!fetchSucceeded) {
            clearTimeout(timeoutId);
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
        }
      }
    }

    throw lastError ?? new Error("Request failed after retries");
  }

  async getVersion(): Promise<string> {
    const res = await this.fetchWithRetry(`${this.baseUrl}/version`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const version = await res.json() as string;
    return version;
  }

  async getSpeakers(): Promise<Speaker[]> {
    const res = await this.fetchWithRetry(`${this.baseUrl}/speakers`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json() as Promise<Speaker[]>;
  }

  async createAudioQuery(text: string, speakerId: number): Promise<AudioQuery> {
    const params = new URLSearchParams({ text, speaker: String(speakerId) });
    const res = await this.fetchWithRetry(`${this.baseUrl}/audio_query?${params}`, {
      method: "POST",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json() as Promise<AudioQuery>;
  }

  async synthesis(query: AudioQuery, speakerId: number): Promise<Buffer> {
    const params = new URLSearchParams({ speaker: String(speakerId) });
    const res = await this.fetchWithRetry(`${this.baseUrl}/synthesis?${params}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async speak(text: string, speakerId: number, speed: number): Promise<void> {
    const query = await this.createAudioQuery(text, speakerId);
    query.speedScale = speed;

    const wavBuffer = await this.synthesis(query, speakerId);

    const tmpPath = join(tmpdir(), `voicevox_${Date.now()}.wav`);
    await writeFile(tmpPath, wavBuffer);

    const player = getAudioPlayer();
    if (!player) {
      throw new Error(
        `No audio player available for platform ${process.platform}. WAV file saved at: ${tmpPath}`
      );
    }

    try {
      await execFileAsync(player.cmd, player.args(tmpPath));
      await unlink(tmpPath).catch(() => undefined);
    } catch (error) {
      // If player command not found, preserve file and throw with path info
      if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error(
          `Audio player '${player.cmd}' not found. WAV file saved at: ${tmpPath}`
        );
      }
      // For other errors, clean up and rethrow
      await unlink(tmpPath).catch(() => undefined);
      throw error;
    }
  }
}
