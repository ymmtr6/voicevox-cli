#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Command, Option } from "commander";
import { runTest } from "./commands/test.js";
import { runSpeak, runSpeakers } from "./commands/speak.js";
import { runMcpServer } from "./commands/mcp-server.js";
import { runConfigGet, runConfigSet } from "./commands/config.js";
import { runPickSpeaker } from "./commands/pick-speaker.js";
import { runCurrentSpeaker } from "./commands/current-speaker.js";
import { runSpeakHooks } from "./commands/speak-hooks.js";
import { runSetupHooks } from "./commands/setup-hooks.js";
import { runInstall } from "./commands/install.js";
import { resolveConfig } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(resolve(__dirname, "..", "package.json"), "utf-8"));

const DEFAULT_HOST = "localhost";
const DEFAULT_PORT = 50021;

const program = new Command();

program
  .name("voicevox-cli")
  .description("VoiceVox API CLI - ローカルのVoiceVoxエンジンを操作するツール")
  .version(pkg.version);

program
  .command("test")
  .description("localhostでVoiceVoxが起動しているか確認します")
  .option("--host <host>", "VoiceVoxホスト", DEFAULT_HOST)
  .option("--port <port>", "VoiceVoxポート", String(DEFAULT_PORT))
  .action(async (options) => {
    await runTest(options.host, Number(options.port));
  });

program
  .command("speak <text>")
  .description("VoiceVoxでテキストを読み上げます")
  .option("--host <host>", "VoiceVoxホスト", DEFAULT_HOST)
  .option("--port <port>", "VoiceVoxポート", String(DEFAULT_PORT))
  .option("-s, --speaker <id>", "話者ID")
  .option("--speed <speed>", "話速 (例: 1.3)")
  .option("--timeout <ms>", "タイムアウト (ミリ秒)")
  .option("--retry-count <count>", "リトライ回数 (ネットワークエラー/タイムアウト時)")
  .option("--retry-delay <ms>", "リトライ間隔 (ミリ秒)")
  .action(async (text, options) => {
    const { speaker, speed, timeoutMs, retryCount, retryDelayMs } = await resolveConfig({
      cliSpeaker: options.speaker !== undefined ? Number(options.speaker) : undefined,
      cliSpeed: options.speed !== undefined ? Number(options.speed) : undefined,
      cliTimeoutMs: options.timeout !== undefined ? Number(options.timeout) : undefined,
      cliRetryCount: options.retryCount !== undefined ? Number(options.retryCount) : undefined,
      cliRetryDelayMs: options.retryDelay !== undefined ? Number(options.retryDelay) : undefined,
    });
    await runSpeak(text, options.host, Number(options.port), speaker, speed, timeoutMs, retryCount, retryDelayMs);
  });

program
  .command("speakers")
  .description("VoiceVoxの話者一覧を取得します")
  .option("--host <host>", "VoiceVoxホスト", DEFAULT_HOST)
  .option("--port <port>", "VoiceVoxポート", String(DEFAULT_PORT))
  .action(async (options) => {
    await runSpeakers(options.host, Number(options.port));
  });

program
  .command("mcp-server")
  .description("stdio形式のMCPサーバーを起動します")
  .option("--host <host>", "VoiceVoxホスト", DEFAULT_HOST)
  .option("--port <port>", "VoiceVoxポート", String(DEFAULT_PORT))
  .action(async (options) => {
    await runMcpServer(options.host, Number(options.port));
  });

program
  .command("current-speaker")
  .description("現在の speaker 設定を表示します (Claude Code ステータスバー用)")
  .option("--host <host>", "VoiceVoxホスト", DEFAULT_HOST)
  .option("--port <port>", "VoiceVoxポート", String(DEFAULT_PORT))
  .option("--json", "JSON形式で出力する", false)
  .action(async (options) => {
    await runCurrentSpeaker({
      host: options.host,
      port: Number(options.port),
      json: options.json,
    });
  });

