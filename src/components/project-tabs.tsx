'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { Project } from '@/domains/project/types'

const OPEN_TABS_STORAGE_KEY = 'agentplanner.open-project-tabs.v1'

function readStoredTabIds() {
  if (typeof window === 'undefined') {
    return [] as string[]
  }

  try {
    const raw = window.localStorage.getItem(OPEN_TABS_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((value): value is string => typeof value === 'string')
  } catch {
    return []
  }
}

function writeStoredTabIds(tabIds: string[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(OPEN_TABS_STORAGE_KEY, JSON.stringify(tabIds))
}

type SortableProjectTabProps = {
  project: Project
  isActive: boolean
  dragDisabled: boolean
}

function SortableProjectTab({
  project,
  isActive,
  dragDisabled,
}: SortableProjectTabProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
    disabled: dragDisabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/tab flex max-w-[280px] min-w-[140px] items-center gap-1 rounded-lg border px-2 py-1.5 transition-shadow ${
        isActive
          ? 'border-primary/50 bg-primary/10 text-primary-foreground'
          : 'border-border bg-white text-muted-foreground hover:border-primary/30 hover:text-foreground'
      } ${isDragging ? 'shadow-lg ring-1 ring-primary/40' : ''}`}
    >
      <Link
        href={`/${project.id}`}
        className="min-w-0 flex-1 truncate text-sm font-medium"
        title={project.name}
      >
        {project.name}
      </Link>
      <button
        type="button"
        aria-label={`Reorder ${project.name}`}
        disabled={dragDisabled}
        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors ${
          dragDisabled ? 'cursor-default opacity-30' : 'hover:bg-muted hover:text-foreground'
        }`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export function ProjectTabs({ projects }: { projects: Project[] }) {
  const params = useParams()
  const rawProjectParam = params.projectId as string | string[] | undefined
  const projectId = Array.isArray(rawProjectParam) ? rawProjectParam[0] : rawProjectParam
  const [openProjectIds, setOpenProjectIds] = useState<string[]>(() => readStoredTabIds())

  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects]
  )

  const resolvedOpenProjectIds = useMemo(() => {
    const availableProjectIds = new Set(projects.map((project) => project.id))
    let next = openProjectIds.filter((id) => availableProjectIds.has(id))

    if (projectId && availableProjectIds.has(projectId) && !next.includes(projectId)) {
      next = [...next, projectId]
    }

    if (next.length === 0 && projectId && availableProjectIds.has(projectId)) {
      next = [projectId]
    }

    return next
  }, [openProjectIds, projectId, projects])

  useEffect(() => {
    writeStoredTabIds(resolvedOpenProjectIds)
  }, [resolvedOpenProjectIds])

  const openProjects = useMemo(
    () =>
      resolvedOpenProjectIds
        .map((id) => projectById.get(id))
        .filter((project): project is Project => !!project),
    [resolvedOpenProjectIds, projectById]
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = resolvedOpenProjectIds.findIndex((id) => id === String(active.id))
    const newIndex = resolvedOpenProjectIds.findIndex((id) => id === String(over.id))

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    setOpenProjectIds(arrayMove(resolvedOpenProjectIds, oldIndex, newIndex))
  }

  return (
    <div className="flex h-12 w-full items-center overflow-x-auto border-b border-border bg-white px-4">
      {openProjects.length === 0 ? (
        <p className="text-sm text-muted-foreground">Open a project from the sidebar to pin it here.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={openProjects.map((project) => project.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex min-w-full items-center gap-2 py-1">
              {openProjects.map((project) => (
                <SortableProjectTab
                  key={project.id}
                  project={project}
                  isActive={project.id === projectId}
                  dragDisabled={openProjects.length < 2}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
