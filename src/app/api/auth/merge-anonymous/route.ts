import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type MergeAnonymousBody = {
  anon_user_id?: unknown
}

export async function POST(request: Request) {
  let body: MergeAnonymousBody
  try {
    body = (await request.json()) as MergeAnonymousBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const anonUserId = typeof body.anon_user_id === 'string' ? body.anon_user_id.trim() : ''
  if (!anonUserId) {
    return NextResponse.json({ error: 'anon_user_id is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 401 })
  }

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (user.is_anonymous) {
    return NextResponse.json(
      { error: 'Cannot merge while still signed in anonymously' },
      { status: 400 }
    )
  }

  if (user.id === anonUserId) {
    return NextResponse.json({ ok: true, no_op: true, reason: 'same_user' })
  }

  const { data, error } = await supabase.rpc('merge_anonymous_into', {
    p_anon_user_id: anonUserId,
    p_target_user_id: user.id,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, result: data })
}
