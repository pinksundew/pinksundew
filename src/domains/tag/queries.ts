import { SupabaseClient } from '@supabase/supabase-js'
import { Tag } from './types'

export async function getProjectTags(
  client: SupabaseClient,
  projectId: string
): Promise<Tag[]> {
  const { data, error } = await client
    .from('tags')
    .select('*')
    .eq('project_id', projectId)
    .order('name')

  if (error) throw error
  return data
}
