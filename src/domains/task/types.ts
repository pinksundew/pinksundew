import { Tag } from '../tag/types'

export const TASK_STATUSES = ['todo', 'in-progress', 'done'] as const
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const
export const TASK_SIGNALS = ['ready_for_review', 'needs_help', 'agent_working'] as const
export const TASK_STATE_MESSAGE_SIGNALS = [...TASK_SIGNALS, 'note'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]
export type TaskPriority = (typeof TASK_PRIORITIES)[number]
export type TaskSignal = (typeof TASK_SIGNALS)[number]
export type TaskStateMessageSignal = (typeof TASK_STATE_MESSAGE_SIGNALS)[number]

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && TASK_STATUSES.includes(value as TaskStatus)
}

export function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && TASK_PRIORITIES.includes(value as TaskPriority)
}

export function isTaskSignal(value: unknown): value is TaskSignal {
  return typeof value === 'string' && TASK_SIGNALS.includes(value as TaskSignal)
}

export function isTaskStateMessageSignal(value: unknown): value is TaskStateMessageSignal {
  return (
    typeof value === 'string' &&
    TASK_STATE_MESSAGE_SIGNALS.includes(value as TaskStateMessageSignal)
  )
}

export type Task = {
  id: string
  project_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assignee_id: string | null
  due_date: string | null
  predecessor_id: string | null
  position: number
  is_deleted: boolean
  completed_at: string | null
  workflow_signal: TaskSignal | null
  workflow_signal_message: string | null
  workflow_signal_updated_at: string | null
  workflow_signal_updated_by: string | null
  agent_lock_until: string | null
  agent_lock_reason: string | null
  created_at: string
  updated_at: string
}

export type TaskWithTags = Task & {
  tags: Tag[]
}

export type TaskStateMessage = {
  id: string
  task_id: string
  signal: TaskStateMessageSignal
  message: string
  created_by: string | null
  created_at: string
}
