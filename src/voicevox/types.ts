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
   * TTYごとの話者設定。キーはTTY名（例: /dev/ttys001）
   */
  speakerByTty?: Record<string, number>;
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

export interface UserDictWord {
  surface: string;
  priority: number;
  context_id: number;
  part_of_speech: string;
  part_of_speech_detail_1: string;
  part_of_speech_detail_2: string;
  part_of_speech_detail_3: string;
  inflectional_type: string;
  inflectional_form: string;
  stem: string;
  yomi: string;
  pronunciation: string;
  accent_type: number;
  mora_count: number | null;
  accent_associative_rule: string;
}

export type WordType = "PROPER_NOUN" | "COMMON_NOUN" | "VERB" | "ADJECTIVE" | "SUFFIX";

export interface DictListResult {
  status: "ok" | "error";
  words?: Record<string, UserDictWord>;
  message?: string;
}

export interface DictAddResult {
  status: "ok" | "error";
  uuid?: string;
  message?: string;
}

export interface DictOperationResult {
  status: "ok" | "error";
  message?: string;
}

export interface Preset {
  id: number;
  name: string;
  speaker_uuid: string;
  style_id: number;
  speedScale: number;
  pitchScale: number;
  intonationScale: number;
  volumeScale: number;
  prePhonemeLength: number;
  postPhonemeLength: number;
  pauseLength?: number;
  pauseLengthScale?: number;
}

export type NewPreset = Omit<Preset, "id">;

export interface PresetListResult {
  status: "ok" | "error";
  presets?: Preset[];
  message?: string;
}

export interface PresetAddResult {
  status: "ok" | "error";
  id?: number;
  message?: string;
}

export interface PresetOperationResult {
  status: "ok" | "error";
  message?: string;
}
