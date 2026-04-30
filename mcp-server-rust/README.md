# Pink Sundew MCP Server (Rust)

Rust runtime implementation of the Pink Sundew MCP stdio server.

## Runtime state

- Global auth is stored in the platform config directory at `pinksundew-mcp/auth.json`.
- Workspace project context is stored locally at `.pinksundew/project.json`.
- Client MCP configs launch `pinksundew-mcp` only; they do not store API keys or project IDs.
- Cursor sync writes managed Pink Sundew project rules into `.cursor/rules/*.mdc`.
- End users do not need Node.js to install or run `pinksundew-mcp`; Node remains a web-app development dependency for this repo only.

## Optional runtime env vars

- `PINKSUNDEW_URL` (optional)
- `PINKSUNDEW_MCP_LOG_LEVEL` (default: `info`)
- `PINKSUNDEW_MCP_PANIC_POLICY` (`graceful_exit` or `supervise`)
- `PINKSUNDEW_MCP_UPDATE_CHECK_TTL_HOURS` (default: `24`)
- `PINKSUNDEW_MCP_DISTRIBUTION_CHANNEL` (optional override: `brew`, `direct`, `unknown`; `npm-wrapper` is legacy/deprecated)

## Development

```bash
cargo run --bin pinksundew-mcp
```

## Setup CLI

```bash
# Friendly terminal wizard
pinksundew-mcp init

# Web handoff
pinksundew-mcp setup --token pst_... --client codex --project your-project-uuid

# Power-user commands
pinksundew-mcp register codex
pinksundew-mcp link --project your-project-uuid
pinksundew-mcp unlink
pinksundew-mcp status
```

The register flow previews changes, prompts by default, creates a backup in your system temp directory, and then writes atomically.

## Notes

- Stdout is reserved for MCP JSON-RPC frames.
- Logging is routed to stderr only.
- Request-level panics are converted to JSON-RPC errors.
- Background sync panics are supervised according to panic policy.
- Update checks are passive, cached on disk, and never auto-update binaries.
- Hello- bump test
