# Pink Sundew

Pink Sundew is a Next.js 16 board application with Supabase-backed data, an MCP bridge API, and SST/OpenNext deployment.

## Tech Stack

- Next.js App Router (TypeScript)
- Supabase (auth, database, realtime)
- SST + OpenNext (AWS deployment)
- Native Rust MCP server in `mcp-server-rust/`

## Workspace Layout

- `src/`: app routes, UI, domain logic, bridge endpoints
- `supabase/`: SQL migrations
- `mcp-server-rust/`: Native Rust MCP runtime
- `sst.config.ts`: production deployment config

## Runtime Split

- The Pink Sundew web app is still a Next.js workspace, so local frontend development uses Node.js and `npm`.
- The distributed MCP experience is binary-first: end users install and run `pinksundew-mcp` without Node.js.
- Cursor instruction sync now uses managed project rules in `.cursor/rules/*.mdc`; other clients keep their existing synced instruction files.

## Local Development

Install dependencies:

```bash
npm install
```

This installs the web app toolchain only. It is not required for end users who are only setting up the Rust MCP binary.

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

The workspace MCP config is in `.vscode/mcp.json`.

Preferred install/upgrade channel for users:

```bash
brew install pinksundew/tap/pinksundew-mcp
brew upgrade pinksundew/tap/pinksundew-mcp
```

End users do not need Node.js to install or run the MCP server.

MCP release tags are canonicalized as `vX.Y.Z`.
