import { bridgeFetch } from './supabase.js'
import {
  AbyssState,
  AgentControls,
  AgentInstructionFile,
  BoardState,
  Project,
  Tag,
  Task,
} from './types.js'

export async function getProjects() {
  return bridgeFetch<Project[]>('/projects')
}

export async function getBoardState(projectId: string) {
  return bridgeFetch<BoardState>(`/board/${projectId}`)
}

export async function getTaskDetails(taskId: string) {
  return bridgeFetch<Task>(`/task/${taskId}`)
}

export async function getProjectAgentControls(projectId: string) {
  return bridgeFetch<AgentControls>(`/controls/${projectId}`)
}

export async function getAbyssState(projectId: string) {
  return bridgeFetch<AbyssState>(`/abyss/${projectId}`)
}

export async function getProjectTags(projectId: string) {
  return bridgeFetch<Tag[]>(`/tags?projectId=${encodeURIComponent(projectId)}`)
}

export async function getTagDetails(tagId: string) {
  return bridgeFetch<Tag>(`/tags/${tagId}`)
}

export async function getInstructionFilesForProject(projectId: string, fileIds: string[]) {
  if (fileIds.length === 0) {
    return [] as AgentInstructionFile[]
  }

  return bridgeFetch<AgentInstructionFile[]>('/instructions/files', {
    method: 'POST',
    body: JSON.stringify({ projectId, fileIds }),
  })
}