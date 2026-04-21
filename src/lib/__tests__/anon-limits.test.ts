import { describe, expect, it } from 'vitest'
import {
  ANONYMOUS_ACTIVE_TASK_LIMIT,
  countActiveAnonymousTasks,
  isAnonymousTaskLimitMessage,
} from '@/lib/anon-limits'

type TaskFixture = {
  status: 'todo' | 'in-progress' | 'done'
  is_deleted: boolean
}

function task(fixture: Partial<TaskFixture>): TaskFixture {
  return {
    status: fixture.status ?? 'todo',
    is_deleted: fixture.is_deleted ?? false,
  }
}

describe('ANONYMOUS_ACTIVE_TASK_LIMIT', () => {
  it('matches the DB trigger cap and the UI guard', () => {
    expect(ANONYMOUS_ACTIVE_TASK_LIMIT).toBe(10)
  })
})

describe('countActiveAnonymousTasks', () => {
  it('counts only non-deleted, non-done tasks', () => {
    const tasks = [
      task({ status: 'todo' }),
      task({ status: 'in-progress' }),
      task({ status: 'done' }),
      task({ status: 'todo', is_deleted: true }),
    ]

    expect(countActiveAnonymousTasks(tasks)).toBe(2)
  })

  it('returns 0 for empty input', () => {
    expect(countActiveAnonymousTasks([])).toBe(0)
  })
})

describe('isAnonymousTaskLimitMessage', () => {
  it('matches the exact server/trigger message for the limit', () => {
    const message = `Anonymous boards are limited to ${ANONYMOUS_ACTIVE_TASK_LIMIT} active tasks. Claim your account to add more tasks.`
    expect(isAnonymousTaskLimitMessage(message)).toBe(true)
  })

  it('matches embedded within a wrapped Postgres error', () => {
    const wrapped = `error: Anonymous boards are limited to ${ANONYMOUS_ACTIVE_TASK_LIMIT} active tasks. Claim your account to add more tasks. (SQLSTATE: P0002)`
    expect(isAnonymousTaskLimitMessage(wrapped)).toBe(true)
  })

  it('does not match unrelated errors', () => {
    expect(isAnonymousTaskLimitMessage('duplicate key value')).toBe(false)
    expect(isAnonymousTaskLimitMessage('')).toBe(false)
  })
})
