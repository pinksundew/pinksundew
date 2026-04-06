'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskWithTags } from '@/domains/task/types'
import { Calendar, User, AlignLeft, GripVertical } from 'lucide-react'

type TaskCardProps = {
  task: TaskWithTags
  isOverlay?: boolean
}

const PRIORITY_COLORS = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-rose-50 text-rose-700 border-rose-200'
}

export function TaskCard({ task, isOverlay }: TaskCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'Task', task },
  })

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  }

  if (isDragging && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-full h-32 border-2 border-dashed border-primary/50 bg-primary/5 rounded-xl opacity-50"
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        group flex flex-col bg-white border border-border p-4 rounded-xl cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-md transition-all shadow-sm
        ${isOverlay ? 'rotate-2 scale-105 shadow-xl z-50 cursor-grabbing bg-white/95' : ''}
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[task.priority]}`}>
          {task.priority}
        </span>
        <button className="text-muted-foreground/0 group-hover:text-muted-foreground transition-colors p-1 hover:bg-muted rounded">
          <GripVertical className="w-4 h-4" />
        </button>
      </div>

      <h4 className="text-sm font-semibold text-foreground leading-tight mb-2">
        {task.title}
      </h4>

      {task.description && (
        <div className="flex items-center gap-1.5 text-muted-foreground mb-3">
          <AlignLeft className="w-3.5 h-3.5" />
          <span className="text-xs truncate max-w-[200px]">{task.description}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-4">
        {task.tags?.map((tag) => (
          <span 
            key={tag.id} 
            className="text-[10px] px-2 py-0.5 rounded-md text-white font-medium"
            style={{ backgroundColor: tag.color || '#4f46e5' }}
          >
            {tag.name}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}</span>
        </div>
        
        {task.assignee_id ? (
           <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
              <User className="w-3.5 h-3.5 text-primary" />
           </div>
        ) : (
           <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center border border-border border-dashed">
              <User className="w-3.5 h-3.5 text-muted-foreground/50" />
           </div>
        )}
      </div>
    </div>
  )
}