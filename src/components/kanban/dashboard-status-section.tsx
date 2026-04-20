'use client'

import { useCallback, useEffect, useState, type KeyboardEvent, type ReactNode } from 'react'
import {
  Bot,
  Clock3,
  Code2,
  Cpu,
  Download,
  FileText,
  MousePointer2,
  PlugZap,
  Radio,
  Settings2,
  Sparkles,
  Waves,
  Wind,
  type LucideIcon,
} from 'lucide-react'
import type { ProjectDashboardStatus } from '@/domains/project/dashboard-status'
import { getSetupClientLabel, isSetupClient } from '@/domains/setup-token/types'

type DashboardStatusSectionProps = {
  projectId: string
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
})

const DASHBOARD_REFRESH_INTERVAL_MS = 15_000

const TARGET_ICONS: Record<string, LucideIcon> = {
  sync_target_vscode: Code2,
  sync_target_cursor: MousePointer2,
  sync_target_codex: Bot,
  sync_target_claude: Sparkles,
  sync_target_windsurf: Wind,
  sync_target_antigravity: Cpu,
}

type DashboardMcpClientId = ProjectDashboardStatus['mcp']['activeClients'][number]['id']

const MCP_CLIENT_ICONS: Record<DashboardMcpClientId, LucideIcon> = {
  cursor: MousePointer2,
  codex: Bot,
  'claude-code': Sparkles,
  antigravity: Cpu,
  vscode: Code2,
}

function formatStatusTime(value: string | null | undefined) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return STATUS_TIME_FORMATTER.format(date)
}

function formatConnectedClient(value: string | null | undefined) {
  if (!value) {
    return null
  }

  if (isSetupClient(value)) {
    return getSetupClientLabel(value)
  }

  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function handleCardKeyDown(event: KeyboardEvent<HTMLDivElement>, onActivate: () => void) {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return
  }

  event.preventDefault()
  onActivate()
}

export function DashboardStatusSection({
  projectId,
  status,
  isGuestMode,
  isSelectionMode,
  settingsSlot,
  onOpenConnect,
  onOpenInstructions,
  onStartExport,
}: DashboardStatusSectionProps) {
  const [currentStatus, setCurrentStatus] = useState<ProjectDashboardStatus | null>(
    status ?? null
  )

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setCurrentStatus(status ?? null)
    }, 0)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [status])

  const refreshDashboardStatus = useCallback(async () => {
    if (isGuestMode) return

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/dashboard-status`,
        {
          cache: 'no-store',
        }
      )

      if (!response.ok) return

      const nextStatus = (await response.json()) as ProjectDashboardStatus
      setCurrentStatus(nextStatus)
    } catch (error) {
      console.error('Error refreshing dashboard status:', error)
    }
  }, [isGuestMode, projectId])

  useEffect(() => {
    if (isGuestMode) return

    const refreshSoon = () => {
      void refreshDashboardStatus()
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshSoon()
      }
    }

    const initialRefresh = window.setTimeout(() => {
      refreshSoon()
    }, 0)
    const interval = window.setInterval(() => {
      refreshSoon()
    }, DASHBOARD_REFRESH_INTERVAL_MS)

    window.addEventListener('focus', refreshSoon)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearTimeout(initialRefresh)
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshSoon)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isGuestMode, refreshDashboardStatus])

  const mcp = currentStatus?.mcp
  const hasConnected = Boolean(mcp?.hasConnected)
  const isActive = Boolean(mcp?.isActive)
  const lastConnected = formatStatusTime(mcp?.lastConnectedAt)
  const lastSync = formatStatusTime(currentStatus?.instructionSync.lastSyncedAt)
  const connectedClient = formatConnectedClient(mcp?.lastSetupClient)
  const activeClients = mcp?.activeClients ?? []
  const enabledTargets =
    currentStatus?.instructionSync.targets.filter((target) => target.enabled) ?? []
  const connectButtonLabel = isGuestMode || !hasConnected ? 'Set Up' : isActive ? 'Connected' : 'Reconnect'

  return (
    <section className="w-full md:w-[63rem] max-w-full">
      <div className="grid gap-3 lg:grid-cols-2">
        <div
          role="button"
          tabIndex={0}
          onClick={onOpenConnect}
          onKeyDown={(event) => handleCardKeyDown(event, onOpenConnect)}
          className="cursor-pointer rounded-lg border border-pink-200/70 bg-white p-4 shadow-sm transition-all hover:border-pink-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/25"
        >
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
                {isActive && activeClients.length > 0 ? (
                  <>
                    <span className="font-medium text-foreground">Active on</span>
                    {activeClients.map((client) => {
                      const ClientIcon = MCP_CLIENT_ICONS[client.id] ?? Waves

                      return (
                        <span
                          key={client.id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-pink-50 px-2.5 py-1 font-medium text-pink-800"
                        >
                          <ClientIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          {client.name}
                        </span>
                      )
                    })}
                  </>
                ) : lastConnected ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    Last connected <time suppressHydrationWarning>{lastConnected}</time>
                  </span>
                ) : (
                  <span>Use Set Up to connect this project.</span>
                )}
                {connectedClient ? (
                  <span>
                    {isActive && activeClients.length === 0 ? 'Active via' : 'Last setup via'}{' '}
                    {connectedClient}
                  </span>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onOpenConnect()
              }}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full border border-pink-300 bg-pink-100 px-4 text-sm font-semibold text-pink-900 shadow-sm transition-colors hover:bg-pink-200"
            >
              <Radio className="h-4 w-4" />
              {connectButtonLabel}
            </button>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={onOpenInstructions}
          onKeyDown={(event) => handleCardKeyDown(event, onOpenInstructions)}
          className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/25"
        >
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
                    <span>
                      {lastSync ? (
                        <>
                          Last sync <time suppressHydrationWarning>{lastSync}</time>
                        </>
                      ) : (
                        'No sync yet'
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {enabledTargets.length > 0 ? (
                  enabledTargets.map((target) => {
                    const TargetIcon = TARGET_ICONS[target.id] ?? Waves

                    return (
                      <span
                        key={target.id}
                        title={`${target.name} - ${target.filePath}`}
                        aria-label={`${target.name} target enabled`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 shadow-sm"
                      >
                        <TargetIcon className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )
                  })
                ) : (
                  <span className="text-sm text-muted-foreground">No targets selected</span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onOpenInstructions()
              }}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
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
