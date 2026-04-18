import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'
import { requireProjectMembership } from '@/lib/bridge-access'
import { generateSetupToken, getSetupTokenExpiry, hashSetupToken } from '@/domains/setup-token/mutations'
import { isSetupClient } from '@/domains/setup-token/types'

function createAdminClient() {
  return createSupabaseAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const projectId =
    body && typeof body === 'object' && 'projectId' in body
      ? (body as { projectId?: unknown }).projectId
      : null
  const client =
    body && typeof body === 'object' && 'client' in body
      ? (body as { client?: unknown }).client
      : null

  if (typeof projectId !== 'string' || !projectId.trim()) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  if (!isSetupClient(client)) {
    return NextResponse.json({ error: 'Invalid client' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const membershipError = await requireProjectMembership(adminClient, user.id, projectId)
  if (membershipError) {
    return membershipError
  }

  const token = generateSetupToken()
  const expiresAt = getSetupTokenExpiry()
  const { error } = await adminClient
    .from('cli_setup_tokens')
    .insert({
      token_hash: hashSetupToken(token),
      user_id: user.id,
      project_id: projectId,
      client,
      expires_at: expiresAt,
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    token,
    expires_at: expiresAt,
  }, { status: 201 })
}
