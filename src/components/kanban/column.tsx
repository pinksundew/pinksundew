'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { TaskWithTags, TaskStatus } from '@/domains/task/types'
import { TaskCard } from './task-card'
import { useMemo } from 'react'

type ColumnProps = {
  columnId: TaskStatus
  tasks: TaskWithTags[]
  isSelectionMode?: boolean
  selectedTaskIds?: Set<string>
  onTaskClick?: (task: TaskWithTags) => void
}

const COLUMN_TITLES: Record<TaskStatus, string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  done: 'Done'
}

export function KanbanColumn({
  columnId,
  tasks,
  isSelectionMode = false,
  selectedTaskIds = new Set<string>(),
  onTaskClick,
}: ColumnProps) {
  const { setNodeRef } = useDroppable({
    id: columnId,
    data: { type: 'Column', columnId },
  })

  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks])

  return (
    <div
      className="flex flex-col bg-muted/30 border border-border rounded-lg w-80 h-full overflow-hidden shrink-0 transition-colors"
      ref={setNodeRef}
    >
      <div className="flex items-center justify-between p-4 bg-muted/40 border-b border-border shadow-sm">
        <h3 className="font-semibold text-foreground text-sm uppercase tracking-wide">
          {COLUMN_TITLES[columnId]}
        </h3>
        <span className="bg-white border-border text-xs px-2 py-0.5 rounded-full text-muted-foreground font-medium">
          {tasks.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-[150px]">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isSelected={selectedTaskIds.has(task.id)}
              isSelectionMode={isSelectionMode}
              onClick={onTaskClick}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
