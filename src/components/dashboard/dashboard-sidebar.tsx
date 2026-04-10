'use client'

import Link from 'next/link'
import { useMemo, useState, type MouseEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { FolderKanban, LayoutDashboard, LogOut, PlusSquare, Trash2, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { deleteProject } from '@/domains/project/mutations'
import type { Project } from '@/domains/project/types'
import { ConfirmModal } from '@/components/modals/confirm-modal'

type SidebarProject = Pick<Project, 'id' | 'name'>

type DashboardSidebarProps = {
  projects: SidebarProject[]
  userEmail?: string | null
  mode?: 'authenticated' | 'guest'
  onRequireAuth?: (message: string, nextPath?: string) => void
}

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
  const [deleteError, setDeleteError] = useState<string | null>(null)

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

  const handleProfileClick = (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    if (
      requireAuth(
        'Profile settings are account features. Sign in to manage your profile and API keys.',
        '/profile'
      )
    ) {
      event.preventDefault()
    }
  }

  const handleLogoutClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (
      requireAuth(
        'Sign in first to access account session actions like profile and logout.',
        '/profile'
      )
    ) {
      event.preventDefault()
    }
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

  const navItemBase =
    'group/nav-item relative flex items-center justify-center gap-0 rounded-xl border border-transparent px-0 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground group-hover/sidebar:justify-start group-hover/sidebar:gap-3 group-hover/sidebar:px-2.5'

  const sideLabelClass =
    'max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[180px] group-hover/sidebar:opacity-100'

  return (
    <>
      <aside className="group/sidebar fixed inset-y-0 left-0 z-50 hidden h-screen w-16 shrink-0 border-r border-border/80 bg-white shadow-sm transition-all duration-200 hover:w-72 md:flex">
        <div className="flex h-full w-full flex-col">
          <div className="min-h-0 flex-1 overflow-hidden p-2 pt-7 group-hover/sidebar:pt-5">
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

                return (
                  <div
                    key={project.id}
                    className={`group/project-row flex h-11 items-center gap-1 rounded-xl border p-0.5 transition-colors ${
                      isActive
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-transparent hover:border-border hover:bg-muted/60'
                    }`}
                  >
                    <Link
                      href={projectHref}
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
                      <button
                        type="button"
                        onClick={() => setProjectToDelete(project)}
                        className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-100 hover:text-rose-700 group-hover/sidebar:inline-flex"
                        aria-label={`Delete ${project.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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
            <div className="space-y-1">
              {isGuestMode ? (
                <button type="button" onClick={handleProfileClick} className={`${navItemBase} w-full`}>
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition-transform duration-200 group-hover/nav-item:scale-110">
                    <User className="h-4 w-4" />
                  </span>
                  <span className={sideLabelClass}>Profile</span>
                </button>
              ) : (
                <Link href="/profile" onClick={handleProfileClick} className={navItemBase}>
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition-transform duration-200 group-hover/nav-item:scale-110">
                    <User className="h-4 w-4" />
                  </span>
                  <span className={sideLabelClass}>Profile</span>
                </Link>
              )}

              {isGuestMode ? (
                <button type="button" onClick={handleLogoutClick} className={`${navItemBase} w-full`}>
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700 transition-transform duration-200 group-hover/nav-item:scale-110">
                    <LogOut className="h-4 w-4" />
                  </span>
                  <span className={sideLabelClass}>Log Out</span>
                </button>
              ) : (
                <form action="/api/auth/signout" method="POST">
                  <button type="submit" className={`${navItemBase} w-full`}>
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700 transition-transform duration-200 group-hover/nav-item:scale-110">
                      <LogOut className="h-4 w-4" />
                    </span>
                    <span className={sideLabelClass}>Log Out</span>
                  </button>
                </form>
              )}
            </div>

            {deleteError ? (
              <p className="mb-2 mt-2 max-w-0 overflow-hidden whitespace-nowrap text-xs font-medium text-rose-700 opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[190px] group-hover/sidebar:opacity-100">
                {deleteError}
              </p>
            ) : null}

            <p className="mt-2 max-w-0 overflow-hidden truncate whitespace-nowrap text-xs text-muted-foreground opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[190px] group-hover/sidebar:opacity-100">
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
    </>
  )
}
