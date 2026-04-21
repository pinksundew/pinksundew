import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

class MemoryStorage {
  private store = new Map<string, string>()

  get length() {
    return this.store.size
  }
  clear() {
    this.store.clear()
  }
  getItem(key: string) {
    return this.store.has(key) ? (this.store.get(key) as string) : null
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value))
  }
  removeItem(key: string) {
    this.store.delete(key)
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null
  }
}

const originalWindow = (globalThis as { window?: unknown }).window
const originalFetch = globalThis.fetch

function installWindow(storage: MemoryStorage) {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: { localStorage: storage },
  })
}

function clearWindow() {
  if (originalWindow === undefined) {
    delete (globalThis as { window?: unknown }).window
  } else {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: originalWindow,
    })
  }
}

async function loadModules() {
  vi.resetModules()
  const merge = await import('@/lib/anon-merge')
  const client = await import('@/lib/anon-merge-client')
  return { merge, client }
}

describe('consumePendingAnonMerge', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage()
    installWindow(storage)
  })

  afterEach(() => {
    clearWindow()
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('returns no-stash when nothing is stashed', async () => {
    const { client } = await loadModules()
    const result = await client.consumePendingAnonMerge('user-1')
    expect(result).toEqual({ status: 'no-stash' })
  })

  it('short-circuits when the stash matches the current user', async () => {
    const { merge, client } = await loadModules()
    merge.stashPendingAnonMerge('user-1')
    const result = await client.consumePendingAnonMerge('user-1')
    expect(result).toEqual({ status: 'same-user' })
    expect(merge.readPendingAnonMerge()).toBeNull()
  })

  it('calls /api/auth/merge-anonymous and clears the stash on success', async () => {
    const { merge, client } = await loadModules()
    merge.stashPendingAnonMerge('anon-1')

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, result: { merged_projects: 1 } }), { status: 200 })
    )
    globalThis.fetch = fetchMock as typeof fetch

    const result = await client.consumePendingAnonMerge('user-2')
    expect(result.status).toBe('merged')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/merge-anonymous',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ anon_user_id: 'anon-1' }),
      })
    )
    expect(merge.readPendingAnonMerge()).toBeNull()
  })

  it('surfaces the server error message and keeps the stash for retry', async () => {
    const { merge, client } = await loadModules()
    merge.stashPendingAnonMerge('anon-1')

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'oops' }), { status: 400 })
    )
    globalThis.fetch = fetchMock as typeof fetch

    const result = await client.consumePendingAnonMerge('user-2')
    expect(result).toEqual({ status: 'error', message: 'oops' })
    expect(merge.readPendingAnonMerge()).not.toBeNull()
  })

  it('falls back to HTTP status when the body is not JSON', async () => {
    const { merge, client } = await loadModules()
    merge.stashPendingAnonMerge('anon-1')

    const fetchMock = vi.fn(async () => new Response('<html>', { status: 500 }))
    globalThis.fetch = fetchMock as typeof fetch

    const result = await client.consumePendingAnonMerge('user-2')
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.message).toContain('HTTP 500')
    }
  })
})
