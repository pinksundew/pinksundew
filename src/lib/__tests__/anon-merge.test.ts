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

async function loadModule() {
  vi.resetModules()
  return import('@/lib/anon-merge')
}

const originalWindow = (globalThis as { window?: unknown }).window

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

describe('anon-merge stash helpers', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage()
    installWindow(storage)
  })

  afterEach(() => {
    clearWindow()
    vi.useRealTimers()
  })

  it('stashes and reads the anonymous user id', async () => {
    const { stashPendingAnonMerge, readPendingAnonMerge } = await loadModule()
    stashPendingAnonMerge('anon-123')
    expect(readPendingAnonMerge()).toMatchObject({ anonUserId: 'anon-123' })
  })

  it('clears a previously stashed value', async () => {
    const { stashPendingAnonMerge, clearPendingAnonMerge, readPendingAnonMerge } = await loadModule()
    stashPendingAnonMerge('anon-123')
    clearPendingAnonMerge()
    expect(readPendingAnonMerge()).toBeNull()
  })

  it('expires stashes older than the 1h TTL', async () => {
    const { stashPendingAnonMerge, readPendingAnonMerge } = await loadModule()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-20T12:00:00Z'))
    stashPendingAnonMerge('anon-123')

    vi.setSystemTime(new Date('2026-04-20T14:00:00Z'))
    expect(readPendingAnonMerge()).toBeNull()
  })

  it('returns null and cleans up when storage contains garbage', async () => {
    storage.setItem('pinksundew:pending-anon-merge', 'not-json')
    const { readPendingAnonMerge } = await loadModule()
    expect(readPendingAnonMerge()).toBeNull()
    expect(storage.getItem('pinksundew:pending-anon-merge')).toBeNull()
  })

  it('is a no-op when window is unavailable (SSR)', async () => {
    clearWindow()
    const { stashPendingAnonMerge, readPendingAnonMerge, clearPendingAnonMerge } = await loadModule()
    expect(() => stashPendingAnonMerge('anon-123')).not.toThrow()
    expect(readPendingAnonMerge()).toBeNull()
    expect(() => clearPendingAnonMerge()).not.toThrow()
  })
})
