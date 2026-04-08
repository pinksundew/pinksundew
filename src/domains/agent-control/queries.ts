import { SupabaseClient } from '@supabase/supabase-js'
import {
  ProjectAgentControls,
  getDefaultToolToggles,
  normalizeToolToggles,
} from './types'

type ProjectAgentControlsRow = {
  project_id: string
  allow_task_completion: boolean
  tool_toggles: unknown
  created_at: string
  updated_at: string
  updated_by: string | null
}

function buildDefaultProjectAgentControls(projectId: string): ProjectAgentControls {
  const now = new Date().toISOString()
  return {
    project_id: projectId,
    allow_task_completion: true,
    tool_toggles: getDefaultToolToggles(),
    created_at: now,
    updated_at: now,
    updated_by: null,
  }
}

export async function getProjectAgentControls(
  client: SupabaseClient,
  projectId: string
): Promise<ProjectAgentControls> {
  const { data, error } = await client
    .from('project_agent_controls')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return buildDefaultProjectAgentControls(projectId)
  }

  const row = data as ProjectAgentControlsRow
  return {
    project_id: row.project_id,
    allow_task_completion: row.allow_task_completion,
    tool_toggles: normalizeToolToggles(row.tool_toggles),
    created_at: row.created_at,
    updated_at: row.updated_at,
    updated_by: row.updated_by,
  }
}
