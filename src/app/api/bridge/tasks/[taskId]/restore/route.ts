import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'
import { requireTaskAccess } from '@/lib/bridge-access'
import { mapTaskWithTags, TaskWithTaskTagsRow } from '@/domains/task/normalization'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await validateBridgeRequest(request)
  if (isBridgeAuthError(auth)) return auth

  const { taskId } = await params
  const taskResult = await requireTaskAccess<TaskWithTaskTagsRow>(
    auth.supabase,
    auth.userId,
    taskId,
    `
      *,
      task_tags(tags (*))
    `
  )

  if (taskResult.response) {
    return taskResult.response
  }

  const task = mapTaskWithTags(taskResult.task)
  const restoredAt = new Date().toISOString()
  const restorePayload = task.is_deleted
    ? {
        is_deleted: false,
        completed_at: task.status === 'done' ? restoredAt : task.completed_at,
        updated_at: restoredAt,
      }
    : {
        completed_at: restoredAt,
        updated_at: restoredAt,
      }

  const { data, error } = await auth.supabase
    .from('tasks')
    .update(restorePayload)
    .eq('id', taskId)
    .select(`
      *,
      task_tags(tags (*))
    `)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to restore task' }, { status: 500 })
  }

  return NextResponse.json(mapTaskWithTags(data as TaskWithTaskTagsRow))
}