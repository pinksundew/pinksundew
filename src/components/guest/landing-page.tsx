import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  MessageSquareText,
  PlugZap,
  Radio,
  RefreshCw,
  TerminalSquare,
  type LucideIcon,
} from 'lucide-react'
import { CLIENT_LOGOS } from '@/components/brand/client-logos'

const demoVideoSrc = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL ?? '/demo/HeroVid.mp4'

type LandingPageProps = {
  isAuthenticated?: boolean
  workspaceHref?: string | null
}

type FeatureCard = {
  title: string
  description: string
  Icon: LucideIcon
  accentClassName: string
}

const featureCards: FeatureCard[] = [
  {
    title: 'Agent sync that feels native',
    description:
      'Keep Codex, Cursor, VS Code, and other targets aligned with the same rules and project context.',
    Icon: RefreshCw,
    accentClassName: 'bg-pink-100 text-pink-800',
  },
  {
    title: 'Tasks agents can actually read',
    description:
      'Descriptions, replies, tags, status, and workflow signals stay available through the MCP bridge.',
    Icon: MessageSquareText,
    accentClassName: 'bg-cyan-100 text-cyan-800',
  },
  {
    title: 'Completion lands back on the board',
    description:
      'Agents post progress, ask for help, and move finished work into review instead of disappearing into chat.',
    Icon: ClipboardCheck,
    accentClassName: 'bg-emerald-100 text-emerald-800',
  },
]

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

function FeaturePanel({ title, description, Icon, accentClassName }: FeatureCard) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-pink-200 hover:bg-pink-50/30">
      <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg ${accentClassName}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-base font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </article>
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
    : 'Try guest board'
  const secondaryHref = isAuthenticated ? '/profile' : '/login'
  const secondaryLabel = isAuthenticated ? 'Profile' : 'Sign in'
  const helperText = isAuthenticated
    ? workspaceHref
      ? 'You are signed in. Jump straight into your workspace or manage your profile.'
      : 'You are signed in. Your profile is ready while you explore the main site.'
    : 'No account needed. The guest board creates a temporary Supabase workspace when you enter.'

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

        <div className="relative z-10 mx-auto flex min-h-[min(760px,88svh)] w-full max-w-7xl flex-col items-center px-5 pb-16 pt-10 sm:px-8 lg:pb-24">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-pink-200 bg-pink-50/50 px-3 py-1.5 text-xs font-bold uppercase text-pink-900 shadow-sm backdrop-blur">
              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
              Live board for coding agents
            </div>
            <h1 className="text-balance text-5xl font-black leading-[0.94] text-slate-950 sm:text-7xl lg:text-8xl">
              Pink Sundew
            </h1>
            <p className="mt-6 max-w-3xl text-pretty text-xl font-semibold leading-8 text-slate-900 sm:text-2xl sm:leading-9">
              The task board where your plans, agent instructions, and completion signals stay in sync.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
              Give your agent a real workspace to read from, write back to, and move through review with you.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={primaryHref}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-bold text-primary-foreground shadow-lg shadow-pink-200/80 transition hover:-translate-y-0.5 hover:bg-primary/90"
              >
                {primaryLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-slate-600">{helperText}</p>
          </div>

          <div className="mx-auto mt-16 grid w-full max-w-5xl gap-4 sm:grid-cols-3">
            {[
              ['Plan work on a board', 'Map out features and let agents pull tasks from columns.'],
              ['Post progress notes', 'Agents use MCP to reply to tasks and ask for clarity.'],
              ['Keep instructions synced', 'No more pasting context. Rules stay fresh globally.'],
            ].map(([title, description]) => (
              <div key={title} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-pink-200 hover:shadow-md">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-50/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative z-10 flex items-center gap-2 text-base font-bold text-slate-950">
                  <CheckCircle2 className="h-5 w-5 text-pink-600" aria-hidden="true" />
                  {title}
                </div>
                <p className="relative z-10 mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-16 w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200/60 bg-white/50 shadow-2xl shadow-pink-900/10 backdrop-blur-xl ring-1 ring-white/50">
            <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/60 px-4 py-3 backdrop-blur-md">
              <div className="flex gap-2">
                <div className="h-3 w-3 rounded-full bg-slate-300"></div>
                <div className="h-3 w-3 rounded-full bg-slate-300"></div>
                <div className="h-3 w-3 rounded-full bg-slate-300"></div>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200/60">
                pinksundew.com
              </div>
              <div className="w-10"></div>
            </div>
            <video
              src={demoVideoSrc}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="w-full object-cover bg-slate-50"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </section>

      <section id="agent-sync" className="bg-white px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase text-pink-700">Why it clicks</p>
            <h2 className="mt-3 text-balance text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
              One operational loop for humans and agents.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              Pink Sundew is not just a prettier task list. It is a live coordination layer for the moment
              when a coding agent needs context, status, and a way to report back.
            </p>

            <div className="mt-7 grid gap-3">
              {featureCards.map((feature) => (
                <FeaturePanel key={feature.title} {...feature} />
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-xl shadow-slate-200/70">
            <div className="rounded-md border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/25 text-primary-foreground">
                    <PlugZap className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-950">MCP Server</p>
                    <p className="text-xs font-medium text-emerald-700">Active and connected</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {syncTargets.map(({ name, Logo }) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
                    >
                      <Logo className="h-3.5 w-3.5" aria-hidden="true" />
                      {name}
                    </span>
                  ))}
                </div>
              </div>

              <div id="task-loop" className="grid gap-3 p-4 md:grid-cols-3">
                {boardColumns.map((column) => (
                  <div key={column.name} className={`rounded-lg border p-3 ${column.tone}`}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{column.name}</h3>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500">
                        {column.tasks.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {column.tasks.map((task) => (
                        <div key={task} className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                          <div className="flex items-start gap-2">
                            <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pink-700" aria-hidden="true" />
                            <p className="text-sm font-semibold leading-5 text-slate-800">{task}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 bg-slate-950 px-4 py-3 text-sm text-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <TerminalSquare className="h-4 w-4 text-pink-300" aria-hidden="true" />
                  <span className="font-semibold text-white">Agent note</span>
                  <span className="text-slate-400">Read task, synced instructions, moved result to review.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
