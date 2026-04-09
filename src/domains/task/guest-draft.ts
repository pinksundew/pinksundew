import {
  TaskPriority,
  TaskStatus,
  TaskWithTags,
  isTaskPriority,
  isTaskStatus,
} from './types'
import { isVisibleOnBoard, sortTasksByPosition } from './visibility'

const GUEST_DRAFT_STORAGE_KEY = 'agentplanner.guest_board.v1'

export const GUEST_ACTIVE_TASK_LIMIT = 10

type StoredGuestDraft = {
  version: 1
  projectName: string
  tasks: TaskWithTags[]
  updatedAt: string
}

type CreateGuestTaskInput = {
  projectId: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  predecessorId: string | null
  position: number
}

function nowIso() {
  return new Date().toISOString()
}

function createGuestTaskId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `guest_${crypto.randomUUID()}`
  }

  return `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function normalizeTask(candidate: unknown, index: number): TaskWithTags | null {
  if (!candidate || typeof candidate !== 'object') return null

  const source = candidate as Partial<TaskWithTags>
  if (!source.id || typeof source.id !== 'string') return null
  if (!source.title || typeof source.title !== 'string') return null

  const status = isTaskStatus(source.status) ? source.status : 'todo'
  const priority = isTaskPriority(source.priority) ? source.priority : 'medium'
  const now = nowIso()

  return {
    id: source.id,
    project_id: typeof source.project_id === 'string' ? source.project_id : 'guest-board',
    title: source.title,
    description: typeof source.description === 'string' ? source.description : null,
    status,
    priority,
    assignee_id: typeof source.assignee_id === 'string' ? source.assignee_id : null,
    due_date: typeof source.due_date === 'string' ? source.due_date : null,
    predecessor_id: typeof source.predecessor_id === 'string' ? source.predecessor_id : null,
    position: Number.isInteger(source.position) ? Number(source.position) : index,
    is_deleted: Boolean(source.is_deleted),
    completed_at: typeof source.completed_at === 'string' ? source.completed_at : null,
    workflow_signal: source.workflow_signal ?? null,
    workflow_signal_message:
      typeof source.workflow_signal_message === 'string' ? source.workflow_signal_message : null,
    workflow_signal_updated_at:
      typeof source.workflow_signal_updated_at === 'string'
        ? source.workflow_signal_updated_at
        : null,
    workflow_signal_updated_by:
      typeof source.workflow_signal_updated_by === 'string'
        ? source.workflow_signal_updated_by
        : null,
    agent_lock_until: typeof source.agent_lock_until === 'string' ? source.agent_lock_until : null,
    agent_lock_reason:
      typeof source.agent_lock_reason === 'string' ? source.agent_lock_reason : null,
    created_at: typeof source.created_at === 'string' ? source.created_at : now,
    updated_at: typeof source.updated_at === 'string' ? source.updated_at : now,
    tags: Array.isArray(source.tags)
      ? source.tags
          .filter(
            (tag): tag is TaskWithTags['tags'][number] =>
              Boolean(tag) &&
              typeof tag === 'object' &&
              typeof tag.id === 'string' &&
              typeof tag.name === 'string' &&
              typeof tag.color === 'string'
          )
          .map((tag) => ({
            id: tag.id,
            project_id: typeof tag.project_id === 'string' ? tag.project_id : 'guest-board',
            name: tag.name,
            color: tag.color,
          }))
      : [],
  }
}

function buildEmptyDraft(defaultProjectName: string): StoredGuestDraft {
  return {
    version: 1,
    projectName: defaultProjectName,
    tasks: [],
    updatedAt: nowIso(),
  }
}

export function loadGuestDraft(defaultProjectName = 'Guest Board'): StoredGuestDraft {
  if (typeof window === 'undefined') {
    return buildEmptyDraft(defaultProjectName)
  }

  const raw = window.localStorage.getItem(GUEST_DRAFT_STORAGE_KEY)
  if (!raw) {
    return buildEmptyDraft(defaultProjectName)
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredGuestDraft>
    if (parsed.version !== 1 || !Array.isArray(parsed.tasks)) {
      return buildEmptyDraft(defaultProjectName)
    }

    const tasks = sortTasksByPosition(
      parsed.tasks
        .map((task, index) => normalizeTask(task, index))
        .filter((task): task is TaskWithTags => Boolean(task))
    )

    return {
      version: 1,
      projectName:
        typeof parsed.projectName === 'string' && parsed.projectName.trim().length > 0
          ? parsed.projectName
          : defaultProjectName,
      tasks,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : nowIso(),
    }
  } catch {
    return buildEmptyDraft(defaultProjectName)
  }
}

export function saveGuestDraft(projectName: string, tasks: TaskWithTags[]) {
  if (typeof window === 'undefined') return

  const payload: StoredGuestDraft = {
    version: 1,
    projectName,
    tasks: sortTasksByPosition(tasks),
    updatedAt: nowIso(),
  }

  window.localStorage.setItem(GUEST_DRAFT_STORAGE_KEY, JSON.stringify(payload))
}

export function clearGuestDraft() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(GUEST_DRAFT_STORAGE_KEY)
}

export function createGuestTask(input: CreateGuestTaskInput): TaskWithTags {
  const timestamp = nowIso()

  return {
    id: createGuestTaskId(),
    project_id: input.projectId,
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    assignee_id: null,
    due_date: null,
    predecessor_id: input.predecessorId,
    position: input.position,
    is_deleted: false,
    completed_at: input.status === 'done' ? timestamp : null,
    workflow_signal: null,
    workflow_signal_message: null,
    workflow_signal_updated_at: null,
    workflow_signal_updated_by: null,
    agent_lock_until: null,
    agent_lock_reason: null,
    created_at: timestamp,
    updated_at: timestamp,
    tags: [],
  }
}

export function countActiveGuestTasks(tasks: TaskWithTags[]) {
  return tasks.filter((task) => isVisibleOnBoard(task)).length
}
