import { SupabaseClient } from '@supabase/supabase-js'
import { Profile } from './types'

export async function updateProfile(
  client: SupabaseClient,
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'email' | 'created_at'>>
): Promise<Profile> {
  const { data, error } = await client
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}
