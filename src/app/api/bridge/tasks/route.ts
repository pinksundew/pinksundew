import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'
import { requireProjectMembership } from '@/lib/bridge-access'
import { createTask } from '@/domains/task/mutations'
import { isTaskPriority, isTaskStatus } from '@/domains/task/types'
import { getPostHogClient } from '@/lib/posthog-server'

export async function POST(request: NextRequest) {
  const auth = await validateBridgeRequest(request)
  if (isBridgeAuthError(auth)) return auth

  const body = await request.json()
  const { project_id, title, description, status, priority, assignee_id, due_date, position, predecessor_id } = body

  if (!project_id || !title) {
    return NextResponse.json({ error: 'project_id and title are required' }, { status: 400 })
  }

  // Verify user is a member of the project
  const membershipError = await requireProjectMembership(auth.supabase, auth.userId, project_id, {
    recordMcpActivity: true,
    requestPath: request.nextUrl.pathname,
  })
  if (membershipError) {
    return membershipError
  }

  if (status !== undefined && !isTaskStatus(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  if (priority !== undefined && !isTaskPriority(priority)) {
    return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
  }

  try {
    const task = await createTask(auth.supabase, {
      project_id,
      title,
      description: description ?? null,
      status: status ?? 'todo',
      priority: priority ?? 'medium',
      assignee_id: assignee_id ?? null,
      due_date: due_date ?? null,
      predecessor_id: predecessor_id ?? null,
      position: position ?? 0,
    })

    const posthog = getPostHogClient()
    posthog.capture({
      distinctId: auth.userId,
      event: 'agent_task_created',
      properties: {
        task_id: task.id,
        project_id,
        status: task.status,
        priority: task.priority,
        has_predecessor: Boolean(predecessor_id),
      },
    })
    await posthog.shutdown()

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create task' },
      { status: 500 }
    )
  }
}
