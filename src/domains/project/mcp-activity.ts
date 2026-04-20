import type { SupabaseClient } from '@supabase/supabase-js'

export type ProjectMcpActivity = {
  client: string
  project_id: string
  user_id: string
  last_seen_at: string
  last_request_path: string | null
  created_at: string
}

type RecordProjectMcpActivityInput = {
  client?: string | null
  projectId: string
  userId: string
  requestPath?: string | null
}

export async function recordProjectMcpActivity(
  client: SupabaseClient,
  input: RecordProjectMcpActivityInput
): Promise<void> {
  const now = new Date().toISOString()
  const activityClient = input.client ?? 'unknown'
  const { error } = await client
    .from('project_mcp_activity')
    .upsert(
      {
        client: activityClient,
        project_id: input.projectId,
        user_id: input.userId,
        last_seen_at: now,
        last_request_path: input.requestPath ?? null,
      },
      { onConflict: 'project_id,user_id,client' }
    )

  if (error) throw error
}

export async function getProjectMcpActivities(
  client: SupabaseClient,
  projectId: string,
  userId: string
): Promise<ProjectMcpActivity[]> {
  const { data, error } = await client
    .from('project_mcp_activity')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .order('last_seen_at', { ascending: false })

  if (error) throw error
  return (data as ProjectMcpActivity[] | null) ?? []
}
