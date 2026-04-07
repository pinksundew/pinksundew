import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'
import { createTask } from '@/domains/task/mutations'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await validateBridgeRequest(request)
  if (isBridgeAuthError(auth)) return auth

  const { taskId } = await params
  const body = await request.json()

  if (!Array.isArray(body.subtasks) || body.subtasks.length === 0) {
    return NextResponse.json({ error: 'subtasks array is required' }, { status: 400 })
  }

  // Get the parent task to verify project membership and get project_id
  const { data: parentTask } = await auth.supabase
    .from('tasks')
    .select('project_id')
    .eq('id', taskId)
    .single()

  if (!parentTask) {
    return NextResponse.json({ error: 'Parent task not found' }, { status: 404 })
  }

  const taskData = parentTask as any

  const { data: membership } = await auth.supabase
    .from('project_members')
    .select('id')
    .eq('project_id', taskData.project_id)
    .eq('user_id', auth.userId)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this project' }, { status: 403 })
  }

  const created = []
  for (let i = 0; i < body.subtasks.length; i++) {
    const sub = body.subtasks[i]
    const task = await createTask(auth.supabase, {
      project_id: taskData.project_id,
      title: sub.title,
      description: sub.description ?? null,
      status: 'todo',
      priority: sub.priority ?? 'medium',
      assignee_id: null,
      due_date: null,
      predecessor_id: taskId,
      position: i,
    })
    created.push(task)
  }

  return NextResponse.json(created, { status: 201 })
}
