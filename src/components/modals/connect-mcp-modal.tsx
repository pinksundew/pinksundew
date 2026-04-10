'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Key, Loader2, PlugZap, Sparkles, X } from 'lucide-react'

type ConnectMcpModalProps = {
  isOpen: boolean
  onClose: () => void
  projectId: string
}

type GuideId = 'vscode' | 'claude-code' | 'codex' | 'antigravity'

type Guide = {
  id: GuideId
  label: string
  title: string
  description: string
  steps: string[]
  getSnippets: (config: SnippetConfig) => Array<{
    id: string
    label: string
    language: string
    code: string
  }>
}

type SnippetConfig = {
  serverName: string
  apiKey: string
  projectId: string
}

type CodeSnippetCardProps = {
  id: string
  label: string
  language: string
  code: string
  copiedSnippetId: string | null
  onCopy: (snippetId: string, content: string) => void
}

function CodeSnippetCard({
  id,
  label,
  language,
  code,
  copiedSnippetId,
  onCopy,
}: CodeSnippetCardProps) {
  const isCopied = copiedSnippetId === id

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </span>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
            {language}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onCopy(id, code)}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          {isCopied ? (
            <>
              <Check className="h-3.5 w-3.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="max-h-72 overflow-auto bg-muted/20 p-3 text-xs leading-relaxed text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function createGuides(): Record<GuideId, Guide> {
  return {
    vscode: {
      id: 'vscode',
      label: 'VS Code',
      title: 'Connect In VS Code',
      description:
        'Add the Pink Sundew MCP server to your workspace settings. One copy-paste and reload.',
      steps: [
        'Generate an API key below (or use an existing one).',
        'Copy the mcp.json snippet and paste it into .vscode/mcp.json in your project.',
        'Add .vscode/mcp.json to your .gitignore to keep your API key private.',
        'Reload VS Code window, then open Copilot Chat and confirm MCP tools appear.',
      ],
      getSnippets: (config) => [
        {
          id: 'vscode-config',
          label: '.vscode/mcp.json',
          language: 'json',
          code: JSON.stringify(
            {
              servers: {
                [config.serverName]: {
                  type: 'stdio',
                  command: 'npx',
                  args: ['-y', '@pinksundew/mcp'],
                  env: {
                    AGENTPLANNER_API_KEY: config.apiKey,
                    AGENTPLANNER_PROJECT_IDS: config.projectId,
                  },
                },
              },
            },
            null,
            2
          ),
        },
      ],
    },
    'claude-code': {
      id: 'claude-code',
      label: 'Claude Code',
      title: 'Connect In Claude Code',
      description:
        'Add via CLI or paste the JSON into your project .mcp.json config file.',
      steps: [
        'Generate an API key below.',
        'Run the CLI command from your project root, OR paste the JSON into .mcp.json.',
        'In Claude Code, run /mcp to verify the server is connected.',
      ],
      getSnippets: (config) => [
        {
          id: 'claude-command',
          label: 'CLI command',
          language: 'bash',
          code: [
            'claude mcp add --transport stdio --scope project \\',
            `  --env AGENTPLANNER_API_KEY=${config.apiKey} \\`,
            `  --env AGENTPLANNER_PROJECT_IDS=${config.projectId} \\`,
            `  ${config.serverName} -- npx -y @pinksundew/mcp`,
          ].join('\n'),
        },
        {
          id: 'claude-json',
          label: '.mcp.json (project scope)',
          language: 'json',
          code: JSON.stringify(
            {
              mcpServers: {
                [config.serverName]: {
                  type: 'stdio',
                  command: 'npx',
                  args: ['-y', '@pinksundew/mcp'],
                  env: {
                    AGENTPLANNER_API_KEY: config.apiKey,
                    AGENTPLANNER_PROJECT_IDS: config.projectId,
                  },
                },
              },
            },
            null,
            2
          ),
        },
      ],
    },
    codex: {
      id: 'codex',
      label: 'Codex',
      title: 'Connect In Codex',
      description:
        'Codex supports MCP through codex mcp commands or config.toml.',
      steps: [
        'Generate an API key below.',
        'Add the server with codex mcp add (fastest) or paste the TOML block into ~/.codex/config.toml.',
        'Run /mcp in Codex or codex mcp list in terminal to verify.',
      ],
      getSnippets: (config) => [
        {
          id: 'codex-command',
          label: 'CLI command',
          language: 'bash',
          code: [
            `codex mcp add ${config.serverName} \\`,
            `  --env AGENTPLANNER_API_KEY=${config.apiKey} \\`,
            `  --env AGENTPLANNER_PROJECT_IDS=${config.projectId} \\`,
            '  -- npx -y @pinksundew/mcp',
          ].join('\n'),
        },
        {
          id: 'codex-toml',
          label: '~/.codex/config.toml',
          language: 'toml',
          code: [
            `[mcp_servers.${config.serverName}]`,
            'command = "npx"',
            'args = ["-y", "@pinksundew/mcp"]',
            '',
            `[mcp_servers.${config.serverName}.env]`,
            `AGENTPLANNER_API_KEY = "${config.apiKey}"`,
            `AGENTPLANNER_PROJECT_IDS = "${config.projectId}"`,
          ].join('\n'),
        },
      ],
    },
    antigravity: {
      id: 'antigravity',
      label: 'Antigravity',
      title: 'Connect In Antigravity',
      description:
        'Add a local stdio MCP server with the configuration below.',
      steps: [
        'Generate an API key below.',
        'Open Antigravity MCP settings and add a new local/stdio server.',
        'Paste the JSON config below, then reconnect the workspace.',
      ],
      getSnippets: (config) => [
        {
          id: 'antigravity-json',
          label: 'Server config',
          language: 'json',
          code: JSON.stringify(
            {
              name: config.serverName,
              type: 'stdio',
              command: 'npx',
              args: ['-y', '@pinksundew/mcp'],
              env: {
                AGENTPLANNER_API_KEY: config.apiKey,
                AGENTPLANNER_PROJECT_IDS: config.projectId,
              },
            },
            null,
            2
          ),
        },
      ],
    },
  }
}

export function ConnectMcpModal({ isOpen, onClose, projectId }: ConnectMcpModalProps) {
  const [activeGuideId, setActiveGuideId] = useState<GuideId>('vscode')
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null)
  const [serverName, setServerName] = useState('pinksundew')
  const [apiKey, setApiKey] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [keyGenerated, setKeyGenerated] = useState(false)

  const guides = useMemo(() => createGuides(), [])

  useEffect(() => {
    if (!isOpen) {
      setCopiedSnippetId(null)
      setActiveGuideId('vscode')
      // Don't reset apiKey/serverName so user doesn't lose their key if they close and reopen
    }
  }, [isOpen])

  const snippetConfig: SnippetConfig = {
    serverName: serverName || 'pinksundew',
    apiKey: apiKey || 'YOUR_API_KEY',
    projectId,
  }

  const activeGuide = guides[activeGuideId]
  const snippets = activeGuide.getSnippets(snippetConfig)

  const generateApiKey = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `MCP: ${serverName || 'pinksundew'}` }),
      })
      if (!res.ok) throw new Error('Failed to create key')
      const data = await res.json()
      setApiKey(data.raw_key)
      setKeyGenerated(true)
    } catch (error) {
      console.error('Failed to generate API key:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const copySnippet = async (snippetId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedSnippetId(snippetId)
      window.setTimeout(() => {
        setCopiedSnippetId((current) => (current === snippetId ? null : current))
      }, 1500)
    } catch (error) {
      console.error('Failed to copy snippet:', error)
    }
  }

  if (!isOpen) return null

  const hasApiKey = apiKey.startsWith('ap_')

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-foreground/25 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground">
                <PlugZap className="h-3.5 w-3.5" /> Connect
              </div>
              <h2 className="mt-2 text-xl font-semibold text-foreground">Connect MCP Server</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                One-shot setup for Pink Sundew MCP integration.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Configuration Section */}
          <div className="border-b border-border bg-muted/10 px-5 py-4">
            <div className="space-y-4">
              {/* Server Name */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Server Name
                </label>
                <input
                  type="text"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value.replace(/[^a-z0-9-_]/gi, '').toLowerCase())}
                  placeholder="pinksundew"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  API Key
                </label>
                {hasApiKey ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <code className="flex-1 truncate font-mono text-sm text-green-800">
                        {apiKey}
                      </code>
                      <button
                        type="button"
                        onClick={() => copySnippet('api-key', apiKey)}
                        className="rounded-md p-1 text-green-700 hover:bg-green-100"
                      >
                        {copiedSnippetId === 'api-key' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {keyGenerated && (
                      <p className="text-xs text-amber-700">
                        Save this key now — it won&apos;t be shown again after you close this modal.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="ap_your_api_key or generate one →"
                      className="flex-1 rounded-lg border border-border bg-white px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={generateApiKey}
                      disabled={isGenerating}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Generate
                    </button>
                  </div>
                )}
              </div>

              {/* Project ID (read-only) */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Project ID <span className="text-muted-foreground/60">(this project)</span>
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <code className="flex-1 truncate font-mono text-sm text-muted-foreground">
                    {projectId}
                  </code>
                  <button
                    type="button"
                    onClick={() => copySnippet('project-id', projectId)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                  >
                    {copiedSnippetId === 'project-id' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* IDE Tabs */}
          <div className="border-b border-border bg-background px-5 pt-4">
            <div className="flex flex-wrap gap-2 pb-4">
              {(Object.values(guides) as Guide[]).map((guide) => (
                <button
                  key={guide.id}
                  type="button"
                  onClick={() => setActiveGuideId(guide.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeGuideId === guide.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-white text-foreground hover:bg-muted'
                  }`}
                >
                  {guide.label}
                </button>
              ))}
            </div>
          </div>

          {/* Guide Content */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">{activeGuide.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{activeGuide.description}</p>
            </div>

            <div className="mb-5 rounded-xl border border-border bg-muted/20 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Setup Steps
              </div>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-foreground">
                {activeGuide.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>

            <div className="space-y-4">
              {snippets.map((snippet) => (
                <CodeSnippetCard
                  key={snippet.id}
                  id={snippet.id}
                  label={snippet.label}
                  language={snippet.language}
                  code={snippet.code}
                  copiedSnippetId={copiedSnippetId}
                  onCopy={copySnippet}
                />
              ))}
            </div>

            {!hasApiKey && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <Key className="mr-1.5 inline-block h-4 w-4" />
                Generate or enter an API key above to populate the config snippets.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
