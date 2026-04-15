import { generateExportText } from './formatters.js'
import { assertProjectAllowed } from './project-scope.js'
import {
  getAbyssState,
  getBoardState,
  getInstructionFilesForProject,
  getProjects,
  getTaskDetails,
} from './resources.js'
import { bridgeFetch } from './supabase.js'
import {
  AgentInstructionFile,
  AgentInstructionSet,
  BoardState,
  ExportFormat,
  ExportInstruction,
  ExportTasksResult,
  Tag,
  Task,
  TaskPriority,
  TaskSignal,
  TaskStateMessage,
  TaskStateMessageSignal,
  TaskStatus,
} from './types.js'

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

type SetTaskSignalInput = {
  taskId: string
  signal?: TaskSignal | null
  message?: string | null
  lockMinutes?: number | null
  lockReason?: string | null
}

type CachedInstructionFile = Pick<
  AgentInstructionFile,
  'id' | 'set_id' | 'file_name' | 'content_hash' | 'updated_at'
> & {
  content: string
}

const instructionFileCache = new Map<string, CachedInstructionFile>()

function isMarkdownInstructionFile(file: Pick<AgentInstructionFile, 'file_name'>) {
  return file.file_name.toLowerCase().endsWith('.md')
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

function applyCachedInstructionContent(sets: AgentInstructionSet[]) {
  return sets.map((instructionSet) => ({
    ...instructionSet,
    files: instructionSet.files.map((file) => {
      const cachedFile = instructionFileCache.get(file.id)
      if (!cachedFile || cachedFile.content_hash !== file.content_hash) {
        return file
      }

      return {
        ...file,
        content: cachedFile.content,
      }
    }),
  }))
}

async function hydrateBoardInstructions(board: BoardState) {
  const projectId = board.project?.id
  if (!projectId || !board.instructions || board.instructions.length === 0) {
    return board
  }

  const fileIdsToFetch = new Set<string>()

  for (const instructionSet of board.instructions) {
    for (const file of instructionSet.files) {
      if (!isMarkdownInstructionFile(file)) {
        continue
      }

      const cachedFile = instructionFileCache.get(file.id)
      if (!cachedFile || cachedFile.content_hash !== file.content_hash) {
        fileIdsToFetch.add(file.id)
      }
    }
  }

  if (fileIdsToFetch.size > 0) {
    try {
      const files = await getInstructionFilesForProject(projectId, Array.from(fileIdsToFetch))
      for (const file of files) {
        if (typeof file.content !== 'string') {
          continue
        }

        instructionFileCache.set(file.id, {
          id: file.id,
          set_id: file.set_id,
          file_name: file.file_name,
          content_hash: file.content_hash,
          updated_at: file.updated_at,
          content: file.content,
        })
      }
    } catch (error) {
      console.warn('Unable to hydrate instruction file content from metadata:', error)
    }
  }

  const unresolvedFileIds = board.instructions
    .flatMap((instructionSet) => instructionSet.files)
    .filter((file) => {
      if (!isMarkdownInstructionFile(file)) {
        return false
      }

      const cachedFile = instructionFileCache.get(file.id)
      return !cachedFile || cachedFile.content_hash !== file.content_hash
    })
    .map((file) => file.id)

  if (unresolvedFileIds.length > 0) {
    throw new Error(
      `Instruction content hydration incomplete for project ${projectId}. ` +
      `Missing file ids: ${unresolvedFileIds.join(', ')}`
    )
  }

  return {
    ...board,
    instructions: applyCachedInstructionContent(board.instructions),
  }
}

export async function getProjectBoard(projectId: string) {
  assertProjectAllowed(projectId, 'getProjectBoard')
  const board = await getBoardState(projectId)
  return hydrateBoardInstructions(board)
}

export async function getTask(taskId: string) {
  return getTaskDetails(taskId)
}

export async function listAbyssTasks(projectId: string) {
  assertProjectAllowed(projectId, 'listAbyssTasks')
  return getAbyssState(projectId)
}

export async function listTags(projectId: string) {
  assertProjectAllowed(projectId, 'listTags')
  return bridgeFetch<Tag[]>(`/tags?projectId=${encodeURIComponent(projectId)}`)
}

export async function createTask(input: CreateTaskInput) {
  assertProjectAllowed(input.projectId, 'createTask')
  const status = input.status ?? 'todo'

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
  const body: Record<string, unknown> = { status }

  if (typeof position === 'number') {
    body.position = position
  }

  if (status === 'done') {
    body.workflow_signal = 'ready_for_review'
    body.workflow_signal_message = 'Completed by MCP agent. Please review before final acceptance.'
    body.agent_lock_until = null
    body.agent_lock_reason = null
  }

  return bridgeFetch<Task>(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function setTaskSignal(input: SetTaskSignalInput) {
  const updates: Record<string, unknown> = {}

  if (input.signal !== undefined) {
    updates.workflow_signal = input.signal
  }

  if (input.message !== undefined) {
    updates.workflow_signal_message = input.message
  }

  if (input.lockMinutes !== undefined) {
    if (input.lockMinutes === null || input.lockMinutes <= 0) {
      updates.agent_lock_until = null
    } else {
      updates.agent_lock_until = new Date(Date.now() + input.lockMinutes * 60 * 1000).toISOString()
    }
  }

  if (input.lockReason !== undefined) {
    updates.agent_lock_reason = input.lockReason
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('At least one of signal, message, lockMinutes, or lockReason must be provided')
  }

  try {
    return await bridgeFetch<Task>(`/tasks/${input.taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const isServerError = /Bridge API error 5\d{2}/.test(errorMessage)

    if (!isServerError) {
      throw error
    }

    // Some bridge failures are transient after the task row is already updated.
    // Verify task state before failing the tool call so agents can continue safely.
    try {
      const currentTask = await getTask(input.taskId)

      const signalMatches =
        input.signal === undefined || currentTask.workflow_signal === input.signal
      const messageMatches =
        input.message === undefined || currentTask.workflow_signal_message === input.message
      const lockReasonMatches =
        input.lockReason === undefined || currentTask.agent_lock_reason === input.lockReason
      const lockUntilMatches =
        input.lockMinutes === undefined ||
        (input.lockMinutes === null || input.lockMinutes <= 0
          ? currentTask.agent_lock_until === null
          : currentTask.agent_lock_until !== null)

      if (signalMatches && messageMatches && lockReasonMatches && lockUntilMatches) {
        console.warn(
          `Recovered from transient bridge 5xx while setting signal for task ${input.taskId}.`
        )
        return currentTask
      }
    } catch {
      // Fall through to original error when verification fails.
    }

    throw error
  }
}

export async function listTaskMessages(taskId: string, limit?: number) {
  const safeLimit = Math.min(Math.max(limit ?? 25, 1), 100)
  return bridgeFetch<TaskStateMessage[]>(
    `/tasks/${taskId}/messages?limit=${encodeURIComponent(String(safeLimit))}`
  )
}

export async function addTaskMessage(
  taskId: string,
  message: string,
  signal: TaskStateMessageSignal = 'note'
) {
  return bridgeFetch<TaskStateMessage>(`/tasks/${taskId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message, signal }),
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
  assertProjectAllowed(projectId, 'createTag')
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
