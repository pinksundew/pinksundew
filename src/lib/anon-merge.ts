/**
 * Helpers for stashing/reading the active anonymous user id so that if a guest
 * bypasses the claim modal and signs into an *existing* account via /login or
 * /signup, we can merge their anonymous workspace into the destination user.
 *
 * When the claim modal is used it relies on linkIdentity/updateUser which
 * preserve the same auth uid, so merging is a no-op. The stash is a fallback
 * for "I already have an account" and OAuth redirects that swap the session.
 */

const STORAGE_KEY = 'pinksundew:pending-anon-merge'
const MAX_STASH_AGE_MS = 1000 * 60 * 60 // 1 hour

export type PendingAnonMerge = {
  anonUserId: string
  stashedAt: number
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function stashPendingAnonMerge(anonUserId: string): void {
  const storage = getStorage()
  if (!storage) {
    return
  }

  try {
    const payload: PendingAnonMerge = {
      anonUserId,
      stashedAt: Date.now(),
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Swallow quota / privacy-mode errors.
  }
}

export function readPendingAnonMerge(): PendingAnonMerge | null {
  const storage = getStorage()
  if (!storage) {
    return null
  }

  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<PendingAnonMerge>
    if (!parsed || typeof parsed.anonUserId !== 'string' || typeof parsed.stashedAt !== 'number') {
      storage.removeItem(STORAGE_KEY)
      return null
    }

    if (Date.now() - parsed.stashedAt > MAX_STASH_AGE_MS) {
      storage.removeItem(STORAGE_KEY)
      return null
    }

    return { anonUserId: parsed.anonUserId, stashedAt: parsed.stashedAt }
  } catch {
    storage.removeItem(STORAGE_KEY)
    return null
  }
}

export function clearPendingAnonMerge(): void {
  const storage = getStorage()
  if (!storage) {
    return
  }

  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore.
  }
}
