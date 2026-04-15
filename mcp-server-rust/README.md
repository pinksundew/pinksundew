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

## Development

```bash
cargo run --bin pinksundew-mcp
```

## Notes

- Stdout is reserved for MCP JSON-RPC frames.
- Logging is routed to stderr only.
- Request-level panics are converted to JSON-RPC errors.
- Background sync panics are supervised according to panic policy.
