'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { FolderKanban, LayoutDashboard, LogOut, PlusSquare, Trash2, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { deleteProject } from '@/domains/project/mutations'
import type { Project } from '@/domains/project/types'
import { ConfirmModal } from '@/components/modals/confirm-modal'

type DashboardSidebarProps = {
  projects: Project[]
  userEmail: string | null | undefined
}

function getProjectIdFromPath(pathname: string) {
  const [firstSegment] = pathname.split('/').filter(Boolean)
  return firstSegment ?? null
}

export function DashboardSidebar({ projects, userEmail }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const currentProjectId = getProjectIdFromPath(pathname)
  const projectIdSet = useMemo(() => new Set(projects.map((project) => project.id)), [projects])
  const activeProjectId = currentProjectId && projectIdSet.has(currentProjectId) ? currentProjectId : null

  const handleDeleteProject = async () => {
    if (!projectToDelete) {
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
    'group/nav-item relative flex items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground'

  return (
    <>
      <aside className="group/sidebar hidden min-h-screen w-16 shrink-0 border-r border-border/80 bg-white/95 shadow-sm transition-all duration-200 hover:w-72 md:flex">
        <div className="flex h-full w-full flex-col">
          <div className="border-b border-border/80 p-2">
            <Link href="/" className={`${navItemBase} border-border/60 bg-muted/60 text-foreground`}>
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary-foreground transition-transform duration-200 group-hover/nav-item:scale-110">
                <LayoutDashboard className="h-4 w-4" />
              </span>
              <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[180px] group-hover/sidebar:opacity-100">
                AgentPlanner
              </span>
            </Link>

            <div className="mt-2 space-y-1">
              <Link href="/create-project" className={navItemBase}>
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 transition-transform duration-200 group-hover/nav-item:scale-110">
                  <PlusSquare className="h-4 w-4" />
                </span>
                <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[180px] group-hover/sidebar:opacity-100">
                  Create Project
                </span>
              </Link>

              <Link href="/profile" className={navItemBase}>
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition-transform duration-200 group-hover/nav-item:scale-110">
                  <User className="h-4 w-4" />
                </span>
                <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[180px] group-hover/sidebar:opacity-100">
                  Profile
                </span>
              </Link>

              <form action="/api/auth/signout" method="POST">
                <button type="submit" className={`${navItemBase} w-full`}>
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700 transition-transform duration-200 group-hover/nav-item:scale-110">
                    <LogOut className="h-4 w-4" />
                  </span>
                  <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[180px] group-hover/sidebar:opacity-100">
                    Log Out
                  </span>
                </button>
              </form>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden p-2">
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="max-w-0 overflow-hidden whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[180px] group-hover/sidebar:opacity-100">
                Projects
              </span>
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {projects.length}
              </span>
            </div>

            <div className="h-full space-y-1 overflow-y-auto pb-3 pr-1">
              {projects.map((project) => {
                const isActive = project.id === activeProjectId

                return (
                  <div
                    key={project.id}
                    className={`group/project-row flex items-center gap-1 rounded-xl border px-1 py-1 transition-colors ${
                      isActive
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-transparent hover:border-border hover:bg-muted/60'
                    }`}
                  >
                    <Link href={`/${project.id}`} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1">
                      <FolderKanban
                        className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover/project-row:scale-110 ${
                          isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                        }`}
                      />
                      <span className="max-w-0 overflow-hidden truncate whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[180px] group-hover/sidebar:opacity-100">
                        {project.name}
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setProjectToDelete(project)}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-colors hover:bg-rose-100 hover:text-rose-700 group-hover/sidebar:opacity-100"
                      aria-label={`Delete ${project.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border-t border-border/80 px-3 py-2">
            {deleteError ? (
              <p className="mb-2 max-w-0 overflow-hidden whitespace-nowrap text-xs font-medium text-rose-700 opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[190px] group-hover/sidebar:opacity-100">
                {deleteError}
              </p>
            ) : null}
            <p className="max-w-0 overflow-hidden truncate whitespace-nowrap text-xs text-muted-foreground opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[190px] group-hover/sidebar:opacity-100">
              {userEmail || 'Signed in'}
            </p>
          </div>
        </div>
      </aside>

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
    </>
  )
}
