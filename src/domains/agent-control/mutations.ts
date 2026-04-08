import { SupabaseClient } from '@supabase/supabase-js'
import {
  ProjectAgentControls,
  ToolToggleMap,
  normalizeToolToggles,
} from './types'

type UpsertProjectAgentControlsInput = {
  project_id: string
  allow_task_completion: boolean
  tool_toggles: ToolToggleMap
  updated_by?: string | null
}

type ProjectAgentControlsRow = {
  project_id: string
  allow_task_completion: boolean
  tool_toggles: unknown
  created_at: string
  updated_at: string
  updated_by: string | null
}

export async function upsertProjectAgentControls(
  client: SupabaseClient,
  input: UpsertProjectAgentControlsInput
): Promise<ProjectAgentControls> {
  const { data, error } = await client
    .from('project_agent_controls')
    .upsert(
      {
        project_id: input.project_id,
        allow_task_completion: input.allow_task_completion,
        tool_toggles: input.tool_toggles,
        updated_at: new Date().toISOString(),
        updated_by: input.updated_by ?? null,
      },
      { onConflict: 'project_id' }
    )
    .select('*')
    .single()

  if (error) {
    throw error
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
