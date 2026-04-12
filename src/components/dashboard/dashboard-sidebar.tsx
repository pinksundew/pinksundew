'use client'

import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Ellipsis, FolderKanban, Pencil, PlusSquare, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { deleteProject, updateProject } from '@/domains/project/mutations'
import type { Project } from '@/domains/project/types'
import { ConfirmModal } from '@/components/modals/confirm-modal'

type SidebarProject = Pick<Project, 'id' | 'name'>

type DashboardSidebarProps = {
  projects: SidebarProject[]
  userEmail?: string | null
  mode?: 'authenticated' | 'guest'
  onRequireAuth?: (message: string, nextPath?: string) => void
}

const PROJECT_TAB_OPEN_EVENT = 'agentplanner:open-project-tab'

function getProjectIdFromPath(pathname: string) {
  const [firstSegment] = pathname.split('/').filter(Boolean)
  return firstSegment ?? null
}

export function DashboardSidebar({
  projects,
  userEmail,
  mode = 'authenticated',
  onRequireAuth,
}: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [projectToDelete, setProjectToDelete] = useState<SidebarProject | null>(null)
  const [projectMenuId, setProjectMenuId] = useState<string | null>(null)
  const [projectToRename, setProjectToRename] = useState<SidebarProject | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [isRenamingProject, setIsRenamingProject] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [renameError, setRenameError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const isGuestMode = mode === 'guest'
  const currentProjectId = getProjectIdFromPath(pathname)
  const projectIdSet = useMemo(() => new Set(projects.map((project) => project.id)), [projects])

  const activeProjectId = isGuestMode
    ? projects[0]?.id ?? null
    : currentProjectId && projectIdSet.has(currentProjectId)
      ? currentProjectId
      : null

  const requireAuth = (message: string, nextPath: string = '/guest') => {
    if (!isGuestMode) {
      return false
    }

    onRequireAuth?.(message, nextPath)
    return true
  }

  const handleCreateProjectClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      requireAuth(
        'Creating additional projects requires an account. Sign in to unlock full multi-project support.',
        '/create-project'
      )
    ) {
      event.preventDefault()
    }
  }

  const handleProjectClick = (projectId: string) => {
    if (typeof window === 'undefined' || isGuestMode) {
      return
    }

    window.dispatchEvent(
      new CustomEvent(PROJECT_TAB_OPEN_EVENT, {
        detail: { projectId },
      })
    )
  }

  const handleDeleteProject = async () => {
    if (!projectToDelete || isGuestMode) {
      return
    }

    const deletingProjectId = projectToDelete.id
    setDeleteError(null)

    try {
      await deleteProject(supabase, deletingProjectId)

      const remainingProjects = projects.filter((project) => project.id !== deletingProjectId)
      if (activeProjectId === deletingProjectId) {
        if (remainingProjects.length > 0) {
          router.push(`/${remainingProjects[0].id}`)
        } else {
          router.push('/create-project')
        }
      }

      router.refresh()
    } catch (error) {
      console.error('Failed to delete project', error)
      setDeleteError('Failed to delete project. Please try again.')
    } finally {
      setProjectToDelete(null)
    }
  }

  useEffect(() => {
    if (!projectMenuId) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setProjectMenuId(null)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProjectMenuId(null)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [projectMenuId])

  const openRenameDialog = (project: SidebarProject) => {
    setProjectMenuId(null)
    setRenameError(null)
    setProjectToRename(project)
    setRenameValue(project.name)
  }

  const handleRenameProject = async () => {
    if (!projectToRename || isGuestMode) {
      return
    }

    const nextName = renameValue.trim()
    if (!nextName) {
      setRenameError('Project name is required.')
      return
    }

    if (nextName === projectToRename.name) {
      setProjectToRename(null)
      setRenameValue('')
      setRenameError(null)
      return
    }

    setIsRenamingProject(true)
    setRenameError(null)

    try {
      await updateProject(supabase, projectToRename.id, { name: nextName })
      setProjectToRename(null)
      setRenameValue('')
      router.refresh()
    } catch (error) {
      console.error('Failed to rename project', error)
      setRenameError('Failed to rename project. Please try again.')
    } finally {
      setIsRenamingProject(false)
    }
  }

  return (
    <>
      <aside className="group/sidebar fixed inset-y-0 left-0 top-14 z-40 hidden h-[calc(100vh-3.5rem)] w-16 shrink-0 border-r border-border/80 bg-white shadow-sm transition-all duration-200 hover:w-72 md:flex">
        <div className="flex h-full w-full flex-col">
          <div className="min-h-0 flex-1 overflow-hidden p-2 pt-4">
            <div className="mb-1 flex items-center justify-center px-2 group-hover/sidebar:justify-between">
              <span className="max-w-0 overflow-hidden whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[180px] group-hover/sidebar:opacity-100">
                Projects
              </span>
              <span className="hidden rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground group-hover/sidebar:inline-flex">
                {projects.length}
              </span>
            </div>

            <div className="h-full space-y-1.5 overflow-y-auto pb-3 pr-1 pt-0.5">
              {projects.map((project) => {
                const isActive = project.id === activeProjectId
                const projectHref = isGuestMode ? '/guest' : `/${project.id}`
                const isMenuOpen = projectMenuId === project.id

                return (
                  <div
                    key={project.id}
                    className={`group/project-row relative flex h-11 items-center gap-1 rounded-xl border p-0.5 transition-colors ${
                      isActive
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-transparent hover:border-border hover:bg-muted/60'
                    }`}
                  >
                    <Link
                      href={projectHref}
                      onClick={() => handleProjectClick(project.id)}
                      className="flex h-full min-w-0 flex-1 items-center justify-center gap-0 rounded-lg px-0 group-hover/sidebar:justify-start group-hover/sidebar:gap-2 group-hover/sidebar:px-1.5"
                    >
                      <span
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover/project-row:scale-110 ${
                          isActive
                            ? 'bg-primary/15 text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <FolderKanban className="h-4 w-4" />
                      </span>
                      <span className="max-w-0 overflow-hidden truncate whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[180px] group-hover/sidebar:opacity-100">
                        {project.name}
                      </span>
                    </Link>

                    {!isGuestMode ? (
                      <div ref={isMenuOpen ? menuRef : null} className="relative hidden shrink-0 group-hover/sidebar:block">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            setProjectMenuId((currentId) => (currentId === project.id ? null : project.id))
                            setDeleteError(null)
                            setRenameError(null)
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-haspopup="menu"
                          aria-expanded={isMenuOpen}
                          aria-label={`Project actions for ${project.name}`}
                        >
                          <Ellipsis className="h-3.5 w-3.5" />
                        </button>

                        <AnimatePresence>
                          {isMenuOpen ? (
                            <motion.div
                              initial={{ opacity: 0, y: -6, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -4, scale: 0.98 }}
                              transition={{ duration: 0.16, ease: 'easeOut' }}
                              className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-border bg-white p-1.5 shadow-lg shadow-black/5"
                              role="menu"
                            >
                              <button
                                type="button"
                                onClick={() => openRenameDialog(project)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                role="menuitem"
                              >
                                <Pencil className="h-3.5 w-3.5 text-sky-700" />
                                Rename
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setProjectMenuId(null)
                                  setProjectToDelete(project)
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50"
                                role="menuitem"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    ) : null}
                  </div>
                )
              })}

              <Link
                href="/create-project"
                onClick={handleCreateProjectClick}
                className="group/project-row mt-2 flex h-11 items-center justify-center gap-0 rounded-xl border border-dashed border-primary/35 p-0.5 text-primary transition-colors hover:border-primary/55 hover:bg-primary/10 group-hover/sidebar:justify-start group-hover/sidebar:gap-2 group-hover/sidebar:px-1.5"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary transition-transform duration-200 group-hover/project-row:scale-110">
                  <PlusSquare className="h-4 w-4" />
                </span>
                <span className="max-w-0 overflow-hidden truncate whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[180px] group-hover/sidebar:opacity-100">
                  Create Project
                </span>
              </Link>
            </div>
          </div>

          <div className="border-t border-border/80 p-2">
            {deleteError ? (
              <p className="mb-2 max-w-0 overflow-hidden whitespace-nowrap text-xs font-medium text-rose-700 opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[190px] group-hover/sidebar:opacity-100">
                {deleteError}
              </p>
            ) : null}

            <p className="max-w-0 overflow-hidden truncate whitespace-nowrap py-2 text-center text-xs text-muted-foreground opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[190px] group-hover/sidebar:opacity-100">
              {isGuestMode ? 'Guest Mode' : userEmail || 'Signed in'}
            </p>
          </div>
        </div>
      </aside>

      {!isGuestMode ? (
        <ConfirmModal
          isOpen={projectToDelete !== null}
          title="Delete Project"
          message={
            projectToDelete
              ? `Delete \"${projectToDelete.name}\"? This action cannot be undone.`
              : 'Delete this project?'
          }
          confirmText="Delete Project"
          cancelText="Keep Project"
          isDestructive
          onConfirm={handleDeleteProject}
          onClose={() => setProjectToDelete(null)}
        />
      ) : null}

      {!isGuestMode ? (
        <AnimatePresence>
          {projectToRename ? (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  if (isRenamingProject) {
                    return
                  }

                  setProjectToRename(null)
                  setRenameValue('')
                  setRenameError(null)
                }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.form
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleRenameProject()
                }}
                className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-white shadow-xl shadow-black/10"
              >
                <div className="border-b border-border bg-muted/30 px-5 py-4">
                  <h2 className="text-lg font-semibold text-foreground">Rename Project</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Update the project name shown in the sidebar and open tabs.
                  </p>
                </div>

                <div className="space-y-3 px-5 py-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Project Name</label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Project name"
                    />
                  </div>
                  {renameError ? <p className="text-sm font-medium text-rose-700">{renameError}</p> : null}
                </div>

                <div className="flex gap-3 border-t border-border bg-muted/20 px-5 py-4">
                  <button
                    type="button"
                    disabled={isRenamingProject}
                    onClick={() => {
                      setProjectToRename(null)
                      setRenameValue('')
                      setRenameError(null)
                    }}
                    className="flex-1 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRenamingProject}
                    className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isRenamingProject ? 'Renaming...' : 'Rename Project'}
                  </button>
                </div>
              </motion.form>
            </div>
          ) : null}
        </AnimatePresence>
      ) : null}
    </>
  )
}
