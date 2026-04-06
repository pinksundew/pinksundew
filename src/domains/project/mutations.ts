import { SupabaseClient } from '@supabase/supabase-js'
import { Project } from './types'

export async function createProject(
  client: SupabaseClient,
  data: { name: string; description?: string; created_by: string }
): Promise<Project> {
  const { data: project, error } = await client
    .from('projects')
    .insert(data)
    .select()
    .single()

  if (error) throw error

  // The policy allows the creator to insert themselves as owner
  const { error: memberError } = await client
    .from('project_members')
    .insert({
      project_id: project.id,
      user_id: data.created_by,
      role: 'owner',
    })

  if (memberError) {
    // Attempt rollback visually but it's okay for now
    throw memberError
  }

  return project
}
