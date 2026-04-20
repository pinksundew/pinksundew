import type { ReactNode } from 'react'
import {
  Clock3,
  Download,
  FileText,
  PlugZap,
  Radio,
  Settings2,
} from 'lucide-react'
import type { ProjectDashboardStatus } from '@/domains/project/dashboard-status'

type DashboardStatusSectionProps = {
  status?: ProjectDashboardStatus | null
  isGuestMode: boolean
  isSelectionMode: boolean
  settingsSlot: ReactNode
  onOpenConnect: () => void
  onOpenInstructions: () => void
  onStartExport: () => void
}

const STATUS_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'UTC',
})

const TARGET_GLYPHS: Record<string, string> = {
  sync_target_vscode: 'VS',
  sync_target_cursor: 'CR',
  sync_target_codex: 'CX',
  sync_target_claude: 'CL',
  sync_target_windsurf: 'WS',
  sync_target_antigravity: 'AG',
}

function formatStatusTime(value: string | null | undefined) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return STATUS_TIME_FORMATTER.format(date)
}

function formatClientLabel(value: string | null | undefined) {
  if (!value) return null

  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function DashboardStatusSection({
  status,
  isGuestMode,
  isSelectionMode,
  settingsSlot,
  onOpenConnect,
  onOpenInstructions,
  onStartExport,
}: DashboardStatusSectionProps) {
  const mcp = status?.mcp
  const hasConnected = Boolean(mcp?.hasConnected)
  const isActive = Boolean(mcp?.isActive)
  const lastConnected = formatStatusTime(mcp?.lastConnectedAt)
  const lastSync = formatStatusTime(status?.instructionSync.lastSyncedAt)
  const connectedClient = formatClientLabel(mcp?.lastSetupClient)
  const enabledTargets =
    status?.instructionSync.targets.filter((target) => target.enabled) ?? []

  return (
    <section className="w-full md:w-[63rem] max-w-full">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-pink-200/70 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/20 text-primary-foreground">
                  <PlugZap className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">MCP Server</h2>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    {isActive ? (
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                      </span>
                    ) : (
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-300" />
                    )}
                    <span className="font-medium text-foreground">
                      {isActive ? 'Active and connected' : hasConnected ? 'Not currently active' : 'Setup required'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                {lastConnected ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    Last connected {lastConnected}
                  </span>
                ) : (
                  <span>No connection recorded</span>
                )}
                {connectedClient ? <span>{connectedClient}</span> : null}
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenConnect}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Radio className="h-4 w-4" />
              {isGuestMode || !hasConnected ? 'Set Up' : 'Reconnect'}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cyan-50 text-cyan-700">
                  <FileText className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Agent Instructions</h2>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    <span>{lastSync ? `Last sync ${lastSync}` : 'No sync yet'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {enabledTargets.length > 0 ? (
                  enabledTargets.map((target) => (
                    <span
                      key={target.id}
                      title={`${target.name} - ${target.filePath}`}
                      className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700"
                    >
                      <span className="flex h-5 min-w-5 items-center justify-center rounded bg-white px-1 font-mono text-[10px] text-primary-foreground shadow-sm">
                        {TARGET_GLYPHS[target.id] ?? target.name.slice(0, 2).toUpperCase()}
                      </span>
                      {target.name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No targets selected</span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenInstructions}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <Settings2 className="h-4 w-4" />
              Manage
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">{settingsSlot}</div>
        <button
          type="button"
          onClick={onStartExport}
          disabled={isSelectionMode}
          className={`inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md border px-3 text-sm font-semibold transition-colors ${
            isSelectionMode
              ? 'border-rose-200 bg-rose-50 text-rose-700 opacity-70'
              : 'border-border bg-white text-foreground hover:bg-muted'
          }`}
        >
          <Download className="h-4 w-4" />
          Export To Agent
        </button>
      </div>
    </section>
  )
}
