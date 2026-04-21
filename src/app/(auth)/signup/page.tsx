'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PlannerBackdrop } from '@/components/auth/planner-backdrop'
import posthog from 'posthog-js'
import { clearPendingAnonMerge, stashPendingAnonMerge } from '@/lib/anon-merge'
import { consumePendingAnonMerge } from '@/lib/anon-merge-client'

function SignupPageInner() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawNextPath = searchParams.get('next') || '/'
  const nextPath = rawNextPath.startsWith('/') ? rawNextPath : '/'

  const supabase = useMemo(() => createClient(), [])
  const [pendingAnonId, setPendingAnonId] = useState<string | null>(null)

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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg({ type: '', text: '' })

    // If there's a live anonymous session, prefer linkIdentity-style upgrade
    // via updateUser to preserve the existing user_id and workspace. This
    // keeps the guest board attached rather than orphaning it.
    if (pendingAnonId) {
      const { error } = await supabase.auth.updateUser({ email, password })
      if (error) {
        setMsg({ type: 'error', text: error.message })
        posthog.captureException(error)
        setLoading(false)
        return
      }

      setMsg({
        type: 'success',
        text: `Check ${email} for a link to finish claiming your guest account.`,
      })
      posthog.capture('guest_claim_started', { method: 'signup-form' })
      setLoading(false)
      return
    }

    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setMsg({ type: 'error', text: error.message })
      posthog.captureException(error)
      setLoading(false)
      return
    }

    if (signUpData.user) {
      posthog.identify(signUpData.user.id, { email: signUpData.user.email })
      posthog.capture('user_signed_up', { method: 'email' })

      if (signUpData.session) {
        const mergeResult = await consumePendingAnonMerge(signUpData.user.id)
        if (mergeResult.status === 'merged') {
          posthog.capture('guest_auto_merge_on_signup')
        } else if (mergeResult.status === 'same-user') {
          clearPendingAnonMerge()
        }
        router.push(nextPath)
        router.refresh()
        return
      }
    }

    setMsg({
      type: 'success',
      text: 'Success! Check your email to confirm your account.',
    })
    setLoading(false)
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    posthog.capture('user_signed_up', { method: provider })
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
            Create an account
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="font-medium text-primary hover:text-primary/90">
              Sign in
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            <Link href="/guest" className="font-medium text-foreground hover:text-primary">
              Continue in guest mode
            </Link>
          </p>
          {pendingAnonId ? (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-900">
              Your guest board will be preserved on your new account—nothing to import.
            </p>
          ) : null}
        </div>

        {msg.text && (
          <div className={`p-3 rounded-md text-sm text-center ${msg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            {msg.text}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
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
                autoComplete="new-password"
                required
                minLength={8}
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
              {loading
                ? pendingAnonId
                  ? 'Claiming account...'
                  : 'Creating account...'
                : pendingAnonId
                  ? 'Claim this guest board'
                  : 'Sign up'}
            </button>
          </div>
        </form>

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

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-12 sm:px-6 lg:px-8">
          <PlannerBackdrop />
          <div className="relative z-10 rounded-lg border border-white/60 bg-white/85 px-4 py-2 text-sm text-muted-foreground backdrop-blur-sm">
            Loading sign up...
          </div>
        </div>
      }
    >
      <SignupPageInner />
    </Suspense>
  )
}
