import { SupabaseClient, User } from '@supabase/supabase-js'
import { Profile } from './types'

function getUserMetadataString(
  metadata: User['user_metadata'] | undefined,
  key: string
): string | null {
  const value = metadata?.[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

export async function syncProfileFromAuthUser(
  client: SupabaseClient,
  user: Pick<User, 'id' | 'email' | 'user_metadata'>
): Promise<void> {
  const payload: Partial<Pick<Profile, 'email' | 'full_name' | 'avatar_url'>> & {
    id: string
    updated_at: string
  } = {
    id: user.id,
    updated_at: new Date().toISOString(),
  }

  if (typeof user.email === 'string' && user.email.length > 0) {
    payload.email = user.email
  }

  const fullName =
    getUserMetadataString(user.user_metadata, 'full_name') ??
    getUserMetadataString(user.user_metadata, 'name')
  if (fullName) {
    payload.full_name = fullName
  }

  const avatarUrl =
    getUserMetadataString(user.user_metadata, 'avatar_url') ??
    getUserMetadataString(user.user_metadata, 'picture')
  if (avatarUrl) {
    payload.avatar_url = avatarUrl
  }

  const { error } = await client
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })

  if (error) throw error
}

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
