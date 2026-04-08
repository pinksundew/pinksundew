import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'
import { requireProjectMembership } from '@/lib/bridge-access'
import { persistTaskOrder } from '@/domains/task/mutations'
import { isTaskStatus, TaskStatus } from '@/domains/task/types'

type TaskOrderPayload = {
  id: string
  status: TaskStatus
  position: number
}

function isTaskOrderPayload(value: unknown): value is TaskOrderPayload {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    isTaskStatus(candidate.status) &&
    Number.isInteger(candidate.position)
  )
}

export async function POST(request: NextRequest) {
  const auth = await validateBridgeRequest(request)
  if (isBridgeAuthError(auth)) return auth

  const body = await request.json()
  const projectId =
    typeof body.project_id === 'string'
      ? body.project_id
      : typeof body.projectId === 'string'
        ? body.projectId
        : null
  const rawTasks = Array.isArray(body.tasks) ? body.tasks : null

  if (!projectId || !rawTasks || rawTasks.length === 0) {
    return NextResponse.json({ error: 'project_id and tasks are required' }, { status: 400 })
  }

  if (!rawTasks.every(isTaskOrderPayload)) {
    return NextResponse.json({ error: 'Invalid task payload' }, { status: 400 })
  }

  const tasks = rawTasks as TaskOrderPayload[]
  const taskIds = tasks.map((task) => task.id)
  if (new Set(taskIds).size !== taskIds.length) {
    return NextResponse.json({ error: 'Duplicate task ids are not allowed' }, { status: 400 })
  }

  const membershipError = await requireProjectMembership(auth.supabase, auth.userId, projectId)
  if (membershipError) {
    return membershipError
  }

  await persistTaskOrder(auth.supabase, projectId, tasks)
  return NextResponse.json({ updatedCount: tasks.length })
}