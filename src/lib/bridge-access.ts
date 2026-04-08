import { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

type ProjectTaskRow = {
  project_id: string
}

type TaskAccessResult<T extends ProjectTaskRow> =
  | { task: T; response?: undefined }
  | { task?: undefined; response: NextResponse }

export async function requireProjectMembership(
  client: SupabaseClient,
  userId: string,
  projectId: string
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

  return null
}

export async function requireTaskAccess<T extends ProjectTaskRow>(
  client: SupabaseClient,
  userId: string,
  taskId: string,
  select: string
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

  const membershipError = await requireProjectMembership(client, userId, typedTask.project_id)
  if (membershipError) {
    return { response: membershipError }
  }

  return { task: typedTask }
}