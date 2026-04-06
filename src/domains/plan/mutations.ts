import { SupabaseClient } from '@supabase/supabase-js'
import { TaskPlan } from './types'

export async function createTaskPlan(
  client: SupabaseClient,
  plan: Omit<TaskPlan, 'id' | 'created_at'>
): Promise<TaskPlan> {
  const { data, error } = await client
    .from('task_plans')
    .insert(plan)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTaskPlan(
  client: SupabaseClient,
  id: string,
  updates: Partial<Omit<TaskPlan, 'id' | 'created_at' | 'task_id' | 'created_by'>>
): Promise<TaskPlan> {
  const { data, error } = await client
    .from('task_plans')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTaskPlan(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client
    .from('task_plans')
    .delete()
    .eq('id', id)

  if (error) throw error
}
