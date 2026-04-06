import { supabaseAdmin } from './supabase.js';

export async function getProjects() {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('id, name, description');
  if (error) throw new Error(error.message);
  return data;
}

export async function getBoardState(projectId: string) {
  const { data: project, error: pError } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (pError) throw new Error(pError.message);

  const { data: tasks, error: tError } = await supabaseAdmin
    .from('tasks')
    .select(`
      *,
      task_tags (
        tags (*)
      )
    `)
    .eq('project_id', projectId)
    .order('position');

  if (tError) throw new Error(tError.message);

  return { project, tasks };
}

export async function getTaskDetails(taskId: string) {
  const { data: task, error } = await supabaseAdmin
    .from('tasks')
    .select(`
      *,
      task_tags (
        tags (*)
      ),
      task_plans (
        id, content, created_at
      )
    `)
    .eq('id', taskId)
    .single();

  if (error) throw new Error(error.message);
  return task;
}