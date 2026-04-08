'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, PlugZap, X } from 'lucide-react'

type ConnectMcpModalProps = {
  isOpen: boolean
  onClose: () => void
}

type GuideId = 'vscode' | 'claude-code' | 'codex' | 'antigravity'

type Guide = {
  id: GuideId
  label: string
  title: string
  description: string
  steps: string[]
  snippets: Array<{
    id: string
    label: string
    language: string
    code: string
  }>
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

export function ConnectMcpModal({ isOpen, onClose }: ConnectMcpModalProps) {
  const [activeGuideId, setActiveGuideId] = useState<GuideId>('vscode')
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null)
  const [appUrl, setAppUrl] = useState('https://your-agentplanner.example.com')

  useEffect(() => {
    if (typeof window === 'undefined') return
    setAppUrl(window.location.origin)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setCopiedSnippetId(null)
      setActiveGuideId('vscode')
    }
  }, [isOpen])

  const guides = useMemo<Record<GuideId, Guide>>(() => {
    const envSnippet = [
      `AGENTPLANNER_URL=${appUrl}`,
      'AGENTPLANNER_API_KEY=ap_your_generated_key',
      'AGENTPLANNER_ALLOW_TASK_COMPLETION=false',
    ].join('\n')

    return {
      vscode: {
        id: 'vscode',
        label: 'VSCode',
        title: 'Connect In VS Code',
        description:
          'Use workspace MCP settings and an env file so keys stay out of the checked-in configuration.',
        steps: [
          'Create an API key in Profile -> API Keys.',
          'Create .vscode/.env.mcp and paste the env values.',
          'Add the agentplanner server entry in .vscode/mcp.json under servers.',
          'Reload the VS Code window, then open Copilot Chat and confirm MCP tools appear.',
        ],
        snippets: [
          {
            id: 'vscode-env',
            label: '.vscode/.env.mcp',
            language: 'env',
            code: envSnippet,
          },
          {
            id: 'vscode-config',
            label: '.vscode/mcp.json (server entry)',
            language: 'json',
            code: [
              '{',
              '  "servers": {',
              '    "agentplanner": {',
              '      "type": "stdio",',
              '      "command": "npx",',
              '      "args": ["-y", "@saltedroads/agentplanner-mcp"],',
              '      "envFile": "${workspaceFolder}/.vscode/.env.mcp"',
              '    }',
              '  }',
              '}',
            ].join('\n'),
          },
        ],
      },
      'claude-code': {
        id: 'claude-code',
        label: 'Claude Code',
        title: 'Connect In Claude Code',
        description:
          'Add a project-scoped stdio server via the Claude CLI so the whole repo can share the MCP configuration.',
        steps: [
          'Create an API key in Profile -> API Keys.',
          'Run the add command from your project root.',
          'In Claude Code, run /mcp to verify the server is connected.',
        ],
        snippets: [
          {
            id: 'claude-command',
            label: 'CLI command',
            language: 'bash',
            code: [
              'claude mcp add --transport stdio --scope project \\\\',
              `  --env AGENTPLANNER_URL=${appUrl} \\\\`,
              '  --env AGENTPLANNER_API_KEY=ap_your_generated_key \\\\',
              '  --env AGENTPLANNER_ALLOW_TASK_COMPLETION=false \\\\',
              '  agentplanner -- npx -y @saltedroads/agentplanner-mcp',
            ].join('\n'),
          },
          {
            id: 'claude-json',
            label: '.mcp.json (project scope)',
            language: 'json',
            code: [
              '{',
              '  "mcpServers": {',
              '    "agentplanner": {',
              '      "type": "stdio",',
              '      "command": "npx",',
              '      "args": ["-y", "@saltedroads/agentplanner-mcp"],',
              '      "env": {',
              `        "AGENTPLANNER_URL": "${appUrl}",`,
              '        "AGENTPLANNER_API_KEY": "ap_your_generated_key",',
              '        "AGENTPLANNER_ALLOW_TASK_COMPLETION": "false"',
              '      }',
              '    }',
              '  }',
              '}',
            ].join('\n'),
          },
        ],
      },
      codex: {
        id: 'codex',
        label: 'Codex',
        title: 'Connect In Codex',
        description:
          'Codex supports MCP in both CLI and IDE through codex mcp commands or config.toml.',
        steps: [
          'Create an API key in Profile -> API Keys.',
          'Add the server with codex mcp add (fastest) or paste the TOML block into ~/.codex/config.toml.',
          'Open Codex and run /mcp in the UI or codex mcp list in terminal to verify.',
        ],
        snippets: [
          {
            id: 'codex-command',
            label: 'CLI command',
            language: 'bash',
            code: [
              'codex mcp add agentplanner \\\\',
              `  --env AGENTPLANNER_URL=${appUrl} \\\\`,
              '  --env AGENTPLANNER_API_KEY=ap_your_generated_key \\\\',
              '  --env AGENTPLANNER_ALLOW_TASK_COMPLETION=false \\\\',
              '  -- npx -y @saltedroads/agentplanner-mcp',
            ].join('\n'),
          },
          {
            id: 'codex-toml',
            label: '~/.codex/config.toml',
            language: 'toml',
            code: [
              '[mcp_servers.agentplanner]',
              'command = "npx"',
              'args = ["-y", "@saltedroads/agentplanner-mcp"]',
              '',
              '[mcp_servers.agentplanner.env]',
              `AGENTPLANNER_URL = "${appUrl}"`,
              'AGENTPLANNER_API_KEY = "ap_your_generated_key"',
              'AGENTPLANNER_ALLOW_TASK_COMPLETION = "false"',
            ].join('\n'),
          },
        ],
      },
      antigravity: {
        id: 'antigravity',
        label: 'Antigravity',
        title: 'Connect In Antigravity',
        description:
          'Use a local stdio MCP server entry with the same command, args, and env values used in this project.',
        steps: [
          'Create an API key in Profile -> API Keys.',
          'Open Antigravity MCP settings and add a new local/stdio server named agentplanner.',
          'Paste the command, args, and env block below, then reconnect the workspace.',
        ],
        snippets: [
          {
            id: 'antigravity-json',
            label: 'Server config payload',
            language: 'json',
            code: [
              '{',
              '  "name": "agentplanner",',
              '  "type": "stdio",',
              '  "command": "npx",',
              '  "args": ["-y", "@saltedroads/agentplanner-mcp"],',
              '  "env": {',
              `    "AGENTPLANNER_URL": "${appUrl}",`,
              '    "AGENTPLANNER_API_KEY": "ap_your_generated_key",',
              '    "AGENTPLANNER_ALLOW_TASK_COMPLETION": "false"',
              '  }',
              '}',
            ].join('\n'),
          },
        ],
      },
    }
  }, [appUrl])

  const activeGuide = guides[activeGuideId]

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
          className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground">
                <PlugZap className="h-3.5 w-3.5" /> Connect
              </div>
              <h2 className="mt-2 text-xl font-semibold text-foreground">Connect MCP Server</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick your IDE or agent and use the exact server settings for AgentPlanner MCP.
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

          <div className="border-b border-border bg-background px-5 pt-4">
            <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-primary-foreground">
              Generate an API key first in{' '}
              <Link href="/profile" className="font-semibold underline underline-offset-2">
                Profile → API Keys
              </Link>
              . Replace ap_your_generated_key in every snippet below.
            </div>

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

            <div className="grid gap-4 lg:grid-cols-2">
              {activeGuide.snippets.map((snippet) => (
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
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
