import { Task } from './types'

export const ABYSS_ARCHIVE_DAYS = 3

type TaskVisibilityFields = Pick<Task, 'status' | 'completed_at' | 'is_deleted'>

export function getAbyssArchiveCutoff(now = new Date()) {
  return new Date(now.getTime() - ABYSS_ARCHIVE_DAYS * 24 * 60 * 60 * 1000)
}

export function isArchivedTask(task: TaskVisibilityFields, now = new Date()) {
  if (task.is_deleted || task.status !== 'done' || !task.completed_at) {
    return false
  }

  const completedAt = new Date(task.completed_at)
  if (Number.isNaN(completedAt.getTime())) {
    return false
  }

  return completedAt < getAbyssArchiveCutoff(now)
}

export function isDeletedTask(task: TaskVisibilityFields) {
  return task.is_deleted
}

export function isVisibleOnBoard(task: TaskVisibilityFields, now = new Date()) {
  return !isDeletedTask(task) && !isArchivedTask(task, now)
}

export function sortTasksByPosition<T extends Pick<Task, 'position'>>(tasks: T[]) {
  return [...tasks].sort((left, right) => left.position - right.position)
}