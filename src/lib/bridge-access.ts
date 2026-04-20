import { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { recordProjectMcpActivity } from '@/domains/project/mcp-activity'

type ProjectTaskRow = {
  project_id: string
}

type TaskAccessResult<T extends ProjectTaskRow> =
  | { task: T; response?: undefined }
  | { task?: undefined; response: NextResponse }

type ProjectActivityOptions = {
  recordMcpActivity?: boolean
  requestPath?: string | null
}

export async function requireProjectMembership(
  client: SupabaseClient,
  userId: string,
  projectId: string,
  options?: ProjectActivityOptions
): Promise<NextResponse | null> {
  const { data: membership } = await client
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this project' }, { status: 403 })
  }

  if (options?.recordMcpActivity) {
    recordProjectMcpActivity(client, {
      projectId,
      userId,
      requestPath: options.requestPath ?? null,
    }).catch(() => {})
  }

  return null
}

export async function requireTaskAccess<T extends ProjectTaskRow>(
  client: SupabaseClient,
  userId: string,
  taskId: string,
  select: string,
  options?: ProjectActivityOptions
): Promise<TaskAccessResult<T>> {
  const { data: task, error } = await client
    .from('tasks')
    .select(select)
    .eq('id', taskId)
    .single()

  if (error || !task) {
    return {
      response: NextResponse.json({ error: 'Task not found' }, { status: 404 }),
    }
  }

  const typedTask = task as unknown as T

  const membershipError = await requireProjectMembership(
    client,
    userId,
    typedTask.project_id,
    options
  )
  if (membershipError) {
    return { response: membershipError }
  }

  return { task: typedTask }
}
