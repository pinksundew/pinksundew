'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Save, Trash2, X } from 'lucide-react'
import {
  createTaskStateMessage,
  deleteTask,
  listTaskStateMessages,
  updateTask,
} from '@/domains/task/mutations'
import { createClient } from '@/lib/supabase/client'
import {
  TaskPriority,
  TaskSignal,
  TaskStateMessage,
  TaskStatus,
  TaskWithTags,
} from '@/domains/task/types'
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
  const [workflowSignal, setWorkflowSignal] = useState<TaskSignal | null>(null)
  const [workflowSignalMessage, setWorkflowSignalMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState<TaskPlan[]>([])
  const [signalMessages, setSignalMessages] = useState<TaskStateMessage[]>([])
  const [isCompleteMenuOpen, setIsCompleteMenuOpen] = useState(false)

  const completeActionsRef = useRef<HTMLDivElement | null>(null)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    if (!task) {
      setPlans([])
      setSignalMessages([])
      setIsCompleteMenuOpen(false)
      return
    }

    setTitle(task.title)
    setDescription(task.description || '')
    setStatus(task.status)
    setPriority(task.priority)
    setWorkflowSignal(task.workflow_signal)
    setWorkflowSignalMessage(task.workflow_signal_message ?? '')
    setIsCompleteMenuOpen(false)
    void fetchPlans(task.id)
    void fetchSignalMessages(task.id)
  }, [task])

  useEffect(() => {
    if (!task) {
      return
    }

    const channel = supabase
      .channel(`task_state_messages_${task.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_state_messages',
          filter: `task_id=eq.${task.id}`,
        },
        (payload) => {
          const nextMessage = payload.new as TaskStateMessage
          setSignalMessages((prev) =>
            prev.some((message) => message.id === nextMessage.id)
              ? prev
              : [nextMessage, ...prev]
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, task?.id])

  useEffect(() => {
    if (!isCompleteMenuOpen) return

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (completeActionsRef.current && !completeActionsRef.current.contains(target)) {
        setIsCompleteMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isCompleteMenuOpen])

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

  const buildSignalPayload = (currentTask: TaskWithTags) => {
    const trimmedSignalMessage = workflowSignalMessage.trim()

    if (workflowSignal === 'needs_help' && trimmedSignalMessage.length === 0) {
      alert('A help message is required when the signal is Needs Help.')
      return null
    }

    const nextSignalMessage = workflowSignal ? trimmedSignalMessage || null : null
    const signalChanged = currentTask.workflow_signal !== workflowSignal
    const signalMessageChanged =
      (currentTask.workflow_signal_message ?? null) !== nextSignalMessage

    return {
      nextSignalMessage,
      signalChanged,
      signalMessageChanged,
      workflowSignalUpdatedAt:
        signalChanged || signalMessageChanged
          ? new Date().toISOString()
          : currentTask.workflow_signal_updated_at,
    }
  }

  const persistTask = async (nextStatus: TaskStatus) => {
    if (!task || !title.trim()) return null

    const signalPayload = buildSignalPayload(task)
    if (!signalPayload) return null

    const updated = await updateTask(supabase, task.id, {
      title: title.trim(),
      description: description.trim() || null,
      status: nextStatus,
      priority,
      workflow_signal: workflowSignal,
      workflow_signal_message: signalPayload.nextSignalMessage,
      workflow_signal_updated_at: signalPayload.workflowSignalUpdatedAt,
    })

    if (
      (signalPayload.signalChanged || signalPayload.signalMessageChanged) &&
      workflowSignal &&
      signalPayload.nextSignalMessage
    ) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      await createTaskStateMessage(supabase, {
        taskId: task.id,
        signal: workflowSignal,
        message: signalPayload.nextSignalMessage,
        createdBy: user?.id ?? null,
      })
    }

    const nextTask = { ...task, ...updated }
    onUpdate(nextTask)
    return nextTask
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
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

  const handleMoveToInProgress = async () => {
    if (!task || !title.trim()) return

    setLoading(true)
    try {
      const nextTask = await persistTask('in-progress')
      if (nextTask) {
        onClose()
      }
    } catch (error) {
      console.error('Error moving task to in-progress:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!task || !title.trim()) return

    setLoading(true)
    try {
      setIsCompleteMenuOpen(false)
      const nextTask = await persistTask('done')
      if (nextTask) {
        onClose()
      }
    } catch (error) {
      console.error('Error completing task:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteAndFollowUp = async () => {
    if (!task || !title.trim()) return

    setLoading(true)
    try {
      setIsCompleteMenuOpen(false)
      const nextTask = await persistTask('done')
      if (nextTask) {
        onClose()
        onCompleteAndFollowUp(nextTask)
      }
    } catch (error) {
      console.error('Error creating follow-up flow:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollowUpOnly = async () => {
    if (!task || !title.trim()) return

    setLoading(true)
    try {
      const nextTask = await persistTask('done')
      if (nextTask) {
        onClose()
        onCompleteAndFollowUp(nextTask)
      }
    } catch (error) {
      console.error('Error creating follow-up task:', error)
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
          className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-background shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-border bg-muted/30 p-4">
            <h2 className="text-xl font-semibold text-foreground">Task Details</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleUpdate} className="space-y-4 p-4">
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

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <h3 className="text-md font-semibold text-foreground">Task Actions</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Use quick actions based on the ticket stage.
              </p>

              <div className="mt-3">
                {status === 'todo' ? (
                  <button
                    type="button"
                    onClick={handleMoveToInProgress}
                    disabled={loading || !title.trim()}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Move to in Progress
                  </button>
                ) : null}

                {status === 'in-progress' ? (
                  <div className="relative inline-flex" ref={completeActionsRef}>
                    <div className="inline-flex overflow-hidden rounded-md border border-primary/50 shadow-sm">
                      <button
                        type="button"
                        onClick={handleComplete}
                        disabled={loading || !title.trim()}
                        className="bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Complete
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCompleteMenuOpen((prev) => !prev)}
                        disabled={loading || !title.trim()}
                        aria-label="Open complete options"
                        className="border-l border-primary-foreground/25 bg-primary px-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            isCompleteMenuOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {isCompleteMenuOpen ? (
                      <div className="absolute right-0 top-[calc(100%+0.5rem)] z-10 w-56 rounded-md border border-border bg-white p-1 shadow-lg">
                        <button
                          type="button"
                          onClick={handleCompleteAndFollowUp}
                          disabled={loading || !title.trim()}
                          className="w-full rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Complete and follow up
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {status === 'done' ? (
                  <button
                    type="button"
                    onClick={handleFollowUpOnly}
                    disabled={loading || !title.trim()}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Follow up with another ticket
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <h3 className="text-md font-semibold text-foreground">Workflow Signal</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Highlight this ticket for AI collaborators without moving it out of its current board stage.
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Signal</label>
                  <select
                    value={workflowSignal ?? ''}
                    onChange={(event) => {
                      const value = event.target.value as '' | TaskSignal
                      if (!value) {
                        setWorkflowSignal(null)
                        setWorkflowSignalMessage('')
                        return
                      }

                      setWorkflowSignal(value)
                    }}
                    className="w-full rounded-md border border-border bg-white p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">No signal</option>
                    <option value="ready_for_review">Ready For Review</option>
                    <option value="needs_help">Needs Help</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    {workflowSignal === 'needs_help' ? 'Help Request (Required)' : 'Context Message (Optional)'}
                  </label>
                  <textarea
                    rows={2}
                    value={workflowSignalMessage}
                    disabled={!workflowSignal}
                    placeholder={
                      workflowSignal === 'needs_help'
                        ? 'What is blocking progress?'
                        : workflowSignal === 'ready_for_review'
                          ? 'What should reviewers focus on?'
                          : 'Select a signal to add context'
                    }
                    onChange={(event) => setWorkflowSignalMessage(event.target.value)}
                    className="w-full rounded-md border border-border bg-white p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-muted"
                  />
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Signal History
                </div>
                {signalMessages.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {signalMessages.map((message) => (
                      <div
                        key={message.id}
                        className="rounded-md border border-border bg-white px-3 py-2 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {formatSignalLabel(message.signal)}
                          </span>
                          <span>{new Date(message.created_at).toLocaleString()}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-foreground">{message.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 rounded-md border border-dashed border-border bg-white px-3 py-4 text-sm text-muted-foreground">
                    No signal messages yet.
                  </div>
                )}
              </div>
            </div>

            {plans.length > 0 ? (
              <div>
                <h3 className="mb-2 mt-4 text-md font-semibold text-foreground">AI Plans</h3>
                <div className="space-y-3">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className="rounded-md border border-border bg-muted/20 p-3 font-mono text-sm whitespace-pre-wrap"
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

            <div className="flex flex-col-reverse justify-between gap-2 pt-4 sm:flex-row">
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> Move To Abyss
              </button>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-border bg-white px-4 py-2 text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

function formatSignalLabel(signal: TaskStateMessage['signal']) {
  if (signal === 'ready_for_review') return 'Ready For Review'
  if (signal === 'needs_help') return 'Needs Help'
  return 'Note'
}
