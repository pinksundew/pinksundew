import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

type EditableMessageRow = {
  id: string
  task_id: string
  signal: string
  created_by: string | null
}

type MessageIdParams = {
  messageId: string
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    const message = (error as { message: string }).message.trim()
    if (message.length > 0) {
      return message
    }
  }

  return fallback
}

function createSupabaseAdminClient() {
  return createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<MessageIdParams> }
) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'You must be signed in to edit replies.' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    const parsed = await request.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 })
    }
    body = parsed as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (typeof body.message !== 'string' || body.message.trim().length === 0) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }
  const nextMessage = body.message.trim()

  const { messageId } = await params
  const adminClient = createSupabaseAdminClient()

  const { data: targetMessage, error: targetMessageError } = await adminClient
    .from('task_state_messages')
    .select('id, task_id, signal, created_by')
    .eq('id', messageId)
    .maybeSingle()

  if (targetMessageError) {
    return NextResponse.json(
      { error: getErrorMessage(targetMessageError, 'Unable to load that reply.') },
      { status: 500 }
    )
  }

  if (!targetMessage) {
    return NextResponse.json({ error: 'Reply not found.' }, { status: 404 })
  }

  const typedTargetMessage = targetMessage as EditableMessageRow

  if (typedTargetMessage.signal !== 'note') {
    return NextResponse.json({ error: 'Only note replies can be edited.' }, { status: 400 })
  }

  if (typedTargetMessage.created_by !== user.id) {
    return NextResponse.json({ error: 'You can only edit your own replies.' }, { status: 403 })
  }

  const { data: latestEditableMessage, error: latestEditableMessageError } = await adminClient
    .from('task_state_messages')
    .select('id')
    .eq('task_id', typedTargetMessage.task_id)
    .eq('signal', 'note')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestEditableMessageError) {
    return NextResponse.json(
      { error: getErrorMessage(latestEditableMessageError, 'Unable to validate editable reply.') },
      { status: 500 }
    )
  }

  if (!latestEditableMessage || latestEditableMessage.id !== messageId) {
    return NextResponse.json(
      { error: 'Unable to edit that reply. You can only edit your latest reply.' },
      { status: 400 }
    )
  }

  const { data: updatedMessage, error: updateError } = await adminClient
    .from('task_state_messages')
    .update({
      message: nextMessage,
    })
    .eq('id', messageId)
    .select('*')
    .maybeSingle()

  if (updateError) {
    return NextResponse.json(
      { error: getErrorMessage(updateError, 'Unable to save that reply.') },
      { status: 500 }
    )
  }

  if (!updatedMessage) {
    return NextResponse.json({ error: 'Unable to save that reply.' }, { status: 500 })
  }

  return NextResponse.json(updatedMessage)
}
