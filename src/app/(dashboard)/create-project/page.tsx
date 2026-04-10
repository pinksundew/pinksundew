'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { createProject } from '@/domains/project/mutations'
import { GitBranch, Loader2, PlusCircle, Sparkles } from 'lucide-react'

type GitHubRepo = {
  id: number
  full_name: string
  description: string | null
}

type CreationMode = 'blank' | 'github'

export default function CreateProjectPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [selectedRepoId, setSelectedRepoId] = useState('')
  const [creationMode, setCreationMode] = useState<CreationMode>('blank')
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [hasGithubAccess, setHasGithubAccess] = useState(false)
  const [isConnectingGithub, setIsConnectingGithub] = useState(false)
  const [isLoadingGithubRepos, setIsLoadingGithubRepos] = useState(false)
  const [githubNotice, setGithubNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const router = useRouter()

  const [supabase] = useState(() => createClient())

  const handleConnectGithub = useCallback(async () => {
    if (typeof window === 'undefined') {
      return
    }

    setIsConnectingGithub(true)
    setGithubNotice(null)

    const callbackUrl = new URL('/callback', window.location.origin)
    callbackUrl.searchParams.set('next', '/create-project')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: callbackUrl.toString(),
        scopes: 'repo',
      },
    })

    if (error) {
      setIsConnectingGithub(false)
      setGithubNotice('Unable to start GitHub authorization. Please try again.')
    }
  }, [supabase])

  const loadGithubRepos = useCallback(async (providerToken: string) => {
    setIsLoadingGithubRepos(true)

    try {
      const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=12', {
        headers: { Authorization: `Bearer ${providerToken}` },
      })

      if (!response.ok) {
        setHasGithubAccess(false)
        setRepos([])
        setSelectedRepoId('')
        setCreationMode('blank')
        setGithubNotice(
          response.status === 401 || response.status === 403
            ? 'Your GitHub access token expired. Click Import from GitHub to reconnect.'
            : 'Unable to load repositories from GitHub right now. Try again.'
        )
        return false
      }

      const payload = (await response.json()) as unknown
      if (!Array.isArray(payload)) {
        setRepos([])
        setSelectedRepoId('')
        setCreationMode('github')
        setGithubNotice('GitHub connected, but no repositories were returned for this account.')
        return true
      }

      const normalizedRepos = payload.filter((item): item is GitHubRepo => {
        if (!item || typeof item !== 'object') {
          return false
        }

        const record = item as Partial<GitHubRepo>
        return (
          typeof record.id === 'number' &&
          typeof record.full_name === 'string' &&
          (typeof record.description === 'string' || record.description === null)
        )
      })

      setHasGithubAccess(true)
      setRepos(normalizedRepos)
      setSelectedRepoId('')
      setGithubNotice(
        normalizedRepos.length > 0
          ? null
          : 'GitHub connected, but no recent repositories were found. You can still type a custom project name.'
      )
      setCreationMode('github')
      return true
    } catch (error) {
      console.error('Failed to load GitHub repositories', error)
      setHasGithubAccess(false)
      setRepos([])
      setSelectedRepoId('')
      setCreationMode('blank')
      setGithubNotice('Unable to reach GitHub right now. Click Import from GitHub to retry.')
      return false
    } finally {
      setIsLoadingGithubRepos(false)
    }
  }, [])

  const syncGithubImportState = useCallback(async (options?: { autoConnectIfMissingToken?: boolean }) => {
    const autoConnectIfMissingToken = options?.autoConnectIfMissingToken ?? false

    const [{ data: userData }, { data: sessionData }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.getSession(),
    ])

    const user = userData.user
    if (!user) {
      setIsAuthenticated(false)
      setHasGithubAccess(false)
      setRepos([])
      setSelectedRepoId('')
      setCreationMode('blank')
      return false
    }

    setIsAuthenticated(true)

    const hasGithubIdentity = (user.identities ?? []).some((identity) => identity.provider === 'github')
    let providerToken = sessionData.session?.provider_token ?? null

    if (!providerToken && hasGithubIdentity) {
      const { data: refreshedSessionData } = await supabase.auth.refreshSession()
      providerToken = refreshedSessionData.session?.provider_token ?? null
    }

    if (!providerToken) {
      setHasGithubAccess(false)
      setRepos([])
      setSelectedRepoId('')
      setCreationMode('blank')
      setGithubNotice(
        hasGithubIdentity
          ? 'GitHub is linked but needs a fresh authorization. Click Import from GitHub.'
          : 'Connect GitHub to import repositories into your project setup.'
      )

      if (autoConnectIfMissingToken) {
        await handleConnectGithub()
      }

      return false
    }

    return loadGithubRepos(providerToken)
  }, [handleConnectGithub, loadGithubRepos, supabase])

  useEffect(() => {
    let isCancelled = false

    async function bootstrap() {
      setIsBootstrapping(true)

      try {
        if (isCancelled) {
          return
        }

        await syncGithubImportState()
      } catch (error) {
        console.error('Failed to bootstrap project creation page', error)
        if (!isCancelled) {
          setHasGithubAccess(false)
          setRepos([])
          setSelectedRepoId('')
          setCreationMode('blank')
          setGithubNotice('Unable to reach GitHub right now. Reconnect GitHub and try again.')
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
  }, [syncGithubImportState])

  const handleGithubImportClick = async () => {
    if (isConnectingGithub || isLoadingGithubRepos) {
      return
    }

    if (hasGithubAccess) {
      await syncGithubImportState()
      return
    }

    await syncGithubImportState({ autoConnectIfMissingToken: true })
  }

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

  const selectRepo = (repo: GitHubRepo) => {
    setCreationMode('github')
    setSelectedRepoId(String(repo.id))
    setName(repo.full_name)
    setDescription(repo.description || `Task board for ${repo.full_name}`)
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
              Start blank or bootstrap from a GitHub repository.
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
                placeholder={creationMode === 'github' ? 'owner/repo' : 'e.g. Growth Roadmap'}
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
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={() => setCreationMode('blank')}
                className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                  creationMode === 'blank'
                    ? 'border-primary/50 bg-primary/10 text-primary-foreground'
                    : 'border-border text-foreground hover:bg-muted'
                }`}
              >
                Blank project
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleGithubImportClick()
                }}
                disabled={isConnectingGithub || isLoadingGithubRepos}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                  creationMode === 'github' && hasGithubAccess
                    ? 'border-primary/50 bg-primary/10 text-primary-foreground'
                    : 'border-border text-foreground hover:bg-muted'
                } ${(isConnectingGithub || isLoadingGithubRepos) ? 'cursor-wait opacity-70' : ''}`}
              >
                {(isConnectingGithub || isLoadingGithubRepos) ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
                {isConnectingGithub
                  ? 'Connecting GitHub...'
                  : isLoadingGithubRepos
                    ? 'Loading Repositories...'
                  : hasGithubAccess
                    ? 'Import from GitHub'
                    : 'Import from GitHub (Connect)'}
              </button>
            </div>

            {!hasGithubAccess ? (
              <div className="mt-4 rounded-lg border border-border bg-muted/40 px-3 py-3">
                <p className="text-xs text-muted-foreground">
                  {githubNotice ??
                    'GitHub import appears here when your current session includes a GitHub provider token.'}
                </p>
              </div>
            ) : null}

            {hasGithubAccess && creationMode === 'github' ? (
              <div className="mt-4 space-y-3">
                {repos.length === 0 ? (
                  <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    No recent repositories found. You can still type a project name manually.
                  </p>
                ) : (
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Repository
                    </label>
                    <select
                      value={selectedRepoId}
                      onChange={(event) => {
                        const nextRepoId = event.target.value
                        setSelectedRepoId(nextRepoId)

                        const repo = repos.find((candidate) => String(candidate.id) === nextRepoId)
                        if (repo) {
                          selectRepo(repo)
                        }
                      }}
                      className="block w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select a repository to prefill project details</option>
                      {repos.map((repo) => (
                        <option key={repo.id} value={String(repo.id)}>
                          {repo.full_name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Pick a repository from the dropdown, or leave it blank and type a custom project name.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Give your project a name and start organizing tasks right away.
              </p>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
