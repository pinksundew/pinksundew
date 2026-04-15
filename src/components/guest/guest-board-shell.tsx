'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { PlayCircle, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { KanbanBoard } from '@/components/kanban/board'
import { clearGuestDraft, loadGuestDraft } from '@/domains/task/guest-draft'
import type { TaskWithTags } from '@/domains/task/types'
import { ConfirmModal } from '@/components/modals/confirm-modal'

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

function AppLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/favicon.ico"
      alt="AgentPlanner logo"
      width={28}
      height={28}
      className={className}
      priority
    />
  )
}

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
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false)
  const [isDemoVideoMissing, setIsDemoVideoMissing] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const demoVideoSrc = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL ?? '/demo/workflow.mp4'

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
      {/* Simplified single-row header matching authenticated layout */}
      <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border/70 bg-white px-4 shadow-sm">
        {/* Left: Logo + Guest Board label */}
        <div className="flex items-center gap-4">
          <Link href="/guest" className="flex items-center gap-2 text-primary transition-colors hover:text-primary/80">
            <AppLogo className="h-7 w-7 rounded-md" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-primary/50 bg-primary/10 px-3 py-1 text-sm font-medium text-primary-foreground">
              Guest Board
            </span>
          </div>
        </div>

        {/* Right: Auth buttons */}
        <div className="flex items-center gap-2">
          <Link
            href="/login?next=/guest"
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Sign In
          </Link>
          <Link
            href="/signup?next=/guest"
            className="hidden rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:inline-flex"
          >
            Create Account
          </Link>
        </div>
      </header>

      {/* Main content area with top padding for fixed header */}
      <div className="flex min-h-screen flex-col pt-14">
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

        <main className="flex flex-1 flex-col p-4 md:p-6">
          <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)]">
            <KanbanBoard mode="guest" projectId="guest-board" projectName="Guest Board" initialTasks={EMPTY_TASKS} />
          </div>
        </main>
      </div>

      <div className="pointer-events-none fixed bottom-4 right-4 z-40 w-[min(21rem,calc(100vw-2rem))]">
        <div className="pointer-events-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="relative aspect-video bg-gradient-to-br from-slate-100 via-white to-pink-50">
            {!isDemoVideoMissing ? (
              <video
                src={demoVideoSrc}
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover"
                onError={() => setIsDemoVideoMissing(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-slate-600">
                Add your demo video at `public/demo/workflow.mp4` or set
                `NEXT_PUBLIC_DEMO_VIDEO_URL`.
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsDemoModalOpen(true)}
              className="absolute inset-x-3 bottom-3 inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-sm font-medium text-foreground shadow-sm backdrop-blur transition-colors hover:bg-white"
            >
              <PlayCircle className="h-4 w-4 text-primary" />
              Watch Demo
            </button>
          </div>
        </div>
      </div>

      {isDemoModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setIsDemoModalOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close demo video"
          />
          <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">AgentPlanner Demo</h2>
                <p className="text-xs text-muted-foreground">
                  Full workflow preview of board + agent handoff.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(false)}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-black">
              {!isDemoVideoMissing ? (
                <video
                  src={demoVideoSrc}
                  autoPlay
                  muted
                  loop
                  controls
                  playsInline
                  className="max-h-[75vh] w-full object-contain"
                  onError={() => setIsDemoVideoMissing(true)}
                />
              ) : (
                <div className="flex min-h-[40vh] items-center justify-center px-6 text-center text-sm text-slate-100">
                  Demo video source not found. Add `public/demo/workflow.mp4` or set
                  `NEXT_PUBLIC_DEMO_VIDEO_URL`.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

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
