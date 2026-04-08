import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TaskStatus } from '@/domains/task/types'

type TaskOrderPayload = {
  id: string
  status: TaskStatus
  position: number
}

const VALID_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done']

function isTaskOrderPayload(value: unknown): value is TaskOrderPayload {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    VALID_STATUSES.includes(candidate.status as TaskStatus) &&
    Number.isInteger(candidate.position)
  )
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const projectId = typeof body.projectId === 'string' ? body.projectId : null
  const rawTasks = Array.isArray(body.tasks) ? body.tasks : null

  if (!projectId || !rawTasks || rawTasks.length === 0) {
    return NextResponse.json({ error: 'projectId and tasks are required' }, { status: 400 })
  }

  if (!rawTasks.every(isTaskOrderPayload)) {
    return NextResponse.json({ error: 'Invalid task payload' }, { status: 400 })
  }

  const tasks = rawTasks as TaskOrderPayload[]
  const { data, error } = await supabase.rpc('reorder_project_tasks', {
    p_project_id: projectId,
    p_tasks: tasks,
  })

  if (error) {
    const status =
      error.message === 'Forbidden'
        ? 403
        : [
            'tasks must be a non-empty array',
            'Invalid task payload',
            'Duplicate task ids are not allowed',
            'One or more tasks could not be validated for this project',
            'Task order update did not affect all rows',
          ].includes(error.message)
          ? 400
          : 500

    return NextResponse.json({ error: error.message }, { status })
  }

  return NextResponse.json({ updatedCount: data ?? tasks.length })
}