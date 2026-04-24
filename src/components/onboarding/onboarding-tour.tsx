'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Check,
  Copy,
  ListChecks,
  Minimize2,
  PenLine,
  PlugZap,
  RefreshCw,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react'
import posthog from 'posthog-js'

type OnboardingTourProps = {
  projectId: string
  viewerId?: string | null
  isAnonymousUser: boolean
  taskCount: number
  isSuspended?: boolean
  onOpenCreateTask: () => void
  onOpenConnect: () => void
  onOpenInstructions: () => void
}

type StoredTourState = {
  completedStepIds?: string[]
  dismissed?: boolean
}

type DashboardStatusSnapshot = {
  hasConnected: boolean
  isActive: boolean
  hasSynced: boolean
}

const TOUR_VERSION = 'agent-loop-v3'

export const SHOW_ONBOARDING_GUIDE_EVENT = 'pinksundew:show-onboarding-guide'

type AutoCompleteKey = 'hasTask' | 'hasConnected' | 'hasSynced'

type TourStep = {
  id: string
  title: string
  description: string
  Icon: LucideIcon
  action?: () => void
  actionLabel?: string
  autoCompleteKey?: AutoCompleteKey
}

const AGENT_PROMPT_TEMPLATE =
  'Look at my Pink Sundew board and start working through the open tasks. Mark anything you pick up as in progress and move it to review when finished.'

function readStoredTourState(storageKey: string): StoredTourState | null {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      return null
    }

    return JSON.parse(raw) as StoredTourState
  } catch {
    return null
  }
}

function writeStoredTourState(storageKey: string, state: StoredTourState) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    // Storage may be unavailable in private browsing; the tour still works in memory.
  }
}

