import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { homedir } from "node:os";
import { join } from "node:path";

export type HookScope = "project" | "user";

interface ClaudeSettings {
  permissions?: Record<string, unknown>;
  hooks?: Record<string, unknown>;
  env?: Record<string, unknown>;
  [key: string]: unknown;
}

function getSettingsPath(scope: HookScope): string {
  if (scope === "user") {
    return join(homedir(), ".claude", "settings.json");
  }
  return join(process.cwd(), ".claude", "settings.json");
}

function readSettings(path: string): ClaudeSettings {
  if (!existsSync(path)) {
    return {};
  }
  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function writeSettings(path: string, settings: ClaudeSettings): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(settings, null, 2) + "\n", "utf-8");
}

/**
 * voicevox-cli speak-hooks を呼び出す hook 設定を生成
 */
function generateVoiceVoxHooks(events: string[]): Record<string, unknown[]> {
  const hooks: Record<string, unknown[]> = {};
  for (const event of events) {
    hooks[event] = [
      {
        hooks: [
          {
            type: "command",
            command: "voicevox-cli speak-hooks",
          },
        ],
      },
    ];
  }
  return hooks;
}

/**
 * 既存の hooks 設定と統合（voicevox-cli の hook があれば更新、なければ追加）
 */
function mergeHooks(
  existing: Record<string, unknown[]> | undefined,
  newHooks: Record<string, unknown[]>
): Record<string, unknown[]> {
  const result: Record<string, unknown[]> = { ...existing };

  for (const [event, hookConfigs] of Object.entries(newHooks)) {
    if (!result[event]) {
      result[event] = hookConfigs;
    } else {
      // voicevox-cli speak-hooks を含む hook を探して更新、なければ追加
      const existingHooks = result[event] as Array<{ hooks?: Array<{ command?: string; type?: string }> }>;
      let found = false;

      for (const hookConfig of existingHooks) {
        if (hookConfig.hooks) {
          for (const hook of hookConfig.hooks) {
            if (hook.command?.includes("voicevox-cli speak-hooks")) {
              // 既存の設定を更新
              hook.command = "voicevox-cli speak-hooks";
              found = true;
              break;
            }
          }
        }
        if (found) break;
      }

      if (!found) {
        result[event] = [...result[event], ...hookConfigs];
      }
    }
  }

  return result;
}

export async function runSetupHooks(options: {
  scope: HookScope;
  events: string[];
  dryRun: boolean;
}): Promise<void> {
  const settingsPath = getSettingsPath(options.scope);

  // 既存設定を読み込み
  const existingSettings = readSettings(settingsPath);

  // 新しい hooks 設定を生成
  const newHooks = generateVoiceVoxHooks(options.events);

  // 既存設定と統合
  const mergedHooks = mergeHooks(
    existingSettings.hooks as Record<string, unknown[]> | undefined,
    newHooks
  );

  const newSettings: ClaudeSettings = {
    ...existingSettings,
    hooks: mergedHooks,
  };

  if (options.dryRun) {
    console.log(JSON.stringify({
      scope: options.scope,
      path: settingsPath,
      settings: newSettings,
    }, null, 2));
    return;
  }

  writeSettings(settingsPath, newSettings);

  console.log(JSON.stringify({
    status: "ok",
    scope: options.scope,
    path: settingsPath,
    events: options.events,
    message: `Hooks configured for ${options.events.length} event(s)`,
  }, null, 2));
}
