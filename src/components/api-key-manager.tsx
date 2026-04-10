'use client'

import { useState } from 'react'
import { Key, Copy, Trash2, Plus, Check } from 'lucide-react'

interface ApiKeyDisplay {
  id: string
  key_prefix: string
  name: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

export default function ApiKeyManager({ initialKeys }: { initialKeys: ApiKeyDisplay[] }) {
  const [keys, setKeys] = useState<ApiKeyDisplay[]>(initialKeys)
  const [newKeyRaw, setNewKeyRaw] = useState<string | null>(null)
  const [keyName, setKeyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generateKey() {
    setLoading(true)
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName || 'Default' }),
      })
      if (!res.ok) throw new Error('Failed to create key')
      const data = await res.json()
      setNewKeyRaw(data.raw_key)
      setKeys(prev => [{
        id: data.id,
        key_prefix: data.key_prefix,
        name: data.name,
        created_at: data.created_at,
        last_used_at: null,
        revoked_at: null,
      }, ...prev])
      setKeyName('')
    } finally {
      setLoading(false)
    }
  }

  async function revokeKey(keyId: string) {
    const res = await fetch(`/api/keys/${keyId}`, { method: 'DELETE' })
    if (!res.ok) return
    setKeys(prev => prev.map(k =>
      k.id === keyId ? { ...k, revoked_at: new Date().toISOString() } : k
    ))
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const activeKeys = keys.filter(k => !k.revoked_at)
  const revokedKeys = keys.filter(k => k.revoked_at)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Key size={20} className="text-primary-foreground" />
        <h2 className="text-lg font-semibold text-foreground">API Keys</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Generate API keys to authenticate the Pink Sundew MCP server.
      </p>

      {/* New key display (shown once after generation) */}
      {newKeyRaw && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 space-y-2">
          <p className="text-sm font-medium text-amber-800">
            Copy your API key now — it won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded border border-amber-200 bg-white px-3 py-2 font-mono text-sm">
              {newKeyRaw}
            </code>
            <button
              onClick={() => copyToClipboard(newKeyRaw)}
              className="rounded-md border border-amber-200 px-3 py-2 transition-colors hover:bg-amber-100"
              title="Copy to clipboard"
            >
              {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
            </button>
          </div>
          <button
            onClick={() => setNewKeyRaw(null)}
            className="text-sm text-amber-700 underline"
          >
            I&apos;ve copied it, dismiss
          </button>
        </div>
      )}

      {/* Generate form */}
      <div className="flex gap-2">
        <input
          type="text"
          value={keyName}
          onChange={e => setKeyName(e.target.value)}
          placeholder="Key name (e.g. Work Laptop)"
          className="flex-1 rounded-md border border-border p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={generateKey}
          disabled={loading}
          className="flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus size={16} />
          Generate
        </button>
      </div>

      {/* Active keys */}
      {activeKeys.length > 0 && (
        <div className="space-y-2">
          {activeKeys.map(key => (
            <div key={key.id} className="flex items-center justify-between rounded-md border border-border bg-white p-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{key.name}</span>
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    {key.key_prefix}...
                  </code>
                </div>
                <p className="text-xs text-muted-foreground">
                  Created {new Date(key.created_at).toLocaleDateString()}
                  {key.last_used_at && ` · Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                </p>
              </div>
              <button
                onClick={() => revokeKey(key.id)}
                className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                title="Revoke key"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Revoked keys */}
      {revokedKeys.length > 0 && (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer">
            {revokedKeys.length} revoked key{revokedKeys.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-1">
            {revokedKeys.map(key => (
              <div key={key.id} className="flex items-center gap-2 text-muted-foreground/70 line-through">
                <span>{key.name}</span>
                <code className="text-xs">{key.key_prefix}...</code>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
