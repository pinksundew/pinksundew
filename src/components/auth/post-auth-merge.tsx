'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { consumePendingAnonMerge } from '@/lib/anon-merge-client'
import posthog from 'posthog-js'

type PostAuthMergeProps = {
  userId: string
}

/**
 * When a user lands on an authenticated page and we still have a pending
 * anonymous-user stash (e.g. from OAuth redirect or manual /login bypass),
 * auto-merge the guest board into this account.
 */
export function PostAuthMerge({ userId }: PostAuthMergeProps) {
  const router = useRouter()
  const didRunRef = useRef(false)

  useEffect(() => {
    if (didRunRef.current) return
    didRunRef.current = true

    consumePendingAnonMerge(userId).then((result) => {
      if (result.status === 'merged') {
        posthog.capture('guest_auto_merge_on_load')
        router.refresh()
      } else if (result.status === 'error') {
        posthog.capture('guest_auto_merge_failed', { reason: result.message })
      }
    })
  }, [router, userId])

  return null
}
