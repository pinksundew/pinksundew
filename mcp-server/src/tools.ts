import { bridgeFetch } from './supabase.js';

export async function createTask(projectId: string, title: string, description?: string, status: string = 'todo', priority: string = 'medium') {
  return bridgeFetch('/tasks', {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId, title, description, status, priority }),
  });
}

export async function updateTaskStatus(taskId: string, status: string, position?: number) {
  const body: Record<string, unknown> = { status };
  if (typeof position === 'number') body.position = position;

  return bridgeFetch(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function createSubtasks(parentId: string, subtasks: { title: string; description?: string }[]) {
  return bridgeFetch(`/tasks/${parentId}/subtasks`, {
    method: 'POST',
    body: JSON.stringify({ subtasks }),
  });
}

export async function addPlanToTask(taskId: string, content: string) {
  return bridgeFetch(`/tasks/${taskId}/plan`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}