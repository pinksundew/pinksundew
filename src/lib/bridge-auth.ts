import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { hashApiKey } from '@/domains/api-key/mutations'
import { getApiKeyByHash } from '@/domains/api-key/queries'
import { updateLastUsed } from '@/domains/api-key/mutations'

interface BridgeAuth {
  userId: string
  supabase: SupabaseClient
}

/**
 * Validates a bridge API request using an API key from the Authorization header.
 * Returns the authenticated user ID and a Supabase admin client, or a 401 response.
 */
export async function validateBridgeRequest(
  request: NextRequest
): Promise<BridgeAuth | NextResponse> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 })
  }

  const rawKey = authHeader.slice(7)
  if (!rawKey || !rawKey.startsWith('ap_')) {
    return NextResponse.json({ error: 'Invalid API key format' }, { status: 401 })
  }

  const keyHash = hashApiKey(rawKey)

  // Use service role client to look up the key (bypasses RLS)
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const apiKey = await getApiKeyByHash(adminClient, keyHash)
  if (!apiKey) {
    return NextResponse.json({ error: 'Invalid or revoked API key' }, { status: 401 })
  }

  // Update last_used_at (fire and forget)
  updateLastUsed(adminClient, apiKey.id).catch(() => {})

  return {
    userId: apiKey.user_id,
    supabase: adminClient,
  }
}

export function isBridgeAuthError(result: BridgeAuth | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}
