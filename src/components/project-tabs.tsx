'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { Project } from '@/domains/project/types'

export function ProjectTabs({ projects }: { projects: Project[] }) {
  const params = useParams()
  const pathname = usePathname()
  const projectId = params.projectId as string | undefined

  return (
    <div className="flex flex-1 items-center gap-2 overflow-x-auto border-b border-border bg-white px-4 h-12">
      {projects.map((p) => {
        const isActive = p.id === projectId
        return (
          <Link
            key={p.id}
            href={`/${p.id}`}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-t-md border-b-2 transition-colors whitespace-nowrap
              ${
                isActive 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              }
            `}
          >
            {p.name}
          </Link>
        )
      })}

      <div className="mx-2 h-4 w-px bg-border flex-shrink-0" />

      <Link
        href="/create-project"
        className={`px-3 py-1 text-sm font-medium rounded bg-muted text-foreground hover:bg-border transition-colors whitespace-nowrap ${pathname === '/create-project' ? 'ring-2 ring-primary ring-offset-1 ring-offset-white' : ''}`}
      >
        + New Project
      </Link>
    </div>
  )
}
