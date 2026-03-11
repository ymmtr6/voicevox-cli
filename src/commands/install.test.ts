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

  it("--skills で project スコープにスキルのみインストールできる", async () => {
    await runInstall({ skills: true, mcp: false, scope: "project" });

    const skillsDir = join(testDir, ".claude", "skills", "voicevox-cli");
    expect(existsSync(skillsDir)).toBe(true);
    expect(existsSync(join(skillsDir, "SKILL.md"))).toBe(true);
    expect(existsSync(join(skillsDir, "references", "hooks-setup.md"))).toBe(true);

    // settings.json は作成されない
    const settingsPath = join(testDir, ".claude", "settings.json");
    expect(existsSync(settingsPath)).toBe(false);
  });

  it("--mcp で MCP 設定のみインストールできる", async () => {
    await runInstall({ skills: false, mcp: true, scope: "project" });

    // skills はコピーされない
    const skillsDir = join(testDir, ".claude", "skills", "voicevox-cli");
    expect(existsSync(skillsDir)).toBe(false);

    // settings.json に MCP 設定が追加されている
    const settingsPath = join(testDir, ".claude", "settings.json");
    expect(existsSync(settingsPath)).toBe(true);
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(settings.mcpServers.voicevox).toEqual({
      command: "voicevox-cli",
      args: ["mcp-server"],
    });
  });

  it("--skills --mcp で両方インストールできる", async () => {
    await runInstall({ skills: true, mcp: true, scope: "project" });

    const skillsDir = join(testDir, ".claude", "skills", "voicevox-cli");
    expect(existsSync(skillsDir)).toBe(true);
    expect(existsSync(join(skillsDir, "SKILL.md"))).toBe(true);

    const settingsPath = join(testDir, ".claude", "settings.json");
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(settings.mcpServers.voicevox).toEqual({
      command: "voicevox-cli",
      args: ["mcp-server"],
    });
  });

  it("既存の settings.json に MCP 設定がマージされる", async () => {
    const claudeDir = join(testDir, ".claude");
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, "settings.json"), JSON.stringify({
      permissions: { allow: ["Bash(git:*)"] },
      hooks: { Stop: [] },
    }));

    await runInstall({ skills: false, mcp: true, scope: "project" });

    const settings = JSON.parse(readFileSync(join(claudeDir, "settings.json"), "utf-8"));
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
    writeFileSync(join(claudeDir, "settings.json"), JSON.stringify({
      mcpServers: {
        voicevox: {
          command: "voicevox-cli",
          args: ["mcp-server", "--host", "custom"],
        },
      },
    }));

    await runInstall({ skills: false, mcp: true, scope: "project" });

    const settings = JSON.parse(readFileSync(join(claudeDir, "settings.json"), "utf-8"));
    expect(settings.mcpServers.voicevox).toEqual({
      command: "voicevox-cli",
      args: ["mcp-server", "--host", "custom"],
    });
  });

  it("--skills も --mcp もなしではエラーになる", async () => {
    await runInstall({ skills: false, mcp: false, scope: "project" });
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("不正な settings.json がある場合もフォールバックする", async () => {
    const claudeDir = join(testDir, ".claude");
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, "settings.json"), "invalid json");

    await runInstall({ skills: false, mcp: true, scope: "project" });

    const settings = JSON.parse(readFileSync(join(claudeDir, "settings.json"), "utf-8"));
    expect(settings.mcpServers.voicevox).toEqual({
      command: "voicevox-cli",
      args: ["mcp-server"],
    });
  });
});
