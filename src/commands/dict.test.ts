import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { UserDictWord } from "../voicevox/types.js";

const mockGetUserDict = vi.fn();
const mockAddUserDictWord = vi.fn();
const mockUpdateUserDictWord = vi.fn();
const mockDeleteUserDictWord = vi.fn();
const mockImportUserDict = vi.fn();

vi.mock("../voicevox/client.js", () => ({
  VoiceVoxClient: class {
    getUserDict = mockGetUserDict;
    addUserDictWord = mockAddUserDictWord;
    updateUserDictWord = mockUpdateUserDictWord;
    deleteUserDictWord = mockDeleteUserDictWord;
    importUserDict = mockImportUserDict;
  },
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

import { readFile, writeFile } from "node:fs/promises";
import {
  runDictList,
  runDictAdd,
  runDictUpdate,
  runDictRemove,
  runDictExport,
  runDictImport,
} from "./dict.js";

const SAMPLE_WORD: UserDictWord = {
  surface: "Claude",
  priority: 5,
  context_id: 1348,
  part_of_speech: "名詞",
  part_of_speech_detail_1: "固有名詞",
  part_of_speech_detail_2: "一般",
  part_of_speech_detail_3: "*",
  inflectional_type: "*",
  inflectional_form: "*",
  stem: "*",
  yomi: "クロード",
  pronunciation: "クロード",
  accent_type: 0,
  mora_count: null,
  accent_associative_rule: "*",
};

describe("runDictList", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it("非JSONモードで空の辞書を表示", async () => {
    mockGetUserDict.mockResolvedValueOnce({});
    await runDictList("localhost", 50021, false);
    expect(consoleLogSpy).toHaveBeenCalledWith("登録されている単語はありません。");
  });

  it("非JSONモードで単語一覧を表示", async () => {
    mockGetUserDict.mockResolvedValueOnce({ "test-uuid": SAMPLE_WORD });
    await runDictList("localhost", 50021, false);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("test-uuid\tClaude\tクロード")
    );
  });

  it("JSONモードで辞書をJSON出力", async () => {
    mockGetUserDict.mockResolvedValueOnce({ "test-uuid": SAMPLE_WORD });
    await runDictList("localhost", 50021, true);
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(output.status).toBe("ok");
    expect(output.words["test-uuid"].surface).toBe("Claude");
  });

  it("非JSONモードでエラー時はstderrに出力", async () => {
    mockGetUserDict.mockRejectedValueOnce(new Error("Connection refused"));
    await runDictList("localhost", 50021, false);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Connection refused");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("JSONモードでエラー時はJSON形式でstdoutに出力", async () => {
    mockGetUserDict.mockRejectedValueOnce(new Error("Connection refused"));
    await runDictList("localhost", 50021, true);
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(output.status).toBe("error");
    expect(output.message).toBe("Connection refused");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});

describe("runDictAdd", () => {
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

  it("単語追加成功時にUUIDを返す", async () => {
    mockAddUserDictWord.mockResolvedValueOnce("new-uuid-123");
    await runDictAdd("localhost", 50021, {
      surface: "Claude",
      pronunciation: "クロード",
      accentType: 0,
      wordType: "PROPER_NOUN",
      priority: 5,
    });
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(output.status).toBe("ok");
    expect(output.uuid).toBe("new-uuid-123");
  });

  it("エラー時にエラーメッセージを返す", async () => {
    mockAddUserDictWord.mockRejectedValueOnce(new Error("HTTP 422: Invalid pronunciation"));
    await runDictAdd("localhost", 50021, {
      surface: "test",
      pronunciation: "invalid",
      accentType: 0,
    });
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(output.status).toBe("error");
    expect(output.message).toBe("HTTP 422: Invalid pronunciation");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});

describe("runDictUpdate", () => {
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

  it("単語更新成功", async () => {
    mockUpdateUserDictWord.mockResolvedValueOnce(undefined);
    await runDictUpdate("localhost", 50021, "uuid-123", {
      surface: "Claude",
      pronunciation: "クロード",
      accentType: 1,
    });
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(output.status).toBe("ok");
  });

  it("エラー時にエラーメッセージを返す", async () => {
    mockUpdateUserDictWord.mockRejectedValueOnce(new Error("HTTP 404: Not found"));
    await runDictUpdate("localhost", 50021, "invalid-uuid", {
      surface: "test",
      pronunciation: "テスト",
      accentType: 0,
    });
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(output.status).toBe("error");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});

describe("runDictRemove", () => {
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

  it("単語削除成功", async () => {
    mockDeleteUserDictWord.mockResolvedValueOnce(undefined);
    await runDictRemove("localhost", 50021, "uuid-123");
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(output.status).toBe("ok");
  });

  it("エラー時にエラーメッセージを返す", async () => {
    mockDeleteUserDictWord.mockRejectedValueOnce(new Error("HTTP 404: Not found"));
    await runDictRemove("localhost", 50021, "invalid-uuid");
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(output.status).toBe("error");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});

describe("runDictExport", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it("ファイル指定時にファイルに書き込む", async () => {
    mockGetUserDict.mockResolvedValueOnce({ "uuid-1": SAMPLE_WORD });
    await runDictExport("localhost", 50021, "/tmp/dict.json");
    expect(vi.mocked(writeFile)).toHaveBeenCalledWith(
      "/tmp/dict.json",
      expect.any(String),
      "utf-8"
    );
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(output.status).toBe("ok");
  });

  it("ファイル未指定時にstdoutに出力", async () => {
    mockGetUserDict.mockResolvedValueOnce({ "uuid-1": SAMPLE_WORD });
    await runDictExport("localhost", 50021);
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(output["uuid-1"].surface).toBe("Claude");
  });

  it("エラー時はstderrに出力", async () => {
    mockGetUserDict.mockRejectedValueOnce(new Error("Connection refused"));
    await runDictExport("localhost", 50021);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Connection refused");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});

describe("runDictImport", () => {
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

  it("インポート成功", async () => {
    vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify({ "uuid-1": SAMPLE_WORD }));
    mockImportUserDict.mockResolvedValueOnce(undefined);
    await runDictImport("localhost", 50021, "/tmp/dict.json", false);
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(output.status).toBe("ok");
  });

  it("ファイル読み取りエラー", async () => {
    vi.mocked(readFile).mockRejectedValueOnce(new Error("ENOENT: no such file"));
    await runDictImport("localhost", 50021, "/tmp/notfound.json", false);
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(output.status).toBe("error");
    expect(output.message).toBe("ENOENT: no such file");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
