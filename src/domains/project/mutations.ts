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

export async function updateProject(
  client: SupabaseClient,
  id: string,
  updates: Partial<Omit<Project, 'id' | 'created_at' | 'created_by'>>
): Promise<Project> {
  const { data, error } = await client
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteProject(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function inviteMember(
  client: SupabaseClient,
  projectId: string,
  userId: string,
  role: string = 'member'
): Promise<void> {
  const { error } = await client
    .from('project_members')
    .insert({ project_id: projectId, user_id: userId, role })

  if (error) throw error
}

export async function removeMember(
  client: SupabaseClient,
  projectId: string,
  userId: string
): Promise<void> {
  const { error } = await client
    .from('project_members')
    .delete()
    .match({ project_id: projectId, user_id: userId })

  if (error) throw error
}
