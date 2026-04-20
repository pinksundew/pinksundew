'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Save, Trash2, X } from 'lucide-react'
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TaskPriority,
  TaskStatus,
  TaskWithTags,
} from '@/domains/task/types'
import { MarkdownContent } from '@/components/markdown/markdown-content'
import { ConfirmModal } from './confirm-modal'

type GuestTaskDetailsModalProps = {
  isOpen: boolean
  onClose: () => void
  task: TaskWithTags | null
  onSave: (task: TaskWithTags) => void
  onDelete: (taskId: string) => void
  onCompleteAndFollowUp: (task: TaskWithTags) => void
}

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

export function GuestTaskDetailsModal({
  isOpen,
  onClose,
  task,
  onSave,
  onDelete,
  onCompleteAndFollowUp,
}: GuestTaskDetailsModalProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(toDateInputValue(task?.due_date ?? null))
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  if (!isOpen || !task) return null

  const buildUpdatedTask = (nextStatus: TaskStatus = status) => {
    const now = new Date().toISOString()
    const completesTask = nextStatus === 'done'

    return {
      ...task,
      title: title.trim(),
      description: description.trim() || null,
      status: nextStatus,
      priority,
      due_date: fromDateInputValue(dueDate),
      completed_at: completesTask ? task.completed_at ?? now : null,
      workflow_signal: completesTask ? null : task.workflow_signal,
      workflow_signal_message: completesTask ? null : task.workflow_signal_message,
      workflow_signal_updated_at: completesTask ? now : task.workflow_signal_updated_at,
      workflow_signal_updated_by: completesTask ? null : task.workflow_signal_updated_by,
      agent_lock_until: completesTask ? null : task.agent_lock_until,
      agent_lock_reason: completesTask ? null : task.agent_lock_reason,
      updated_at: now,
    }
  }

  const handleSave = () => {
    if (!title.trim()) return

    onSave(buildUpdatedTask(status))
    onClose()
  }

  const handleQuickAction = () => {
    if (!title.trim()) return
    if (status === 'todo') {
      onSave(buildUpdatedTask('in-progress'))
      onClose()
      return
    }

    if (status === 'in-progress') {
      onSave(buildUpdatedTask('done'))
      onClose()
    }
  }

  const handleCompleteAndFollowUp = () => {
    if (!title.trim()) return

    const completedTask = buildUpdatedTask('done')
    onSave(completedTask)
    onClose()
    onCompleteAndFollowUp(completedTask)
  }

  const handleDelete = () => {
    setIsDeleteConfirmOpen(true)
  }

  const confirmDelete = () => {
    onDelete(task.id)
    setIsDeleteConfirmOpen(false)
    onClose()
  }

  const quickActionLabel =
    status === 'todo' ? 'Move To In Progress' : status === 'in-progress' ? 'Complete Task' : null

  return (
    <>
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.95, y: 10, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 10, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Guest Task Details</h2>
              <p className="text-xs text-muted-foreground">
                Changes are saved in this browser until you sign in.
              </p>
            </div>
            <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 p-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Task title"
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-28 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Add details"
              />
              {description.trim() ? (
                <div className="mt-3 rounded-md border border-border bg-white p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Markdown Preview
                  </div>
                  <MarkdownContent content={description} />
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Status</label>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as TaskStatus)}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {TASK_STATUSES.map((taskStatus) => (
                    <option key={taskStatus} value={taskStatus}>
                      {taskStatus}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Priority</label>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as TaskPriority)}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {TASK_PRIORITIES.map((taskPriority) => (
                    <option key={taskPriority} value={taskPriority}>
                      {taskPriority}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 p-4">
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {quickActionLabel ? (
                <button
                  type="button"
                  onClick={handleQuickAction}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {quickActionLabel}
                </button>
              ) : null}

              {status === 'in-progress' ? (
                <button
                  type="button"
                  onClick={handleCompleteAndFollowUp}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-foreground hover:bg-slate-100"
                >
                  Complete and Follow Up <ChevronRight className="h-4 w-4" />
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleSave}
                disabled={!title.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> Save
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
    <ConfirmModal
      isOpen={isDeleteConfirmOpen}
      title="Delete Task"
      message="This task will be removed from your guest board in this browser."
      confirmText="Delete Task"
      cancelText="Cancel"
      isDestructive
      onConfirm={confirmDelete}
      onClose={() => setIsDeleteConfirmOpen(false)}
    />
    </>
  )
}
