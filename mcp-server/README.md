# Pink Sundew MCP Server

Model Context Protocol server for Pink Sundew's Kanban bridge API.

This server is project-first: it can read boards, inspect tickets, move work between active stages, manage tags, export prompts, and restore tasks from the abyss.

## Install

```bash
npm install -g @pinksundew/mcp
```

## Required environment variables

- `AGENTPLANNER_API_KEY`: API key created in the Pink Sundew dashboard.
- `AGENTPLANNER_PROJECT_IDS`: Comma-separated list of project UUIDs the agent can access. Required for project scoping.
- `AGENTPLANNER_URL`: Optional. Defaults to `https://pinksundew.com`.

`get_project_board` enforces instruction hydration for markdown files: when `.md` metadata is returned, the server checks `content_hash`, fetches new/changed files, and fails if any markdown content cannot be resolved.

## Run

```bash
AGENTPLANNER_API_KEY=your_api_key \
AGENTPLANNER_PROJECT_IDS=project-uuid-1,project-uuid-2 \
pinksundew-mcp
```

## Example MCP client configuration

```json
{
  "mcpServers": {
    "pinksundew": {
      "command": "npx",
      "args": ["-y", "@pinksundew/mcp"],
      "env": {
        "AGENTPLANNER_API_KEY": "your_api_key",
        "AGENTPLANNER_PROJECT_IDS": "your_project_id"
      }
    }
  }
}
```

## Development

```bash
npm install
npm run build
```