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
- `mcp-server-rust/`: Native Rust MCP runtime
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

Build native Rust MCP server:

```bash
cargo build --manifest-path mcp-server-rust/Cargo.toml
```

Compatibility npm launcher package:

```bash
npm --prefix mcp-server run build
```

The workspace MCP config is in `.vscode/mcp.json`.

Preferred install/upgrade channel for users:

```bash
brew install pinksundew/tap/pinksundew-mcp
brew upgrade pinksundew/tap/pinksundew-mcp
```

MCP release tags are canonicalized as `vX.Y.Z`.
