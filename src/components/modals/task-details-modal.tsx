'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Save, Trash2, X } from 'lucide-react'
import {
  createTaskStateMessage,
  deleteTask,
  listTaskStateMessages,
  updateTask,
} from '@/domains/task/mutations'
import { createClient } from '@/lib/supabase/client'
import { TaskPriority, TaskStateMessage, TaskStatus, TaskWithTags } from '@/domains/task/types'
import { TaskPlan } from '@/domains/plan/types'
import { getTaskPlans } from '@/domains/plan/queries'

type TaskDetailsModalProps = {
  isOpen: boolean
  onClose: () => void
  task: TaskWithTags | null
  onUpdate: (task: TaskWithTags) => void
  onDelete: (taskId: string) => void
  onCompleteAndFollowUp: (task: TaskWithTags) => void
}

type ReviewThreadMessage = Pick<
  TaskStateMessage,
  'id' | 'signal' | 'message' | 'created_at' | 'created_by'
>

function toDateInputValue(value: string | null) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString().slice(0, 10)
}

function fromDateInputValue(value: string) {
  if (!value) return null

  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

export function TaskDetailsModal({
  isOpen,
  onClose,
  task,
  onUpdate,
  onDelete,
  onCompleteAndFollowUp,
}: TaskDetailsModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [replyMessage, setReplyMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState<TaskPlan[]>([])
  const [signalMessages, setSignalMessages] = useState<TaskStateMessage[]>([])
  const [isInProgressActionMenuOpen, setIsInProgressActionMenuOpen] = useState(false)

  const [supabase] = useState(() => createClient())

  useEffect(() => {
    if (!task) {
      setPlans([])
      setSignalMessages([])
      setDueDate('')
      setReplyMessage('')
      setIsInProgressActionMenuOpen(false)
      return
    }

    setTitle(task.title)
    setDescription(task.description || '')
    setStatus(task.status)
    setPriority(task.priority)
    setDueDate(toDateInputValue(task.due_date))
    setReplyMessage('')
    setIsInProgressActionMenuOpen(false)
    void fetchPlans(task.id)
    void fetchSignalMessages(task.id)
  }, [task])

  const fetchPlans = async (taskId: string) => {
    try {
      const taskPlans = await getTaskPlans(supabase, taskId)
      setPlans(taskPlans)
    } catch (error) {
      console.error('Error loading task plans:', error)
      setPlans([])
    }
  }

  const fetchSignalMessages = async (taskId: string) => {
    try {
      const messages = await listTaskStateMessages(supabase, taskId, 25)
      setSignalMessages(messages)
    } catch (error) {
      console.error('Error loading task signal messages:', error)
      setSignalMessages([])
    }
  }

  const persistTask = async (
    nextStatus: TaskStatus,
    options?: { clearSignal?: boolean; updatedBy?: string | null }
  ) => {
    if (!task || !title.trim()) return null

    const now = new Date().toISOString()
    const shouldClearSignal =
      hasActiveSignal(task) && Boolean(options?.clearSignal || nextStatus === 'done')

    const updated = await updateTask(supabase, task.id, {
      title: title.trim(),
      description: description.trim() || null,
      status: nextStatus,
      priority,
      due_date: fromDateInputValue(dueDate),
      ...(shouldClearSignal
        ? {
            workflow_signal: null,
            workflow_signal_message: null,
            workflow_signal_updated_at: now,
            workflow_signal_updated_by: options?.updatedBy ?? null,
            agent_lock_until: null,
            agent_lock_reason: null,
          }
        : {}),
    })

    const nextTask = { ...task, ...updated }
    onUpdate(nextTask)
    return nextTask
  }

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!task || !title.trim()) return

    setLoading(true)
    try {
      const nextTask = await persistTask(status)
      if (nextTask) {
        onClose()
      }
    } catch (error) {
      console.error('Error updating task:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAction = async (
    mode: 'default' | 'complete-and-follow-up' = 'default'
  ) => {
    if (!task || !title.trim()) return

    setLoading(true)
    try {
      if (status === 'todo') {
        const nextTask = await persistTask('in-progress')
        if (nextTask) {
          onClose()
        }
        return
      }

      if (status === 'in-progress') {
        const nextTask = await persistTask('done')
        if (nextTask) {
          onClose()
          if (mode === 'complete-and-follow-up') {
            onCompleteAndFollowUp(nextTask)
          }
        }
        return
      }

      const nextTask = await persistTask('done')
      if (nextTask) {
        onClose()
        onCompleteAndFollowUp(nextTask)
      }
    } catch (error) {
      console.error('Error running task action:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReply = async () => {
    if (!task || !task.workflow_signal) return

    const trimmedReply = replyMessage.trim()
    if (!trimmedReply) return

    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const reply = await createTaskStateMessage(supabase, {
        taskId: task.id,
        signal: 'note',
        message: trimmedReply,
        createdBy: user?.id ?? null,
      })

      setSignalMessages((prev) =>
        prev.some((message) => message.id === reply.id) ? prev : [reply, ...prev]
      )

      const shouldReopenForWork =
        task.workflow_signal === 'ready_for_review' && status === 'done'
      const nextStatus = shouldReopenForWork ? 'in-progress' : status

      const nextTask = await persistTask(nextStatus, {
        clearSignal: true,
        updatedBy: user?.id ?? null,
      })

      if (nextTask) {
        setStatus(nextTask.status)
        setReplyMessage('')
      }
    } catch (error) {
      console.error('Error replying to task signal:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReviewComplete = async () => {
    if (!task || task.workflow_signal !== 'ready_for_review') return

    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const nextTask = await persistTask(status, {
        clearSignal: true,
        updatedBy: user?.id ?? null,
      })

      if (nextTask) {
        setStatus(nextTask.status)
      }
    } catch (error) {
      console.error('Error completing review:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!task) return
    if (!confirm('Move this task to the abyss? You can restore it later.')) return

    setLoading(true)
    try {
      await deleteTask(supabase, task.id)
      onDelete(task.id)
      onClose()
    } catch (error) {
      console.error('Error deleting task:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !task) return null

  const threadMessages = buildThreadMessages(task, signalMessages)
  const quickAction = getQuickAction(status)

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-foreground/25 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-border bg-muted/30 p-4 shrink-0">
            <h2 className="text-xl font-semibold text-foreground">Task Details</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleUpdate} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Title</label>
                <input
                  autoFocus
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-md border border-border bg-white p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="w-full rounded-md border border-border bg-white p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Status</label>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as TaskStatus)}
                    className="w-full rounded-md border border-border bg-white p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Priority</label>
                  <select
                    value={priority}
                    onChange={(event) => setPriority(event.target.value as TaskPriority)}
                    className="w-full rounded-md border border-border bg-white p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="w-full rounded-md border border-border bg-white p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-md font-semibold text-foreground">Review Thread</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Messages from the MCP agent and your replies live here.
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                      task.workflow_signal === 'needs_help'
                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                        : task.workflow_signal === 'agent_working'
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : task.workflow_signal === 'ready_for_review'
                          ? 'border-pink-200 bg-pink-50 text-pink-700'
                          : 'border-border bg-white text-muted-foreground'
                    }`}
                  >
                    {formatActiveSignalLabel(task.workflow_signal)}
                  </span>
                </div>

                {threadMessages.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {threadMessages.map((message) => {
                      const isAgentMessage = message.signal !== 'note' || message.created_by === null
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isAgentMessage ? 'justify-start' : 'justify-end'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${getThreadBubbleClassName(
                              message
                            )}`}
                          >
                            <div
                              className={`flex items-center justify-between gap-3 text-xs ${
                                isAgentMessage
                                  ? 'text-muted-foreground'
                                  : 'text-primary-foreground/80'
                              }`}
                            >
                              <span className="font-semibold uppercase tracking-[0.14em]">
                                {formatThreadAuthorLabel(message)}
                              </span>
                              <span>{new Date(message.created_at).toLocaleString()}</span>
                            </div>
                            <p
                              className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${
                                isAgentMessage ? 'text-foreground' : 'text-primary-foreground'
                              }`}
                            >
                              {message.message}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="mt-4 rounded-md border border-dashed border-border bg-white px-3 py-4 text-sm text-muted-foreground">
                    No review messages yet.
                  </div>
                )}

                {task.workflow_signal ? (
                  <div className="mt-4 rounded-xl border border-border bg-white p-3">
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Reply Back
                    </label>
                    <textarea
                      rows={3}
                      value={replyMessage}
                      onChange={(event) => setReplyMessage(event.target.value)}
                      placeholder={`Reply to ${formatSignalLabel(task.workflow_signal).toLowerCase()} and clear the active signal.${task.workflow_signal === 'ready_for_review' ? ' This reply will also move the task back to in progress.' : ''}`}
                      className="w-full rounded-md border border-border bg-white p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        Sending a reply clears the current signal and leaves the conversation in history.
                        {task.workflow_signal === 'ready_for_review'
                          ? ' For review requests, this also reopens the ticket to in progress.'
                          : ''}
                      </p>
                      <button
                        type="button"
                        onClick={handleReply}
                        disabled={loading || replyMessage.trim().length === 0}
                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Send Reply
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-md border border-dashed border-border bg-white px-3 py-4 text-sm text-muted-foreground">
                    No active workflow signal.
                  </div>
                )}
              </div>

              {plans.length > 0 ? (
                <div>
                  <h3 className="mb-2 mt-4 text-md font-semibold text-foreground">AI Plans</h3>
                  <div className="space-y-3">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        className="whitespace-pre-wrap rounded-md border border-border bg-muted/20 p-3 font-mono text-sm"
                      >
                        <div className="mb-2 flex items-center justify-between border-b border-border pb-1 text-xs text-muted-foreground">
                          <span>{plan.created_by}</span>
                          <span>{new Date(plan.created_at).toLocaleString()}</span>
                        </div>
                        {plan.content}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col-reverse justify-between gap-2 border-t border-border bg-background p-4 shrink-0 sm:flex-row">
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> Move To Abyss
              </button>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> {loading ? 'Saving...' : 'Save Changes'}
                </button>

                {task.workflow_signal === 'ready_for_review' ? (
                  <button
                    type="button"
                    onClick={handleReviewComplete}
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-md border border-pink-200 bg-pink-50 px-4 py-2 text-sm font-medium text-pink-700 transition-colors hover:bg-pink-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Review Complete
                  </button>
                ) : null}

                {quickAction ? (
                  status === 'in-progress' ? (
                    <div className="relative inline-flex">
                      <button
                        type="button"
                        onClick={() => {
                          setIsInProgressActionMenuOpen(false)
                          void handleQuickAction()
                        }}
                        disabled={loading || !title.trim()}
                        className="inline-flex items-center justify-center rounded-l-md border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {quickAction}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsInProgressActionMenuOpen((previous) => !previous)}
                        disabled={loading || !title.trim()}
                        className="inline-flex items-center justify-center rounded-r-md border border-l-0 border-border bg-white px-2 text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Toggle complete actions"
                        aria-expanded={isInProgressActionMenuOpen}
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            isInProgressActionMenuOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {isInProgressActionMenuOpen ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setIsInProgressActionMenuOpen(false)}
                            className="fixed inset-0 z-10 cursor-default"
                            aria-label="Close complete actions menu"
                          />
                          <div className="absolute bottom-full right-0 z-20 mb-2 min-w-[220px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                            <button
                              type="button"
                              onClick={() => {
                                setIsInProgressActionMenuOpen(false)
                                void handleQuickAction('complete-and-follow-up')
                              }}
                              disabled={loading || !title.trim()}
                              className="flex w-full items-center justify-start px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Complete and Follow Up
                            </button>
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        void handleQuickAction()
                      }}
                      disabled={loading || !title.trim()}
                      className="inline-flex items-center justify-center rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {quickAction}
                    </button>
                  )
                ) : null}
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

function hasActiveSignal(task: TaskWithTags) {
  return Boolean(
    task.workflow_signal ||
      task.workflow_signal_message ||
      task.agent_lock_until ||
      task.agent_lock_reason
  )
}

function buildThreadMessages(task: TaskWithTags, messages: TaskStateMessage[]): ReviewThreadMessage[] {
  const orderedMessages = [...messages].sort(
    (left, right) =>
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  )

  if (!task.workflow_signal || !task.workflow_signal_message) {
    return orderedMessages
  }

  const hasCurrentSignalMessage = orderedMessages.some(
    (message) =>
      message.signal === task.workflow_signal && message.message === task.workflow_signal_message
  )

  if (hasCurrentSignalMessage) {
    return orderedMessages
  }

  return [
    ...orderedMessages,
    {
      id: `active-signal-${task.id}`,
      signal: task.workflow_signal,
      message: task.workflow_signal_message,
      created_at: task.workflow_signal_updated_at ?? task.updated_at,
      created_by: task.workflow_signal_updated_by,
    },
  ].sort(
    (left, right) =>
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  )
}

function formatSignalLabel(signal: TaskStateMessage['signal'] | TaskWithTags['workflow_signal']) {
  if (signal === 'ready_for_review') return 'Needs Review'
  if (signal === 'needs_help') return 'Needs Help'
  if (signal === 'agent_working') return 'Agent Working'
  return 'Note'
}

function formatActiveSignalLabel(signal: TaskWithTags['workflow_signal']) {
  return signal ? formatSignalLabel(signal) : 'No Active Review'
}

function formatThreadAuthorLabel(message: ReviewThreadMessage) {
  if (message.signal === 'note') {
    return message.created_by === null ? 'Agent' : 'You'
  }

  return `Agent · ${formatSignalLabel(message.signal)}`
}

function getThreadBubbleClassName(message: ReviewThreadMessage) {
  if (message.signal === 'note') {
    if (message.created_by === null) {
      return 'border border-border bg-white'
    }

    return 'bg-primary text-primary-foreground'
  }

  if (message.signal === 'needs_help') {
    return 'border border-rose-200 bg-rose-50'
  }

  if (message.signal === 'ready_for_review') {
    return 'border border-pink-200 bg-pink-50'
  }

  if (message.signal === 'agent_working') {
    return 'border border-amber-200 bg-amber-50'
  }

  return 'border border-border bg-white'
}

function getQuickAction(status: TaskStatus) {
  if (status === 'todo') return 'Move To In Progress'
  if (status === 'in-progress') return 'Complete'
  if (status === 'done') return 'Create Follow-Up'
  return null
}
