import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runInstall } from "./install.js";

describe("install command", () => {
  let testDir: string;
  let originalCwd: string;
  let originalExit: typeof process.exit;

  beforeEach(() => {
    testDir = join(tmpdir(), `voicevox-install-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    originalCwd = process.cwd();
    process.chdir(testDir);

    // process.exit をモックして実際には終了しないようにする
    originalExit = process.exit;
    process.exit = vi.fn() as never;
  });

  afterEach(() => {
    process.chdir(originalCwd);
    process.exit = originalExit;
    rmSync(testDir, { recursive: true, force: true });
  });

  it("skills ディレクトリがパッケージに同梱されている", () => {
    const skillsDir = join(originalCwd, "skills", "voicevox-cli");
    expect(existsSync(skillsDir)).toBe(true);
    expect(existsSync(join(skillsDir, "SKILL.md"))).toBe(true);
    expect(existsSync(join(skillsDir, "references"))).toBe(true);
  });

  it("SKILL.md に必須フィールドが含まれている", () => {
    const skillMd = readFileSync(
      join(originalCwd, "skills", "voicevox-cli", "SKILL.md"),
      "utf-8"
    );
    expect(skillMd).toContain("name: voicevox-cli");
    expect(skillMd).toContain("description:");
    expect(skillMd).toContain("allowed-tools:");
  });

  it("references ディレクトリにファイルが存在する", () => {
    const refsDir = join(originalCwd, "skills", "voicevox-cli", "references");
    expect(existsSync(join(refsDir, "hooks-setup.md"))).toBe(true);
    expect(existsSync(join(refsDir, "mcp-integration.md"))).toBe(true);
    expect(existsSync(join(refsDir, "speaker-customization.md"))).toBe(true);
  });

  it("--skills で project スコープにインストールできる", async () => {
    await runInstall({ skills: true, scope: "project" });

    // skills がコピーされている
    const skillsDir = join(testDir, ".claude", "skills", "voicevox-cli");
    expect(existsSync(skillsDir)).toBe(true);
    expect(existsSync(join(skillsDir, "SKILL.md"))).toBe(true);
    expect(existsSync(join(skillsDir, "references", "hooks-setup.md"))).toBe(true);
    expect(existsSync(join(skillsDir, "references", "mcp-integration.md"))).toBe(true);
    expect(existsSync(join(skillsDir, "references", "speaker-customization.md"))).toBe(true);

    // settings.json に MCP 設定が追加されている
    const settingsPath = join(testDir, ".claude", "settings.json");
    expect(existsSync(settingsPath)).toBe(true);
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(settings.mcpServers.voicevox).toEqual({
      command: "voicevox-cli",
      args: ["mcp-server"],
    });
  });

  it("既存の settings.json にマージされる", async () => {
    // 既存の settings.json を作成
    const claudeDir = join(testDir, ".claude");
    mkdirSync(claudeDir, { recursive: true });
    const settingsPath = join(claudeDir, "settings.json");
    writeFileSync(settingsPath, JSON.stringify({
      permissions: { allow: ["Bash(git:*)"] },
      hooks: { Stop: [] },
    }));

    await runInstall({ skills: true, scope: "project" });

    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(settings.permissions).toEqual({ allow: ["Bash(git:*)"] });
    expect(settings.hooks).toEqual({ Stop: [] });
    expect(settings.mcpServers.voicevox).toEqual({
      command: "voicevox-cli",
      args: ["mcp-server"],
    });
  });

  it("既存の MCP 設定がある場合は上書きしない", async () => {
    const claudeDir = join(testDir, ".claude");
    mkdirSync(claudeDir, { recursive: true });
    const settingsPath = join(claudeDir, "settings.json");
    writeFileSync(settingsPath, JSON.stringify({
      mcpServers: {
        voicevox: {
          command: "voicevox-cli",
          args: ["mcp-server", "--host", "custom"],
        },
      },
    }));

    await runInstall({ skills: true, scope: "project" });

    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(settings.mcpServers.voicevox).toEqual({
      command: "voicevox-cli",
      args: ["mcp-server", "--host", "custom"],
    });
  });

  it("--skills なしではエラーになる", async () => {
    await runInstall({ skills: false, scope: "project" });
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("不正な settings.json がある場合もフォールバックする", async () => {
    const claudeDir = join(testDir, ".claude");
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, "settings.json"), "invalid json");

    await runInstall({ skills: true, scope: "project" });

    const settings = JSON.parse(readFileSync(join(claudeDir, "settings.json"), "utf-8"));
    expect(settings.mcpServers.voicevox).toEqual({
      command: "voicevox-cli",
      args: ["mcp-server"],
    });
  });
});
