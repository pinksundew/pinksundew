import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'
import { requireTaskAccess } from '@/lib/bridge-access'
import { createTaskPlan } from '@/domains/plan/mutations'

type TaskProjectRow = {
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

  if (!body.content) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const taskResult = await requireTaskAccess<TaskProjectRow>(
    auth.supabase,
    auth.userId,
    taskId,
    'project_id'
  )

  if (taskResult.response) {
    return taskResult.response
  }

  try {
    const plan = await createTaskPlan(auth.supabase, {
      task_id: taskId,
      content: body.content,
      created_by: auth.userId,
    })

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create plan' },
      { status: 500 }
    )
  }
}
