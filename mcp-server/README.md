# AgentPlanner MCP Server

Model Context Protocol server for AgentPlanner's Kanban bridge API.

## Install

```bash
npm install -g agentplanner-mcp
```

## Required environment variables

- `AGENTPLANNER_URL`: Base URL of the deployed AgentPlanner app.
- `AGENTPLANNER_API_KEY`: API key created in the AgentPlanner dashboard.

## Run

```bash
AGENTPLANNER_URL=https://your-agentplanner.example.com \
AGENTPLANNER_API_KEY=your_api_key \
agentplanner-mcp
```

## Example MCP client configuration

```json
{
  "mcpServers": {
    "agentplanner": {
      "command": "agentplanner-mcp",
      "env": {
        "AGENTPLANNER_URL": "https://your-agentplanner.example.com",
        "AGENTPLANNER_API_KEY": "your_api_key"
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