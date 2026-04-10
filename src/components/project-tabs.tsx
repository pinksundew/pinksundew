'use client'

import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
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
import { X } from 'lucide-react'
import { Project } from '@/domains/project/types'

const OPEN_TABS_STORAGE_KEY = 'agentplanner.open-project-tabs.v1'
const LAST_ACTIVE_PROJECT_STORAGE_KEY = 'agentplanner.last-active-project.v1'
const PROJECT_TAB_OPEN_EVENT = 'agentplanner:open-project-tab'

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
    if (Array.isArray(parsed)) {
      return parsed.filter((value): value is string => typeof value === 'string')
    }

    if (!parsed || typeof parsed !== 'object') {
      return []
    }

    const tabIds = (parsed as { tabIds?: unknown }).tabIds
    if (!Array.isArray(tabIds)) {
      return []
    }

    return tabIds.filter((value): value is string => typeof value === 'string')
  } catch {
    return []
  }
}

function writeStoredTabIds(tabIds: string[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    OPEN_TABS_STORAGE_KEY,
    JSON.stringify({
      tabIds,
    })
  )
}

function readStoredLastActiveProjectId() {
  if (typeof window === 'undefined') {
    return null
  }

  const value = window.localStorage.getItem(LAST_ACTIVE_PROJECT_STORAGE_KEY)
  return value && value.length > 0 ? value : null
}

function writeStoredLastActiveProjectId(projectId: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(LAST_ACTIVE_PROJECT_STORAGE_KEY, projectId)
}

type SortableProjectTabProps = {
  project: Project
  isActive: boolean
  dragDisabled: boolean
  onClose: (projectId: string) => void
}

function SortableProjectTab({
  project,
  isActive,
  dragDisabled,
  onClose,
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
      {...attributes}
      {...listeners}
      className={`group/tab flex max-w-[280px] min-w-[140px] items-center gap-1 rounded-lg border px-2 py-1.5 transition-shadow ${
        isActive
          ? 'border-primary/50 bg-primary/10 text-primary-foreground'
          : 'border-border bg-white text-muted-foreground hover:border-primary/30 hover:text-foreground'
      } ${isDragging ? 'shadow-lg ring-1 ring-primary/40' : ''} ${
        dragDisabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      }`}
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
        aria-label={`Close ${project.name}`}
        onPointerDown={(event) => {
          event.stopPropagation()
        }}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onClose(project.id)
        }}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export function ProjectTabs({ projects }: { projects: Project[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const rawProjectParam = params.projectId as string | string[] | undefined
  const projectId = Array.isArray(rawProjectParam) ? rawProjectParam[0] : rawProjectParam
  const [openProjectIds, setOpenProjectIds] = useState<string[]>(() => readStoredTabIds())
  const hasRestoredLaunchProjectRef = useRef(false)

  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects]
  )
  const projectIdSet = useMemo(() => new Set(projects.map((project) => project.id)), [projects])

  const shouldRestoreFromLastActive = Boolean(
    projectId && projectIdSet.has(projectId) && pathname !== '/create-project'
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleOpenProjectTab = (event: Event) => {
      const customEvent = event as CustomEvent<{ projectId?: string }>
      const clickedProjectId = customEvent.detail?.projectId

      if (!clickedProjectId || !projectIdSet.has(clickedProjectId)) {
        return
      }

      setOpenProjectIds((previous) =>
        previous.includes(clickedProjectId) ? previous : [...previous, clickedProjectId]
      )
      writeStoredLastActiveProjectId(clickedProjectId)
    }

    window.addEventListener(PROJECT_TAB_OPEN_EVENT, handleOpenProjectTab as EventListener)

    return () => {
      window.removeEventListener(PROJECT_TAB_OPEN_EVENT, handleOpenProjectTab as EventListener)
    }
  }, [projectIdSet])

  useEffect(() => {
    if (hasRestoredLaunchProjectRef.current) {
      return
    }

    hasRestoredLaunchProjectRef.current = true

    if (openProjectIds.length > 0 || !shouldRestoreFromLastActive) {
      return
    }

    const lastActiveProjectId = readStoredLastActiveProjectId()
    if (!lastActiveProjectId || !projectIdSet.has(lastActiveProjectId)) {
      return
    }

    if (projectId !== lastActiveProjectId) {
      router.replace(`/${lastActiveProjectId}`)
    }
  }, [openProjectIds.length, projectId, projectIdSet, router, shouldRestoreFromLastActive])

  const resolvedOpenProjectIds = useMemo(() => {
    const availableProjectIds = new Set(projects.map((project) => project.id))
    let next = openProjectIds.filter((id) => availableProjectIds.has(id))
    const shouldRestoreLastActiveProject = next.length === 0 && shouldRestoreFromLastActive

    if (shouldRestoreLastActiveProject) {
      const lastActiveProjectId = readStoredLastActiveProjectId()
      if (lastActiveProjectId && availableProjectIds.has(lastActiveProjectId)) {
        next = [lastActiveProjectId]
      }
    }

    if (
      projectId &&
      availableProjectIds.has(projectId) &&
      !next.includes(projectId)
    ) {
      next = [...next, projectId]
    }

    if (next.length === 0 && projectId && availableProjectIds.has(projectId)) {
      next = [projectId]
    }

    return next
  }, [openProjectIds, projectId, projects, shouldRestoreFromLastActive])

  useEffect(() => {
    writeStoredTabIds(resolvedOpenProjectIds)
  }, [resolvedOpenProjectIds])

  useEffect(() => {
    if (!projectId || !projectIdSet.has(projectId)) {
      return
    }

    writeStoredLastActiveProjectId(projectId)
  }, [projectId, projectIdSet])

  const openProjects = useMemo(
    () =>
      resolvedOpenProjectIds
        .map((id) => projectById.get(id))
        .filter((project): project is Project => !!project),
    [resolvedOpenProjectIds, projectById]
  )

  const handleCloseTab = (closingProjectId: string) => {
    const nextOpenProjectIds = resolvedOpenProjectIds.filter((id) => id !== closingProjectId)
    setOpenProjectIds(nextOpenProjectIds)

    if (nextOpenProjectIds.length === 0) {
      router.push('/create-project')
      return
    }

    if (closingProjectId !== projectId) {
      return
    }

    const closingIndex = resolvedOpenProjectIds.findIndex((id) => id === closingProjectId)
    const nextIndex = Math.max(0, Math.min(closingIndex, nextOpenProjectIds.length - 1))
    const nextActiveProjectId = nextOpenProjectIds[nextIndex]
    router.push(`/${nextActiveProjectId}`)
  }

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
    <div className="flex h-12 w-full items-center overflow-x-auto bg-white px-2">
      {openProjects.length === 0 ? (
        pathname === '/create-project' ? null : (
          <p className="text-sm text-muted-foreground">Open a project from the sidebar to pin it here.</p>
        )
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
                  onClose={handleCloseTab}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
