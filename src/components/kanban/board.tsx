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
import { deleteTask, persistTaskOrderWithKeepalive } from '@/domains/task/mutations'
import { getProjectTasks } from '@/domains/task/queries'
import { AgentInstructionsModal } from '@/components/modals/agent-instructions-modal'
import { TaskDetailsModal } from '@/components/modals/task-details-modal'
import { GuestTaskDetailsModal } from '@/components/modals/guest-task-details-modal'
import { TagManagerModal } from '@/components/modals/tag-manager-modal'
import { ExportModal } from '@/components/modals/export-modal'
import { ConfirmModal } from '@/components/modals/confirm-modal'
import { AbyssModal } from '@/components/modals/abyss-modal'
import { ConnectMcpModal } from '@/components/modals/connect-mcp-modal'
import { Download, FileText, Ghost, PlugZap, X } from 'lucide-react'
import { isVisibleOnBoard, sortTasksByPosition } from '@/domains/task/visibility'
import {
  GUEST_ACTIVE_TASK_LIMIT,
  countActiveGuestTasks,
  createGuestTask,
  loadGuestDraft,
  saveGuestDraft,
} from '@/domains/task/guest-draft'

type KanbanBoardProps = {
  projectId: string
  projectName: string
  initialTasks: TaskWithTags[]
  mode?: 'authenticated' | 'guest'
}

const COLUMNS: TaskStatus[] = ['todo', 'in-progress', 'done']

type PersistedTaskOrder = Pick<TaskWithTags, 'id' | 'status' | 'position'>

function normalizeVisibleTasks(taskList: TaskWithTags[]) {
  return sortTasksByPosition(taskList.filter((task) => isVisibleOnBoard(task)))
}

function buildTaskSyncSignature(taskList: TaskWithTags[]) {
  return normalizeVisibleTasks(taskList)
    .map((task) => {
      const tagSignature = [...task.tags]
        .map((tag) => tag.id)
        .sort()
        .join(',')

      return [
        task.id,
        task.updated_at,
        task.status,
        String(task.position),
        task.workflow_signal ?? '',
        task.workflow_signal_message ?? '',
        task.agent_lock_until ?? '',
        task.agent_lock_reason ?? '',
        tagSignature,
      ].join('|')
    })
    .join('||')
}

function mergeRealtimeTask(task: Partial<TaskWithTags>, existing?: TaskWithTags | null) {
  return {
    ...existing,
    ...task,
    tags: existing?.tags ?? [],
  } as TaskWithTags
}

function applyStatusSideEffects(task: TaskWithTags, nextStatus: TaskStatus): TaskWithTags {
  if (nextStatus !== 'done' || task.status === 'done') {
    return { ...task, status: nextStatus }
  }

  return {
    ...task,
    status: nextStatus,
    workflow_signal: null,
    workflow_signal_message: null,
    workflow_signal_updated_at: new Date().toISOString(),
    workflow_signal_updated_by: null,
    agent_lock_until: null,
    agent_lock_reason: null,
  }
}

