'use client'

import React, { useEffect, useRef, useState } from 'react'
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragStartEvent,
  DragOverEvent,
  DragEndEvent
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { createClient } from '@/lib/supabase/client'
import { TaskWithTags, TaskStatus } from '@/domains/task/types'
import { KanbanColumn } from './column'
import { TaskCard } from './task-card'
import { AbyssDropZone } from '@/components/abyss/abyss-drop-zone'
import { CreateTaskModal } from '@/components/modals/create-task-modal'
import { deleteTask, persistTaskOrder } from '@/domains/task/mutations'
import { TaskDetailsModal } from '@/components/modals/task-details-modal'
import { TagManagerModal } from '@/components/modals/tag-manager-modal'
import { ExportModal } from '@/components/modals/export-modal'
import { ConfirmModal } from '@/components/modals/confirm-modal'
import { AbyssModal } from '@/components/modals/abyss-modal'
import { CheckSquare, Download, Ghost, Square } from 'lucide-react'
import { isVisibleOnBoard, sortTasksByPosition } from '@/domains/task/visibility'

type KanbanBoardProps = {
  projectId: string
  projectName: string
  initialTasks: TaskWithTags[]
}

const COLUMNS: TaskStatus[] = ['todo', 'in-progress', 'done']

type PersistedTaskOrder = Pick<TaskWithTags, 'id' | 'status' | 'position'>

function normalizeVisibleTasks(taskList: TaskWithTags[]) {
  return sortTasksByPosition(taskList.filter((task) => isVisibleOnBoard(task)))
}

function mergeRealtimeTask(task: Partial<TaskWithTags>, existing?: TaskWithTags | null) {
  return {
    ...existing,
    ...task,
    tags: existing?.tags ?? [],
  } as TaskWithTags
}

