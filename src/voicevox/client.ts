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

const execFileAsync = promisify(execFile);

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_RETRY_COUNT = 0;
const DEFAULT_RETRY_DELAY_MS = 1000;

export class VoiceVoxClient {
  private baseUrl: string;
  private timeoutMs: number;
  private retryCount: number;
  private retryDelayMs: number;

  constructor(options: VoiceVoxClientOptions) {
    this.baseUrl = `http://${options.host}:${options.port}`;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retryCount = options.retryCount ?? DEFAULT_RETRY_COUNT;
    this.retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  }

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

        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
          });
          return response;
        } finally {
          clearTimeout(timeoutId);
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

    try {
      await execFileAsync("afplay", [tmpPath]);
    } finally {
      await unlink(tmpPath).catch(() => undefined);
    }
  }
}