export function KanbanBoard({
  projectId,
  projectName,
  initialTasks,
  mode = 'authenticated',
}: KanbanBoardProps) {
  const isGuestMode = mode === 'guest'
  const [tasks, setTasks] = useState<TaskWithTags[]>(() =>
    normalizeVisibleTasks(initialTasks)
  )
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isTagModalOpen, setIsTagModalOpen] = useState(false)
  const [isAgentInstructionsOpen, setIsAgentInstructionsOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isAbyssModalOpen, setIsAbyssModalOpen] = useState(false)
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [selectedTask, setSelectedTask] = useState<TaskWithTags | null>(null)
  const [followUpSourceTask, setFollowUpSourceTask] = useState<Pick<TaskWithTags, 'id' | 'title'> | null>(null)
  const [activeTask, setActiveTask] = useState<TaskWithTags | null>(null)
  const [authPromptMessage, setAuthPromptMessage] = useState<string | null>(null)
  const [supabase] = useState(() => createClient())
  const tasksRef = useRef<TaskWithTags[]>(normalizeVisibleTasks(initialTasks))
  const dragStartTasksRef = useRef<TaskWithTags[] | null>(null)
  const isPersistingOrderRef = useRef(false)
  const lastPersistedTasksRef = useRef<TaskWithTags[]>(normalizeVisibleTasks(initialTasks))
  const pendingPersistRef = useRef<{
    tasks: TaskWithTags[]
    payload: PersistedTaskOrder[]
  } | null>(null)
  const isPersistLoopRunningRef = useRef(false)
  const hasGuestDraftRef = useRef(false)
  const isAutoRefreshRunningRef = useRef(false)

  const persistGuestTasks = (taskList: TaskWithTags[]) => {
    saveGuestDraft(projectName, taskList)
    hasGuestDraftRef.current = taskList.length > 0
    lastPersistedTasksRef.current = taskList
  }

  const promptForAuth = (message: string) => {
    setAuthPromptMessage(message)
  }

  const redirectToAuth = () => {
    if (typeof window === 'undefined') return
    window.location.href = '/login?next=/guest'
  }

  useEffect(() => {
    if (isGuestMode) {
      const draft = loadGuestDraft(projectName)
      const nextTasks = normalizeVisibleTasks(draft.tasks)
      setTasks(nextTasks)
      tasksRef.current = nextTasks
      lastPersistedTasksRef.current = nextTasks
      hasGuestDraftRef.current = nextTasks.length > 0
      return
    }

    const nextTasks = normalizeVisibleTasks(initialTasks)
    setTasks(nextTasks)
    tasksRef.current = nextTasks
    lastPersistedTasksRef.current = nextTasks
  }, [initialTasks, isGuestMode, projectName])

  useEffect(() => {
    if (isGuestMode) {
      return
    }

    const channel = supabase.channel(`tasks_${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` }, (payload) => {
        setTasks(prev => {
          let nextTasks = prev

          if (payload.eventType === 'INSERT') {
            const newTask = mergeRealtimeTask(payload.new as Partial<TaskWithTags>)
            if (!isVisibleOnBoard(newTask)) {
              return prev
            }

            if (!prev.find(t => t.id === newTask.id)) {
              nextTasks = normalizeVisibleTasks([...prev, newTask])
            }
          }

          if (payload.eventType === 'UPDATE') {
            const existingTask = prev.find((task) => task.id === payload.new.id)
            const nextTask = mergeRealtimeTask(payload.new as Partial<TaskWithTags>, existingTask)

            if (!isVisibleOnBoard(nextTask)) {
              nextTasks = prev.filter((task) => task.id !== nextTask.id)
            } else if (!existingTask) {
              nextTasks = normalizeVisibleTasks([...prev, nextTask])
            } else {
              nextTasks = normalizeVisibleTasks(
                prev.map((task) => (task.id === nextTask.id ? nextTask : task))
              )
            }
          }

          if (payload.eventType === 'DELETE') {
            nextTasks = prev.filter(t => t.id !== payload.old.id)
          }

          if (!isPersistingOrderRef.current) {
            lastPersistedTasksRef.current = nextTasks
          }

          return nextTasks
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, supabase, isGuestMode])

  useEffect(() => {
    if (isGuestMode) {
      return
    }

    const refreshBoardTasks = async () => {
      if (isAutoRefreshRunningRef.current) {
        return
      }

      if (isPersistingOrderRef.current || dragStartTasksRef.current || activeTask) {
        return
      }

      if (typeof document !== 'undefined' && document.hidden) {
        return
      }

      isAutoRefreshRunningRef.current = true

      try {
        const latestTasks = normalizeVisibleTasks(await getProjectTasks(supabase, projectId))
        const currentSignature = buildTaskSyncSignature(tasksRef.current)
        const latestSignature = buildTaskSyncSignature(latestTasks)

        if (latestSignature === currentSignature) {
          return
        }

        tasksRef.current = latestTasks
        lastPersistedTasksRef.current = latestTasks
        setTasks(latestTasks)

        setSelectedTask((previous) => {
          if (!previous) {
            return previous
          }

          return latestTasks.find((task) => task.id === previous.id) ?? null
        })
      } catch (error) {
        console.error('Error auto-refreshing board tasks:', error)
      } finally {
        isAutoRefreshRunningRef.current = false
      }
    }

    const refreshInterval = window.setInterval(() => {
      void refreshBoardTasks()
    }, 5000)

    return () => {
      window.clearInterval(refreshInterval)
    }
  }, [activeTask, isGuestMode, projectId, supabase])

  useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isGuestMode && hasGuestDraftRef.current) {
        event.preventDefault()
        event.returnValue = ''
        return
      }

      if (!isPersistingOrderRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isGuestMode])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const selectedTasks = tasks.filter((task) => selectedTaskIds.has(task.id))

  const exitSelectionMode = () => {
    setIsSelectionMode(false)
    setSelectedTaskIds(new Set())
  }

  const hideSelectionMode = () => {
    setIsSelectionMode(false)
  }

  const startSelectionMode = () => {
    setIsSelectionMode(true)
    setSelectedTaskIds(new Set())
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

    if (isGuestMode) {
      setSelectedTask(task)
      setIsDetailsModalOpen(true)
      return
    }

    setSelectedTask(task)
    setIsDetailsModalOpen(true)
  }

  const openExportModal = () => {
    if (selectedTasks.length === 0) return
    hideSelectionMode()
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

  const flushPersistQueue = async () => {
    if (isPersistLoopRunningRef.current) return

    isPersistLoopRunningRef.current = true
    isPersistingOrderRef.current = true

    try {
      while (pendingPersistRef.current) {
        const nextPersist = pendingPersistRef.current
        pendingPersistRef.current = null

        try {
          await persistTaskOrderWithKeepalive(projectId, nextPersist.payload)
          lastPersistedTasksRef.current = nextPersist.tasks
        } catch {
          if (!pendingPersistRef.current) {
            tasksRef.current = lastPersistedTasksRef.current
            setTasks(lastPersistedTasksRef.current)
          }
        }
      }
    } finally {
      isPersistingOrderRef.current = false
      isPersistLoopRunningRef.current = false
    }
  }

  const queuePersistTaskOrder = (taskList: TaskWithTags[]) => {
    if (isGuestMode) {
      persistGuestTasks(taskList)
      return
    }

    pendingPersistRef.current = {
      tasks: taskList,
      payload: toPersistedTaskOrder(taskList),
    }

    void flushPersistQueue()
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
      task.id === activeId ? applyStatusSideEffects(task, nextStatus) : task
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
      tasksRef.current = preview
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
    const currentPreviewTasks = tasksRef.current
    dragStartTasksRef.current = null

    if (!over) {
      // DragOver may have already moved the task visually; persist if changed
      if (hasOrderChanged(dragStartTasks, currentPreviewTasks)) {
        queuePersistTaskOrder(currentPreviewTasks)
      } else {
        tasksRef.current = dragStartTasks
        setTasks(dragStartTasks)
      }
      return
    }

    if (over.id === 'abyss-drop-zone') {
      setTaskToDelete(activeId)
      return
    }

    if (!overId || activeId === overId) {
      // Even when over matches active, the preview may have a valid cross-column move
      if (hasOrderChanged(dragStartTasks, currentPreviewTasks)) {
        queuePersistTaskOrder(currentPreviewTasks)
      }
      return
    }

    const finalTasks = buildReorderedTasks(dragStartTasks, activeId, overId, overType)
    if (finalTasks && hasOrderChanged(dragStartTasks, finalTasks)) {
      tasksRef.current = finalTasks
      setTasks(finalTasks)
      queuePersistTaskOrder(finalTasks)
    } else if (hasOrderChanged(dragStartTasks, currentPreviewTasks)) {
      // buildReorderedTasks couldn't compute a result, but the DragOver preview
      // already captured the correct state — persist it instead
      queuePersistTaskOrder(currentPreviewTasks)
    }
  }

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return

    const id = taskToDelete
    const previousTasks = tasksRef.current
    const remainingTasks = normalizeTaskPositions(previousTasks.filter((task) => task.id !== id))

    tasksRef.current = remainingTasks
    setTasks(remainingTasks)

    if (isGuestMode) {
      persistGuestTasks(remainingTasks)
      setTaskToDelete(null)
      return
    }

    try {
      await deleteTask(supabase, id)
      lastPersistedTasksRef.current = remainingTasks

      if (remainingTasks.length > 0) {
        queuePersistTaskOrder(remainingTasks)
      }
    } catch {
      tasksRef.current = previousTasks
      setTasks(previousTasks)
    } finally {
      setTaskToDelete(null)
    }
  }

  const guestTaskLimitReached =
    isGuestMode && countActiveGuestTasks(tasks) >= GUEST_ACTIVE_TASK_LIMIT

  return (
    <div className="h-full flex flex-col items-start w-full relative">
      <div className="w-full flex justify-between items-center mb-6 shrink-0 font-sans sticky top-24 z-30 bg-[var(--color-muted)]/20 backdrop-blur-sm py-2 -mt-2">
         <div>
           <div className="flex items-center gap-3">
             <h1 className="text-2xl font-bold text-foreground">{projectName}</h1>
             <button
               type="button"
               onClick={() => {
                 if (isGuestMode) {
                   promptForAuth('Connecting MCP requires an account and an API key. Sign in to generate your key and keep your draft.')
                   return
                 }

                 setIsConnectModalOpen(true)
               }}
               className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-primary-foreground uppercase transition-colors hover:bg-primary/20"
             >
               <PlugZap className="h-3.5 w-3.5" />
               Connect
             </button>
           </div>
           <p className="text-sm text-muted-foreground">
             {isGuestMode
               ? 'Guest mode: saved in this browser only. Sign in before leaving this device.'
               : 'Project Board'}
           </p>
         </div>
         <div className="flex gap-2">
            <button
              onClick={startSelectionMode}
              disabled={isSelectionMode}
              className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                isSelectionMode
                  ? 'border-rose-200 bg-rose-50 text-rose-700 opacity-70'
                  : 'border-border text-foreground hover:bg-muted'
              }`}
            >
              <Download className="h-4 w-4" /> Export to AI Agent
            </button>
            <button
              onClick={() => {
                if (isGuestMode) {
                  promptForAuth('Agent instruction sets are project features tied to your account. Sign in to manage them.')
                  return
                }

                setIsAgentInstructionsOpen(true)
              }}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <FileText className="h-4 w-4" /> Agent Instructions
            </button>
            <button 
              onClick={() => openCreateModal()}
              disabled={guestTaskLimitReached}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guestTaskLimitReached ? `Guest Limit (${GUEST_ACTIVE_TASK_LIMIT})` : 'Add Task'}
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
        onCreateTask={
          isGuestMode
            ? async (taskInput) => {
                if (countActiveGuestTasks(tasksRef.current) >= GUEST_ACTIVE_TASK_LIMIT) {
                  throw new Error(
                    `Guest boards are limited to ${GUEST_ACTIVE_TASK_LIMIT} active tasks. Sign in to continue.`
                  )
                }

                return createGuestTask({
                  projectId: taskInput.project_id,
                  title: taskInput.title,
                  description: taskInput.description,
                  status: taskInput.status,
                  priority: taskInput.priority,
                  predecessorId: taskInput.predecessor_id,
                  position: taskInput.position,
                })
              }
            : undefined
        }
        onSuccess={(newTask) => {
          setTasks((prev) => {
            const nextTasks = normalizeVisibleTasks([...prev, newTask])
            tasksRef.current = nextTasks
            if (isGuestMode) {
              persistGuestTasks(nextTasks)
            } else {
              lastPersistedTasksRef.current = nextTasks
            }
            return nextTasks
          })
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
        onClick={() => {
          if (isGuestMode) {
            promptForAuth('The Abyss history is account-backed. Sign in to keep deleted and archived task history.')
            return
          }

          setIsAbyssModalOpen(true)
        }}
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
      {!isGuestMode ? (
        <TaskDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => { setIsDetailsModalOpen(false); setSelectedTask(null); }}
          task={selectedTask}
          onUpdate={(updated) => {
            setSelectedTask(updated)
            setTasks((prev) => {
              if (!isVisibleOnBoard(updated)) {
                const nextTasks = prev.filter((task) => task.id !== updated.id)
                tasksRef.current = nextTasks
                lastPersistedTasksRef.current = nextTasks
                return nextTasks
              }

              const nextTasks = normalizeVisibleTasks(
                prev.some((task) => task.id === updated.id)
                  ? prev.map((task) => (task.id === updated.id ? updated : task))
                  : [...prev, updated]
              )
              tasksRef.current = nextTasks
              lastPersistedTasksRef.current = nextTasks
              return nextTasks
            })
          }}
          onDelete={(taskId) => setTasks((prev) => {
            const nextTasks = prev.filter((task) => task.id !== taskId)
            tasksRef.current = nextTasks
            lastPersistedTasksRef.current = nextTasks
            return nextTasks
          })}
          onCompleteAndFollowUp={(task) => openCreateModal({ id: task.id, title: task.title })}
        />
      ) : null}
      {isGuestMode ? (
        <GuestTaskDetailsModal
          key={selectedTask?.id ?? 'guest-task-details'}
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false)
            setSelectedTask(null)
          }}
          task={selectedTask}
          onSave={(updated) => {
            setSelectedTask(updated)
            setTasks((prev) => {
              if (!isVisibleOnBoard(updated)) {
                const nextTasks = prev.filter((task) => task.id !== updated.id)
                tasksRef.current = nextTasks
                persistGuestTasks(nextTasks)
                return nextTasks
              }

              const nextTasks = normalizeVisibleTasks(
                prev.some((task) => task.id === updated.id)
                  ? prev.map((task) => (task.id === updated.id ? updated : task))
                  : [...prev, updated]
              )
              tasksRef.current = nextTasks
              persistGuestTasks(nextTasks)
              return nextTasks
            })
          }}
          onDelete={(taskId) => {
            setTaskToDelete(taskId)
          }}
          onCompleteAndFollowUp={(task) => openCreateModal({ id: task.id, title: task.title })}
        />
      ) : null}
      <TagManagerModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        projectId={projectId}
      />
      <AgentInstructionsModal
        isOpen={isAgentInstructionsOpen}
        onClose={() => setIsAgentInstructionsOpen(false)}
        projectId={projectId}
      />
      {isExportModalOpen ? (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          tasks={selectedTasks}
          projectName={projectName}
          mode={mode}
        />
      ) : null}
      {isSelectionMode ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[70] flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur">
            <button
              type="button"
              onClick={openExportModal}
              disabled={selectedTaskIds.size === 0}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                selectedTaskIds.size > 0
                  ? 'bg-pink-400 text-white hover:bg-pink-500'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {selectedTaskIds.size > 0 ? `Export (${selectedTaskIds.size})` : 'Export'}
            </button>
            <button
              type="button"
              onClick={exitSelectionMode}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label="Exit selection mode"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
      <ConfirmModal
        isOpen={taskToDelete !== null}
        title={isGuestMode ? 'Delete Task' : 'Move Task To The Abyss'}
        message={
          isGuestMode
            ? 'This task will be removed from your guest board in this browser.'
            : 'This task will be hidden from the board and can be restored later from the abyss.'
        }
        confirmText={isGuestMode ? 'Delete Task' : 'Move Task'}
        isDestructive
        onConfirm={handleConfirmDelete}
        onClose={() => setTaskToDelete(null)}
      />
      <AbyssModal
        isOpen={isAbyssModalOpen}
        onClose={() => setIsAbyssModalOpen(false)}
        projectId={projectId}
      />
      <ConnectMcpModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
      />
      <ConfirmModal
        isOpen={authPromptMessage !== null}
        title="Sign In Required"
        message={
          authPromptMessage ??
          'This action needs an account. Your guest progress is saved in this browser until you sign in.'
        }
        confirmText="Sign In / Create Account"
        cancelText="Keep Editing"
        onConfirm={redirectToAuth}
        onClose={() => setAuthPromptMessage(null)}
      />
    </div>
  )
}
