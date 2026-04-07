import { bridgeFetch } from './supabase.js';

export async function getProjects() {
  return bridgeFetch('/projects');
}

export async function getBoardState(projectId: string) {
  return bridgeFetch(`/board/${projectId}`);
}

export async function getTaskDetails(taskId: string) {
  return bridgeFetch(`/task/${taskId}`);
}