import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'
import { getTaskPlans } from '@/domains/plan/queries'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await validateBridgeRequest(request)
  if (isBridgeAuthError(auth)) return auth

  const { taskId } = await params

  // Get the task
  const { data: task, error } = await auth.supabase
    .from('tasks')
    .select(`
      *,
      task_tags(tags (*))
    `)
    .eq('id', taskId)
    .single()

  if (error || !task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const taskData = task as any

  // Verify user is a member of the task's project
  const { data: membership } = await auth.supabase
    .from('project_members')
    .select('id')
    .eq('project_id', taskData.project_id)
    .eq('user_id', auth.userId)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this project' }, { status: 403 })
  }

  // Get plans for the task
  const plans = await getTaskPlans(auth.supabase, taskId)

  // Normalize tags
  const tags = (taskData.task_tags as any[])?.map((tt: any) => tt.tags).filter(Boolean) ?? []

  return NextResponse.json({
    ...taskData,
    task_tags: undefined,
    tags,
    plans,
  })
}
