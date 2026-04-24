import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Link2,
  MessageSquareText,
  PlugZap,
  Radio,
  RefreshCw,
} from 'lucide-react'
import { CLIENT_LOGOS } from '@/components/brand/client-logos'

const demoVideoSrc = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL ?? '/demo/HeroVid.mp4'

type LandingPageProps = {
  isAuthenticated?: boolean
  workspaceHref?: string | null
}

const boardColumns = [
  {
    name: 'Todo',
    tone: 'border-slate-200 bg-white',
    tasks: ['Write agent handoff', 'Refresh homepage copy'],
  },
  {
    name: 'In progress',
    tone: 'border-amber-200 bg-amber-50',
    tasks: ['Agent is syncing instructions'],
  },
  {
    name: 'Review',
    tone: 'border-pink-200 bg-pink-50',
    tasks: ['Task completion posted'],
  },
]

const syncTargets = [
  { name: 'Codex', Logo: CLIENT_LOGOS.codex },
  { name: 'Cursor', Logo: CLIENT_LOGOS.cursor },
  { name: 'VS Code', Logo: CLIENT_LOGOS.vscode },
  { name: 'Antigravity', Logo: CLIENT_LOGOS.antigravity },
]

function HeroWorkflowCards() {
  return (
    <div className="mt-8 grid w-full max-w-5xl gap-3 text-left min-[760px]:grid-cols-3">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
        <div className="flex items-center gap-3 border-b border-slate-200/80 bg-gradient-to-b from-slate-100/40 to-slate-50/90 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-pink-700 shadow-sm ring-1 ring-slate-200/60">
            <PlugZap className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-base font-black leading-tight text-slate-950">One ruleset</p>
            <p className="text-xs font-semibold text-slate-600">Synced for every agent &amp; IDE</p>
          </div>
        </div>
        <div className="space-y-2 p-3.5 sm:p-4">
          {['AGENTS.md', 'copilot-instructions.md'].map((file) => (
            <div key={file} className="flex items-center justify-between rounded-lg border border-pink-100/90 bg-pink-50/70 px-3 py-2">
              <span className="text-xs font-semibold text-slate-700">{file}</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-pink-700" aria-hidden="true" />
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {syncTargets.map(({ name, Logo }) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-600"
              >
                <Logo className="h-3 w-3 opacity-80" aria-hidden="true" />
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
        <div className="flex items-center gap-3 border-b border-slate-200/80 bg-gradient-to-b from-slate-100/40 to-slate-50/90 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-pink-700 shadow-sm ring-1 ring-slate-200/60">
            <Link2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-base font-black leading-tight text-slate-950">MCP link</p>
            <p className="text-xs font-semibold text-slate-600">Board and agent stay wired</p>
          </div>
        </div>
        <div className="p-3.5 sm:p-4">
          <div className="rounded-xl border border-pink-100/90 bg-pink-50/70 p-3">
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-bold text-slate-800">
              <span className="rounded-md border border-slate-200/80 bg-white px-2 py-1">Board</span>
              <span className="text-slate-400" aria-hidden="true">
                ↔
              </span>
              <span className="inline-flex items-center gap-0.5 rounded-md border border-pink-200 bg-white px-2 py-1 text-pink-800">
                <span className="text-[9px] font-black uppercase tracking-wide text-pink-600">MCP</span>
              </span>
              <span className="text-slate-400" aria-hidden="true">
                ↔
              </span>
              <span className="rounded-md border border-slate-200/80 bg-white px-2 py-1">Agent</span>
            </div>
            <p className="mt-2.5 text-center text-[11px] font-medium leading-relaxed text-slate-600">
              Your tool pulls work from the board and reports back without paste-hunting.
            </p>
            <div className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-dashed border-pink-200/60 bg-white/60 px-2 py-1.5">
              <CircleDot className="h-3.5 w-3.5 shrink-0 text-pink-700" aria-hidden="true" />
              <p className="text-[11px] font-bold text-slate-800">E.g. “Build onboarding guide” in todo</p>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
        <div className="flex items-center gap-3 border-b border-slate-200/80 bg-gradient-to-b from-slate-100/40 to-slate-50/90 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-pink-700 shadow-sm ring-1 ring-slate-200/60">
            <MessageSquareText className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-base font-black leading-tight text-slate-950">Review</p>
            <p className="text-xs font-semibold text-slate-600">Progress lands on the board</p>
          </div>
        </div>
        <div className="p-3.5 sm:p-4">
          <div className="rounded-xl border border-pink-100/90 bg-pink-50/70 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black uppercase text-pink-700 shadow-sm">
                Ready for review
              </span>
              <RefreshCw className="h-3.5 w-3.5 text-pink-700" aria-hidden="true" />
            </div>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-700">
              Validated MCP reads, task updates, and sync state.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function WorkflowPreview() {
  return (
    <div
      id="agent-sync"
      className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70"
    >
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/25 text-primary-foreground">
            <PlugZap className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-black text-slate-950">MCP Server</p>
            <p className="text-sm font-semibold text-emerald-700">Active and connected</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {syncTargets.map(({ name, Logo }) => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700"
            >
              <Logo className="h-3.5 w-3.5" aria-hidden="true" />
              {name}
            </span>
          ))}
        </div>
      </div>

      <div id="task-loop" className="grid gap-2.5 bg-slate-50/70 p-2.5 min-[560px]:grid-cols-3 sm:gap-3 sm:p-3">
        {boardColumns.map((column) => (
          <div key={column.name} className={`rounded-xl border p-2.5 sm:p-3 ${column.tone}`}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-black text-slate-900">{column.name}</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500 shadow-sm">
                {column.tasks.length}
              </span>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              {column.tasks.map((task) => (
                <div key={task} className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
                  <div className="flex items-start gap-2">
                    <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pink-700" aria-hidden="true" />
                    <p className="text-sm font-bold leading-snug text-slate-800">{task}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}

export function LandingPage({
  isAuthenticated = false,
  workspaceHref = null,
}: LandingPageProps) {
  const primaryHref = isAuthenticated ? workspaceHref ?? '/profile' : '/guest'
  const primaryLabel = isAuthenticated
    ? workspaceHref
      ? 'Open workspace'
      : 'Open profile'
    : 'Try sandbox'
  const secondaryHref = isAuthenticated ? '/profile' : '/login'
  const secondaryLabel = isAuthenticated ? 'Profile' : 'Sign in'

  return (
    <main className="min-h-screen bg-slate-50 text-foreground">
      <section className="relative isolate overflow-hidden border-b border-pink-100 bg-slate-50">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:24px_24px] opacity-50" />

        <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
            <Image
              src="/favicon.png"
              alt="Pink Sundew logo"
              width={30}
              height={30}
              className="rounded-md"
              priority
            />
            <span>Pink Sundew</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href={secondaryHref}
              className="rounded-md border border-slate-200 bg-white/75 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur transition-colors hover:bg-white"
            >
              {secondaryLabel}
            </Link>
            {!isAuthenticated ? (
              <Link
                href="/guest"
                className="hidden rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:inline-flex"
              >
                Sandbox
              </Link>
            ) : null}
          </div>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-5 pb-12 pt-10 sm:px-8 lg:pb-16">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-pink-200 bg-pink-50/50 px-3 py-1.5 text-xs font-bold uppercase text-pink-900 shadow-sm backdrop-blur">
              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
              Live board for coding agents
            </div>
            <h1 className="text-balance text-5xl font-black leading-[0.94] text-slate-950 sm:text-7xl lg:text-8xl">
              Pink Sundew
            </h1>

            <HeroWorkflowCards />

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={primaryHref}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-bold text-primary-foreground shadow-lg shadow-pink-200/80 transition hover:-translate-y-0.5 hover:bg-primary/90"
              >
                {primaryLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-12 w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200/60 bg-white/50 shadow-2xl shadow-pink-900/10 backdrop-blur-xl ring-1 ring-white/50">
            <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/60 px-4 py-3 backdrop-blur-md">
              <div className="flex gap-2">
                <div className="h-3 w-3 rounded-full bg-slate-300" />
                <div className="h-3 w-3 rounded-full bg-slate-300" />
                <div className="h-3 w-3 rounded-full bg-slate-300" />
              </div>
              <div className="flex items-center gap-2 rounded-md bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200/60">
                pinksundew.com
              </div>
              <div className="w-10" />
            </div>
            <video
              src={demoVideoSrc}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="w-full bg-slate-50 object-cover"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:py-16">
          <WorkflowPreview />
        </div>

        <footer className="relative z-10 flex min-h-44 items-center justify-center px-5 pb-10 text-xs font-black uppercase tracking-[0.24em] text-slate-300">
          Pink Sundew
        </footer>
      </section>
    </main>
  )
}
