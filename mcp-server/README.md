# AgentPlanner MCP Server

Model Context Protocol server for AgentPlanner's Kanban bridge API.

This server is project-first: it can read boards, inspect tickets, move work between active stages, manage tags, export prompts, and restore tasks from the abyss.

## Install

```bash
npm install -g @saltedroads/agentplanner-mcp
```

## Required environment variables

- `AGENTPLANNER_URL`: Base URL of the deployed AgentPlanner app.
- `AGENTPLANNER_API_KEY`: API key created in the AgentPlanner dashboard.
- `AGENTPLANNER_ALLOW_TASK_COMPLETION`: Optional. Defaults to `false`. Set to `true` only when you want the MCP server to be able to move tasks into `done`.

`get_project_board` now strictly enforces instruction hydration for markdown files: when `.md` metadata is returned, the server checks `content_hash`, fetches new/changed files, and fails if any markdown content cannot be resolved.

## Run

```bash
AGENTPLANNER_URL=https://your-agentplanner.example.com \
AGENTPLANNER_API_KEY=your_api_key \
AGENTPLANNER_ALLOW_TASK_COMPLETION=false \
agentplanner-mcp
```

## Example MCP client configuration

```json
{
  "mcpServers": {
    "agentplanner": {
      "command": "npx",
      "args": ["-y", "@saltedroads/agentplanner-mcp"],
      "env": {
        "AGENTPLANNER_URL": "https://your-agentplanner.example.com",
        "AGENTPLANNER_API_KEY": "your_api_key",
        "AGENTPLANNER_ALLOW_TASK_COMPLETION": "false"
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