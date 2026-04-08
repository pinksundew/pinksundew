import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'
import { updateTask } from '@/domains/task/mutations'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await validateBridgeRequest(request)
  if (isBridgeAuthError(auth)) return auth

  const { taskId } = await params
  const body = await request.json()

  // Get the task to verify project membership
  const { data: task } = await auth.supabase
    .from('tasks')
    .select('project_id')
    .eq('id', taskId)
    .single()

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const taskData = task as any

  const { data: membership } = await auth.supabase
    .from('project_members')
    .select('id')
    .eq('project_id', taskData.project_id)
    .eq('user_id', auth.userId)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this project' }, { status: 403 })
  }

  const { title, description, status, priority, assignee_id, due_date, position, predecessor_id } = body
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
