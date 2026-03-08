export interface Speaker {
  name: string;
  speaker_uuid: string;
  styles: SpeakerStyle[];
  version: string;
}

export interface SpeakerStyle {
  name: string;
  id: number;
}

export interface AudioQuery {
  accent_phrases: AccentPhrase[];
  speedScale: number;
  pitchScale: number;
  intonationScale: number;
  volumeScale: number;
  prePhonemeLength: number;
  postPhonemeLength: number;
  outputSamplingRate: number;
  outputStereo: boolean;
  kana: string;
}

export interface AccentPhrase {
  moras: Mora[];
  accent: number;
  pause_mora: Mora | null;
  is_interrogative: boolean;
}

export interface Mora {
  text: string;
  consonant: string | null;
  consonant_length: number | null;
  vowel: string;
  vowel_length: number;
  pitch: number;
}

export interface VoiceVoxClientOptions {
  host: string;
  port: number;
  timeoutMs?: number;
  retryCount?: number;
  retryDelayMs?: number;
}

export interface TestResult {
  status: "ok" | "error";
  version?: string;
  message?: string;
  host: string;
  port: number;
}

export interface SpeakResult {
  status: "ok" | "error";
  speaker: number;
  speed: number;
  text: string;
  message?: string;
}

export interface SpeakersResult {
  status: "ok" | "error";
  speakers?: Speaker[];
  message?: string;
}

export interface Config {
  speaker?: number;
  speed?: number;
  speakerPool?: number[];
  timeoutMs?: number;
  retryCount?: number;
  retryDelayMs?: number;
  /**
   * Emoji (or text) shown as a prefix in the status line output of `voicevox current-speaker`.
   *
   * Note: This option is intended to be configured by manually editing the
   * config file and is not currently supported by the `voicevox config set`
   * CLI command.
   */
  statusLineEmoji?: string;
}

export interface ConfigResult {
  status: "ok" | "error";
  config?: Config;
  message?: string;
}
