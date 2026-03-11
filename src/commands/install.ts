import { existsSync, mkdirSync, cpSync, readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type InstallScope = "project" | "user";

/**
 * パッケージに同梱された skills ディレクトリのパスを返す
 */
function getSourceSkillsDir(): string {
  // dist/commands/install.js -> project root -> skills/
  return resolve(__dirname, "..", "..", "skills");
}

/**
 * インストール先の skills ディレクトリパスを返す
 */
function getTargetSkillsDir(scope: InstallScope): string {
  if (scope === "user") {
    return join(homedir(), ".claude", "skills");
  }
  return join(process.cwd(), ".claude", "skills");
}

/**
 * settings.json のパスを返す
 */
function getSettingsPath(scope: InstallScope): string {
  if (scope === "user") {
    return join(homedir(), ".claude", "settings.json");
  }
  return join(process.cwd(), ".claude", "settings.json");
}

/**
 * ディレクトリ内の全ファイルを再帰的にリストアップ
 */
function listFilesRecursive(dir: string, basePath: string = ""): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relativePath = basePath ? join(basePath, entry) : entry;
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listFilesRecursive(fullPath, relativePath));
    } else {
      files.push(relativePath);
    }
  }
  return files;
}

/**
 * MCP サーバー設定を settings.json に追加
 */
function configureMcpServer(settingsPath: string): boolean {
  let settings: Record<string, unknown> = {};
  if (existsSync(settingsPath)) {
    try {
      const parsed = JSON.parse(readFileSync(settingsPath, "utf-8"));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        settings = parsed as Record<string, unknown>;
      }
    } catch {
      // ignore parse errors
    }
  }

  const rawMcpServers = settings.mcpServers;
  const mcpServers: Record<string, unknown> =
    rawMcpServers && typeof rawMcpServers === "object" && !Array.isArray(rawMcpServers)
      ? (rawMcpServers as Record<string, unknown>)
      : {};
  // 既に設定済みならスキップ
  if (mcpServers.voicevox) {
    return false;
  }

  mcpServers.voicevox = {
    command: "voicevox-cli",
    args: ["mcp-server"],
  };
  settings.mcpServers = mcpServers;

  const dir = dirname(settingsPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf-8");
  return true;
}

/**
 * skills / MCP をインストール
 */
export async function runInstall(options: {
  skills: boolean;
  mcp: boolean;
  scope: InstallScope;
}): Promise<void> {
  if (!options.skills && !options.mcp) {
    console.log(JSON.stringify({
      status: "error",
      message: "使用法: voicevox-cli install --skills|--mcp [--scope project|user]",
    }, null, 2));
    process.exit(1);
  }

  const results: Record<string, unknown> = {
    status: "ok",
    scope: options.scope,
  };

  // --skills: スキルファイルをコピー
  if (options.skills) {
    const sourceDir = getSourceSkillsDir();
    if (!existsSync(sourceDir)) {
      console.log(JSON.stringify({
        status: "error",
        message: `Skills ディレクトリが見つかりません: ${sourceDir}`,
      }, null, 2));
      process.exit(1);
    }

    const sourceSkillDir = join(sourceDir, "voicevox-cli");
    if (!existsSync(sourceSkillDir)) {
      console.log(JSON.stringify({
        status: "error",
        message: `Skills ソースが見つかりません: ${sourceSkillDir}`,
      }, null, 2));
      process.exit(1);
    }

    const targetBaseDir = getTargetSkillsDir(options.scope);
    const targetDir = join(targetBaseDir, "voicevox-cli");

    mkdirSync(targetDir, { recursive: true });
    cpSync(sourceSkillDir, targetDir, { recursive: true });

    const files = listFilesRecursive(targetDir);
    results.skillsDir = targetDir;
    results.files = files;
  }

  // --mcp: MCP サーバー設定を settings.json に追加
  if (options.mcp) {
    const settingsPath = getSettingsPath(options.scope);
    const mcpConfigured = configureMcpServer(settingsPath);
    results.mcpConfigured = mcpConfigured;
    results.mcpSettingsPath = settingsPath;
  }

  const parts: string[] = [];
  if (options.skills) parts.push("skills");
  if (options.mcp) parts.push("mcp");
  results.message = `Installed: ${parts.join(", ")}`;

  console.log(JSON.stringify(results, null, 2));
}
