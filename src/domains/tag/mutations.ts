import { SupabaseClient } from '@supabase/supabase-js'
import { Tag } from './types'

export async function createTag(
  client: SupabaseClient,
  tag: Omit<Tag, 'id'>
): Promise<Tag> {
  const { data, error } = await client
    .from('tags')
    .insert(tag)
    .select()
    .single()

  if (error) throw error
  return data
}
