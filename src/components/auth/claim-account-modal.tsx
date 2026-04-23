'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Mail, ShieldCheck, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { stashPendingAnonMerge } from '@/lib/anon-merge'
import { dispatchGlobalOverlay } from '@/lib/global-overlay'
import posthog from 'posthog-js'

type ClaimAccountModalProps = {
  isOpen: boolean
  onClose: () => void
  anonymousUserId: string
}

type Mode = 'idle' | 'linking' | 'otp-sent'

type LinkProvider = 'github' | 'google'

function buildClaimCallbackUrl(mode: 'email' | 'oauth') {
  if (typeof window === 'undefined') {
    return `/callback?claim=${mode}`
  }

  const url = new URL('/callback', window.location.origin)
  url.searchParams.set('next', window.location.pathname + window.location.search)
  url.searchParams.set('claim', mode)
  return url.toString()
}

function isManualLinkingDisabledError(message: string) {
  return message.toLowerCase().includes('manual linking is disabled')
}

export function ClaimAccountModal({ isOpen, onClose, anonymousUserId }: ClaimAccountModalProps) {
  const supabase = useMemo(() => createClient(), [])
  const [mode, setMode] = useState<Mode>('idle')
  const [email, setEmail] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)
  const [busyProvider, setBusyProvider] = useState<LinkProvider | null>(null)
  const [busyEmail, setBusyEmail] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setMode('idle')
      setErrorMsg(null)
      setInfoMsg(null)
      setBusyProvider(null)
      setBusyEmail(false)
    }
  }, [isOpen])

  useEffect(() => {
    dispatchGlobalOverlay({ id: 'claim-account', open: isOpen })

    return () => {
      dispatchGlobalOverlay({ id: 'claim-account', open: false })
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  const handleOAuth = useCallback(
    async (provider: LinkProvider) => {
      setErrorMsg(null)
      setInfoMsg(null)
      setBusyProvider(provider)

      stashPendingAnonMerge(anonymousUserId)

      try {
        const claimCallbackUrl = buildClaimCallbackUrl('oauth')
        const providerOptions = {
          redirectTo: claimCallbackUrl,
          scopes: provider === 'github' ? 'repo' : undefined,
        }

        const { error } = await supabase.auth.linkIdentity({
          provider,
          options: providerOptions,
        })

        if (error) {
          if (isManualLinkingDisabledError(error.message)) {
            posthog.capture('guest_claim_fallback_to_oauth_signin', { provider })
            const { error: oauthError } = await supabase.auth.signInWithOAuth({
              provider,
              options: providerOptions,
            })

            if (oauthError) {
              setErrorMsg(oauthError.message)
              setBusyProvider(null)
            }
            return
          }

          posthog.capture('guest_claim_failed', { method: provider, reason: error.message })
          setErrorMsg(error.message)
          setBusyProvider(null)
          return
        }

        posthog.capture('guest_claim_started', { method: provider })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected error'
        posthog.capture('guest_claim_failed', { method: provider, reason: message })
        setErrorMsg(message)
        setBusyProvider(null)
      }
    },
    [anonymousUserId, supabase]
  )

  const handleEmailClaim = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setErrorMsg(null)
      setInfoMsg(null)

      const trimmed = email.trim()
      if (!trimmed) {
        setErrorMsg('Please enter your email address.')
        return
      }

      setBusyEmail(true)
      setMode('linking')

      stashPendingAnonMerge(anonymousUserId)

      try {
        const { error } = await supabase.auth.updateUser(
          { email: trimmed },
          { emailRedirectTo: buildClaimCallbackUrl('email') }
        )

        if (error) {
          posthog.capture('guest_claim_failed', { method: 'email', reason: error.message })
          setErrorMsg(error.message)
          setMode('idle')
          setBusyEmail(false)
          return
        }

        posthog.capture('guest_claim_started', { method: 'email' })
        setMode('otp-sent')
        setInfoMsg(`Check ${trimmed} for a link to finish claiming your account.`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected error'
        posthog.capture('guest_claim_failed', { method: 'email', reason: message })
        setErrorMsg(message)
        setMode('idle')
      } finally {
        setBusyEmail(false)
      }
    },
    [anonymousUserId, email, supabase]
  )

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (busyProvider || busyEmail) {
                return
              }
              onClose()
            }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="claim-account-title"
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-white shadow-2xl shadow-black/10"
          >
            <div className="relative flex items-start justify-between gap-3 border-b border-border bg-gradient-to-br from-primary/10 via-white to-white px-6 py-5">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Save Your Board
                </div>
                <h2 id="claim-account-title" className="text-xl font-semibold text-foreground">
                  Save your board
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Keep this project and your API key. Choose GitHub, Google, or email and we&apos;ll save this workspace to the account you use.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (busyProvider || busyEmail) return
                  onClose()
                }}
                className="-mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {errorMsg ? (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {errorMsg}
                </div>
              ) : null}

              {infoMsg && mode === 'otp-sent' ? (
                <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{infoMsg}</span>
                </div>
              ) : null}

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={Boolean(busyProvider) || busyEmail}
                  onClick={() => handleOAuth('github')}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-foreground/80 bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-sm transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2 .37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                  {busyProvider === 'github' ? 'Opening GitHub...' : 'Continue with GitHub'}
                </button>
                <button
                  type="button"
                  disabled={Boolean(busyProvider) || busyEmail}
                  onClick={() => handleOAuth('google')}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="flex h-4 w-4 items-center justify-center">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
                      <path
                        fill="#4285F4"
                        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.28 1.4-1.12 2.58-2.38 3.38v2.81h3.85c2.26-2.09 3.55-5.17 3.55-8.43z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.94-2.91l-3.85-2.98c-1.07.72-2.44 1.16-4.09 1.16-3.14 0-5.8-2.12-6.75-4.98H1.27v3.12C3.25 21.3 7.31 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.25 14.29c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.59H1.27C.46 8.21 0 10.06 0 12s.46 3.79 1.27 5.41l3.98-3.12z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.59l3.98 3.12C6.2 6.87 8.86 4.75 12 4.75z"
                      />
                    </svg>
                  </span>
                  {busyProvider === 'google' ? 'Opening Google...' : 'Continue with Google'}
                </button>
              </div>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 font-medium uppercase tracking-wide text-muted-foreground">
                    Or with email
                  </span>
                </div>
              </div>

              <form className="space-y-2" onSubmit={handleEmailClaim}>
                <label className="sr-only" htmlFor="claim-email">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="claim-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    disabled={Boolean(busyProvider) || busyEmail || mode === 'otp-sent'}
                    className="w-full rounded-lg border border-border py-2.5 pl-9 pr-3 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>
                <button
                  type="submit"
                  disabled={Boolean(busyProvider) || busyEmail || mode === 'otp-sent'}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/80 bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {busyEmail ? 'Sending link...' : mode === 'otp-sent' ? 'Link sent' : 'Email me a magic link'}
                </button>
              </form>

              <p className="text-center text-[11px] text-muted-foreground">
                Existing accounts merge automatically. New accounts keep this board and API key intact.
              </p>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
