import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { requireProjectMembership } from '@/lib/bridge-access'
import { createApiKey } from '@/domains/api-key/mutations'
import { hashSetupToken } from '@/domains/setup-token/mutations'
import { isSetupClient } from '@/domains/setup-token/types'

type SetupTokenRow = {
  id: string
  user_id: string
  project_id: string
  client: string
}

type ProjectRow = {
  id: string
  name: string
}

function createAdminClient() {
  return createSupabaseAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}

function setupKeyName(client: string) {
  const label = client
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
  return `MCP ${label} setup`
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const token =
    body && typeof body === 'object' && 'token' in body
      ? (body as { token?: unknown }).token
      : null
  const client =
    body && typeof body === 'object' && 'client' in body
      ? (body as { client?: unknown }).client
      : null
  const projectId =
    body && typeof body === 'object' && 'projectId' in body
      ? (body as { projectId?: unknown }).projectId
      : null

  if (typeof token !== 'string' || !token.startsWith('pst_')) {
    return NextResponse.json({ error: 'Invalid setup token' }, { status: 400 })
  }

  if (!isSetupClient(client)) {
    return NextResponse.json({ error: 'Invalid client' }, { status: 400 })
  }

  if (typeof projectId !== 'string' || !projectId.trim()) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const now = new Date().toISOString()
  const { data: setupToken, error: tokenError } = await adminClient
    .from('cli_setup_tokens')
    .update({ used_at: now })
    .eq('token_hash', hashSetupToken(token))
    .eq('client', client)
    .eq('project_id', projectId)
    .is('used_at', null)
    .gt('expires_at', now)
    .select('id, user_id, project_id, client')
    .single()

  if (tokenError || !setupToken) {
    return NextResponse.json({ error: 'Setup token is invalid, expired, or already used' }, { status: 401 })
  }

  const row = setupToken as SetupTokenRow
  const membershipError = await requireProjectMembership(adminClient, row.user_id, row.project_id)
  if (membershipError) {
    return membershipError
  }

  let createdKey: Awaited<ReturnType<typeof createApiKey>>
  let projectResult: {
    data: unknown
    error: { message: string } | null
  }

  try {
    const results = await Promise.all([
      createApiKey(adminClient, row.user_id, setupKeyName(row.client)),
      adminClient
        .from('projects')
        .select('id, name')
        .eq('id', row.project_id)
        .single(),
    ])
    createdKey = results[0]
    projectResult = results[1]
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create API key' },
      { status: 500 }
    )
  }

  if (projectResult.error || !projectResult.data) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const project = projectResult.data as ProjectRow

  return NextResponse.json({
    apiKey: createdKey.rawKey,
    keyPrefix: createdKey.key.key_prefix,
    baseUrl: request.nextUrl.origin,
    project: {
      id: project.id,
      name: project.name,
    },
    client: row.client,
  })
}
