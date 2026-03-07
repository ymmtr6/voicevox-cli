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

export class VoiceVoxClient {
  private baseUrl: string;

  constructor(options: VoiceVoxClientOptions) {
    this.baseUrl = `http://${options.host}:${options.port}`;
  }

  async getVersion(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/version`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const version = await res.json() as string;
    return version;
  }

  async getSpeakers(): Promise<Speaker[]> {
    const res = await fetch(`${this.baseUrl}/speakers`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json() as Promise<Speaker[]>;
  }

  async createAudioQuery(text: string, speakerId: number): Promise<AudioQuery> {
    const params = new URLSearchParams({ text, speaker: String(speakerId) });
    const res = await fetch(`${this.baseUrl}/audio_query?${params}`, {
      method: "POST",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json() as Promise<AudioQuery>;
  }

  async synthesis(query: AudioQuery, speakerId: number): Promise<Buffer> {
    const params = new URLSearchParams({ speaker: String(speakerId) });
    const res = await fetch(`${this.baseUrl}/synthesis?${params}`, {
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
