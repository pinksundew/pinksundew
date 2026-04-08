import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'
import { createTaskStateMessage, deleteTask, updateTask } from '@/domains/task/mutations'
import { requireTaskAccess } from '@/lib/bridge-access'
import { isTaskPriority, isTaskSignal, isTaskStatus, TaskSignal } from '@/domains/task/types'

type TaskProjectRow = {
  project_id: string
  workflow_signal: TaskSignal | null
  workflow_signal_message: string | null
}

function hasOwnProperty(obj: object, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

function parseNullableString(value: unknown, fieldName: string) {
  if (value === null) return null
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string or null`)
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await validateBridgeRequest(request)
  if (isBridgeAuthError(auth)) return auth

  const { taskId } = await params
  const body = await request.json()

  const taskResult = await requireTaskAccess<TaskProjectRow>(
    auth.supabase,
    auth.userId,
    taskId,
    'project_id, workflow_signal, workflow_signal_message'
  )

  if (taskResult.response) {
    return taskResult.response
  }

  const { title, description, status, priority, assignee_id, due_date, position, predecessor_id } = body
  const signalProvided = hasOwnProperty(body, 'workflow_signal')
  const signalMessageProvided = hasOwnProperty(body, 'workflow_signal_message')
  const lockUntilProvided = hasOwnProperty(body, 'agent_lock_until')
  const lockReasonProvided = hasOwnProperty(body, 'agent_lock_reason')

  if (status !== undefined && !isTaskStatus(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  if (priority !== undefined && !isTaskPriority(priority)) {
    return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
  }

  if (signalProvided && body.workflow_signal !== null && !isTaskSignal(body.workflow_signal)) {
    return NextResponse.json({ error: 'Invalid workflow_signal' }, { status: 400 })
  }

  let parsedSignalMessage: string | null | undefined
  if (signalMessageProvided) {
    try {
      parsedSignalMessage = parseNullableString(body.workflow_signal_message, 'workflow_signal_message')
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid workflow_signal_message' },
        { status: 400 }
      )
    }
  }

  let parsedAgentLockUntil: string | null | undefined
  if (lockUntilProvided) {
    if (body.agent_lock_until === null) {
      parsedAgentLockUntil = null
    } else if (typeof body.agent_lock_until === 'string') {
      const parsedDate = new Date(body.agent_lock_until)
      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: 'agent_lock_until must be a valid date string or null' }, { status: 400 })
      }

      parsedAgentLockUntil = parsedDate.toISOString()
    } else {
      return NextResponse.json({ error: 'agent_lock_until must be a string or null' }, { status: 400 })
    }
  }

  let parsedAgentLockReason: string | null | undefined
  if (lockReasonProvided) {
    try {
      parsedAgentLockReason = parseNullableString(body.agent_lock_reason, 'agent_lock_reason')
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid agent_lock_reason' },
        { status: 400 }
      )
    }
  }

  const nextSignal = signalProvided
    ? (body.workflow_signal as TaskSignal | null)
    : taskResult.task.workflow_signal

  const nextSignalMessage =
    parsedSignalMessage !== undefined
      ? parsedSignalMessage
      : signalProvided && body.workflow_signal === null
        ? null
        : taskResult.task.workflow_signal_message

  if (nextSignal === 'needs_help' && !nextSignalMessage) {
    return NextResponse.json(
      { error: 'workflow_signal_message is required when workflow_signal is needs_help' },
      { status: 400 }
    )
  }

  const updates: Record<string, unknown> = {}
  if (title !== undefined) updates.title = title
  if (description !== undefined) updates.description = description
  if (status !== undefined) updates.status = status
  if (priority !== undefined) updates.priority = priority
  if (assignee_id !== undefined) updates.assignee_id = assignee_id
  if (due_date !== undefined) updates.due_date = due_date
  if (position !== undefined) updates.position = position
  if (predecessor_id !== undefined) updates.predecessor_id = predecessor_id

  if (signalProvided) {
    updates.workflow_signal = body.workflow_signal
  }

  if (parsedSignalMessage !== undefined) {
    updates.workflow_signal_message = parsedSignalMessage
  } else if (signalProvided && body.workflow_signal === null) {
    updates.workflow_signal_message = null
  }

  if (signalProvided || signalMessageProvided) {
    updates.workflow_signal_updated_at = new Date().toISOString()
    updates.workflow_signal_updated_by = auth.userId
  }

  if (parsedAgentLockUntil !== undefined) {
    updates.agent_lock_until = parsedAgentLockUntil
  }

  if (parsedAgentLockReason !== undefined) {
    updates.agent_lock_reason = parsedAgentLockReason
  } else if (parsedAgentLockUntil === null) {
    updates.agent_lock_reason = null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates were provided' }, { status: 400 })
  }

  const updated = await updateTask(auth.supabase, taskId, updates)

  const signalChanged = nextSignal !== taskResult.task.workflow_signal
  const signalMessageChanged = nextSignalMessage !== taskResult.task.workflow_signal_message
  const shouldCreateSignalMessage =
    (signalChanged || signalMessageChanged) &&
    nextSignal !== null &&
    typeof nextSignalMessage === 'string' &&
    nextSignalMessage.length > 0

  if (shouldCreateSignalMessage) {
    await createTaskStateMessage(auth.supabase, {
      taskId,
      signal: nextSignal,
      message: nextSignalMessage,
      createdBy: auth.userId,
    })
  }

  return NextResponse.json(updated)
}

export async function DELETE(
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

  await deleteTask(auth.supabase, taskId)
  return NextResponse.json({ deleted: true })
}
