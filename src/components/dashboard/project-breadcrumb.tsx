'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, FolderKanban, Plus } from 'lucide-react'
import type { Project } from '@/domains/project/types'

type SidebarProject = Pick<Project, 'id' | 'name'>

type ProjectBreadcrumbProps = {
  projects: SidebarProject[]
  userEmail?: string | null
}

export function ProjectBreadcrumb({
  projects,
  userEmail,
}: ProjectBreadcrumbProps) {
  const params = useParams()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentProjectId = params.projectId as string | undefined
  const currentProject = projects.find((p) => p.id === currentProjectId)

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleSelectProject = (projectId: string) => {
    setIsOpen(false)
    router.push(`/${projectId}`)
  }

  const displayName = currentProject?.name || 'Select Project'
  const displayEmail = userEmail ? userEmail.split('@')[0] : 'My Projects'

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="text-muted-foreground">{displayEmail}</span>
      <span className="text-muted-foreground/50">/</span>
      
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-foreground transition-colors hover:bg-muted"
        >
          <FolderKanban className="h-4 w-4 text-primary" />
          <span className="max-w-[200px] truncate">{displayName}</span>
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-xl border border-border bg-white p-1.5 shadow-lg shadow-black/5"
            >
              <div className="mb-1 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Projects
              </div>
              <div className="max-h-64 overflow-y-auto">
                {projects.map((project) => {
                  const isActive = project.id === currentProjectId
                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => handleSelectProject(project.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-foreground'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <FolderKanban className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="min-w-0 flex-1 truncate font-medium">{project.name}</span>
                      {isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
                    </button>
                  )
                })}
              </div>
              <div className="mt-1 border-t border-border pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/create-project')
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  <Plus className="h-4 w-4" />
                  New Project
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
