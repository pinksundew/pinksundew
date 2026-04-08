import { generateExportText } from './formatters.js'
import { getAbyssState, getBoardState, getProjects, getTaskDetails } from './resources.js'
import { assertTaskCompletionAllowed, bridgeFetch } from './supabase.js'
import { ExportFormat, ExportInstruction, ExportTasksResult, Tag, Task, TaskPriority, TaskStatus } from './types.js'

type CreateTaskInput = {
  projectId: string
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string | null
  dueDate?: string | null
  predecessorId?: string | null
  position?: number
}

type UpdateTaskInput = {
  taskId: string
  title?: string
  description?: string | null
  priority?: TaskPriority
  assigneeId?: string | null
  dueDate?: string | null
  predecessorId?: string | null
}

function ensureTaskFound(tasks: Task[], taskId: string) {
  const task = tasks.find((candidate) => candidate.id === taskId)
  if (!task) {
    throw new Error(`Task ${taskId} was not found in the selected project context`)
  }
  return task
}

export async function listProjects() {
  return getProjects()
}

export async function getProjectBoard(projectId: string) {
  return getBoardState(projectId)
}

export async function getTask(taskId: string) {
  return getTaskDetails(taskId)
}

export async function listAbyssTasks(projectId: string) {
  return getAbyssState(projectId)
}

export async function listTags(projectId: string) {
  return bridgeFetch<Tag[]>(`/tags?projectId=${encodeURIComponent(projectId)}`)
}

export async function createTask(input: CreateTaskInput) {
  const status = input.status ?? 'todo'
  assertTaskCompletionAllowed(status)

  return bridgeFetch<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify({
      project_id: input.projectId,
      title: input.title,
      description: input.description,
      status,
      priority: input.priority ?? 'medium',
      assignee_id: input.assigneeId ?? null,
      due_date: input.dueDate ?? null,
      predecessor_id: input.predecessorId ?? null,
      position: input.position ?? 0,
    }),
  })
}

export async function updateTask(input: UpdateTaskInput) {
  const updates: Record<string, unknown> = {}

  if (input.title !== undefined) updates.title = input.title
  if (input.description !== undefined) updates.description = input.description
  if (input.priority !== undefined) updates.priority = input.priority
  if (input.assigneeId !== undefined) updates.assignee_id = input.assigneeId
  if (input.dueDate !== undefined) updates.due_date = input.dueDate
  if (input.predecessorId !== undefined) updates.predecessor_id = input.predecessorId

  if (Object.keys(updates).length === 0) {
    throw new Error('No task updates were provided')
  }

  return bridgeFetch<Task>(`/tasks/${input.taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export async function moveTask(taskId: string, status: TaskStatus, position?: number) {
  assertTaskCompletionAllowed(status)

  const body: Record<string, unknown> = { status }
  if (typeof position === 'number') {
    body.position = position
  }

  return bridgeFetch<Task>(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function moveTaskToAbyss(taskId: string) {
  return bridgeFetch<{ deleted: boolean }>(`/tasks/${taskId}`, {
    method: 'DELETE',
  })
}

export async function restoreTask(taskId: string) {
  return bridgeFetch<Task>(`/tasks/${taskId}/restore`, {
    method: 'POST',
  })
}

export async function addPlanToTask(taskId: string, content: string) {
  return bridgeFetch(`/tasks/${taskId}/plan`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

export async function createTag(projectId: string, name: string, color: string = '#3b82f6') {
  return bridgeFetch<Tag>('/tags', {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId, name, color }),
  })
}

export async function deleteTag(tagId: string) {
  return bridgeFetch<{ deleted: boolean }>(`/tags/${tagId}`, {
    method: 'DELETE',
  })
}

export async function exportTasks(input: {
  projectId: string
  taskIds?: string[]
  format?: ExportFormat
  includeTags?: boolean
  includePriority?: boolean
  includeDeleted?: boolean
  includeArchived?: boolean
  additionalInstructions?: ExportInstruction[]
}): Promise<ExportTasksResult> {
  const board = await getBoardState(input.projectId)
  const tasksById = new Map<string, Task>()

  for (const task of board.tasks) {
    tasksById.set(task.id, task)
  }

  if (input.includeDeleted || input.includeArchived) {
    const abyss = await getAbyssState(input.projectId)

    if (input.includeDeleted) {
      for (const task of abyss.deletedTasks) {
        tasksById.set(task.id, task)
      }
    }

    if (input.includeArchived) {
      for (const task of abyss.archivedTasks) {
        tasksById.set(task.id, task)
      }
    }
  }

  const orderedTasks = input.taskIds && input.taskIds.length > 0
    ? input.taskIds.map((taskId) => ensureTaskFound([...tasksById.values()], taskId))
    : [...board.tasks]

  return {
    project: board.project ? { id: board.project.id, name: board.project.name } : null,
    taskCount: orderedTasks.length,
    tasks: orderedTasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
    })),
    content: generateExportText(orderedTasks, {
      format: input.format ?? 'numbered',
      includeTags: input.includeTags ?? true,
      includePriority: input.includePriority ?? true,
      instructions: input.additionalInstructions,
    }),
  }
}