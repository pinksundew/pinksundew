import type { SupabaseClient } from '@supabase/supabase-js'
import { getProjectAgentControls } from '@/domains/agent-control/queries'
import {
  INSTRUCTION_SYNC_TARGET_CATALOG,
  type InstructionSyncTargetId,
} from '@/domains/agent-control/types'
import { getProjectInstructionSetMetadata } from '@/domains/agent-instruction/queries'
import { getProjectMcpActivity } from '@/domains/project/mcp-activity'

const ACTIVE_MCP_WINDOW_MS = 2 * 60 * 1000

export type InstructionSyncTargetStatus = {
  id: InstructionSyncTargetId
  name: string
  filePath: string
  enabled: boolean
}

export type ProjectDashboardStatus = {
  mcp: {
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

export async function getProjectDashboardStatus(
  client: SupabaseClient,
  projectId: string,
  userId: string
): Promise<ProjectDashboardStatus> {
  const [agentControls, instructionSets, activity, setupTokenResult] = await Promise.all([
    getProjectAgentControls(client, projectId),
    getProjectInstructionSetMetadata(client, projectId),
    getProjectMcpActivity(client, projectId, userId),
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
  const latestProjectActivity = activity?.last_seen_at ?? null
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
  const latestProjectActivityTime = latestProjectActivity
    ? new Date(latestProjectActivity).getTime()
    : null
  const isActive =
    latestProjectActivity !== null &&
    latestProjectActivityTime !== null &&
    Date.now() - latestProjectActivityTime <= ACTIVE_MCP_WINDOW_MS

  return {
    mcp: {
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
