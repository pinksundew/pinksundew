import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { Project } from '@/domains/project/types'

type ProjectRow = Database['public']['Tables']['projects']['Row']

function mapProjectRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    created_by: row.created_by ?? '',
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
    is_guest: row.is_guest ?? false,
  }
}

export async function ensureGuestProject(
  client: SupabaseClient<Database>,
  userId: string
): Promise<Project> {
  const { data: existingProject, error: existingProjectError } = await client
    .from('projects')
    .select('*')
    .eq('created_by', userId)
    .eq('is_guest', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingProjectError) {
    throw existingProjectError
  }

  if (existingProject) {
    return mapProjectRow(existingProject)
  }

  const { data: projectId, error: bootstrapError } = await client.rpc('bootstrap_guest_project')
  if (bootstrapError) {
    throw bootstrapError
  }

  if (typeof projectId !== 'string' || !projectId) {
    throw new Error('Guest project bootstrap returned an invalid response')
  }

  const { data: createdProject, error: createdProjectError } = await client
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (createdProjectError) {
    throw createdProjectError
  }

  return mapProjectRow(createdProject)
}
