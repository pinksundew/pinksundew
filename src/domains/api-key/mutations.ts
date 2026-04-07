import { SupabaseClient } from '@supabase/supabase-js'
import { randomBytes, createHash } from 'crypto'
import { ApiKey } from './types'

function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `ap_${randomBytes(32).toString('hex')}`
  const hash = createHash('sha256').update(raw).digest('hex')
  const prefix = raw.slice(0, 11) // "ap_" + first 8 hex chars
  return { raw, hash, prefix }
}

export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export async function createApiKey(
  client: SupabaseClient,
  userId: string,
  name: string
): Promise<{ key: ApiKey; rawKey: string }> {
  const { raw, hash, prefix } = generateApiKey()

  const { data, error } = await client
    .from('api_keys')
    .insert({
      user_id: userId,
      key_hash: hash,
      key_prefix: prefix,
      name,
    })
    .select()
    .single()

  if (error) throw error
  return { key: data, rawKey: raw }
}

export async function revokeApiKey(
  client: SupabaseClient,
  keyId: string
): Promise<void> {
  const { error } = await client
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)

  if (error) throw error
}

export async function updateLastUsed(
  client: SupabaseClient,
  keyId: string
): Promise<void> {
  const { error } = await client
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyId)

  if (error) throw error
}
