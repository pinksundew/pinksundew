'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { KanbanBoard } from '@/components/kanban/board'
import { clearGuestDraft, loadGuestDraft } from '@/domains/task/guest-draft'
import type { TaskWithTags } from '@/domains/task/types'
import { ConfirmModal } from '@/components/modals/confirm-modal'

type ImportResponse = {
  projectId: string
  reused: boolean
}

const IMPORT_ID_STORAGE_KEY = 'agentplanner.guest_import.id'
const EMPTY_TASKS: TaskWithTags[] = []

function createImportId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function getImportId() {
  if (typeof window === 'undefined') {
    return createImportId()
  }

  const existing = window.sessionStorage.getItem(IMPORT_ID_STORAGE_KEY)
  if (existing) {
    return existing
  }

  const next = createImportId()
  window.sessionStorage.setItem(IMPORT_ID_STORAGE_KEY, next)
  return next
}

export function GuestBoardShell() {
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [isNewProjectPromptOpen, setIsNewProjectPromptOpen] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const redirectToAuthForProjects = () => {
    if (typeof window === 'undefined') {
      return
    }

    window.location.href = '/login?next=/create-project'
  }

  useEffect(() => {
    let isCancelled = false

    const runUpgradeImport = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (isCancelled || !user) {
        return
      }

      const draft = loadGuestDraft('Guest Board')
      if (draft.tasks.length === 0) {
        window.location.replace('/')
        return
      }

      setIsImporting(true)
      setImportError(null)

      try {
        const response = await fetch('/api/guest/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            importId: getImportId(),
            projectName: draft.projectName,
            tasks: draft.tasks,
            updatedAt: draft.updatedAt,
          }),
        })

        const body = (await response.json().catch(() => null)) as
          | ImportResponse
          | { error?: string }
          | null

        if (!response.ok) {
          throw new Error(body && 'error' in body ? body.error || 'Guest import failed' : 'Guest import failed')
        }

        if (!body || !('projectId' in body) || typeof body.projectId !== 'string') {
          throw new Error('Guest import returned an invalid response')
        }

        clearGuestDraft()
        window.sessionStorage.removeItem(IMPORT_ID_STORAGE_KEY)
        window.location.replace(`/${body.projectId}`)
      } catch (error) {
        if (isCancelled) return

        setImportError(error instanceof Error ? error.message : 'Guest import failed')
        setIsImporting(false)
      }
    }

    void runUpgradeImport()

    return () => {
      isCancelled = true
    }
  }, [supabase])

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-white/80 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between px-4 md:px-8">
          <div>
            <h1 className="text-base font-semibold text-foreground">AgentPlanner Guest Mode</h1>
            <p className="text-xs text-muted-foreground">
              Work without an account. Sign in to sync and unlock MCP tools.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsNewProjectPromptOpen(true)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              New Project
            </button>
            <Link
              href="/login?next=/guest"
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Sign In
            </Link>
            <Link
              href="/signup?next=/guest"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Create Account
            </Link>
          </div>
        </div>
      </header>

      {isImporting ? (
        <div className="border-b border-border bg-primary/10 px-4 py-2 text-sm text-primary-foreground">
          Importing your guest board into your account.
        </div>
      ) : null}

      {importError ? (
        <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {importError}
        </div>
      ) : null}

      <main className="flex-1 p-4 md:p-8">
        <KanbanBoard mode="guest" projectId="guest-board" projectName="Guest Board" initialTasks={EMPTY_TASKS} />
      </main>

      <ConfirmModal
        isOpen={isNewProjectPromptOpen}
        title="Sign In Required"
        message="Guest mode supports one local board. Sign in to create and manage multiple projects across devices."
        confirmText="Sign In / Create Account"
        cancelText="Keep Guest Board"
        onConfirm={redirectToAuthForProjects}
        onClose={() => setIsNewProjectPromptOpen(false)}
      />
    </div>
  )
}
