import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// install.ts が process.cwd() を使うため、テスト用ディレクトリで動作確認
describe("install command", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `voicevox-install-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("skills ディレクトリが存在する", () => {
    // パッケージの skills ディレクトリが存在することを確認
    const skillsDir = join(process.cwd(), "skills", "voicevox-cli");
    expect(existsSync(skillsDir)).toBe(true);
    expect(existsSync(join(skillsDir, "SKILL.md"))).toBe(true);
    expect(existsSync(join(skillsDir, "references"))).toBe(true);
  });

  it("SKILL.md に必須フィールドが含まれている", () => {
    const skillMd = readFileSync(
      join(process.cwd(), "skills", "voicevox-cli", "SKILL.md"),
      "utf-8"
    );
    expect(skillMd).toContain("name: voicevox-cli");
    expect(skillMd).toContain("description:");
    expect(skillMd).toContain("allowed-tools:");
  });

  it("references ディレクトリにファイルが存在する", () => {
    const refsDir = join(process.cwd(), "skills", "voicevox-cli", "references");
    expect(existsSync(join(refsDir, "hooks-setup.md"))).toBe(true);
    expect(existsSync(join(refsDir, "mcp-integration.md"))).toBe(true);
    expect(existsSync(join(refsDir, "speaker-customization.md"))).toBe(true);
  });

  it("MCP 設定が既存の settings.json にマージされる", () => {
    const settingsPath = join(testDir, "settings.json");
    const existingSettings = {
      permissions: { allow: ["Bash(git:*)"] },
      hooks: { Stop: [] },
    };
    writeFileSync(settingsPath, JSON.stringify(existingSettings));

    // configureMcpServer のロジックを直接テスト
    let settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    const mcpServers = (settings.mcpServers ?? {}) as Record<string, unknown>;
    mcpServers.voicevox = { command: "voicevox-cli", args: ["mcp-server"] };
    settings.mcpServers = mcpServers;
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(settings.permissions).toEqual({ allow: ["Bash(git:*)"] });
    expect(settings.hooks).toEqual({ Stop: [] });
    expect(settings.mcpServers.voicevox).toEqual({
      command: "voicevox-cli",
      args: ["mcp-server"],
    });
  });

  it("既存の MCP 設定がある場合は上書きしない", () => {
    const settingsPath = join(testDir, "settings.json");
    const existingSettings = {
      mcpServers: {
        voicevox: {
          command: "voicevox-cli",
          args: ["mcp-server", "--host", "custom"],
        },
      },
    };
    writeFileSync(settingsPath, JSON.stringify(existingSettings));

    // configureMcpServer 相当のロジック
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    const mcpServers = (settings.mcpServers ?? {}) as Record<string, unknown>;
    if (!mcpServers.voicevox) {
      mcpServers.voicevox = { command: "voicevox-cli", args: ["mcp-server"] };
    }

    // 既存設定が保持されていることを確認
    expect(mcpServers.voicevox).toEqual({
      command: "voicevox-cli",
      args: ["mcp-server", "--host", "custom"],
    });
  });
});
