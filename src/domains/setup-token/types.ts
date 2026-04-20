export const SETUP_CLIENTS = [
  'cursor',
  'codex',
  'claude-code',
  'antigravity',
  'vscode',
] as const

export type SetupClient = (typeof SETUP_CLIENTS)[number]

const SETUP_CLIENT_LABELS: Record<SetupClient, string> = {
  cursor: 'Cursor',
  codex: 'Codex',
  'claude-code': 'Claude Code',
  antigravity: 'Antigravity',
  vscode: 'VS Code',
}

const SETUP_CLIENT_NAME_ALIASES: Record<string, SetupClient> = {
  cursor: 'cursor',
  codex: 'codex',
  'claude code': 'claude-code',
  'claude-code': 'claude-code',
  antigravity: 'antigravity',
  vscode: 'vscode',
  'vs code': 'vscode',
}

export function isSetupClient(value: unknown): value is SetupClient {
  return typeof value === 'string' && SETUP_CLIENTS.includes(value as SetupClient)
}

export function getSetupClientLabel(client: SetupClient) {
  return SETUP_CLIENT_LABELS[client]
}

export function inferSetupClientFromApiKeyName(value: string | null | undefined): SetupClient | null {
  if (!value) return null

  const normalizedValue = value.trim().toLowerCase()
  const match = normalizedValue.match(/^mcp\s+(.+?)\s+setup$/)
  if (!match) {
    return null
  }

  return SETUP_CLIENT_NAME_ALIASES[match[1].trim()] ?? null
}
