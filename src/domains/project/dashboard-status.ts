import type { SupabaseClient } from '@supabase/supabase-js'
import { getProjectAgentControls } from '@/domains/agent-control/queries'
import {
  INSTRUCTION_SYNC_TARGET_CATALOG,
  type InstructionSyncTargetId,
} from '@/domains/agent-control/types'
import { getProjectInstructionSetMetadata } from '@/domains/agent-instruction/queries'
import { getProjectMcpActivities, type ProjectMcpActivity } from '@/domains/project/mcp-activity'
import {
  getSetupClientLabel,
  isSetupClient,
  type SetupClient,
} from '@/domains/setup-token/types'

const ACTIVE_MCP_WINDOW_MS = 2 * 60 * 1000

export type InstructionSyncTargetStatus = {
  id: InstructionSyncTargetId
  name: string
  filePath: string
  enabled: boolean
}

export type ProjectMcpClientStatus = {
  id: SetupClient
  isActive: boolean
  lastSeenAt: string
  name: string
}

export type ProjectDashboardStatus = {
  mcp: {
    activeClients: ProjectMcpClientStatus[]
    hasConnected: boolean
    isActive: boolean
    lastConnectedAt: string | null
    lastSetupAt: string | null
    lastSetupClient: string | null
  }
  instructionSync: {
    targets: InstructionSyncTargetStatus[]
    lastSyncedAt: string | null
  }
}

type UsedSetupTokenRow = {
  client: string
  used_at: string | null
}

function getLatestIso(values: Array<string | null | undefined>) {
  return values.reduce<string | null>((latest, value) => {
    if (!value) return latest

    const timestamp = new Date(value).getTime()
    if (Number.isNaN(timestamp)) return latest
    if (!latest) return value

    return timestamp > new Date(latest).getTime() ? value : latest
  }, null)
}

function isClientActive(lastSeenAt: string) {
  const timestamp = new Date(lastSeenAt).getTime()
  if (Number.isNaN(timestamp)) {
    return false
  }

  return Date.now() - timestamp <= ACTIVE_MCP_WINDOW_MS
}

function buildMcpClientStatuses(activities: ProjectMcpActivity[]): ProjectMcpClientStatus[] {
  const latestByClient = new Map<SetupClient, string>()

  for (const activity of activities) {
    if (!isSetupClient(activity.client) || latestByClient.has(activity.client)) {
      continue
    }

    latestByClient.set(activity.client, activity.last_seen_at)
  }

  return Array.from(latestByClient.entries())
    .map(([clientId, lastSeenAt]) => ({
      id: clientId,
      isActive: isClientActive(lastSeenAt),
      lastSeenAt,
      name: getSetupClientLabel(clientId),
    }))
    .sort((left, right) => new Date(right.lastSeenAt).getTime() - new Date(left.lastSeenAt).getTime())
}

export async function getProjectDashboardStatus(
  client: SupabaseClient,
  projectId: string,
  userId: string
): Promise<ProjectDashboardStatus> {
  const [agentControls, instructionSets, activities, setupTokenResult] = await Promise.all([
    getProjectAgentControls(client, projectId),
    getProjectInstructionSetMetadata(client, projectId),
    getProjectMcpActivities(client, projectId, userId),
    client
      .from('cli_setup_tokens')
      .select('client, used_at')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .not('used_at', 'is', null)
      .order('used_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (setupTokenResult.error) {
    throw setupTokenResult.error
  }

  const latestSetupToken = setupTokenResult.data as UsedSetupTokenRow | null
  const lastSetupAt = latestSetupToken?.used_at ?? null
  const latestProjectActivity = activities[0]?.last_seen_at ?? null
  const lastInstructionFileUpdate = getLatestIso(
    instructionSets.flatMap((instructionSet) =>
      instructionSet.files.map((file) => file.updated_at)
    )
  )
  const lastSyncedAt = getLatestIso([
    agentControls.updated_at,
    lastInstructionFileUpdate,
  ])
  const lastConnectedAt = getLatestIso([latestProjectActivity, lastSetupAt])
  const clientStatuses = buildMcpClientStatuses(activities)
  const activeClients = clientStatuses.filter((activity) => activity.isActive)
  const isActive = Boolean(
    (latestProjectActivity && isClientActive(latestProjectActivity)) || activeClients.length > 0
  )

  return {
    mcp: {
      activeClients,
      hasConnected: Boolean(lastSetupAt || latestProjectActivity),
      isActive,
      lastConnectedAt,
      lastSetupAt,
      lastSetupClient: latestSetupToken?.client ?? null,
    },
    instructionSync: {
      targets: INSTRUCTION_SYNC_TARGET_CATALOG.map((target) => ({
        id: target.id,
        name: target.name,
        filePath: target.file_path,
        enabled: agentControls.tool_toggles[target.id],
      })),
      lastSyncedAt,
    },
  }
}
