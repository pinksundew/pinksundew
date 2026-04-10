'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { KanbanBoard } from '@/components/kanban/board'
import { clearGuestDraft, loadGuestDraft } from '@/domains/task/guest-draft'
import type { TaskWithTags } from '@/domains/task/types'
import { ConfirmModal } from '@/components/modals/confirm-modal'
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar'
import { LayoutDashboard, LogOut, PlusSquare, User } from 'lucide-react'

type ImportResponse = {
  projectId: string
  reused: boolean
}

type AuthPromptState = {
  message: string
  nextPath: string
} | null

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
  const [authPrompt, setAuthPrompt] = useState<AuthPromptState>(null)
  const supabase = useMemo(() => createClient(), [])

  const guestProjects = useMemo(() => [{ id: 'guest-board', name: 'Guest Board' }], [])

  const openAuthPrompt = (message: string, nextPath: string = '/guest') => {
    setAuthPrompt({ message, nextPath })
  }

  const redirectToAuth = () => {
    if (typeof window === 'undefined') {
      return
    }

    const nextPath = authPrompt?.nextPath ?? '/guest'
    window.location.href = `/login?next=${encodeURIComponent(nextPath)}`
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
    <div className="min-h-screen bg-muted/20">
      <DashboardSidebar
        mode="guest"
        projects={guestProjects}
        userEmail="Guest Mode"
        onRequireAuth={openAuthPrompt}
      />

      <div className="flex min-h-screen flex-col md:pl-16">
        <header className="sticky top-0 z-40 flex h-24 flex-col border-b border-border/80 bg-white shadow-sm backdrop-blur">
          <div className="hidden h-12 items-center justify-between border-b border-border/70 px-1 md:flex">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold text-foreground">AgentPlanner</span>
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground">
                Guest
              </span>
            </div>
            <div className="flex items-center gap-2">
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

          <div className="flex h-12 items-center justify-between border-b border-border/70 px-4 md:hidden">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">AgentPlanner</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  openAuthPrompt(
                    'Creating additional projects requires an account. Sign in to unlock full multi-project support.',
                    '/create-project'
                  )
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <PlusSquare className="h-4 w-4" />
                <span className="sr-only">Create project</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  openAuthPrompt(
                    'Profile settings are account features. Sign in to manage your profile and API keys.',
                    '/profile'
                  )
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <User className="h-4 w-4" />
                <span className="sr-only">Profile</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  openAuthPrompt(
                    'Sign in first to access account session actions like profile and logout.',
                    '/profile'
                  )
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Log out</span>
              </button>
            </div>
          </div>

          <div className="flex h-12 items-center justify-between border-b border-border/70 px-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="rounded-lg border border-primary/50 bg-primary/10 px-3 py-1 text-sm font-medium text-primary-foreground">
                Guest Board
              </span>
              <button
                type="button"
                onClick={() =>
                  openAuthPrompt(
                    'Creating additional projects requires an account. Sign in to unlock full multi-project support.',
                    '/create-project'
                  )
                }
                className="rounded-md border border-border bg-muted px-3 py-1 text-sm font-medium text-foreground transition-colors hover:bg-border"
              >
                + New Project
              </button>
            </div>
            <button
              type="button"
              onClick={() =>
                openAuthPrompt(
                  'Sign in to sync your guest board and unlock account-only project management features.',
                  '/guest'
                )
              }
              className="rounded-md border border-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:bg-muted"
            >
              Sign In to Sync
            </button>
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
      </div>

      <ConfirmModal
        isOpen={authPrompt !== null}
        title="Sign In Required"
        message={
          authPrompt?.message ??
          'Guest mode supports one local board. Sign in to create and manage multiple projects across devices.'
        }
        confirmText="Sign In / Create Account"
        cancelText="Keep Guest Board"
        onConfirm={redirectToAuth}
        onClose={() => setAuthPrompt(null)}
      />
    </div>
  )
}
