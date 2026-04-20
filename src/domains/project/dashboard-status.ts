import type { SupabaseClient } from '@supabase/supabase-js'
import { getProjectAgentControls } from '@/domains/agent-control/queries'
import {
  INSTRUCTION_SYNC_TARGET_CATALOG,
  type InstructionSyncTargetId,
} from '@/domains/agent-control/types'
import { getUserApiKeys } from '@/domains/api-key/queries'
import { getProjectInstructionSetMetadata } from '@/domains/agent-instruction/queries'

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
  const [agentControls, instructionSets, apiKeys, setupTokenResult] = await Promise.all([
    getProjectAgentControls(client, projectId),
    getProjectInstructionSetMetadata(client, projectId),
    getUserApiKeys(client, userId),
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
  const latestApiKeyUse = getLatestIso(apiKeys.map((key) => key.last_used_at))
  const lastInstructionFileUpdate = getLatestIso(
    instructionSets.flatMap((instructionSet) =>
      instructionSet.files.map((file) => file.updated_at)
    )
  )
  const lastSyncedAt = getLatestIso([
    agentControls.updated_at,
    lastInstructionFileUpdate,
  ])
  const lastConnectedAt = getLatestIso([latestApiKeyUse, lastSetupAt])
  const latestApiKeyUseTime = latestApiKeyUse ? new Date(latestApiKeyUse).getTime() : null
  const isActive =
    latestApiKeyUse !== null &&
    latestApiKeyUseTime !== null &&
    Date.now() - latestApiKeyUseTime <= ACTIVE_MCP_WINDOW_MS

  return {
    mcp: {
      hasConnected: Boolean(lastSetupAt || latestApiKeyUse),
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
