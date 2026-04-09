# AgentPlanner

AgentPlanner is a Next.js 16 board application with Supabase-backed data, an MCP bridge API, and SST/OpenNext deployment.

## Tech Stack

- Next.js App Router (TypeScript)
- Supabase (auth, database, realtime)
- SST + OpenNext (AWS deployment)
- MCP server package in `mcp-server/`

## Workspace Layout

- `src/`: app routes, UI, domain logic, bridge endpoints
- `supabase/`: SQL migrations
- `mcp-server/`: MCP server source and package
- `sst.config.ts`: production deployment config

## Local Development

Install dependencies:

```bash
npm install
```

Start dev server:

```bash
npm run dev
```

## Build

Build command:

```bash
npm run build
```

`prebuild` automatically clears stale `.next` artifacts to avoid intermittent `ENOTEMPTY` build failures.

## Deploy

Deploy production with SST:

```bash
npx sst deploy --stage production
```

## MCP Server

Build MCP server:

```bash
npm --prefix mcp-server run build
```

The workspace MCP config is in `.vscode/mcp.json`.
