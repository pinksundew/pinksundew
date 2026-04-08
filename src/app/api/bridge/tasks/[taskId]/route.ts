import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'
import { deleteTask, updateTask } from '@/domains/task/mutations'
import { requireTaskAccess } from '@/lib/bridge-access'
import { isTaskPriority, isTaskStatus } from '@/domains/task/types'

type TaskProjectRow = {
  project_id: string
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
    'project_id'
  )

  if (taskResult.response) {
    return taskResult.response
  }

  const { title, description, status, priority, assignee_id, due_date, position, predecessor_id } = body

  if (status !== undefined && !isTaskStatus(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  if (priority !== undefined && !isTaskPriority(priority)) {
    return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
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

  const updated = await updateTask(auth.supabase, taskId, updates)
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
