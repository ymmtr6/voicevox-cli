#!/usr/bin/env node
import { Command } from "commander";
import { runTest } from "./commands/test.js";
import { runSpeak, runSpeakers } from "./commands/speak.js";
import { runMcpServer } from "./commands/mcp-server.js";
import { runConfigGet, runConfigSet } from "./commands/config.js";
import { runPickSpeaker } from "./commands/pick-speaker.js";
import { runCurrentSpeaker } from "./commands/current-speaker.js";
import { resolveConfig } from "./config.js";

const DEFAULT_HOST = "localhost";
const DEFAULT_PORT = 50021;

const program = new Command();

program
  .name("voicevox-cli")
  .description("VoiceVox API CLI - ローカルのVoiceVoxエンジンを操作するツール")
  .version("1.0.0");

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
  .action(async (text, options) => {
    const { speaker, speed } = await resolveConfig({
      cliSpeaker: options.speaker !== undefined ? Number(options.speaker) : undefined,
      cliSpeed: options.speed !== undefined ? Number(options.speed) : undefined,
    });
    await runSpeak(text, options.host, Number(options.port), speaker, speed);
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
  .description("設定を変更します (key: speaker, speed)")
  .action(async (key, value) => {
    await runConfigSet(key, value);
  });

program.parse(process.argv);
