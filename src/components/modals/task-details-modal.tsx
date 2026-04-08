'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Trash2 } from 'lucide-react'
import { updateTask, deleteTask } from '@/domains/task/mutations'
import { createClient } from '@/lib/supabase/client'
import { TaskStatus, TaskPriority, TaskWithTags } from '@/domains/task/types'
import { TaskPlan } from '@/domains/plan/types'
import { getTaskPlans } from '@/domains/plan/queries'

type TaskDetailsModalProps = {
  isOpen: boolean
  onClose: () => void
  task: TaskWithTags | null
  onUpdate: (task: TaskWithTags) => void
  onDelete: (taskId: string) => void
}

export function TaskDetailsModal({ isOpen, onClose, task, onUpdate, onDelete }: TaskDetailsModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState<TaskPlan[]>([])

  const supabase = createClient()

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || '')
      setStatus(task.status)
      setPriority(task.priority)
      fetchPlans()
    }
  }, [task])

  const fetchPlans = async () => {
    if (!task) return
    try {
      const p = await getTaskPlans(supabase, task.id)
      setPlans(p)
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !task) return

    setLoading(true)
    try {
      const updated = await updateTask(supabase, task.id, {
        title: title.trim(),
        description: description.trim(),
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
