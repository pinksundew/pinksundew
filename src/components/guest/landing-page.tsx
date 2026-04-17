import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Play } from 'lucide-react'

const demoVideoSrc = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL ?? '/demo/introdemo.mp4'

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#fff7fb_0%,#f8fafc_52%,#ecfeff_100%)] text-foreground">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          <Image
            src="/favicon.ico"
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
            href="/login"
            className="rounded-md border border-border bg-white/70 px-3 py-2 text-sm font-medium text-foreground shadow-sm backdrop-blur transition-colors hover:bg-white"
          >
            Sign In
          </Link>
          <Link
            href="/guest"
            className="hidden rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:inline-flex"
          >
            Sandbox
          </Link>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-7xl flex-col justify-center px-5 pb-10 pt-3 sm:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-900 shadow-sm">
            <Play className="h-3.5 w-3.5 fill-cyan-900" />
            AI-native project board
          </div>
          <h1 className="text-balance text-5xl font-black leading-[0.95] text-slate-950 sm:text-7xl lg:text-8xl">
            Pink Sundew
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg leading-8 text-slate-700 sm:text-xl">
            Give your coding agent a live board it can read, update, and use as shared context.
          </p>
        </div>

        <div className="mx-auto mt-8 w-full max-w-6xl">
          <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-slate-950 shadow-2xl shadow-cyan-950/10">
            <video
              src={demoVideoSrc}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Pink Sundew demo showing an agent updating a board"
              className="aspect-video w-full bg-slate-950 object-cover"
            >
              Your browser does not support the video tag.
            </video>
          </div>

          <div className="mt-7 flex flex-col items-center gap-4">
            <Link
              href="/guest"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary px-7 py-3 text-base font-bold text-primary-foreground shadow-lg shadow-pink-200/70 transition hover:-translate-y-0.5 hover:bg-primary/90"
            >
              Try it live in the Sandbox
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-sm font-medium text-muted-foreground">
              No account needed. The sandbox keeps a local board in this browser.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-10 grid w-full max-w-5xl gap-3 text-sm text-slate-700 sm:grid-cols-3">
          {[
            'Plan work on a board your agent can inspect.',
            'Let agents post progress notes back to tickets.',
            'Keep instructions synced into your workspace.',
          ].map((item) => (
            <div key={item} className="border-l-2 border-primary bg-white/45 px-4 py-3 shadow-sm backdrop-blur">
              {item}
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
