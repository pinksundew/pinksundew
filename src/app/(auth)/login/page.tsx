'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PlannerBackdrop } from '@/components/auth/planner-backdrop'
import posthog from 'posthog-js'
import { stashPendingAnonMerge, clearPendingAnonMerge } from '@/lib/anon-merge'
import { consumePendingAnonMerge } from '@/lib/anon-merge-client'

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
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return
      if (data.user?.is_anonymous) {
        setPendingAnonId(data.user.id)
        stashPendingAnonMerge(data.user.id)
      }
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
      <div className="relative z-10 w-full max-w-md space-y-8 rounded-xl border border-white/60 bg-white/85 p-8 shadow-xl backdrop-blur-sm">
        <div>
          <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-foreground">
            Sign in to Pink Sundew
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Or{' '}
            <Link href={`/signup?next=${encodeURIComponent(nextPath)}`} className="font-medium text-primary hover:text-primary/90">
              create a new account
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            <Link href="/guest" className="font-medium text-foreground hover:text-primary">
              Continue in guest mode
            </Link>
          </p>
          {pendingAnonId ? (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-900">
              Signing into an existing account will merge your guest board into it automatically.
            </p>
          ) : null}
        </div>

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

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm text-center">{errorMsg}</div>
        )}
        {infoMsg && (
          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-md text-sm text-center">{infoMsg}</div>
        )}

        {mode === 'password' ? (
          <form className="mt-4 space-y-6" onSubmit={handlePasswordLogin}>
            <div className="space-y-4 rounded-md">
              <div>
                <label className="sr-only" htmlFor="email-address">Email address</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="relative block w-full appearance-none rounded-md border border-border px-3 py-2 text-foreground placeholder-muted-foreground focus:z-10 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
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
                  className="relative block w-full appearance-none rounded-md border border-border px-3 py-2 text-foreground placeholder-muted-foreground focus:z-10 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-70"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-4 space-y-6" onSubmit={handleMagicLink}>
            <div>
              <label className="sr-only" htmlFor="magic-email">Email address</label>
              <input
                id="magic-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full appearance-none rounded-md border border-border px-3 py-2 text-foreground placeholder-muted-foreground focus:z-10 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              We&apos;ll email you a one-time link. Great for accounts claimed with OAuth or Magic Link that never set a password.
            </p>
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-70"
              >
                {loading ? 'Sending...' : 'Email me a magic link'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white/85 px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button onClick={() => handleOAuth('google')} className="flex w-full justify-center rounded-md border border-border bg-white py-2 px-4 text-sm font-medium text-foreground hover:bg-muted focus:outline-none">
              Google
            </button>
            <button onClick={() => handleOAuth('github')} className="flex w-full justify-center rounded-md border border-border bg-white py-2 px-4 text-sm font-medium text-foreground hover:bg-muted focus:outline-none">
              GitHub
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
