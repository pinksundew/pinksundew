import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'
import {
  createTaskStateMessage,
  listTaskStateMessages,
} from '@/domains/task/mutations'
import { isTaskStateMessageSignal } from '@/domains/task/types'
import { requireTaskAccess } from '@/lib/bridge-access'

type TaskProjectRow = {
  project_id: string
}

function parseLimit(rawLimit: string | null) {
  if (!rawLimit) {
    return 25
  }

  const parsed = Number.parseInt(rawLimit, 10)
  if (Number.isNaN(parsed)) {
    return null
  }

  return Math.min(Math.max(parsed, 1), 100)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await validateBridgeRequest(request)
  if (isBridgeAuthError(auth)) return auth

  const { taskId } = await params
  const taskResult = await requireTaskAccess<TaskProjectRow>(
    auth.supabase,
    auth.userId,
    taskId,
    'project_id'
  )

  if (taskResult.response) {
    return taskResult.response
  }

  const limit = parseLimit(request.nextUrl.searchParams.get('limit'))
  if (limit === null) {
    return NextResponse.json({ error: 'limit must be a valid integer' }, { status: 400 })
  }

  const messages = await listTaskStateMessages(auth.supabase, taskId, limit)
  return NextResponse.json(messages)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await validateBridgeRequest(request)
  if (isBridgeAuthError(auth)) return auth

  const { taskId } = await params
  const taskResult = await requireTaskAccess<TaskProjectRow>(
    auth.supabase,
    auth.userId,
    taskId,
    'project_id'
  )

  if (taskResult.response) {
    return taskResult.response
  }

  const body = await request.json()
  const signal = body.signal ?? 'note'
  const rawMessage = body.message

  if (!isTaskStateMessageSignal(signal)) {
    return NextResponse.json(
      { error: 'signal must be one of ready_for_review, needs_help, or note' },
      { status: 400 }
    )
  }

  if (typeof rawMessage !== 'string' || rawMessage.trim().length === 0) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  const message = await createTaskStateMessage(auth.supabase, {
    taskId,
    signal,
    message: rawMessage.trim(),
    createdBy: auth.userId,
  })

  return NextResponse.json(message, { status: 201 })
}
