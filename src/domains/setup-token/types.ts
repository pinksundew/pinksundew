export const SETUP_CLIENTS = [
  'cursor',
  'codex',
  'claude-code',
  'antigravity',
  'vscode',
] as const

export type SetupClient = (typeof SETUP_CLIENTS)[number]

export function isSetupClient(value: unknown): value is SetupClient {
  return typeof value === 'string' && SETUP_CLIENTS.includes(value as SetupClient)
}
