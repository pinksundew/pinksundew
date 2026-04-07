import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'
import { createTaskPlan } from '@/domains/plan/mutations'

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

  const plan = await createTaskPlan(auth.supabase, {
    task_id: taskId,
    content: body.content,
    created_by: auth.userId,
  })

  return NextResponse.json(plan, { status: 201 })
}
