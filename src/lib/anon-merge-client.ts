import { clearPendingAnonMerge, readPendingAnonMerge } from './anon-merge'

/**
 * If there is a stashed anonymous user id and we are now authenticated as a
 * different account, hit /api/auth/merge-anonymous to reassign the guest
 * workspace to the current account, then clear the stash.
 *
 * Safe to call multiple times; the route and RPC short-circuit when the anon
 * user id matches the current session.
 */
export async function consumePendingAnonMerge(currentUserId: string | null | undefined): Promise<
  | { status: 'no-stash' }
  | { status: 'same-user' }
  | { status: 'merged'; result: unknown }
  | { status: 'error'; message: string }
> {
  const stash = readPendingAnonMerge()
  if (!stash) {
    return { status: 'no-stash' }
  }

  if (currentUserId && stash.anonUserId === currentUserId) {
    clearPendingAnonMerge()
    return { status: 'same-user' }
  }

  try {
    const response = await fetch('/api/auth/merge-anonymous', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ anon_user_id: stash.anonUserId }),
    })

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      return { status: 'error', message: data?.error ?? `HTTP ${response.status}` }
    }

    const data = (await response.json().catch(() => null)) as unknown
    clearPendingAnonMerge()
    return { status: 'merged', result: data }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unexpected error',
    }
  }
}
