import type { SupabaseClient } from '@supabase/supabase-js'

export type ProjectMcpActivity = {
  project_id: string
  user_id: string
  last_seen_at: string
  last_request_path: string | null
  created_at: string
}

type RecordProjectMcpActivityInput = {
  projectId: string
  userId: string
  requestPath?: string | null
}

export async function recordProjectMcpActivity(
  client: SupabaseClient,
  input: RecordProjectMcpActivityInput
): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await client
    .from('project_mcp_activity')
    .upsert(
      {
        project_id: input.projectId,
        user_id: input.userId,
        last_seen_at: now,
        last_request_path: input.requestPath ?? null,
      },
      { onConflict: 'project_id,user_id' }
    )

  if (error) throw error
}

export async function getProjectMcpActivity(
  client: SupabaseClient,
  projectId: string,
  userId: string
): Promise<ProjectMcpActivity | null> {
  const { data, error } = await client
    .from('project_mcp_activity')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return (data as ProjectMcpActivity | null) ?? null
}
