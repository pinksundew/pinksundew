'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Save, Trash2, X } from 'lucide-react'
import { updateTask, deleteTask } from '@/domains/task/mutations'
import { createClient } from '@/lib/supabase/client'
import { TaskStatus, TaskPriority, TaskWithTags } from '@/domains/task/types'
import { TaskPlan } from '@/domains/plan/types'
import { getTaskPlans } from '@/domains/plan/queries'
import { isArchivedTask, isDeletedTask } from '@/domains/task/visibility'

type TimelineTask = Pick<
  TaskWithTags,
  'id' | 'title' | 'status' | 'priority' | 'predecessor_id' | 'is_deleted' | 'completed_at'
>

const TIMELINE_TASK_SELECT = 'id, title, status, priority, predecessor_id, is_deleted, completed_at'

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
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState<TaskPlan[]>([])
  const [predecessor, setPredecessor] = useState<TimelineTask | null>(null)
  const [successors, setSuccessors] = useState<TimelineTask[]>([])
  const [isTimelineLoading, setIsTimelineLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (!task) {
      setPlans([])
      setPredecessor(null)
      setSuccessors([])
      return
    }

    setTitle(task.title)
    setDescription(task.description || '')
    setStatus(task.status)
    setPriority(task.priority)
    void fetchPlans(task.id)
    void fetchTimeline(task)
  }, [task])

  const fetchPlans = async (taskId: string) => {
    try {
      const p = await getTaskPlans(supabase, taskId)
      setPlans(p)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchTimeline = async (currentTask: TaskWithTags) => {
    setIsTimelineLoading(true)

    try {
      const predecessorQuery = currentTask.predecessor_id
        ? supabase
            .from('tasks')
            .select(TIMELINE_TASK_SELECT)
            .eq('id', currentTask.predecessor_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null })

      const successorsQuery = supabase
        .from('tasks')
        .select(TIMELINE_TASK_SELECT)
        .eq('predecessor_id', currentTask.id)
        .order('created_at', { ascending: true })

      const [predecessorResult, successorsResult] = await Promise.all([predecessorQuery, successorsQuery])

      if (predecessorResult.error) throw predecessorResult.error
      if (successorsResult.error) throw successorsResult.error

      setPredecessor((predecessorResult.data as TimelineTask | null) ?? null)
      setSuccessors((successorsResult.data as TimelineTask[] | null) ?? [])
    } catch (error) {
      console.error('Error loading task timeline:', error)
      setPredecessor(null)
      setSuccessors([])
    } finally {
      setIsTimelineLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !task) return

    setLoading(true)
    try {
      const updated = await updateTask(supabase, task.id, {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority
      })
      onUpdate({ ...task, ...updated })
      onClose()
    } catch (error) {
      console.error('Error updating task:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteAndFollowUp = async () => {
    if (!task || !title.trim()) return

    setLoading(true)
    try {
      const updated = await updateTask(supabase, task.id, {
        title: title.trim(),
        description: description.trim() || null,
        status: 'done',
        priority,
      })

      const nextTask = { ...task, ...updated }
      onUpdate(nextTask)
      onClose()
      onCompleteAndFollowUp(nextTask)
    } catch (error) {
      console.error('Error creating follow-up flow:', error)
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-xl shadow-xl overflow-y-auto max-h-[90vh] bg-white"
        >
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-xl font-semibold">Task Details</h2>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleUpdate} className="p-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Title</label>
              <input
                autoFocus
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              
              <div>
                <label className="mb-1 block text-sm font-medium">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-md font-semibold text-foreground">Ticket Timeline</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    See what this ticket follows and what it unlocks next.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCompleteAndFollowUp}
                  disabled={loading || !title.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowRight className="h-4 w-4" /> Complete and Follow Up
                </button>
              </div>

              {isTimelineLoading ? (
                <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-muted-foreground">
                  Loading timeline...
                </div>
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Predecessor
                    </div>
                    {predecessor ? (
                      <TimelineTaskCard task={predecessor} />
                    ) : (
                      <TimelineEmptyState message="This ticket starts a new thread." />
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Follow Ups
                    </div>
                    {successors.length > 0 ? (
                      <div className="space-y-2">
                        {successors.map((successor) => (
                          <TimelineTaskCard key={successor.id} task={successor} />
                        ))}
                      </div>
                    ) : (
                      <TimelineEmptyState message="No follow-up tickets yet." />
                    )}
                  </div>
                </div>
              )}
            </div>

            {plans.length > 0 && (
              <div>
                <h3 className="mb-2 text-md font-semibold mt-4">AI Plans</h3>
                <div className="space-y-3">
                  {plans.map(plan => (
                    <div key={plan.id} className="p-3 bg-gray-50 rounded-md border text-sm whitespace-pre-wrap font-mono">
                      <div className="flex justify-between items-center mb-2 border-b pb-1 text-gray-500 text-xs">
                        <span>{plan.created_by}</span>
                        <span>{new Date(plan.created_at).toLocaleString()}</span>
                      </div>
                      {plan.content}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 sm:flex-row flex-col-reverse gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> Move To Abyss
              </button>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
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

function TimelineTaskCard({ task }: { task: TimelineTask }) {
  const visibilityLabel = isDeletedTask(task)
    ? 'In abyss'
    : isArchivedTask(task)
      ? 'Archived'
      : 'On board'

  const visibilityClasses = isDeletedTask(task)
    ? 'bg-rose-100 text-rose-700'
    : isArchivedTask(task)
      ? 'bg-amber-100 text-amber-700'
      : 'bg-emerald-100 text-emerald-700'

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-sm font-semibold text-foreground">{task.title}</div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-slate-100 px-2 py-1 capitalize text-slate-700">
          {task.status.replace('-', ' ')}
        </span>
        <span className="rounded-full bg-sky-100 px-2 py-1 capitalize text-sky-700">
          {task.priority}
        </span>
        <span className={`rounded-full px-2 py-1 ${visibilityClasses}`}>{visibilityLabel}</span>
      </div>
    </div>
  )
}

function TimelineEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-muted-foreground">
      {message}
    </div>
  )
}
