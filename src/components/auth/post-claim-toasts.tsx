'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { KeyRound, Check, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import posthog from 'posthog-js'

type ToastState = 'prompt' | 'entering-password' | 'saving' | 'saved' | 'error'
type ClaimMode = 'email' | 'oauth'

const DISMISSED_STORAGE_KEY = 'pinksundew:claim-set-password-dismissed'

export function PostClaimToasts() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  const [show, setShow] = useState(false)
  const [claimMode, setClaimMode] = useState<ClaimMode | null>(null)
  const [state, setState] = useState<ToastState>('prompt')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const claimFlag = searchParams.get('claim')
    if (claimFlag !== 'email' && claimFlag !== 'oauth') {
      return
    }

    try {
      if (typeof window !== 'undefined') {
        const dismissedSession = window.sessionStorage.getItem(DISMISSED_STORAGE_KEY)
        if (dismissedSession === '1') {
          return
        }
      }
    } catch {
      // Ignore private-mode errors and continue.
    }

    setShow(true)
    setClaimMode(claimFlag)
    posthog.capture('guest_claim_completed', { method: claimFlag })

    const params = new URLSearchParams(Array.from(searchParams.entries()))
    params.delete('claim')
    const queryString = params.toString()
    const nextUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname
    router.replace(nextUrl)
  }, [router, searchParams])

  const dismiss = () => {
    setShow(false)
    setClaimMode(null)
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(DISMISSED_STORAGE_KEY, '1')
      }
    } catch {
      // Ignore storage errors.
    }
  }

  const handleSavePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMsg(null)

    if (password.length < 8) {
      setErrorMsg('Passwords need to be at least 8 characters.')
      return
    }

    setState('saving')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      posthog.capture('guest_claim_set_password_failed', { reason: error.message })
      setErrorMsg(error.message)
      setState('error')
      return
    }

    posthog.capture('guest_claim_set_password')
    setState('saved')
    setPassword('')
    setTimeout(() => dismiss(), 1800)
  }

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed bottom-6 right-6 z-[120] w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-white shadow-2xl shadow-black/15"
        >
          <div className="relative flex items-start justify-between gap-3 border-b border-border bg-gradient-to-br from-emerald-50 via-white to-white px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Board saved</p>
                <p className="text-xs text-muted-foreground">Your board and API key are saved.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="-mr-1 -mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3 px-4 py-3">
            {state === 'saved' ? (
              <p className="text-sm text-emerald-700">Password saved. See you next time!</p>
            ) : claimMode === 'oauth' ? (
              <p className="text-sm text-foreground">
                You&apos;re signed in with your linked account. No password setup is needed.
              </p>
            ) : (
              <>
                <p className="text-sm text-foreground">
                  Want to set a password so you can sign in without a magic link next time?
                </p>

                {state === 'entering-password' || state === 'saving' || state === 'error' ? (
                  <form className="space-y-2" onSubmit={handleSavePassword}>
                    <label className="sr-only" htmlFor="claim-set-password">
                      Password
                    </label>
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="claim-set-password"
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="At least 8 characters"
                        disabled={state === 'saving'}
                        className="w-full rounded-md border border-border py-2 pl-9 pr-3 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70"
                      />
                    </div>
                    {errorMsg ? (
                      <p className="text-xs font-medium text-rose-700">{errorMsg}</p>
                    ) : null}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={dismiss}
                        disabled={state === 'saving'}
                        className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Not now
                      </button>
                      <button
                        type="submit"
                        disabled={state === 'saving'}
                        className="flex-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {state === 'saving' ? 'Saving...' : 'Set password'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={dismiss}
                      className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      Not now
                    </button>
                    <button
                      type="button"
                      onClick={() => setState('entering-password')}
                      className="flex-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Set a password
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
