'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Key, Loader2, PlugZap, Sparkles, X } from 'lucide-react'

type ConnectMcpModalProps = {
  isOpen: boolean
  onClose: () => void
  projectId: string
}

type GuideId = 'vscode' | 'cursor' | 'claude-code' | 'codex' | 'antigravity'

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
        'Add the Pink Sundew MCP server to your workspace settings. Requires Node.js (npx will auto-download the server on first run).',
      steps: [
        'Generate an API key (or use an existing one).',
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
                pinksundew: {
                  type: 'stdio',
                  command: 'npx',
                  args: ['-y', '@pinksundew/mcp'],
                  env: {
                    AGENTPLANNER_API_KEY: config.apiKey,
                    AGENTPLANNER_PROJECT_ID: config.projectId,
                    AGENTPLANNER_CLIENT_ENV: 'vscode',
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
    cursor: {
      id: 'cursor',
      label: 'Cursor',
      title: 'Connect In Cursor',
      description:
        'Add the MCP server to Cursor workspace settings. Requires Node.js (npx will auto-download the server on first run).',
      steps: [
        'Generate an API key (or use an existing one).',
        'Copy the mcp.json snippet and paste it into .cursor/mcp.json in your project.',
        'Add .cursor/mcp.json to your .gitignore to keep your API key private.',
        'Restart Cursor or reconnect MCP, then confirm Pink Sundew tools appear.',
      ],
      getSnippets: (config) => [
        {
          id: 'cursor-config',
          label: '.cursor/mcp.json',
          language: 'json',
          code: JSON.stringify(
            {
              mcpServers: {
                pinksundew: {
                  type: 'stdio',
                  command: 'npx',
                  args: ['-y', '@pinksundew/mcp'],
                  env: {
                    AGENTPLANNER_API_KEY: config.apiKey,
                    AGENTPLANNER_PROJECT_ID: config.projectId,
                    AGENTPLANNER_CLIENT_ENV: 'cursor',
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
        'Add via CLI or paste the JSON into your project .mcp.json config file. Requires Node.js (npx will auto-download the server on first run).',
      steps: [
        'Generate an API key.',
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
            `  --env AGENTPLANNER_PROJECT_ID=${config.projectId} \\`,
            '  --env AGENTPLANNER_CLIENT_ENV=claude \\',
            '  pinksundew -- npx -y @pinksundew/mcp',
          ].join('\n'),
        },
        {
          id: 'claude-json',
          label: '.mcp.json (project scope)',
          language: 'json',
          code: JSON.stringify(
            {
              mcpServers: {
                pinksundew: {
                  type: 'stdio',
                  command: 'npx',
                  args: ['-y', '@pinksundew/mcp'],
                  env: {
                    AGENTPLANNER_API_KEY: config.apiKey,
                    AGENTPLANNER_PROJECT_ID: config.projectId,
                    AGENTPLANNER_CLIENT_ENV: 'claude',
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
        'Codex supports MCP through codex mcp commands or config.toml. Use AGENTPLANNER_CLIENT_ENV=codex,vscode to sync both AGENTS.md and .github/copilot-instructions.md automatically.',
      steps: [
        'Generate an API key.',
        'Add the server with codex mcp add (fastest) or paste the TOML block into ~/.codex/config.toml.',
        'Run /mcp in Codex or codex mcp list in terminal to verify.',
        'For advanced setups, you can explicitly set AGENTPLANNER_TARGET_FILES=AGENTS.md,.github/copilot-instructions.md (this overrides AGENTPLANNER_CLIENT_ENV mapping).',
      ],
      getSnippets: (config) => [
        {
          id: 'codex-command',
          label: 'CLI command',
          language: 'bash',
          code: `codex mcp add pinksundew --env AGENTPLANNER_API_KEY=${config.apiKey} --env AGENTPLANNER_PROJECT_ID=${config.projectId} --env AGENTPLANNER_CLIENT_ENV=codex,vscode --env PATH=/usr/local/bin:/usr/bin:/bin -- /usr/local/bin/npx -y @pinksundew/mcp`,
        },
        {
          id: 'codex-command-explicit',
          label: 'CLI command (explicit files)',
          language: 'bash',
          code: `codex mcp add pinksundew --env AGENTPLANNER_API_KEY=${config.apiKey} --env AGENTPLANNER_PROJECT_ID=${config.projectId} --env AGENTPLANNER_CLIENT_ENV=codex,vscode --env AGENTPLANNER_TARGET_FILES=AGENTS.md,.github/copilot-instructions.md --env PATH=/usr/local/bin:/usr/bin:/bin -- /usr/local/bin/npx -y @pinksundew/mcp`,
        },
        {
          id: 'codex-toml',
          label: '~/.codex/config.toml',
          language: 'toml',
          code: [
            '[mcp_servers.pinksundew]',
            'command = "/usr/local/bin/npx"',
            'args = ["-y", "@pinksundew/mcp"]',
            '',
            '[mcp_servers.pinksundew.env]',
            `AGENTPLANNER_API_KEY = "${config.apiKey}"`,
            `AGENTPLANNER_PROJECT_ID = "${config.projectId}"`,
            'AGENTPLANNER_CLIENT_ENV = "codex,vscode"',
            '# Optional explicit override:',
            '# AGENTPLANNER_TARGET_FILES = "AGENTS.md,.github/copilot-instructions.md"',
            'PATH = "/usr/local/bin:/usr/bin:/bin"',
          ].join('\n'),
        },
      ],
    },
    antigravity: {
      id: 'antigravity',
      label: 'Antigravity',
      title: 'Connect In Antigravity',
      description:
        'Use a project .mcp.json config (recommended) or add a single local stdio server manually. Requires Node.js; npx will auto-download the server on first run.',
      steps: [
        'Generate an API key.',
        'Preferred: copy the `.mcp.json` snippet below into your project root.',
        'Alternative: open Antigravity MCP settings, add a local/stdio server, and paste the single-server snippet.',
        'Reconnect the workspace and confirm Pink Sundew tools appear.',
      ],
      getSnippets: (config) => [
        {
          id: 'antigravity-mcp-json',
          label: '.mcp.json (project scope)',
          language: 'json',
          code: JSON.stringify(
            {
              mcpServers: {
                pinksundew: {
                  type: 'stdio',
                  command: 'npx',
                  args: ['-y', '@pinksundew/mcp'],
                  env: {
                    AGENTPLANNER_API_KEY: config.apiKey,
                    AGENTPLANNER_PROJECT_ID: config.projectId,
                    AGENTPLANNER_CLIENT_ENV: 'antigravity',
                  },
                },
              },
            },
            null,
            2
          ),
        },
        {
          id: 'antigravity-server-json',
          label: 'Single server object',
          language: 'json',
          code: JSON.stringify(
            {
              type: 'stdio',
              command: 'npx',
              args: ['-y', '@pinksundew/mcp'],
              env: {
                AGENTPLANNER_API_KEY: config.apiKey,
                AGENTPLANNER_PROJECT_ID: config.projectId,
                AGENTPLANNER_CLIENT_ENV: 'antigravity',
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

function generateUniqueKeyName(): string {
  const now = new Date()
  const month = now.toLocaleString('en-US', { month: 'short' })
  const day = now.getDate()
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `MCP ${month} ${day} ${time}`
}

export function ConnectMcpModal({ isOpen, onClose, projectId }: ConnectMcpModalProps) {
  const [activeGuideId, setActiveGuideId] = useState<GuideId>('vscode')
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [keyGenerated, setKeyGenerated] = useState(false)

  const guides = useMemo(() => createGuides(), [])

  useEffect(() => {
    if (!isOpen) {
      setCopiedSnippetId(null)
      setActiveGuideId('vscode')
    }
  }, [isOpen])

  const snippetConfig: SnippetConfig = {
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
        body: JSON.stringify({ name: generateUniqueKeyName() }),
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 shrink-0">
            <div>
              <h2 className="text-xl font-semibold">Connect MCP Server</h2>
              <p className="text-sm text-muted-foreground">
                Configure your AI agent to connect to this project board.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Two-column layout */}
          <div className="m-3 grid min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/40 md:m-4 md:grid-cols-[minmax(250px,280px)_minmax(0,1fr)]">
            {/* Left sidebar - API Key */}
            <div className="flex min-h-0 flex-col border-b border-slate-200 bg-white p-4 md:border-b-0 md:border-r">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Key className="h-4 w-4" />
                    API Key
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Required to authenticate the MCP server.
                  </p>
                </div>

                {hasApiKey ? (
                  <div className="space-y-2">
                    <div className="rounded-lg border border-green-200 bg-green-50 p-2">
                      <div className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 shrink-0 text-green-600" />
                        <span className="text-xs font-medium text-green-700">Key Generated</span>
                      </div>
                      <code className="mt-1.5 block truncate font-mono text-[10px] text-green-800">
                        {apiKey}
                      </code>
                      <button
                        type="button"
                        onClick={() => copySnippet('api-key', apiKey)}
                        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-green-200 bg-white px-2 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-50"
                      >
                        {copiedSnippetId === 'api-key' ? (
                          <>
                            <Check className="h-3 w-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy Key
                          </>
                        )}
                      </button>
                    </div>
                    {keyGenerated && (
                      <p className="text-[10px] leading-tight text-amber-700">
                        Save this key — it won&apos;t be shown again after closing.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={generateApiKey}
                      disabled={isGenerating}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Generate Key
                    </button>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase">
                        <span className="bg-muted/10 px-2 text-muted-foreground">or paste</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="ap_..."
                      className="w-full rounded-lg border border-border bg-white px-2.5 py-1.5 font-mono text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                <div className="border-t border-border pt-4">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Project ID
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 rounded-md border border-border bg-white px-2 py-1.5">
                    <code className="flex-1 truncate font-mono text-[10px] text-muted-foreground">
                      {projectId}
                    </code>
                    <button
                      type="button"
                      onClick={() => copySnippet('project-id', projectId)}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted"
                    >
                      {copiedSnippetId === 'project-id' ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right content - Config */}
            <div className="flex min-h-0 flex-col overflow-hidden bg-white">
              {/* IDE Tabs */}
              <div className="border-b border-slate-200 bg-slate-50/60 px-4 py-3">
                <div className="overflow-x-auto">
                  <div className="inline-flex min-w-max rounded-lg border border-border bg-muted/20 p-1">
                    {(Object.values(guides) as Guide[]).map((guide) => (
                      <button
                        key={guide.id}
                        type="button"
                        onClick={() => setActiveGuideId(guide.id)}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                          activeGuideId === guide.id
                            ? 'bg-white text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {guide.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Guide Content */}
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="mb-3">
                  <h3 className="text-base font-semibold text-foreground">{activeGuide.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{activeGuide.description}</p>
                </div>

                <ol className="mb-4 list-decimal space-y-1 pl-4 text-xs text-foreground">
                  {activeGuide.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>

                <div className="space-y-3">
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

                {activeGuideId === 'codex' ? (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                    <PlugZap className="mr-1 inline-block h-3.5 w-3.5" />
                    In restricted sandbox environments, Codex may connect but fail to write synced instruction
                    files until filesystem permissions are granted. MCP tools still work while sync retries in
                    the background.
                  </div>
                ) : null}

                {!hasApiKey && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                    <Key className="mr-1 inline-block h-3.5 w-3.5" />
                    Generate an API key to populate the config snippets.
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
