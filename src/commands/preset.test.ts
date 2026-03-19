import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGetPresets = vi.fn();
const mockAddPreset = vi.fn();
const mockUpdatePreset = vi.fn();
const mockDeletePreset = vi.fn();

vi.mock("../voicevox/client.js", () => ({
  VoiceVoxClient: class {
    getPresets = mockGetPresets;
    addPreset = mockAddPreset;
    updatePreset = mockUpdatePreset;
    deletePreset = mockDeletePreset;
  },
}));

import {
  runPresetList,
  runPresetAdd,
  runPresetUpdate,
  runPresetRemove,
} from "./preset.js";

const SAMPLE_PRESET = {
  id: 1,
  name: "高速読み上げ",
  speaker_uuid: "uuid-1",
  style_id: 1,
  speedScale: 1.5,
  pitchScale: 0.0,
  intonationScale: 1.0,
  volumeScale: 1.0,
  prePhonemeLength: 0.1,
  postPhonemeLength: 0.1,
};

describe("runPresetList", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it("非JSONモードで空一覧を表示", async () => {
    mockGetPresets.mockResolvedValueOnce([]);
    await runPresetList("localhost", 50021, false);
    expect(consoleLogSpy).toHaveBeenCalledWith("登録されているプリセットはありません。");
  });

  it("非JSONモードでプリセット一覧を表示", async () => {
    mockGetPresets.mockResolvedValueOnce([SAMPLE_PRESET]);
    await runPresetList("localhost", 50021, false);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("高速読み上げ")
    );
  });

  it("JSONモードでプリセットをJSON出力", async () => {
    mockGetPresets.mockResolvedValueOnce([SAMPLE_PRESET]);
    await runPresetList("localhost", 50021, true);
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(output.status).toBe("ok");
    expect(output.presets[0].name).toBe("高速読み上げ");
  });

  it("エラー時にexit(1)", async () => {
    mockGetPresets.mockRejectedValueOnce(new Error("Connection refused"));
    await runPresetList("localhost", 50021, true);
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(output.status).toBe("error");
    expect(output.message).toBe("Connection refused");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});

describe("runPresetAdd", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it("プリセット追加成功時にIDを返す", async () => {
    mockAddPreset.mockResolvedValueOnce(42);
    await runPresetAdd("localhost", 50021, {
      name: "テスト",
      speakerUuid: "uuid-1",
      styleId: 1,
      speedScale: 1.0,
      pitchScale: 0.0,
      intonationScale: 1.0,
      volumeScale: 1.0,
      prePhonemeLength: 0.1,
      postPhonemeLength: 0.1,
    });
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(output.status).toBe("ok");
    expect(output.id).toBe(42);
  });

  it("エラー時にエラーメッセージを返す", async () => {
    mockAddPreset.mockRejectedValueOnce(new Error("HTTP 422: Validation Error"));
    await runPresetAdd("localhost", 50021, {
      name: "テスト",
      speakerUuid: "uuid-1",
      styleId: 1,
      speedScale: 1.0,
      pitchScale: 0.0,
      intonationScale: 1.0,
      volumeScale: 1.0,
      prePhonemeLength: 0.1,
      postPhonemeLength: 0.1,
    });
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(output.status).toBe("error");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});

describe("runPresetUpdate", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it("プリセット更新成功", async () => {
    mockUpdatePreset.mockResolvedValueOnce(1);
    await runPresetUpdate("localhost", 50021, {
      id: 1,
      name: "テスト",
      speakerUuid: "uuid-1",
      styleId: 1,
      speedScale: 1.5,
      pitchScale: 0.0,
      intonationScale: 1.0,
      volumeScale: 1.0,
      prePhonemeLength: 0.1,
      postPhonemeLength: 0.1,
    });
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(output.status).toBe("ok");
  });

  it("エラー時にエラーメッセージを返す", async () => {
    mockUpdatePreset.mockRejectedValueOnce(new Error("HTTP 404: Not found"));
    await runPresetUpdate("localhost", 50021, {
      id: 999,
      name: "テスト",
      speakerUuid: "uuid-1",
      styleId: 1,
      speedScale: 1.0,
      pitchScale: 0.0,
      intonationScale: 1.0,
      volumeScale: 1.0,
      prePhonemeLength: 0.1,
      postPhonemeLength: 0.1,
    });
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(output.status).toBe("error");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});

describe("runPresetRemove", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it("プリセット削除成功", async () => {
    mockDeletePreset.mockResolvedValueOnce(undefined);
    await runPresetRemove("localhost", 50021, 1);
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(output.status).toBe("ok");
  });

  it("エラー時にエラーメッセージを返す", async () => {
    mockDeletePreset.mockRejectedValueOnce(new Error("HTTP 404: Not found"));
    await runPresetRemove("localhost", 50021, 999);
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(output.status).toBe("error");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
