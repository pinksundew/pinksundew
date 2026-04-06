import { SupabaseClient } from '@supabase/supabase-js'
import { TaskWithTags } from './types'
import { Tag } from '../tag/types'

export async function getProjectTasks(
  client: SupabaseClient,
  projectId: string
): Promise<TaskWithTags[]> {
  // Query tasks and join their tags using the task_tags junction table
  const { data, error } = await client
    .from('tasks')
    .select(`
      *,
      task_tags!inner(
        tags (*)
      )
    `)
    .eq('project_id', projectId)
    .order('position')

  if (error) throw error

  // The shape of data returned by Supabase for a many-to-many through a junction
  // will look like: 
  // [ { id: '...', task_tags: [ { tags: { id: '...', name: '..' } } ] } ]
  // We need to map it to the TaskWithTags interface where `tags` is just an array of Tag
  
  return (data as any[]).map((row) => {
    return {
      ...row,
      tags: row.task_tags.map((tt: any) => tt.tags),
      task_tags: undefined // remove the raw join table data
    }
  })
}
