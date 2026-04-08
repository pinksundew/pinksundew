import React, { useEffect, useState } from 'react'
import { TaskWithTags } from '@/domains/task/types'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckSquare, Square, Trash, History, ArchiveRestore, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isArchivedTask, isDeletedTask } from '@/domains/task/visibility'

type AbyssModalProps = {
  isOpen: boolean
  onClose: () => void
  projectId: string
}

export function AbyssModal({ isOpen, onClose, projectId }: AbyssModalProps) {
  const [deletedTasks, setDeletedTasks] = useState<TaskWithTags[]>([])
  const [archivedTasks, setArchivedTasks] = useState<TaskWithTags[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!isOpen) return

    const fetchAbyss = async () => {
      setIsLoading(true)

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          task_tags(tags (*))
        `)
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false })

      if (!error && data) {
        const rawTasks = data.map((row: any) => ({
          ...row,
          tags: row.task_tags ? row.task_tags.map((tt: any) => tt.tags).filter(Boolean) : [],
          task_tags: undefined,
        })) as TaskWithTags[]

        setDeletedTasks(rawTasks.filter((task) => isDeletedTask(task)))
        setArchivedTasks(rawTasks.filter((task) => isArchivedTask(task)))
      } else {
        setDeletedTasks([])
        setArchivedTasks([])
      }

      setIsLoading(false)
    }

    fetchAbyss()
  }, [isOpen, projectId, supabase])

  const handleRestore = async (task: TaskWithTags) => {
    const restoredAt = new Date().toISOString()
    const restorePayload = task.is_deleted
      ? {
          is_deleted: false,
          completed_at: task.status === 'done' ? restoredAt : task.completed_at,
          updated_at: restoredAt,
        }
      : {
          completed_at: restoredAt,
          updated_at: restoredAt,
        }

    const { error } = await supabase.from('tasks').update(restorePayload).eq('id', task.id)
    if (error) return

    setDeletedTasks((prev) => prev.filter((item) => item.id !== task.id))
    setArchivedTasks((prev) => prev.filter((item) => item.id !== task.id))
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
          className="relative w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl flex flex-col max-h-[80vh]"
        >
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <ArchiveRestore className="w-5 h-5 text-muted-foreground" />
              The Abyss
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading ? (
              <div className="text-center text-sm text-muted-foreground py-10">Loading the Abyss...</div>
            ) : (
              <>
                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold flex items-center gap-2 text-rose-600 uppercase tracking-wider">
                        <Trash className="w-4 h-4" />
                        Deleted Tasks
                      </h3>
                      <p className="mt-1 text-sm text-rose-700/80">
                        Tickets moved here manually from the board.
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose-700 shadow-sm">
                      {deletedTasks.length}
                    </span>
                  </div>

                  {deletedTasks.length > 0 ? (
                    <div className="space-y-2">
                      {deletedTasks.map(task => (
                        <TaskRow key={task.id} task={task} onRestore={() => handleRestore(task)} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-rose-200 bg-white/80 px-4 py-5 text-sm text-rose-700/80">
                      No manually deleted tasks right now.
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                        <History className="w-4 h-4" />
                        Archived (Completed {'>'} 3 days ago)
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Finished tickets that aged out of the main board.
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                      {archivedTasks.length}
                    </span>
                  </div>

                  {archivedTasks.length > 0 ? (
                    <div className="space-y-2">
                      {archivedTasks.map(task => (
                        <TaskRow key={task.id} task={task} onRestore={() => handleRestore(task)} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-muted-foreground">
                      No archived completed tasks right now.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          
          <div className="p-4 bg-muted/30 border-t border-border flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

function TaskRow({ task, onRestore }: { task: TaskWithTags, onRestore: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors">
      <div className="flex flex-col gap-1 overflow-hidden">
        <span className="font-medium text-sm truncate">{task.title}</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {task.status === 'done' ? (
            <CheckSquare className="w-3 h-3 text-emerald-500" />
          ) : (
            <Square className="w-3 h-3" />
          )}
          <span className="capitalize">{task.status.replace('-', ' ')}</span>
          <span className="text-muted-foreground/60">•</span>
          <span>{task.is_deleted ? 'Hidden manually' : 'Archived after completion'}</span>
        </div>
      </div>
      <button 
        onClick={onRestore}
        className="text-xs px-3 py-1.5 border rounded-md hover:bg-background transition-colors"
      >
        Restore
      </button>
    </div>
  )
}