export function OnboardingTour({
  projectId,
  viewerId,
  isAnonymousUser,
  taskCount,
  isSuspended = false,
  onOpenCreateTask,
  onOpenConnect,
  onOpenInstructions,
}: OnboardingTourProps) {
  // Per-user storage so completing the guide once hides it on every project.
  const storageKey = useMemo(() => {
    const audience = isAnonymousUser ? 'guest' : 'user'
    const identity = viewerId ?? projectId
    return `pinksundew:onboarding:${TOUR_VERSION}:${audience}:${identity}`
  }, [isAnonymousUser, projectId, viewerId])

  const [isReady, setIsReady] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [completedStepIds, setCompletedStepIds] = useState<Set<string>>(
    () => new Set()
  )
  const [isDismissed, setIsDismissed] = useState(false)
  const [status, setStatus] = useState<DashboardStatusSnapshot>({
    hasConnected: false,
    isActive: false,
    hasSynced: false,
  })
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')

  const steps = useMemo<TourStep[]>(
    () => [
      {
        id: 'create-task',
        title: 'Add your first task',
        description: 'Drop in something concrete an agent could pick up.',
        Icon: PenLine,
        action: onOpenCreateTask,
        actionLabel: 'Add task',
        autoCompleteKey: 'hasTask',
      },
      {
        id: 'connect-agent',
        title: 'Connect your agent',
        description: 'Run MCP setup so Codex, Cursor, or VS Code can see this board.',
        Icon: PlugZap,
        action: onOpenConnect,
        actionLabel: 'Open setup',
        autoCompleteKey: 'hasConnected',
      },
      {
        id: 'sync-instructions',
        title: 'Sync project instructions',
        description: 'Pick the rule files your agent should pull when this project changes.',
        Icon: RefreshCw,
        action: onOpenInstructions,
        actionLabel: 'Manage sync',
        autoCompleteKey: 'hasSynced',
      },
      {
        id: 'start-working',
        title: 'Tell your agent to start working',
        description:
          'Ask your AI to read this board and pick up open tasks — it will report back here as it works.',
        Icon: Sparkles,
      },
    ],
    [onOpenConnect, onOpenCreateTask, onOpenInstructions]
  )

  const totalSteps = steps.length
  const completedCount = completedStepIds.size
  const isComplete = completedCount === totalSteps
  const guideLabel = isAnonymousUser ? 'Guest guide' : 'Get started'

  const persistState = useCallback(
    (nextState: StoredTourState) => {
      writeStoredTourState(storageKey, nextState)
    },
    [storageKey]
  )

  useEffect(() => {
    const loadTimeout = window.setTimeout(() => {
      const storedState = readStoredTourState(storageKey)
      const nextCompleted = new Set<string>()
      storedState?.completedStepIds?.forEach((stepId) => {
        nextCompleted.add(stepId)
      })

      const nextDismissed = Boolean(storedState?.dismissed)

      setCompletedStepIds(nextCompleted)
      setIsDismissed(nextDismissed)
      setIsExpanded(!nextDismissed)
      setIsReady(true)

      if (!nextDismissed) {
        posthog.capture('onboarding_tour_started', {
          audience: isAnonymousUser ? 'guest' : 'authenticated',
          project_id: projectId,
        })
      }
    }, 0)

    return () => {
      window.clearTimeout(loadTimeout)
    }
  }, [isAnonymousUser, projectId, storageKey])

  // Listen for explicit "show guide" requests from elsewhere in the app
  // (e.g. project settings).
  useEffect(() => {
    if (!isReady) return

    const handleShowRequest = () => {
      setIsDismissed(false)
      setIsExpanded(true)
      persistState({
        completedStepIds: Array.from(completedStepIds),
        dismissed: false,
      })
      posthog.capture('onboarding_tour_started', {
        audience: isAnonymousUser ? 'guest' : 'authenticated',
        project_id: projectId,
        replay: true,
      })
    }

    window.addEventListener(SHOW_ONBOARDING_GUIDE_EVENT, handleShowRequest)
    return () => {
      window.removeEventListener(SHOW_ONBOARDING_GUIDE_EVENT, handleShowRequest)
    }
  }, [completedStepIds, isAnonymousUser, isReady, persistState, projectId])

  // Poll dashboard status so we can auto-complete connect/sync steps.
  useEffect(() => {
    if (!isReady || isDismissed || isAnonymousUser) {
      return
    }

    let isCancelled = false
    const fetchStatus = async () => {
      try {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/dashboard-status`,
          { cache: 'no-store' }
        )
        if (!response.ok) return
        const data = await response.json()
        if (isCancelled) return

        const lastConnectedAt = data?.mcp?.lastConnectedAt as string | null
        const lastSetupAt = data?.mcp?.lastSetupAt as string | null
        const activeCount = Array.isArray(data?.mcp?.activeClients)
          ? data.mcp.activeClients.length
          : 0

        // "First successful sync" = real MCP traffic has happened
        // (an agent actually called the bridge), not just CLI setup.
        const hasRealMcpTraffic = Boolean(
          activeCount > 0 ||
            (lastConnectedAt &&
              lastSetupAt &&
              new Date(lastConnectedAt).getTime() >
                new Date(lastSetupAt).getTime()) ||
            (lastConnectedAt && !lastSetupAt)
        )

        setStatus({
          hasConnected: Boolean(data?.mcp?.hasConnected),
          isActive: Boolean(data?.mcp?.isActive),
          hasSynced: hasRealMcpTraffic,
        })
      } catch {
        // Silent failure — auto-completion is a nice-to-have.
      }
    }

    void fetchStatus()
    const interval = window.setInterval(fetchStatus, 12_000)

    return () => {
      isCancelled = true
      window.clearInterval(interval)
    }
  }, [isAnonymousUser, isDismissed, isReady, projectId])

  // Auto-complete steps based on observable signals.
  useEffect(() => {
    if (!isReady) return

    const signals: Record<AutoCompleteKey, boolean> = {
      hasTask: taskCount > 0,
      hasConnected: status.hasConnected,
      hasSynced: status.hasSynced,
    }

    const additions: string[] = []
    steps.forEach((step) => {
      if (!step.autoCompleteKey) return
      if (signals[step.autoCompleteKey] && !completedStepIds.has(step.id)) {
        additions.push(step.id)
      }
    })

    if (additions.length === 0) return

    setCompletedStepIds((previous) => {
      const next = new Set(previous)
      additions.forEach((id) => next.add(id))
      persistState({
        completedStepIds: Array.from(next),
        dismissed: isDismissed,
      })
      return next
    })
  }, [
    completedStepIds,
    isDismissed,
    isReady,
    persistState,
    status.hasConnected,
    status.hasSynced,
    steps,
    taskCount,
  ])

  // When all steps are done, auto-hide the guide entirely.
  useEffect(() => {
    if (!isReady || isDismissed || !isComplete) {
      return
    }

    const dismissTimer = window.setTimeout(() => {
      setIsDismissed(true)
      setIsExpanded(false)
      persistState({
        completedStepIds: Array.from(completedStepIds),
        dismissed: true,
      })
      posthog.capture('onboarding_tour_completed', {
        audience: isAnonymousUser ? 'guest' : 'authenticated',
        project_id: projectId,
      })
    }, 1500)

    return () => {
      window.clearTimeout(dismissTimer)
    }
  }, [
    completedStepIds,
    isAnonymousUser,
    isComplete,
    isDismissed,
    isReady,
    persistState,
    projectId,
  ])

  const toggleStepCompletion = (stepId: string) => {
    setCompletedStepIds((previous) => {
      const next = new Set(previous)
      if (next.has(stepId)) {
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      persistState({
        completedStepIds: Array.from(next),
        dismissed: isDismissed,
      })
      return next
    })
  }

  const dismissTour = () => {
    setIsDismissed(true)
    setIsExpanded(false)
    persistState({
      completedStepIds: Array.from(completedStepIds),
      dismissed: true,
    })

    if (!isComplete) {
      posthog.capture('onboarding_tour_skipped', {
        audience: isAnonymousUser ? 'guest' : 'authenticated',
        project_id: projectId,
      })
    }
  }

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AGENT_PROMPT_TEMPLATE)
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 1600)
    } catch {
      // Clipboard may be unavailable; user can copy manually.
    }
  }

  if (!isReady || isSuspended || isDismissed) {
    return null
  }

  return (
    <div className="fixed right-3 top-16 z-[90] w-[calc(100vw-1.5rem)] max-w-[20rem] sm:right-5 sm:top-20">
      <AnimatePresence mode="wait">
        {isExpanded ? (
          <motion.aside
            key="expanded"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-950/10"
            aria-label={`${guideLabel} checklist`}
          >
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-3.5 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  <ListChecks className="h-3.5 w-3.5 text-pink-700" aria-hidden="true" />
                  {guideLabel}
                </div>
                <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                  {completedCount} of {totalSteps} done
                  {isComplete ? ' — nice work.' : ''}
                </p>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Minimize guide"
                >
                  <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={dismissTour}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Hide guide"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="h-1 w-full bg-slate-100">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(completedCount / totalSteps) * 100}%` }}
              />
            </div>

            <ul className="divide-y divide-slate-100">
              {steps.map((step) => {
                const StepIcon = step.Icon
                const isDone = completedStepIds.has(step.id)
                const isStartWorking = step.id === 'start-working'

                return (
                  <li key={step.id} className="px-3 py-2.5">
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => toggleStepCompletion(step.id)}
                        aria-label={isDone ? `Mark ${step.title} as not done` : `Mark ${step.title} as done`}
                        aria-pressed={isDone}
                        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          isDone
                            ? 'border-emerald-300 bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'border-slate-300 bg-white text-transparent hover:border-pink-300 hover:bg-pink-50'
                        }`}
                      >
                        <Check className="h-3 w-3" aria-hidden="true" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div
                          className={`flex items-center gap-1.5 text-[13px] font-semibold ${
                            isDone ? 'text-slate-400 line-through' : 'text-slate-900'
                          }`}
                        >
                          <StepIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {step.title}
                        </div>
                        {!isDone ? (
                          <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                            {step.description}
                          </p>
                        ) : null}
                        {!isDone && step.action && step.actionLabel ? (
                          <button
                            type="button"
                            onClick={step.action}
                            className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                          >
                            {step.actionLabel}
                            <ArrowRight className="h-3 w-3" aria-hidden="true" />
                          </button>
                        ) : null}
                        {!isDone && isStartWorking ? (
                          <div className="mt-1.5 rounded-md border border-slate-200 bg-slate-50 p-2">
                            <p className="text-[11px] italic leading-4 text-slate-600">
                              &ldquo;{AGENT_PROMPT_TEMPLATE}&rdquo;
                            </p>
                            <button
                              type="button"
                              onClick={handleCopyPrompt}
                              className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                            >
                              {copyState === 'copied' ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" aria-hidden="true" />
                                  Copy prompt
                                </>
                              )}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </motion.aside>
        ) : (
          <motion.button
            key="collapsed"
            type="button"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={() => setIsExpanded(true)}
            className="ml-auto flex items-center gap-2 rounded-full border border-pink-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-md shadow-slate-950/10 transition-colors hover:bg-pink-50"
          >
            <ListChecks className="h-3.5 w-3.5 text-pink-700" aria-hidden="true" />
            {`Guide · ${completedCount}/${totalSteps}`}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
