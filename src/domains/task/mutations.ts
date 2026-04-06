import { SupabaseClient } from '@supabase/supabase-js'
import { Task } from './types'

export async function createTask(
  client: SupabaseClient,
  task: Omit<Task, 'id' | 'created_at' | 'updated_at'>
): Promise<Task> {
  const { data, error } = await client
    .from('tasks')
    .insert(task)
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
  const { data, error } = await client
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  
  // Basic hook-up point for email notifications when assignee changes
  if (updates.assignee_id !== undefined) {
    // Fire & forget internal API call for email notifs
    fetch('/api/notifications/task-assigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: id, assigneeId: updates.assignee_id })
    }).catch(console.error)
  }

  return data
}

export async function deleteTask(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function moveTask(
  client: SupabaseClient,
  id: string,
  newStatus: Task['status'],
  newPosition: number
): Promise<void> {
  const { error } = await client
    .from('tasks')
    .update({ status: newStatus, position: newPosition, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}
