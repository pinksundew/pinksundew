import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revokeApiKey } from '@/domains/api-key/mutations'
import { getPostHogClient } from '@/lib/posthog-server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { keyId } = await params
  await revokeApiKey(supabase, keyId)

  const posthog = getPostHogClient()
  posthog.capture({
    distinctId: user.id,
    event: 'api_key_revoked',
    properties: { key_id: keyId },
  })
  await posthog.shutdown()

  return NextResponse.json({ success: true })
}
