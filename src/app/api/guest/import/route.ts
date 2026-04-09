import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  GUEST_ACTIVE_TASK_LIMIT,
} from '@/domains/task/guest-draft'
import {
  TaskPriority,
  TaskStatus,
  isTaskPriority,
  isTaskStatus,
} from '@/domains/task/types'
import { getAbyssArchiveCutoff } from '@/domains/task/visibility'

type GuestTagPayload = {
  name: string
  color: string
}

type GuestTaskImportPayload = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  position: number
  predecessor_id: string | null
  is_deleted: boolean
  completed_at: string | null
  due_date: string | null
  tags: GuestTagPayload[]
}

type ImportPayload = {
  importId: string
  projectName: string
  tasks: GuestTaskImportPayload[]
}

function safeString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

function parseDateString(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

function parseTags(value: unknown): GuestTagPayload[] {
  if (!Array.isArray(value)) return []

  const dedupe = new Set<string>()
  const parsed: GuestTagPayload[] = []

  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object') continue

    const source = candidate as Record<string, unknown>
    const name = safeString(source.name, 80)
    if (!name) continue

    const dedupeKey = name.toLowerCase()
    if (dedupe.has(dedupeKey)) continue
    dedupe.add(dedupeKey)

    const rawColor = safeString(source.color, 7)
    const color = rawColor && /^#[0-9A-Fa-f]{6}$/.test(rawColor) ? rawColor : '#3b82f6'

    parsed.push({
      name,
      color,
    })
  }

  return parsed
}

function parseTasks(value: unknown): GuestTaskImportPayload[] {
  if (!Array.isArray(value)) {
    throw new Error('tasks must be an array')
  }

  if (value.length > 200) {
    throw new Error('tasks payload exceeds the maximum size')
  }

  return value.map((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') {
      throw new Error(`Task ${index + 1} is invalid`)
    }

    const source = candidate as Record<string, unknown>
    const id = safeString(source.id, 120)
    const title = safeString(source.title, 500)

    if (!id) {
      throw new Error(`Task ${index + 1} is missing an id`)
    }

    if (!title) {
      throw new Error(`Task ${index + 1} is missing a title`)
    }

    const statusValue = typeof source.status === 'string' ? source.status : 'todo'
    const priorityValue = typeof source.priority === 'string' ? source.priority : 'medium'

    if (!isTaskStatus(statusValue)) {
      throw new Error(`Task ${index + 1} has an invalid status`)
    }

    if (!isTaskPriority(priorityValue)) {
      throw new Error(`Task ${index + 1} has an invalid priority`)
    }

    const position =
      Number.isInteger(source.position) && Number(source.position) >= 0
        ? Number(source.position)
        : index

    return {
      id,
      title,
      description: safeString(source.description, 4000),
      status: statusValue,
      priority: priorityValue,
      position,
      predecessor_id: safeString(source.predecessor_id, 120),
      is_deleted: Boolean(source.is_deleted),
      completed_at: parseDateString(source.completed_at),
      due_date: parseDateString(source.due_date),
      tags: parseTags(source.tags),
    }
  })
}

function countVisibleTasks(tasks: GuestTaskImportPayload[]) {
  const archiveCutoff = getAbyssArchiveCutoff()

  return tasks.filter((task) => {
    if (task.is_deleted) {
      return false
    }

    if (task.status !== 'done') {
      return true
    }

    if (!task.completed_at) {
      return true
    }

    return new Date(task.completed_at) >= archiveCutoff
  }).length
}

function parseImportPayload(value: unknown): ImportPayload {
  if (!value || typeof value !== 'object') {
    throw new Error('Request body must be an object')
  }

  const source = value as Record<string, unknown>
  const importId = safeString(source.importId, 128)
  const projectName = safeString(source.projectName, 120)
  const tasks = parseTasks(source.tasks)

  if (!importId) {
    throw new Error('importId is required')
  }

  if (!projectName) {
    throw new Error('projectName is required')
  }

  const visibleCount = countVisibleTasks(tasks)
  if (visibleCount > GUEST_ACTIVE_TASK_LIMIT) {
    throw new Error(`Guest imports are limited to ${GUEST_ACTIVE_TASK_LIMIT} active tasks`)
  }

  const taskIds = new Set(tasks.map((task) => task.id))
  const normalizedTasks = tasks.map((task) => ({
    ...task,
    predecessor_id:
      task.predecessor_id && taskIds.has(task.predecessor_id) ? task.predecessor_id : null,
  }))

  return {
    importId,
    projectName,
    tasks: normalizedTasks,
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let parsedPayload: ImportPayload
  try {
    parsedPayload = parseImportPayload(await request.json())
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid import payload' },
      { status: 400 }
    )
  }

  const payloadHash = createHash('sha256')
    .update(
      JSON.stringify({
        projectName: parsedPayload.projectName,
        tasks: parsedPayload.tasks,
      })
    )
    .digest('hex')

  const { data, error } = await supabase.rpc('import_guest_board', {
    p_project_name: parsedPayload.projectName,
    p_tasks: parsedPayload.tasks,
    p_import_id: parsedPayload.importId,
    p_payload_hash: payloadHash,
  })

  if (error) {
    const status =
      error.message === 'Unauthorized'
        ? 401
        : error.message.includes('limited to')
          ? 400
          : error.message.includes('required')
            ? 400
            : 500

    return NextResponse.json({ error: error.message }, { status })
  }

  const response = data as { project_id?: string; reused?: boolean } | null
  if (!response?.project_id) {
    return NextResponse.json({ error: 'Import did not return a project id' }, { status: 500 })
  }

  return NextResponse.json({ projectId: response.project_id, reused: Boolean(response.reused) })
}
