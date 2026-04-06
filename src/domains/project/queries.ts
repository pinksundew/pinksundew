import { SupabaseClient } from '@supabase/supabase-js'
import { Project } from './types'

export async function getUserProjects(client: SupabaseClient): Promise<Project[]> {
  const { data, error } = await client
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getProject(
  client: SupabaseClient,
  projectId: string
): Promise<Project | null> {
  const { data, error } = await client
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (error) throw error
  return data
}
