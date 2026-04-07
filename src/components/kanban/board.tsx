'use client'

import React, { useState, useEffect } from 'react'
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
import { CheckSquare, Download, Square } from 'lucide-react'

type KanbanBoardProps = {
  projectId: string
  projectName: string
  initialTasks: TaskWithTags[]
}

const COLUMNS: TaskStatus[] = ['todo', 'in-progress', 'done']

export function KanbanBoard({ projectId, projectName, initialTasks }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<TaskWithTags[]>(initialTasks)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isTagModalOpen, setIsTagModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [selectedTask, setSelectedTask] = useState<TaskWithTags | null>(null)
  const [activeTask, setActiveTask] = useState<TaskWithTags | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase.channel(`tasks_${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` }, (payload) => {
        console.log('Live change:', payload)
        setTasks(prev => {
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as TaskWithTags
            if (!prev.find(t => t.id === newTask.id)) {
              return [...prev, { ...newTask, tags: [] }]
            }
          }
          if (payload.eventType === 'UPDATE') {
            return prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t)
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

  const normalizeTaskPositions = (taskList: TaskWithTags[]) =>
    taskList.map((task, index) => ({ ...task, position: index }))

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveTask(tasks.find((t) => t.id === active.id) || null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id
    
    if (activeId === overId) return
    if (overId === 'abyss-drop-zone') return

    setTasks((prev) => {
      const activeIdx = prev.findIndex((t) => t.id === activeId)
      const overIdx = prev.findIndex((t) => t.id === overId)

      let newStatus: TaskStatus | undefined

      if (over.data.current?.type === 'Column') {
        newStatus = over.id as TaskStatus
      } else if (over.data.current?.type === 'Task') {
        const overTask = prev[overIdx]
        newStatus = overTask.status
      }

      if (newStatus && prev[activeIdx].status !== newStatus) {
        return arrayMove(prev, activeIdx, overIdx === -1 ? prev.length - 1 : overIdx).map((t, idx) => {
          if (t.id === activeId) {
            return { ...t, status: newStatus as TaskStatus, position: idx }
          }
          return { ...t, position: idx }
        })
      }
      return prev
    })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    if (over.id === 'abyss-drop-zone') {
      const isConfirmed = window.confirm("Throw this task into the abyss?")
      if (isConfirmed) {
        setTasks((prev) => normalizeTaskPositions(prev.filter((t) => t.id !== active.id)))
        await deleteTask(supabase, active.id as string).catch(console.error)
      }
      return
    }

    const activeId = active.id
    const overId = over.id

    if (activeId !== overId) {
      setTasks((prev) => {
        const activeIdx = prev.findIndex((task) => task.id === activeId)
        const overIdx = prev.findIndex((task) => task.id === overId)
        
        let newStatus: TaskStatus | undefined

        if (over.data.current?.type === 'Column') {
          newStatus = over.id as TaskStatus
        } else if (over.data.current?.type === 'Task') {
          newStatus = prev[overIdx].status
        }
        
        const nextIndex = overIdx === -1 ? prev.length - 1 : overIdx
        const reorderedTasks = arrayMove(prev, activeIdx, nextIndex)

        const finalArray = normalizeTaskPositions(
          reorderedTasks.map((task) => ({
            ...task,
            status: task.id === activeId && newStatus ? newStatus : task.status,
          }))
        )

        persistTaskOrder(
          supabase,
          finalArray.map((task) => ({
            id: task.id,
            status: task.status,
            position: task.position,
          }))
        ).catch(console.error)

        return finalArray
      })
    }
  }

  return (
    <div className="h-full flex flex-col items-start w-full relative">
      <div className="w-full flex justify-between items-center mb-6 shrink-0">
         <div>
           <h1 className="text-2xl font-bold text-foreground">{projectName}</h1>
           <p className="text-sm text-muted-foreground">Project Board</p>
         </div>
         <div className="flex gap-2">
            <button
              onClick={toggleSelectionMode}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              {isSelectionMode ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              {isSelectionMode ? `Selecting (${selectedTaskIds.size})` : 'Selection Mode'}
            </button>
            <button
              onClick={openExportModal}
              disabled={!isSelectionMode || selectedTaskIds.size === 0}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> Export
            </button>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition text-sm font-medium"
            >
              Add Task
            </button>
         </div>
      </div>
      
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        projectId={projectId}
        onSuccess={(newTask) => setTasks((prev) => [...prev, newTask])}
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
      <TaskDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => { setIsDetailsModalOpen(false); setSelectedTask(null); }}
        task={selectedTask}
        onUpdate={(updated) => setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))}
        onDelete={(taskId) => setTasks(prev => prev.filter(t => t.id !== taskId))}
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
    </div>
  )
}
