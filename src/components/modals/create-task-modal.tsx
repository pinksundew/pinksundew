'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Link2, X } from 'lucide-react'
import { createTask } from '@/domains/task/mutations'
import { createClient } from '@/lib/supabase/client'
import { TaskStatus, TaskPriority, TaskWithTags } from '@/domains/task/types'

function fromDateInputValue(value: string) {
  if (!value) return null

  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

type CreateTaskRequest = {
  project_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  position: number
  assignee_id: string | null
  due_date: string | null
  predecessor_id: string | null
}

const DRAFTING_PLACEHOLDER = 'Drafting...'

type CreateTaskModalProps = {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onSuccess: (task: TaskWithTags) => void
  onUpdateTaskTitle?: (taskId: string, title: string) => Promise<void>
  initialStatus?: TaskStatus
  initialTitle?: string
  initialDescription?: string
  initialPredecessorTask?: Pick<TaskWithTags, 'id' | 'title'> | null
  onCreateTask?: (task: CreateTaskRequest) => Promise<TaskWithTags>
}

export function CreateTaskModal({
  isOpen,
  onClose,
  projectId,
  onSuccess,
  onUpdateTaskTitle,
  initialPredecessorTask = null,
  onCreateTask,
  initialStatus = 'todo',
  initialTitle = '',
  initialDescription = '',
}: CreateTaskModalProps) {
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [status, setStatus] = useState<TaskStatus>(initialStatus)
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [predecessorId, setPredecessorId] = useState<string | null>(initialPredecessorTask?.id ?? null)
  const [predecessorTitle, setPredecessorTitle] = useState(initialPredecessorTask?.title ?? '')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (!isOpen) return

    setTitle(initialTitle)
    setDescription(initialDescription)
    setStatus(initialStatus)
    setPriority('medium')
    setDueDate('')
    setLoading(false)
    setPredecessorId(initialPredecessorTask?.id ?? null)
    setPredecessorTitle(initialPredecessorTask?.title ?? '')
  }, [initialDescription, initialPredecessorTask, initialStatus, initialTitle, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedDescription = description.trim()
    if (!trimmedDescription) return

    const hasCustomTitle = title.trim().length > 0
    const initialTitle = hasCustomTitle ? title.trim() : DRAFTING_PLACEHOLDER

    setLoading(true)
    try {
      const taskInput: CreateTaskRequest = {
        project_id: projectId,
        title: initialTitle,
        description: trimmedDescription,
        status,
        priority,
        position: 0,
        assignee_id: null,
        due_date: fromDateInputValue(dueDate),
        predecessor_id: predecessorId,
      }

      let createdTask: TaskWithTags

      if (onCreateTask) {
        createdTask = await onCreateTask(taskInput)
      } else {
        const newTask = await createTask(supabase, taskInput)
        createdTask = { ...newTask, tags: [] }
      }

      onSuccess(createdTask)

      onClose()

      if (!hasCustomTitle && onUpdateTaskTitle) {
        void generateAITitle(createdTask.id, trimmedDescription)
      }
    } catch (error) {
      console.error('Failed to create task:', error)
      alert(error instanceof Error ? error.message : 'Error creating task')
    } finally {
      setLoading(false)
    }
  }

  const generateAITitle = async (taskId: string, sourceDescription: string) => {
    try {
      const response = await fetch('/api/tasks/ai-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: sourceDescription }),
      })

      if (!response.ok) {
        console.error('AI title generation failed')
        return
      }

      const { title: generatedTitle } = await response.json()
      if (generatedTitle && onUpdateTaskTitle) {
        await onUpdateTaskTitle(taskId, generatedTitle)
      }
    } catch (error) {
      console.error('Error generating AI title:', error)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-border overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <h2 className="text-lg font-semibold text-foreground">
                {predecessorId ? 'Create Follow-Up Task' : 'Create New Task'}
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {predecessorId ? (
                <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-3 text-sm text-sky-900">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-700">
                        <Link2 className="h-3.5 w-3.5" />
                        Ticket Timeline
                      </div>
                      <div className="mt-2 flex items-center gap-2 font-medium">
                        <span>{predecessorTitle || 'Linked predecessor'}</span>
                        <ArrowRight className="h-4 w-4 text-sky-600" />
                        <span>New follow-up</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPredecessorId(null)
                        setPredecessorTitle('')
                      }}
                      className="rounded-md px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100"
                    >
                      Remove link
                    </button>
                  </div>
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Title (optional)
                </label>
                <input
                  type="text"
                  placeholder="Leave blank to auto-generate"
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  If left blank, a title will be auto-generated from the description.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                  <span className="ml-1 text-pink-500" aria-hidden="true">
                    *
                  </span>
                  <span className="sr-only">required</span>
                </label>
                <textarea
                  required
                  placeholder="Add details..."
                  rows={3}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                  <select
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Priority</label>
                  <select
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Due Date</label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-md transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !description.trim()}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
