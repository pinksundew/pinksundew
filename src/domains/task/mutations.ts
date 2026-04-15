import { SupabaseClient } from '@supabase/supabase-js'
import { Task, TaskStateMessage, TaskStateMessageSignal } from './types'

type CreateTaskInput = Omit<
  Task,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'is_deleted'
  | 'completed_at'
  | 'workflow_signal'
  | 'workflow_signal_message'
  | 'workflow_signal_updated_at'
  | 'workflow_signal_updated_by'
  | 'agent_lock_until'
  | 'agent_lock_reason'
>

export async function createTask(
  client: SupabaseClient,
  task: CreateTaskInput
): Promise<Task> {
  let nextPosition = task.position

  if (nextPosition <= 0) {
    const { data: lastTask } = await client
      .from('tasks')
      .select('position')
      .eq('project_id', task.project_id)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    nextPosition = (lastTask?.position ?? -1) + 1
  }

  const insertPayload = {
    ...task,
    position: nextPosition,
    is_deleted: false,
    completed_at: task.status === 'done' ? new Date().toISOString() : null,
  }

  const { data, error } = await client
    .from('tasks')
    .insert(insertPayload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTask(
  client: SupabaseClient,
  id: string,
  updates: Partial<Omit<Task, 'id' | 'created_at' | 'project_id'>>
): Promise<Task> {
  const nextStatus = updates.status
  const updatePayload: Partial<Task> & { updated_at: string } = {
    ...updates,
    updated_at: new Date().toISOString(),
  }
  
  if (nextStatus === 'done') {
    updatePayload.completed_at = new Date().toISOString()
  } else if (nextStatus === 'todo' || nextStatus === 'in-progress') {
    updatePayload.completed_at = null
  }

  const { data, error } = await client
    .from('tasks')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  
  return data
}

type SetTaskSignalInput = {
  taskId: string
  signal: Task['workflow_signal']
  message: string | null
  updatedBy: string | null
  lockUntil?: string | null
  lockReason?: string | null
}

type CreateTaskStateMessageInput = {
  taskId: string
  signal: TaskStateMessageSignal
  message: string
  createdBy?: string | null
}

type UpdateTaskStateMessageInput = {
  messageId: string
  message: string
  createdBy: string
}

export async function setTaskSignal(
  client: SupabaseClient,
  input: SetTaskSignalInput
): Promise<Task> {
  const now = new Date().toISOString()
  const updatePayload: Partial<Task> & { updated_at: string } = {
    updated_at: now,
    workflow_signal: input.signal,
    workflow_signal_message: input.message,
    workflow_signal_updated_at: now,
    workflow_signal_updated_by: input.updatedBy,
  }

  if (input.lockUntil !== undefined) {
    updatePayload.agent_lock_until = input.lockUntil
  }

  if (input.lockReason !== undefined) {
    updatePayload.agent_lock_reason = input.lockReason
  }

  const { data, error } = await client
    .from('tasks')
    .update(updatePayload)
    .eq('id', input.taskId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function listTaskStateMessages(
  client: SupabaseClient,
  taskId: string,
  limit = 25
): Promise<TaskStateMessage[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 100)
  const { data, error } = await client
    .from('task_state_messages')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  if (error) throw error
  return (data ?? []) as TaskStateMessage[]
}

export async function createTaskStateMessage(
  client: SupabaseClient,
  input: CreateTaskStateMessageInput
): Promise<TaskStateMessage> {
  const { data, error } = await client
    .from('task_state_messages')
    .insert({
      task_id: input.taskId,
      signal: input.signal,
      message: input.message,
      created_by: input.createdBy ?? null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as TaskStateMessage
}

export async function updateTaskStateMessage(
  client: SupabaseClient,
  input: UpdateTaskStateMessageInput
): Promise<TaskStateMessage> {
  const trimmedMessage = input.message.trim()
  if (!trimmedMessage) {
    throw new Error('Message is required')
  }

  const { data, error } = await client
    .from('task_state_messages')
    .update({
      message: trimmedMessage,
    })
    .eq('id', input.messageId)
    .eq('created_by', input.createdBy)
    .select('*')
    .single()

  if (error) throw error
  return data as TaskStateMessage
}

export async function persistTaskOrderWithKeepalive(
  projectId: string,
  tasks: Array<{ id: string; status: string; position: number }>
): Promise<void> {
  const response = await fetch('/api/tasks/reorder', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    keepalive: true,
    body: JSON.stringify({ projectId, tasks }),
  })

  if (response.ok) {
    return
  }

  const errorBody = await response.text()
  throw new Error(errorBody || 'Failed to persist task order')
}

export async function deleteTask(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client
    .from('tasks')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function persistTaskOrder(
  client: SupabaseClient,
  projectId: string,
  tasks: Array<{ id: string; status: string; position: number }>
): Promise<void> {
  const { error } = await client.rpc('reorder_project_tasks', {
    p_project_id: projectId,
    p_tasks: tasks,
  })

  if (error) {
    throw new Error(error.message || 'Failed to persist task order')
  }
}
