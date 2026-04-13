import { SupabaseClient } from '@supabase/supabase-js'
import { Profile } from './types'

type ProjectMemberWithProfile = {
  profiles: Profile | Profile[] | null
}

export async function getProfile(
  client: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export async function getProjectMembers(
  client: SupabaseClient,
  projectId: string
): Promise<Profile[]> {
  const { data, error } = await client
    .from('project_members')
    .select(`
      user_id,
      profiles (*)
    `)
    .eq('project_id', projectId)

  if (error) throw error
  return (data as unknown as ProjectMemberWithProfile[]).flatMap((row) => {
    if (!row.profiles) return []
    return Array.isArray(row.profiles) ? row.profiles : [row.profiles]
  })
}
