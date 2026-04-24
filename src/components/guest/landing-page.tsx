import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  FileText,
  Kanban,
  ListChecks,
  MessageSquareText,
  PlugZap,
  Radio,
  RefreshCw,
  Sparkles,
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

type TutorialStep = {
  title: string
  description: string
  target: string
  Icon: LucideIcon
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

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Start with the shared board',
    description:
      'Welcome guests and new users with a tiny tour of the task columns, add-task action, and project context.',
    target: 'Board surface',
    Icon: Kanban,
  },
  {
    title: 'Show the agent connection',
    description:
      'Highlight MCP setup and instruction sync so users understand how their coding agent sees the project.',
    target: 'Agent sync card',
    Icon: PlugZap,
  },
  {
    title: 'Open a task like an agent would',
    description:
      'Point at title, description, replies, priority, and tags as the information the agent reads before work.',
    target: 'Task detail modal',
    Icon: FileText,
  },
  {
    title: 'Finish with review signals',
    description:
      'Demonstrate progress notes, needs-help, and ready-for-review as the completion loop for agent work.',
    target: 'Workflow signal',
    Icon: BadgeCheck,
  },
]

const boardColumns = [
  {
    name: 'Todo',
    tone: 'border-slate-200 bg-white',
    tasks: ['Wire guest tutorial', 'Refresh homepage copy'],
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

function TutorialPlanStep({ title, description, target, Icon }: TutorialStep) {
  return (
    <li className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-300">{description}</p>
          <p className="mt-3 inline-flex rounded-full border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300">
            {target}
          </p>
        </div>
      </div>
    </li>
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
      <section className="relative isolate overflow-hidden border-b border-pink-100 bg-white">
        <video
          src={demoVideoSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full object-cover opacity-30"
        >
          Your browser does not support the video tag.
        </video>
        <div className="absolute inset-0 -z-10 bg-white/78" />

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

          <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 md:flex">
            <a href="#agent-sync" className="transition-colors hover:text-slate-950">
              Agent sync
            </a>
            <a href="#task-loop" className="transition-colors hover:text-slate-950">
              Task loop
            </a>
            <a href="#tutorial" className="transition-colors hover:text-slate-950">
              Tutorial
            </a>
          </nav>

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

        <div className="relative z-10 mx-auto flex min-h-[min(760px,88svh)] w-full max-w-7xl flex-col justify-center px-5 pb-12 pt-6 sm:px-8 lg:pb-16">
          <div className="max-w-4xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white/82 px-3 py-1.5 text-xs font-bold uppercase text-pink-900 shadow-sm backdrop-blur">
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

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={primaryHref}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-bold text-primary-foreground shadow-lg shadow-pink-200/80 transition hover:-translate-y-0.5 hover:bg-primary/90"
              >
                {primaryLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href="#tutorial"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white/80 px-6 py-3 text-base font-bold text-slate-900 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
              >
                See first-minute tour
                <ListChecks className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-slate-600">{helperText}</p>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-3">
            {[
              ['Agent sync', 'Instructions and clients stay current.'],
              ['Task reading', 'Agents see scope, replies, tags, and status.'],
              ['Review loop', 'Finished work returns as board signals.'],
            ].map(([title, description]) => (
              <div key={title} className="rounded-lg border border-white/70 bg-white/72 p-4 shadow-sm backdrop-blur">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
                  <CheckCircle2 className="h-4 w-4 text-pink-700" aria-hidden="true" />
                  {title}
                </div>
                <p className="mt-2 text-sm leading-5 text-slate-600">{description}</p>
              </div>
            ))}
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

      <section id="tutorial" className="bg-slate-950 px-5 py-16 text-white sm:px-8 lg:py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase text-pink-300">Guest and new-user tutorial</p>
            <h2 className="mt-3 text-balance text-3xl font-black leading-tight sm:text-5xl">
              A quick first-minute tour, focused on the agent loop.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-300">
              The tour should appear after a guest board opens for the first time, and once after signup for
              new authenticated users. Keep it short, skippable, and centered on the features that make the
              board different.
            </p>
            <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Sparkles className="h-4 w-4 text-pink-300" aria-hidden="true" />
                Tour rules
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                <li>Show once per browser for guests, with a replay option in help or profile.</li>
                <li>Use custom in-app overlays, never browser alerts or confirm dialogs.</li>
                <li>End by inviting users to create a sample task or connect their agent.</li>
              </ul>
            </div>
          </div>

          <ol className="grid gap-3 md:grid-cols-2">
            {tutorialSteps.map((step) => (
              <TutorialPlanStep key={step.title} {...step} />
            ))}
          </ol>
        </div>
      </section>
    </main>
  )
}
