'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { createProject } from '@/domains/project/mutations'
import { Loader2, PlusCircle, Sparkles } from 'lucide-react'

export default function CreateProjectPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const router = useRouter()

  const [supabase] = useState(() => createClient())

  useEffect(() => {
    let isCancelled = false

    async function bootstrap() {
      setIsBootstrapping(true)

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!isCancelled) {
          setIsAuthenticated(Boolean(user))
        }
      } catch (error) {
        console.error('Failed to bootstrap project creation page', error)
        if (!isCancelled) {
          setIsAuthenticated(false)
        }
      } finally {
        if (!isCancelled) {
          setIsBootstrapping(false)
        }
      }
    }

    void bootstrap()

    return () => {
      isCancelled = true
    }
  }, [supabase])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!name.trim()) {
      setErrorMsg('Project name is required.')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setErrorMsg('Please sign in to create additional projects.')
      setLoading(false)
      return
    }

    try {
      const project = await createProject(supabase, {
        name: name.trim(),
        description: description.trim() || undefined,
        created_by: user.id,
      })

      router.push(`/${project.id}`)
      router.refresh()
    } catch (error) {
      console.error(error)
      setErrorMsg('Failed to create project. Please try again.')
      setLoading(false)
    }
  }

  if (isBootstrapping || isAuthenticated === null) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading project options
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center justify-center p-4 md:p-8">
        <div className="w-full rounded-3xl border border-border bg-white/95 p-6 shadow-sm md:p-8">
          <h1 className="text-2xl font-bold text-foreground">Sign in to create more projects</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Guest mode keeps one local board in this browser. To create and manage multiple projects,
            sign in with your account.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/login?next=/create-project"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Sign In
            </Link>
            <Link
              href="/signup?next=/create-project"
              className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Create Account
            </Link>
            <Link
              href="/guest"
              className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
            >
              Back to Guest Board
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-8">
      <div className="rounded-3xl border border-border bg-white/90 p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create a new project</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with a blank project and customize it as you go.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Workspace Setup
          </span>
        </div>

        {errorMsg ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMsg}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-muted/30 p-5">
            <div>
              <label className="block text-sm font-medium text-foreground">Project Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border border-border bg-white px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Growth Roadmap"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">Description (Optional)</label>
              <textarea
                className="mt-1 block w-full rounded-md border border-border bg-white px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="What will this project track?"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
              {loading ? 'Creating project...' : 'Create Project'}
            </button>
          </form>

          <aside className="rounded-2xl border border-border bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Project Source
            </h2>
            <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
              GitHub project import is temporarily disabled.
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              GitHub remains available for login and authentication. Project creation is currently blank-project only.
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}
