import type { Task } from '@/domains/task/types'

export const ANONYMOUS_ACTIVE_TASK_LIMIT = 10

type TaskVisibilityFields = Pick<Task, 'status' | 'is_deleted'>

export function getAnonymousTaskLimitPrompt() {
  return `Anonymous boards are limited to ${ANONYMOUS_ACTIVE_TASK_LIMIT} active tasks. Save your board to add more tasks.`
}

/**
 * Mirrors the logic of private.enforce_anonymous_task_cap() in Postgres:
 * an "active" task is any task that is not soft-deleted and whose status is
 * not 'done'. The UI guard and the DB trigger must agree so that the cap
 * message appears at the same moment from either side of the wire.
 */
export function countActiveAnonymousTasks(tasks: TaskVisibilityFields[]) {
  return tasks.filter((task) => {
    if (task.is_deleted) return false
    if (task.status === 'done') return false
    return true
  }).length
}

export function isAnonymousTaskLimitMessage(message: string) {
  return (
    message.includes(
      `Anonymous boards are limited to ${ANONYMOUS_ACTIVE_TASK_LIMIT} active tasks`
    ) ||
    message.includes(getAnonymousTaskLimitPrompt())
  )
}
