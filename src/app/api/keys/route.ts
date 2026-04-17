import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserApiKeys } from '@/domains/api-key/queries'
import { createApiKey } from '@/domains/api-key/mutations'
import { getPostHogClient } from '@/lib/posthog-server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const keys = await getUserApiKeys(supabase, user.id)
  return NextResponse.json(keys)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const name = typeof body.name === 'string' && body.name.trim()
    ? body.name.trim()
    : 'Default'

  const { key, rawKey } = await createApiKey(supabase, user.id, name)

  const posthog = getPostHogClient()
  posthog.capture({
    distinctId: user.id,
    event: 'api_key_created',
    properties: { key_id: key.id, key_name: key.name },
  })
  await posthog.shutdown()

  return NextResponse.json({
    id: key.id,
    key_prefix: key.key_prefix,
    name: key.name,
    created_at: key.created_at,
    raw_key: rawKey,
  }, { status: 201 })
}
