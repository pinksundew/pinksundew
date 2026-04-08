'use client'

import { useDroppable } from '@dnd-kit/core'
import { Trash2 } from 'lucide-react'

type AbyssDropZoneProps = {
  isVisible: boolean
}

export function AbyssDropZone({ isVisible }: AbyssDropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'abyss-drop-zone',
    data: { type: 'AbyssDropZone' },
  })

  if (!isVisible) return null

  return (
    <div
      ref={setNodeRef}
      className={`
        fixed bottom-4 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-2 px-6 py-3 rounded-lg
        border transition-all duration-200
        ${isOver
          ? 'bg-red-50 border-red-300 text-red-600 shadow-lg scale-105'
          : 'bg-white border-border text-muted-foreground shadow-md'}
      `}
    >
      <Trash2 className="w-4 h-4" />
      <span className="text-sm font-medium">
        {isOver ? 'Release to delete' : 'Drop here to delete'}
      </span>
    </div>
  )
}
