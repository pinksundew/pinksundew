import { assertProjectAllowed, filterByProjectScope } from './project-scope.js'
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
  const allProjects = await bridgeFetch<Project[]>('/projects')
  return filterByProjectScope(allProjects, (p) => p.id)
}

export async function getBoardState(projectId: string) {
  assertProjectAllowed(projectId, 'getBoardState')
  return bridgeFetch<BoardState>(`/board/${projectId}`)
}

export async function getTaskDetails(taskId: string) {
  const task = await bridgeFetch<Task>(`/task/${taskId}`)
  assertProjectAllowed(task.project_id, 'getTaskDetails')
  return task
}

export async function getProjectAgentControls(projectId: string) {
  assertProjectAllowed(projectId, 'getProjectAgentControls')
  return bridgeFetch<AgentControls>(`/controls/${projectId}`)
}

export async function getAbyssState(projectId: string) {
  assertProjectAllowed(projectId, 'getAbyssState')
  return bridgeFetch<AbyssState>(`/abyss/${projectId}`)
}

export async function getProjectTags(projectId: string) {
  assertProjectAllowed(projectId, 'getProjectTags')
  return bridgeFetch<Tag[]>(`/tags?projectId=${encodeURIComponent(projectId)}`)
}

export async function getTagDetails(tagId: string) {
  const tag = await bridgeFetch<Tag>(`/tags/${tagId}`)
  assertProjectAllowed(tag.project_id, 'getTagDetails')
  return tag
}

export async function getInstructionFilesForProject(projectId: string, fileIds: string[], envName?: string) {
  if (fileIds.length === 0) {
    return [] as AgentInstructionFile[]
  }

  const body: Record<string, unknown> = { projectId, fileIds }
  if (envName) {
    body.envName = envName
  }

  return bridgeFetch<AgentInstructionFile[]>('/instructions/files', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}