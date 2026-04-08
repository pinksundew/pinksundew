import { SupabaseClient } from '@supabase/supabase-js'
import { Task } from './types'

type CreateTaskInput = Omit<
  Task,
  'id' | 'created_at' | 'updated_at' | 'is_deleted' | 'completed_at'
>

export async function createTask(
  client: SupabaseClient,
  task: CreateTaskInput
): Promise<Task> {
  let nextPosition = task.position

  if (nextPosition <= 0) {
    const { data: lastTask } = await client
      .from('tasks')
      .select('position')
      .eq('project_id', task.project_id)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    nextPosition = (lastTask?.position ?? -1) + 1
  }

  const insertPayload = {
    ...task,
    position: nextPosition,
    is_deleted: false,
    completed_at: task.status === 'done' ? new Date().toISOString() : null,
  }

  const { data, error } = await client
    .from('tasks')
    .insert(insertPayload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTask(
  client: SupabaseClient,
  id: string,
  updates: Partial<Omit<Task, 'id' | 'created_at' | 'project_id'>>
): Promise<Task> {
  const nextStatus = updates.status
  const updatePayload: Partial<Task> & { updated_at: string } = {
    ...updates,
    updated_at: new Date().toISOString(),
  }
  
  if (nextStatus === 'done') {
    updatePayload.completed_at = new Date().toISOString()
  } else if (nextStatus === 'todo' || nextStatus === 'in-progress') {
    updatePayload.completed_at = null
  }

  const { data, error } = await client
    .from('tasks')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  
  return data
}

export async function deleteTask(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client
    .from('tasks')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function persistTaskOrder(
  client: SupabaseClient,
  projectId: string,
  tasks: Array<{ id: string; status: string; position: number }>
): Promise<void> {
  const { error } = await client.rpc('reorder_project_tasks', {
    p_project_id: projectId,
    p_tasks: tasks,
  })

  if (error) {
    throw new Error(error.message || 'Failed to persist task order')
  }
}
