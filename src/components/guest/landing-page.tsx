import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CircleDot, Link2, PlugZap, Radio } from 'lucide-react'
import { CLIENT_LOGOS } from '@/components/brand/client-logos'
import { SyncIdeOrbit } from '@/components/guest/landing-hero-graphics'
import { McpFlowGraphic } from '@/components/guest/mcp-flow-graphic'

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
    <div className="mt-8 w-full max-w-5xl text-left">
      {/*
        Single “bento” shell: one shadow, shared interior, column seam—reads as one flow
        (rules → IDEs → MCP bridge) instead of two disconnected rectangles.
      */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-100/90 via-white to-pink-50/25 p-px shadow-lg shadow-slate-300/20 ring-1 ring-white/90 sm:rounded-3xl sm:p-1 sm:shadow-xl">
        <div className="grid items-start divide-y divide-slate-200/70 min-[760px]:grid-cols-2 min-[760px]:divide-x min-[760px]:divide-y-0 min-[760px]:divide-pink-100/50">
          {/* Sync — circular vignette hugs the orbit (no aspect-square “stage”) */}
          <div className="flex w-full flex-col self-start bg-gradient-to-br from-white via-slate-50/35 to-pink-50/15">
            <div className="flex shrink-0 items-start gap-2 border-b border-slate-200/60 px-2.5 py-2 sm:gap-2.5 sm:px-3 sm:py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-pink-700 shadow-sm ring-1 ring-slate-200/50">
                <PlugZap className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div className="min-w-0 pt-px">
                <p className="text-sm font-black leading-tight text-slate-950">Sync</p>
                <p className="text-[10px] font-semibold leading-snug text-slate-600 sm:text-[11px]">
                  Same rules in Cursor, Codex, VS Code, Antigravity and more. No drift.
                </p>
              </div>
            </div>
            <div className="flex justify-center px-2 pb-2 pt-1.5 sm:px-3 sm:pb-2.5 sm:pt-2">
              <div
                className="inline-flex rounded-full p-2 shadow-sm ring-1 ring-pink-100/40 sm:p-2.5"
                style={{
                  background:
                    'radial-gradient(circle at 50% 42%, rgb(255 255 255) 0%, rgb(252 231 243 / 0.45) 52%, rgb(241 245 249 / 0.65) 100%)',
                }}
              >
                <SyncIdeOrbit className="flex items-center justify-center" />
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col self-start bg-gradient-to-bl from-white via-pink-50/20 to-slate-50/25">
            <div className="flex shrink-0 items-start gap-2 border-b border-slate-200/60 px-2.5 py-2 sm:gap-2.5 sm:px-3 sm:py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-pink-700 shadow-sm ring-1 ring-slate-200/50">
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div className="min-w-0 pt-px">
                <p className="text-sm font-black leading-tight text-slate-950">Connect</p>
                <p className="text-[10px] font-semibold leading-snug text-slate-600 sm:text-[11px]">
                  Seamlessly connect your agent to your board.
                </p>
              </div>
            </div>
            <div className="w-full px-2 pb-2 pt-1.5 sm:px-3 sm:pb-2.5 sm:pt-2">
              <McpFlowGraphic />
            </div>
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
      className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70"
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
          <div className="mx-auto w-full max-w-5xl">
            <WorkflowPreview />
          </div>
        </div>

        <footer className="relative z-10 flex min-h-44 items-center justify-center px-5 pb-10 text-xs font-black uppercase tracking-[0.24em] text-slate-300">
          Pink Sundew
        </footer>
      </section>
    </main>
  )
}
