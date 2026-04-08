import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'
import { requireProjectMembership } from '@/lib/bridge-access'
import { mapTasksWithTags, TaskWithTaskTagsRow } from '@/domains/task/normalization'
import { isArchivedTask, isDeletedTask } from '@/domains/task/visibility'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await validateBridgeRequest(request)
  if (isBridgeAuthError(auth)) return auth

  const { projectId } = await params
  const membershipError = await requireProjectMembership(auth.supabase, auth.userId, projectId)
  if (membershipError) {
    return membershipError
  }

  const { data, error } = await auth.supabase
    .from('tasks')
    .select(`
      *,
      task_tags(tags (*))
    `)
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const tasks = mapTasksWithTags((data ?? []) as TaskWithTaskTagsRow[])

  return NextResponse.json({
    deletedTasks: tasks.filter((task) => isDeletedTask(task)),
    archivedTasks: tasks.filter((task) => isArchivedTask(task)),
  })
}