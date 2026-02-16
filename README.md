# Glanceway MCP Server

MCP (Model Context Protocol) server for [Glanceway](https://glanceway.app), the macOS menu bar information app. Lets AI assistants read your sources and items.

## Install

### mcpb (recommended)

Download [`glanceway.mcpb`](https://github.com/glanceway/glanceway-mcp/releases/latest/download/glanceway.mcpb) from the [latest release](https://github.com/glanceway/glanceway-mcp/releases/latest) and open it in Claude Desktop to install.

### Build from source

```bash
npm install
npm run build    # bundle to dist/mcpb/server/index.mjs
npm run pack     # build + produce dist/glanceway.mcpb
```

### Add to Claude Desktop manually

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "glanceway": {
      "command": "node",
      "args": ["/path/to/dist/mcpb/server/index.mjs"]
    }
  }
}
```

### Add to Claude Code

```bash
claude mcp add glanceway node /path/to/dist/mcpb/server/index.mjs
```

## Tools

| Tool | Description |
|------|-------------|
| `glanceway_list_sources` | List all enabled sources |
| `glanceway_list_items` | List items, optionally filtered by `sourceId` or `isRead` |

## Prompts

| Prompt | Description |
|--------|-------------|
| `summarize` | Fetch all items and produce a grouped digest |

## How it works

The server discovers the running Glanceway app by scanning localhost ports 9470-9479 for the local API. Glanceway must be running for the tools to work.