program
  .command("pick-speaker")
  .description("speaker-pool からランダムに話者IDを選んで出力します (シェル埋め込み用)")
  .option("--host <host>", "VoiceVoxホスト", DEFAULT_HOST)
  .option("--port <port>", "VoiceVoxポート", String(DEFAULT_PORT))
  .option("--from <ids>", "カンマ区切りの候補ID (例: 1,2,3)")
  .option("-l, --list", "候補の id/name 一覧を表示する", false)
  .option("--json", "JSON形式で出力する", false)
  .action(async (options) => {
    await runPickSpeaker({
      host: options.host,
      port: Number(options.port),
      from: options.from,
      list: options.list,
      json: options.json,
    });
  });

program
  .command("speak-hooks [payload]")
  .description("Stop/SubagentStop/Notification hook 用: JSON を解析して読み上げます (stdin または引数で受け取る)")
  .option("--host <host>", "VoiceVoxホスト", DEFAULT_HOST)
  .option("--port <port>", "VoiceVoxポート", String(DEFAULT_PORT))
  .option("-s, --speaker <id>", "話者ID")
  .option("--speed <speed>", "話速 (例: 1.3)")
  .option("--timeout <ms>", "タイムアウト (ミリ秒)")
  .option("--retry-count <count>", "リトライ回数 (ネットワークエラー/タイムアウト時)")
  .option("--retry-delay <ms>", "リトライ間隔 (ミリ秒)")
  .option("--fallback <text>", "transcript がない場合のメッセージ", "クロードの作業が完了しました")
  .action(async (payload, options) => {
    await runSpeakHooks({
      host: options.host,
      port: Number(options.port),
      speaker: options.speaker !== undefined ? Number(options.speaker) : undefined,
      speed: options.speed !== undefined ? Number(options.speed) : undefined,
      timeoutMs: options.timeout !== undefined ? Number(options.timeout) : undefined,
      retryCount: options.retryCount !== undefined ? Number(options.retryCount) : undefined,
      retryDelayMs: options.retryDelay !== undefined ? Number(options.retryDelay) : undefined,
      fallback: options.fallback,
      payload,
    });
  });

const config = program
  .command("config")
  .description("デフォルト設定を管理します (~/.config/voicevox-cli/config.json)");

config
  .command("get")
  .description("現在の設定を表示します")
  .action(async () => {
    await runConfigGet();
  });

config
  .command("set <key> <value>")
  .description("設定を変更します (key: speaker, speaker-pool, speed, timeoutMs, retryCount, retryDelayMs)")
  .action(async (key, value) => {
    await runConfigSet(key, value);
  });

program
  .command("setup-hooks")
  .description("Claude Code hooks に voicevox-cli speak-hooks を設定します")
  .option("--scope <scope>", "設定スコープ (project または user)", "project")
  .option("--events <events>", "カンマ区切りでイベントを指定 (例: Stop,SubagentStop,Notification)")
  .option("--all", "全17イベントを設定する", false)
  .option("--dry-run", "設定をファイルに書き込まず出力のみ", false)
  .action(async (options) => {
    const defaultEvents = ["Stop", "SubagentStop", "Notification"];
    const allEvents = [
      "SessionStart",
      "SessionEnd",
      "UserPromptSubmit",
      "PreToolUse",
      "PostToolUse",
      "PostToolUseFailure",
      "Notification",
      "SubagentStart",
      "SubagentStop",
      "Stop",
      "TeammateIdle",
      "TaskCompleted",
      "ConfigChange",
      "WorktreeCreate",
      "WorktreeRemove",
      "PreCompact",
      "PermissionRequest",
    ];

    let events: string[];
    if (options.all) {
      events = allEvents;
    } else if (options.events) {
      events = options.events.split(",").map((e: string) => e.trim());
    } else {
      events = defaultEvents;
    }

    await runSetupHooks({
      scope: options.scope as "project" | "user",
      events,
      dryRun: options.dryRun,
    });
  });

program
  .command("install")
  .description("Claude Code スキルや MCP サーバー設定をインストールします")
  .option("--skills", "スキルファイルをインストールする")
  .option("--mcp", "MCP サーバー設定を settings.json に追加する")
  .addOption(
    new Option("--scope <scope>", "インストールスコープ")
      .choices(["project", "user"])
      .default("project")
  )
  .action(async (options) => {
    await runInstall({
      skills: options.skills ?? false,
      mcp: options.mcp ?? false,
      scope: options.scope,
    });
  });

program.parse(process.argv);
