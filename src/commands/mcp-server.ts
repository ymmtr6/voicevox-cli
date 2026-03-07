import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { VoiceVoxClient } from "../voicevox/client.js";
import { resolveConfig } from "../config.js";

export async function runMcpServer(host: string, port: number): Promise<void> {
  const server = new Server(
    { name: "voicevox-cli", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "voicevox_test",
        description: "VoiceVoxがlocalhostで起動しているか確認します",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "voicevox_speak",
        description: "VoiceVoxでテキストを読み上げます",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "読み上げるテキスト",
            },
            speaker: {
              type: "number",
              description: "話者ID（デフォルト: 1）",
              default: 1,
            },
            speed: {
              type: "number",
              description: "話速（デフォルト: 1.3）",
              default: 1.3,
            },
          },
          required: ["text"],
        },
      },
      {
        name: "voicevox_speakers",
        description: "VoiceVoxの話者一覧を取得します",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const client = new VoiceVoxClient({ host, port });
    const { name, arguments: args } = request.params;

    try {
      if (name === "voicevox_test") {
        const version = await client.getVersion();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ status: "ok", version, host, port }, null, 2),
            },
          ],
        };
      }

      if (name === "voicevox_speak") {
        const text = String(args?.text ?? "");
        const resolved = await resolveConfig({
          cliSpeaker: args?.speaker !== undefined ? Number(args.speaker) : undefined,
          cliSpeed: args?.speed !== undefined ? Number(args.speed) : undefined,
        });
        const speaker = resolved.speaker;
        const speed = resolved.speed;

        await client.speak(text, speaker, speed);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { status: "ok", text, speaker, speed },
                null,
                2
              ),
            },
          ],
        };
      }

      if (name === "voicevox_speakers") {
        const speakers = await client.getSpeakers();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ status: "ok", speakers }, null, 2),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ status: "error", message: `Unknown tool: ${name}` }),
          },
        ],
        isError: true,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ status: "error", message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
