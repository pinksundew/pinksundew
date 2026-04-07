import { SupabaseClient } from '@supabase/supabase-js'
import { ApiKey } from './types'

export async function getUserApiKeys(
  client: SupabaseClient,
  userId: string
): Promise<Omit<ApiKey, 'key_hash'>[]> {
  const { data, error } = await client
    .from('api_keys')
    .select('id, user_id, key_prefix, name, created_at, last_used_at, revoked_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getApiKeyByHash(
  client: SupabaseClient,
  keyHash: string
): Promise<ApiKey | null> {
  const { data, error } = await client
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}
