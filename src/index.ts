#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { AcpClient, AcpApiError } from "./client.js";
import { TOOLS } from "./tools.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new AcpClient(config);

  const server = new McpServer(
    {
      name: "hms-acp-feature-scrumboard",
      version: "1.0.0",
    },
    {
      instructions:
        "Tools for the HumanSoft ACP 'Feature Scrumboard' (web-acp Developer ▸ Feature Scrumboard). " +
        "Two boards — Feature (product-feature cards) and Incident (software-incident cards) — laid out " +
        "in month columns. Pass raw ids (feature_id, incident_id, member[].id, feature[].id); the server " +
        "base64-encodes them as the backend requires. All responses use a { code, message, payload } envelope.",
    }
  );

  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      {
        title: tool.annotations.title,
        description: tool.description,
        inputSchema: tool.shape,
        annotations: tool.annotations,
      },
      async (args: Record<string, unknown>) => {
        try {
          const result = await client.call(tool.constants, args ?? {});
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (err) {
          const message =
            err instanceof AcpApiError
              ? err.message +
                (err.details?.envelopeCode ? ` (envelope code ${err.details.envelopeCode})` : "") +
                (err.details?.httpStatus ? ` [HTTP ${err.details.httpStatus}]` : "")
              : err instanceof Error
                ? err.message
                : String(err);
          return {
            isError: true,
            content: [{ type: "text", text: `Error calling ${tool.name}: ${message}` }],
          };
        }
      }
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr is safe for logging on stdio transport; stdout is the JSON-RPC channel.
  console.error(
    `hms-acp-feature-scrumboard MCP server running (${TOOLS.length} tools) → ${config.baseUrl}${config.apiPath}`
  );
}

main().catch((err) => {
  console.error("Fatal: failed to start MCP server:", err instanceof Error ? err.message : err);
  process.exit(1);
});
