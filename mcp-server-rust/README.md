# Pink Sundew MCP Server (Rust)

Rust runtime implementation of the Pink Sundew MCP stdio server.

## Required environment variables

- `AGENTPLANNER_API_KEY`
- `AGENTPLANNER_PROJECT_ID` (strict single UUID per workspace)
- `AGENTPLANNER_CLIENT_ENV` (optional)
- `AGENTPLANNER_TARGET_FILES` (optional)
- `AGENTPLANNER_URL` (optional)

## Optional runtime env vars

- `PINKSUNDEW_MCP_LOG_LEVEL` (default: `info`)
- `PINKSUNDEW_MCP_PANIC_POLICY` (`graceful_exit` or `supervise`)
- `PINKSUNDEW_MCP_UPDATE_CHECK_TTL_HOURS` (default: `24`)
- `PINKSUNDEW_MCP_DISTRIBUTION_CHANNEL` (optional override: `brew`, `npm-wrapper`, `direct`, `unknown`)

## Development

```bash
cargo run --bin pinksundew-mcp
```

## Register helper CLI (v1)

```bash
# Codex global config
pinksundew-mcp register codex --api-key ap_... --project-id your-project-uuid

# Antigravity project config
pinksundew-mcp register antigravity --api-key ap_... --project-id your-project-uuid
```

The register flow previews changes, prompts by default, creates a backup in your system temp directory, and then writes atomically.

## Notes

- Stdout is reserved for MCP JSON-RPC frames.
- Logging is routed to stderr only.
- Request-level panics are converted to JSON-RPC errors.
- Background sync panics are supervised according to panic policy.
- Update checks are passive, cached on disk, and never auto-update binaries.