export function KanbanBoard({ projectId, projectName, initialTasks }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<TaskWithTags[]>(() =>
    normalizeVisibleTasks(initialTasks)
  )
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isTagModalOpen, setIsTagModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isAbyssModalOpen, setIsAbyssModalOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [selectedTask, setSelectedTask] = useState<TaskWithTags | null>(null)
  const [followUpSourceTask, setFollowUpSourceTask] = useState<Pick<TaskWithTags, 'id' | 'title'> | null>(null)
  const [activeTask, setActiveTask] = useState<TaskWithTags | null>(null)
  const [supabase] = useState(() => createClient())
  const tasksRef = useRef<TaskWithTags[]>(normalizeVisibleTasks(initialTasks))
  const dragStartTasksRef = useRef<TaskWithTags[] | null>(null)
  const isPersistingOrderRef = useRef(false)

  useEffect(() => {
    const nextTasks = normalizeVisibleTasks(initialTasks)
    setTasks(nextTasks)
    tasksRef.current = nextTasks
  }, [initialTasks])

  useEffect(() => {
    const channel = supabase.channel(`tasks_${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` }, (payload) => {
        setTasks(prev => {
          if (payload.eventType === 'INSERT') {
            const newTask = mergeRealtimeTask(payload.new as Partial<TaskWithTags>)
            if (!isVisibleOnBoard(newTask)) {
              return prev
            }

            if (!prev.find(t => t.id === newTask.id)) {
              return normalizeVisibleTasks([...prev, newTask])
            }
          }

          if (payload.eventType === 'UPDATE') {
            const existingTask = prev.find((task) => task.id === payload.new.id)
            const nextTask = mergeRealtimeTask(payload.new as Partial<TaskWithTags>, existingTask)

            if (!isVisibleOnBoard(nextTask)) {
              return prev.filter((task) => task.id !== nextTask.id)
            }

            if (!existingTask) {
              return normalizeVisibleTasks([...prev, nextTask])
            }

            return normalizeVisibleTasks(
              prev.map((task) => (task.id === nextTask.id ? nextTask : task))
            )
          }

          if (payload.eventType === 'DELETE') {
            return prev.filter(t => t.id !== payload.old.id)
          }

          return prev
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, supabase])

  useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isPersistingOrderRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const selectedTasks = tasks.filter((task) => selectedTaskIds.has(task.id))

  const toggleSelectionMode = () => {
    setIsSelectionMode((prev) => {
      const next = !prev
      if (!next) {
        setSelectedTaskIds(new Set())
      }
      return next
    })
  }

  const handleTaskClick = (task: TaskWithTags) => {
    if (isSelectionMode) {
      setSelectedTaskIds((prev) => {
        const next = new Set(prev)
        if (next.has(task.id)) {
          next.delete(task.id)
        } else {
          next.add(task.id)
        }
        return next
      })
      return
    }

    setSelectedTask(task)
    setIsDetailsModalOpen(true)
  }

  const openExportModal = () => {
    if (selectedTasks.length === 0) return
    setIsExportModalOpen(true)
  }

  const openCreateModal = (predecessorTask: Pick<TaskWithTags, 'id' | 'title'> | null = null) => {
    setFollowUpSourceTask(predecessorTask)
    setIsCreateModalOpen(true)
  }

  const normalizeTaskPositions = (taskList: TaskWithTags[]) =>
    taskList.map((task, index) => ({ ...task, position: index }))

  const hasOrderChanged = (before: TaskWithTags[], after: TaskWithTags[]) =>
    before.length !== after.length ||
    before.some((task, index) => {
      const nextTask = after[index]
      return (
        !nextTask ||
        nextTask.id !== task.id ||
        nextTask.status !== task.status ||
        nextTask.position !== task.position
      )
    })

  const toPersistedTaskOrder = (taskList: TaskWithTags[]): PersistedTaskOrder[] =>
    taskList.map((task) => ({
      id: task.id,
      status: task.status,
      position: task.position,
    }))

  const getColumnDropIndex = (
    taskList: TaskWithTags[],
    activeId: string,
    targetStatus: TaskStatus
  ) => {
    let lastTargetIndex = -1

    taskList.forEach((task, index) => {
      if (task.id !== activeId && task.status === targetStatus) {
        lastTargetIndex = index
      }
    })

    return lastTargetIndex === -1 ? taskList.length - 1 : lastTargetIndex
  }

  const buildReorderedTasks = (
    taskList: TaskWithTags[],
    activeId: string,
    overId: string,
    overType?: string
  ) => {
    const activeIndex = taskList.findIndex((t) => t.id === activeId)
    if (activeIndex === -1) return null

    const overIndex = taskList.findIndex((t) => t.id === overId)
    const activeTask = taskList[activeIndex]
    let nextStatus = activeTask.status
    let nextIndex = activeIndex

    if (overType === 'Column') {
      nextStatus = overId as TaskStatus
      // If dropping on a column, move to the end of that column
      const tasksInColumn = taskList.filter((t) => t.status === nextStatus && t.id !== activeId)
      if (tasksInColumn.length > 0) {
        // Find global index of the last task in this column
        const lastTaskInColumn = tasksInColumn[tasksInColumn.length - 1]
        nextIndex = taskList.indexOf(lastTaskInColumn)
      } else {
        // Empty column - find where to insert
        // This is complex for a flat array, but simplest is move to end
        nextIndex = taskList.length - 1
      }
    } else if (overType === 'Task') {
      if (overIndex === -1) return null
      const overTask = taskList[overIndex]
      nextStatus = overTask.status
      nextIndex = overIndex
    } else {
      return null
    }

    // Optimization: If status and general position haven't changed, return null to skip state update
    if (activeTask.status === nextStatus && activeIndex === nextIndex) {
      return null
    }

    const reordered = arrayMove(taskList, activeIndex, nextIndex).map((task) =>
      task.id === activeId ? { ...task, status: nextStatus } : task
    )

    return normalizeTaskPositions(reordered)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const activeId = String(active.id)
    dragStartTasksRef.current = [...tasksRef.current]
    setActiveTask(tasksRef.current.find((task) => task.id === activeId) || null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    if (activeId === overId) return
    if (overId === 'abyss-drop-zone') return

    // If active task status hasn't changed AND it's a Column, skip
    // Sorting within column is handled by SortableContext automatic logic 
    // but building the preview for cross-column needs to be careful
    const activeTaskInList = tasksRef.current.find(t => t.id === activeId)
    if (over.data.current?.type === 'Column' && activeTaskInList?.status === overId) {
      return
    }

    const preview = buildReorderedTasks(tasksRef.current, activeId, overId, over.data.current?.type)
    if (preview && hasOrderChanged(tasksRef.current, preview)) {
      setTasks(preview)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    const activeId = String(active.id)
    const overId = over ? String(over.id) : null
    const overType = over?.data.current?.type

    setActiveTask(null)
    const dragStartTasks = dragStartTasksRef.current ?? tasksRef.current
    dragStartTasksRef.current = null

    if (!over) return

    if (over.id === 'abyss-drop-zone') {
      setTaskToDelete(activeId)
      return
    }

    if (!overId || activeId === overId) return

    const finalTasks = buildReorderedTasks(dragStartTasks, activeId, overId, overType)
    if (!finalTasks || !hasOrderChanged(dragStartTasks, finalTasks)) {
      return
    }

    const previousTasks = tasksRef.current
    tasksRef.current = finalTasks
    setTasks(finalTasks)
    isPersistingOrderRef.current = true

    try {
      await persistTaskOrder(supabase, projectId, toPersistedTaskOrder(finalTasks))
    } catch {
      tasksRef.current = previousTasks
      setTasks(previousTasks)
    } finally {
      isPersistingOrderRef.current = false
    }
  }

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return

    const id = taskToDelete
    const previousTasks = tasksRef.current
    const remainingTasks = normalizeTaskPositions(previousTasks.filter((task) => task.id !== id))

    tasksRef.current = remainingTasks
    setTasks(remainingTasks)
    isPersistingOrderRef.current = true

    try {
      await deleteTask(supabase, id)

      if (remainingTasks.length > 0) {
        await persistTaskOrder(supabase, projectId, toPersistedTaskOrder(remainingTasks))
      }
    } catch {
      tasksRef.current = previousTasks
      setTasks(previousTasks)
    } finally {
      isPersistingOrderRef.current = false
      setTaskToDelete(null)
    }
  }

  return (
    <div className="h-full flex flex-col items-start w-full relative">
      <div className="w-full flex justify-between items-center mb-6 shrink-0 font-sans">
         <div>
           <h1 className="text-2xl font-bold text-foreground">{projectName}</h1>
           <p className="text-sm text-muted-foreground">Project Board</p>
         </div>
         <div className="flex gap-2">
            <button
              onClick={toggleSelectionMode}
              className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                isSelectionMode 
                  ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' 
                  : 'border-border text-foreground hover:bg-muted'
              }`}
            >
              {isSelectionMode ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              {isSelectionMode ? `Selecting (${selectedTaskIds.size})` : 'Selection Mode'}
            </button>
            <button
              onClick={openExportModal}
              disabled={!isSelectionMode || selectedTaskIds.size === 0}
              className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                isSelectionMode && selectedTaskIds.size > 0
                  ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                  : 'border-border text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
              }`}
            >
              <Download className="h-4 w-4" /> Export
            </button>
            <button 
              onClick={() => openCreateModal()}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition text-sm font-medium"
            >
              Add Task
            </button>
         </div>
      </div>
      
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setFollowUpSourceTask(null)
        }}
        projectId={projectId}
        initialPredecessorTask={followUpSourceTask}
        onSuccess={(newTask) => {
          setTasks((prev) => normalizeVisibleTasks([...prev, newTask]))
          setFollowUpSourceTask(null)
        }}
      />
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex justify-start xl:justify-center gap-6 w-full h-full pb-10 overflow-x-auto min-viewport-p">
          {COLUMNS.map((columnId) => (
            <KanbanColumn
              key={columnId}
              columnId={columnId}
              tasks={tasks.filter((t) => t.status === columnId)}
              isSelectionMode={isSelectionMode}
              selectedTaskIds={selectedTaskIds}
              onTaskClick={handleTaskClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && !isSelectionMode ? <TaskCard task={activeTask} isOverlay /> : null}
        </DragOverlay>

        <AbyssDropZone isVisible={!!activeTask && !isSelectionMode} />
      </DndContext>

      <button
        type="button"
        onClick={() => setIsAbyssModalOpen(true)}
        className="mt-4 flex w-full shrink-0 items-center justify-between gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/90 px-5 py-4 text-left transition-colors hover:border-slate-400 hover:bg-slate-100"
      >
        <div className="flex items-center gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm">
            <Ghost className="h-5 w-5" />
          </span>
          <div>
            <div className="text-sm font-semibold text-foreground">Open The Abyss</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Deleted tickets and completed tickets archived after three days live here.
            </div>
          </div>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Restore / Review
        </span>
      </button>
      <TaskDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => { setIsDetailsModalOpen(false); setSelectedTask(null); }}
        task={selectedTask}
        onUpdate={(updated) => setTasks((prev) => {
          if (!isVisibleOnBoard(updated)) {
            return prev.filter((task) => task.id !== updated.id)
          }

          return normalizeVisibleTasks(
            prev.some((task) => task.id === updated.id)
              ? prev.map((task) => (task.id === updated.id ? updated : task))
              : [...prev, updated]
          )
        })}
        onDelete={(taskId) => setTasks((prev) => prev.filter((task) => task.id !== taskId))}
        onCompleteAndFollowUp={(task) => openCreateModal({ id: task.id, title: task.title })}
      />
      <TagManagerModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        projectId={projectId}
      />
      {isExportModalOpen ? (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          tasks={selectedTasks}
          projectName={projectName}
        />
      ) : null}
      <ConfirmModal
        isOpen={taskToDelete !== null}
        title="Move Task To The Abyss"
        message="This task will be hidden from the board and can be restored later from the abyss."
        confirmText="Move Task"
        isDestructive
        onConfirm={handleConfirmDelete}
        onClose={() => setTaskToDelete(null)}
      />
      <AbyssModal
        isOpen={isAbyssModalOpen}
        onClose={() => setIsAbyssModalOpen(false)}
        projectId={projectId}
      />
    </div>
  )
}
