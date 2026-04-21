'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2, RefreshCcw } from 'lucide-react'
import { PlannerBackdrop } from '@/components/auth/planner-backdrop'
import { createClient } from '@/lib/supabase/client'
import { ensureGuestProject } from '@/domains/project/ensure-guest-project'

function AppLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/favicon.png"
      alt="Pink Sundew logo"
      width={28}
      height={28}
      className={className}
      priority
    />
  )
}

function getBootstrapErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Guest mode could not be started right now.'
  }

  if (error.message.includes('Anonymous sign-ins are disabled')) {
    return 'Guest mode is not enabled in Supabase Auth yet. Turn on Anonymous Sign-Ins in the dashboard, then try again.'
  }

  return error.message || 'Guest mode could not be started right now.'
}

export function GuestBootstrapPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    let isCancelled = false

    async function bootstrapGuestBoard() {
      setErrorMessage(null)

      try {
        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          throw userError
        }

        if (currentUser && !currentUser.is_anonymous) {
          router.replace('/')
          router.refresh()
          return
        }

        let user = currentUser
        if (!user) {
          const { data, error } = await supabase.auth.signInAnonymously()
          if (error) {
            throw error
          }
          user = data.user
        }

        if (!user) {
          throw new Error('Unable to create a guest session.')
        }

        const project = await ensureGuestProject(supabase, user.id)
        if (isCancelled) {
          return
        }

        router.replace(`/${project.id}`)
        router.refresh()
      } catch (error) {
        if (isCancelled) {
          return
        }

        setErrorMessage(getBootstrapErrorMessage(error))
      }
    }

    void bootstrapGuestBoard()

    return () => {
      isCancelled = true
    }
  }, [router, supabase])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-12 sm:px-6 lg:px-8">
      <PlannerBackdrop />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/60 bg-white/88 p-8 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <AppLogo className="h-8 w-8 rounded-md" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Starting your guest board</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pink Sundew is creating a temporary workspace in Supabase so the board and MCP share the same source of truth.
            </p>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-rose-900">Guest mode could not start</h2>
                <p className="mt-1 text-sm leading-6 text-rose-700">{errorMessage}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsRetrying(true)
                  window.location.reload()
                }}
                disabled={isRetrying}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Retrying
                  </>
                ) : (
                  <>
                    <RefreshCcw className="h-4 w-4" />
                    Try Again
                  </>
                )}
              </button>
              <Link
                href="/login"
                className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Sign In Instead
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating session and workspace
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              This keeps the board, instructions, and MCP setup on the same backend from the first click.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
