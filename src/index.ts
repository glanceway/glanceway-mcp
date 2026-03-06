import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Port discovery — scan localhost 9470-9479
// ---------------------------------------------------------------------------

const PORT_START = 9470;
const PORT_END = 9479;

async function discoverPort(): Promise<number> {
  for (let port = PORT_START; port <= PORT_END; port++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/v1/sources`, {
        signal: AbortSignal.timeout(500),
      });
      if (res.ok) return port;
    } catch {
      // port not listening or timed out
    }
  }
  throw new Error(
    "Glanceway is not running or its API is not reachable. Please open Glanceway and try again.",
  );
}

async function apiGet(path: string): Promise<unknown> {
  const port = await discoverPort();
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`Glanceway API returned HTTP ${res.status}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

declare const PKG_VERSION: string;

const server = new McpServer({
  name: "glanceway",
  version: PKG_VERSION,
});

// -- Tools ------------------------------------------------------------------

server.registerTool(
  "glanceway_list_sources",
  { description: "List all enabled sources configured in Glanceway" },
  async () => {
    const data = await apiGet("/v1/sources");
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  },
);

server.registerTool(
  "glanceway_list_items",
  {
    description:
      "List items from Glanceway sources. Returns items sorted by timestamp (newest first).",
    inputSchema: {
      sourceId: z.string().optional().describe("Filter items by source ID"),
      isRead: z.boolean().optional().describe("Filter by read status"),
    },
  },
  async ({ sourceId, isRead }) => {
    const params = new URLSearchParams();
    if (sourceId) params.set("sourceId", sourceId);
    if (isRead !== undefined) params.set("isRead", String(isRead));
    const qs = params.toString();
    const path = qs ? `/v1/items?${qs}` : "/v1/items";
    const data = await apiGet(path);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  },
);

// -- Prompts ----------------------------------------------------------------

server.registerPrompt(
  "summarize_unread",
  { description: "Summarize all unread Glanceway items grouped by source" },
  async () => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Use the glanceway_list_sources tool to get all sources, then use glanceway_list_items with isRead=false to fetch only unread items. Group items by source, and for each source provide:
- Source name
- Number of unread items
- A brief summary of the items (up to 5 per source)

Present the results in a clear, scannable format. Highlight anything that looks time-sensitive or particularly noteworthy. If there are no unread items, say so.`,
        },
      },
    ],
  }),
);

server.registerPrompt(
  "summarize_recent",
  { description: "Summarize Glanceway items from the last day" },
  async () => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Use the glanceway_list_sources tool to get all sources, then use glanceway_list_items to fetch all items. Filter to only items with a timestamp within the last 24 hours, group them by source, and for each source provide:
- Source name
- Number of items in the last 24 hours
- A brief summary of the items

Present the results in a clear, scannable format. Highlight anything that looks time-sensitive or particularly noteworthy. If a source has no items in the last 24 hours, skip it.`,
        },
      },
    ],
  }),
);

server.registerPrompt(
  "summarize_source",
  {
    description: "Summarize items from a specific Glanceway source",
    inputSchema: {
      sourceId: z.string().describe("The source ID to summarize"),
    },
  },
  async ({ sourceId }) => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Use glanceway_list_items with sourceId="${sourceId}" to fetch all items from this source. Provide:
- Total number of items and how many are unread
- A summary of the most recent items (up to 10)
- Any patterns or notable trends in the content

Present the results in a clear, scannable format. Highlight anything that looks time-sensitive or particularly noteworthy.`,
        },
      },
    ],
  }),
);

// -- Start ------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
