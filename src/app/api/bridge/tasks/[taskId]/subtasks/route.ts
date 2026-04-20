import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'
import { requireTaskAccess } from '@/lib/bridge-access'
import { createTask } from '@/domains/task/mutations'
import { isTaskPriority } from '@/domains/task/types'

type ParentTaskRow = {
  project_id: string
}

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

  const parentTaskResult = await requireTaskAccess<ParentTaskRow>(
    auth.supabase,
    auth.userId,
    taskId,
    'project_id',
    {
      recordMcpActivity: true,
      requestPath: request.nextUrl.pathname,
    }
  )

  if (parentTaskResult.response) {
    return parentTaskResult.response
  }

  const taskData = parentTaskResult.task

  const created = []
  for (let i = 0; i < body.subtasks.length; i++) {
    const sub = body.subtasks[i]

    if (sub.priority !== undefined && !isTaskPriority(sub.priority)) {
      return NextResponse.json({ error: 'Invalid priority in subtasks payload' }, { status: 400 })
    }

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
