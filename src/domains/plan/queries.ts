import { SupabaseClient } from '@supabase/supabase-js'
import { TaskPlan } from './types'

export async function getTaskPlans(
  client: SupabaseClient,
  taskId: string
): Promise<TaskPlan[]> {
  const { data, error } = await client
    .from('task_plans')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
