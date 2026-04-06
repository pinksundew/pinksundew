import { supabaseAdmin } from './supabase.js';

export async function createTask(projectId: string, title: string, description?: string, status: string = 'todo', priority: string = 'medium', position: number = 0) {
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .insert({
      project_id: projectId,
      title,
      description,
      status,
      priority,
      position,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateTaskStatus(taskId: string, status: string, position?: number) {
  const updates: any = { status, updated_at: new Date().toISOString() };
  if (typeof position === 'number') updates.position = position;

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createSubtasks(parentId: string, subtasks: { title: string; description?: string }[]) {
  // First, get parent project
  const { data: parent, error: pError } = await supabaseAdmin.from('tasks').select('project_id').eq('id', parentId).single();
  if (pError) throw new Error(pError.message);

  const payload = subtasks.map((st, i) => ({
    project_id: parent.project_id,
    title: st.title,
    description: st.description,
    status: 'todo',
    position: i,
    // Add predecessor_id if domain schema gets it in the future, for now just create the tasks 
  }));

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .insert(payload)
    .select();

  if (error) throw new Error(error.message);
  return data;
}

export async function addPlanToTask(taskId: string, content: string) {
  const { data, error } = await supabaseAdmin
    .from('task_plans')
    .insert({
      task_id: taskId,
      content,
      created_by: 'ai-agent'
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}