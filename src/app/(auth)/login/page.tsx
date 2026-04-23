'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PlannerBackdrop } from '@/components/auth/planner-backdrop'
import posthog from 'posthog-js'
import { stashPendingAnonMerge, clearPendingAnonMerge } from '@/lib/anon-merge'
import { consumePendingAnonMerge } from '@/lib/anon-merge-client'
import { getCurrentSessionUser } from '@/lib/supabase/guest-session'

type Mode = 'password' | 'magic-link'

function LoginPageInner() {
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [infoMsg, setInfoMsg] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawNextPath = searchParams.get('next') || '/'
  const nextPath = rawNextPath.startsWith('/') ? rawNextPath : '/'
  const initialError = searchParams.get('error')

  const supabase = useMemo(() => createClient(), [])
  const [pendingAnonId, setPendingAnonId] = useState<string | null>(null)

  useEffect(() => {
    if (initialError) {
      setErrorMsg(initialError)
    }
  }, [initialError])

  useEffect(() => {
    let cancelled = false
    getCurrentSessionUser(supabase.auth)
      .then((user) => {
        if (cancelled) return
        if (user?.is_anonymous) {
          setPendingAnonId(user.id)
          stashPendingAnonMerge(user.id)
        }
      })
      .catch((error) => {
        console.error('Unable to inspect the current auth session:', error)
      })
    return () => {
      cancelled = true
    }
  }, [supabase])

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setInfoMsg('')

    if (pendingAnonId) {
      stashPendingAnonMerge(pendingAnonId)
    }

    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMsg(error.message)
      posthog.captureException(error)
      setLoading(false)
      return
    }

    if (signInData.user) {
      posthog.identify(signInData.user.id, { email: signInData.user.email })
      posthog.capture('user_logged_in', { method: 'email' })

      const mergeResult = await consumePendingAnonMerge(signInData.user.id)
      if (mergeResult.status === 'merged') {
        posthog.capture('guest_auto_merge_on_login')
      } else if (mergeResult.status === 'error') {
        posthog.capture('guest_auto_merge_failed', { reason: mergeResult.message })
      } else if (mergeResult.status === 'same-user') {
        clearPendingAnonMerge()
      }
    }

    router.push(nextPath)
    router.refresh()
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setInfoMsg('')

    if (pendingAnonId) {
      stashPendingAnonMerge(pendingAnonId)
    }

    const callbackUrl = new URL('/callback', window.location.origin)
    callbackUrl.searchParams.set('next', nextPath)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl.toString(),
        shouldCreateUser: true,
      },
    })

    if (error) {
      setErrorMsg(error.message)
      posthog.captureException(error)
    } else {
      setInfoMsg(`Magic link sent to ${email}. Check your inbox.`)
      posthog.capture('magic_link_sent', { method: 'email' })
    }
    setLoading(false)
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    posthog.capture('user_logged_in', { method: provider })
    if (pendingAnonId) {
      stashPendingAnonMerge(pendingAnonId)
    }

    const callbackUrl = new URL('/callback', window.location.origin)
    callbackUrl.searchParams.set('next', nextPath)

    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl.toString(),
        scopes: provider === 'github' ? 'repo' : undefined,
      },
    })
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-12 sm:px-6 lg:px-8">
      <PlannerBackdrop />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white/92 shadow-2xl shadow-black/10 backdrop-blur-sm">
        <div className="border-b border-border bg-gradient-to-br from-primary/10 via-white to-white px-6 py-5">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
            {pendingAnonId ? 'Save your board' : 'Sign in'}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            {pendingAnonId ? 'Pick up where you left off' : 'Sign in to Pink Sundew'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {pendingAnonId
              ? 'Signing into an existing account will merge this guest board into it automatically.'
              : 'Use your password, a magic link, or an OAuth provider to continue.'}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Or{' '}
            <Link
              href={`/signup?next=${encodeURIComponent(nextPath)}`}
              className="font-medium text-primary hover:text-primary/90"
            >
              create a new account
            </Link>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            <Link href="/guest" className="font-medium text-foreground hover:text-primary">
              Continue in guest mode
            </Link>
          </p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="flex rounded-full border border-border bg-muted/70 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setMode('password')}
              className={`flex-1 rounded-full px-3 py-1.5 transition-colors ${
                mode === 'password' ? 'bg-white text-foreground shadow' : 'text-muted-foreground'
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => setMode('magic-link')}
              className={`flex-1 rounded-full px-3 py-1.5 transition-colors ${
                mode === 'magic-link' ? 'bg-white text-foreground shadow' : 'text-muted-foreground'
              }`}
            >
              Magic link
            </button>
          </div>

          {errorMsg ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMsg}
            </div>
          ) : null}
          {infoMsg ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {infoMsg}
            </div>
          ) : null}

          {mode === 'password' ? (
            <form className="space-y-4" onSubmit={handlePasswordLogin}>
              <div className="space-y-3">
                <div>
                  <label className="sr-only" htmlFor="email-address">Email address</label>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full rounded-lg border border-border px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="sr-only" htmlFor="password">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="block w-full rounded-lg border border-border px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Signing in...' : pendingAnonId ? 'Save your board' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleMagicLink}>
              <div>
                <label className="sr-only" htmlFor="magic-email">Email address</label>
                <input
                  id="magic-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-lg border border-border px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                We&apos;ll send a one-time link. This is perfect for accounts that never set a password.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Sending...' : pendingAnonId ? 'Email me a save link' : 'Email me a magic link'}
              </button>
            </form>
          )}

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 font-medium uppercase tracking-wide text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <span className="flex h-4 w-4 items-center justify-center">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
                  <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.28 1.4-1.12 2.58-2.38 3.38v2.81h3.85c2.26-2.09 3.55-5.17 3.55-8.43z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.94-2.91l-3.85-2.98c-1.07.72-2.44 1.16-4.09 1.16-3.14 0-5.8-2.12-6.75-4.98H1.27v3.12C3.25 21.3 7.31 24 12 24z" />
                  <path fill="#FBBC05" d="M5.25 14.29c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.59H1.27C.46 8.21 0 10.06 0 12s.46 3.79 1.27 5.41l3.98-3.12z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.59l3.98 3.12C6.2 6.87 8.86 4.75 12 4.75z" />
                </svg>
              </span>
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('github')}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-foreground/80 bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-sm transition-colors hover:bg-foreground/90"
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2 .37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
              </svg>
              Continue with GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-12 sm:px-6 lg:px-8">
          <PlannerBackdrop />
          <div className="relative z-10 rounded-lg border border-white/60 bg-white/85 px-4 py-2 text-sm text-muted-foreground backdrop-blur-sm">
            Loading sign in...
          </div>
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  )
}
