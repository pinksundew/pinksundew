'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, Save, Shield, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  AgentInstructionSetWithFiles,
  InstructionSetScope,
} from '@/domains/agent-instruction/types'
import { getProjectInstructionSets } from '@/domains/agent-instruction/queries'
import {
  createInstructionFile,
  createInstructionSet,
  updateInstructionFile,
} from '@/domains/agent-instruction/mutations'
import { upsertProjectAgentControls } from '@/domains/agent-control/mutations'
import { getProjectAgentControls } from '@/domains/agent-control/queries'
import {
  CORE_MCP_TOOL_CATALOG,
  CoreMcpToolId,
  ToolToggleMap,
  getDefaultToolToggles,
} from '@/domains/agent-control/types'

type AgentInstructionsModalProps = {
  isOpen: boolean
  onClose: () => void
  projectId: string
}

type AgentSettingsTab = 'instructions' | 'controls'
const DEFAULT_INSTRUCTION_FILE_NAME = 'copilot-instructions.md'

function slugifyInstructionCode(rawValue: string) {
  const slug = rawValue
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'instruction-set'
}

function buildInstructionSetCode(rawName: string) {
  const normalizedName = rawName.trim().toLowerCase()
  const baseCode = slugifyInstructionCode(normalizedName)

  let hash = 0
  for (let index = 0; index < normalizedName.length; index += 1) {
    hash = (hash * 31 + normalizedName.charCodeAt(index)) | 0
  }

  const suffix = Math.abs(hash).toString(36).slice(0, 6) || 'set'
  return `${baseCode}-${suffix}`
}

function sortInstructionSets(sets: AgentInstructionSetWithFiles[]) {
  return [...sets].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order
    }

    return left.name.localeCompare(right.name)
  })
}

export function AgentInstructionsModal({
  isOpen,
  onClose,
  projectId,
}: AgentInstructionsModalProps) {
  const [activeTab, setActiveTab] = useState<AgentSettingsTab>('instructions')

  const [instructionSets, setInstructionSets] = useState<AgentInstructionSetWithFiles[]>([])
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)

  const [draftContent, setDraftContent] = useState('')

  const [allowTaskCompletion, setAllowTaskCompletion] = useState(true)
  const [toolToggles, setToolToggles] = useState<ToolToggleMap>(getDefaultToolToggles())
  const [controlsDirty, setControlsDirty] = useState(false)

  const [instructionErrorMessage, setInstructionErrorMessage] = useState<string | null>(null)
  const [controlsErrorMessage, setControlsErrorMessage] = useState<string | null>(null)
  const [isInstructionLoading, setIsInstructionLoading] = useState(false)
  const [isControlsSaving, setIsControlsSaving] = useState(false)
  const [supabase] = useState(() => createClient())

  const selectedSet = useMemo(
    () => instructionSets.find((instructionSet) => instructionSet.id === selectedSetId) ?? null,
    [instructionSets, selectedSetId]
  )

  const selectedFile = useMemo(
    () => selectedSet?.files.find((file) => file.id === selectedFileId) ?? null,
    [selectedSet, selectedFileId]
  )

  useEffect(() => {
    if (!isOpen) {
      setInstructionErrorMessage(null)
      setControlsErrorMessage(null)
      setActiveTab('instructions')
      return
    }

    void fetchInstructionSets()
    void fetchAgentControls()
  }, [isOpen, projectId])

  useEffect(() => {
    if (!selectedSet) {
      setSelectedFileId(null)
      return
    }

    if (selectedSet.files.length === 0) {
      setSelectedFileId(null)
      return
    }

    if (selectedFileId && selectedSet.files.some((file) => file.id === selectedFileId)) {
      return
    }

    setSelectedFileId(selectedSet.files[0]?.id ?? null)
  }, [selectedSetId, selectedSet, selectedFileId])

  useEffect(() => {
    if (!selectedFile) {
      setDraftContent('')
      return
    }

    setDraftContent(selectedFile.content)
  }, [selectedFile])

  const fetchInstructionSets = async (options?: { selectedSetId?: string | null; selectedFileId?: string | null }) => {
    setInstructionErrorMessage(null)

    try {
      let nextSets = sortInstructionSets(
        await getProjectInstructionSets(supabase, projectId)
      )

      if (nextSets.length === 0) {
        const createdSet = await createInstructionSet(supabase, {
          project_id: projectId,
          name: 'Workspace Standard',
          code: buildInstructionSetCode('workspace-standard'),
          scope: 'global' as InstructionSetScope,
        })

        nextSets = [{ ...createdSet, files: [] }]
      }

      setInstructionSets(nextSets)

      const nextSelectedSetId =
        options?.selectedSetId && nextSets.some((set) => set.id === options.selectedSetId)
          ? options.selectedSetId
          : nextSets[0]?.id ?? null
      setSelectedSetId(nextSelectedSetId)

      const nextSelectedSet = nextSets.find((set) => set.id === nextSelectedSetId) ?? null
      if (!nextSelectedSet) {
        setSelectedFileId(null)
        return
      }

      if (nextSelectedSet.files.length === 0) {
        const createdFile = await createInstructionFile(supabase, {
          set_id: nextSelectedSet.id,
          file_name: DEFAULT_INSTRUCTION_FILE_NAME,
          content: '',
        })

        await fetchInstructionSets({
          selectedSetId: nextSelectedSet.id,
          selectedFileId: createdFile.id,
        })
        return
      }

      const nextSelectedFileId =
        options?.selectedFileId &&
        nextSelectedSet.files.some((file) => file.id === options.selectedFileId)
          ? options.selectedFileId
          : nextSelectedSet.files[0]?.id ?? null

      setSelectedFileId(nextSelectedFileId)
    } catch (error) {
      console.error('Error loading instruction sets:', error)
      setInstructionErrorMessage('Unable to load instruction files right now.')
    }
  }

  const fetchAgentControls = async () => {
    setControlsErrorMessage(null)

    try {
      const controls = await getProjectAgentControls(supabase, projectId)
      setAllowTaskCompletion(controls.allow_task_completion)
      setToolToggles(controls.tool_toggles)
      setControlsDirty(false)
    } catch (error) {
      console.error('Error loading project agent controls:', error)
      setControlsErrorMessage('Unable to load agent controls right now.')
    }
  }

  const handleToggleTool = (toolId: CoreMcpToolId) => {
    setToolToggles((previous) => ({
      ...previous,
      [toolId]: !previous[toolId],
    }))
    setControlsDirty(true)
    setControlsErrorMessage(null)
  }

  const handleToggleTaskCompletion = () => {
    setAllowTaskCompletion((previous) => !previous)
    setControlsDirty(true)
    setControlsErrorMessage(null)
  }

  const handleSaveControls = async () => {
    setIsControlsSaving(true)
    setControlsErrorMessage(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const controls = await upsertProjectAgentControls(supabase, {
        project_id: projectId,
        allow_task_completion: allowTaskCompletion,
        tool_toggles: toolToggles,
        updated_by: user?.id ?? null,
      })

      setAllowTaskCompletion(controls.allow_task_completion)
      setToolToggles(controls.tool_toggles)
      setControlsDirty(false)
    } catch (error) {
      console.error('Error saving project agent controls:', error)
      setControlsErrorMessage('Unable to save agent controls right now.')
    } finally {
      setIsControlsSaving(false)
    }
  }

  const handleSaveFile = async () => {
    if (!selectedFile) return

    setIsInstructionLoading(true)
    setInstructionErrorMessage(null)

    try {
      await updateInstructionFile(supabase, selectedFile.id, {
        file_name: selectedFile.file_name || DEFAULT_INSTRUCTION_FILE_NAME,
        content: draftContent,
      })

      await fetchInstructionSets({
        selectedSetId: selectedSet?.id ?? null,
        selectedFileId: selectedFile.id,
      })
    } catch (error) {
      console.error('Error saving instruction file:', error)
      setInstructionErrorMessage('Unable to save that instruction file.')
    } finally {
      setIsInstructionLoading(false)
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative flex h-[88vh] max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        >
          <div className="flex items-center justify-between p-4 shrink-0">
            <div>
              <h2 className="text-xl font-semibold">Agent Instructions</h2>
              <p className="text-sm text-muted-foreground">
                Configure instruction bundles and what MCP agents are allowed to do on this board.
              </p>
              <div className="mt-3 inline-flex rounded-lg border border-border bg-muted/20 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('instructions')}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    activeTab === 'instructions'
                      ? 'bg-white text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Instruction Files
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('controls')}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    activeTab === 'controls'
                      ? 'bg-white text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Agent Controls
                </button>
              </div>
            </div>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          {activeTab === 'instructions' ? (
            <div className="m-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-50/60 px-4 py-3">
                <div className="flex items-start gap-2 text-foreground">
                  <FileText className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.08em]">Instruction File</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      These instructions are synced into your workspace&apos;s agent instruction file
                      based on your IDE/environment (for example `AGENTS.md`,
                      `.github/copilot-instructions.md`, `.cursorrules`, or similar).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveFile}
                  disabled={isInstructionLoading || !selectedFile}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> {isInstructionLoading ? 'Saving...' : 'Save Instructions'}
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-3">
                {selectedFile ? (
                  <textarea
                    value={draftContent}
                    onChange={(event) => setDraftContent(event.target.value)}
                    placeholder="## Agent Notes\n\n- Read linked review thread first\n- Prefer smallest safe code change"
                    className="min-h-[420px] w-full flex-1 resize-none overflow-y-auto rounded-md border border-slate-200 px-3 py-3 font-mono text-sm leading-6 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                    Preparing your instruction file...
                  </div>
                )}

                {instructionErrorMessage ? (
                  <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {instructionErrorMessage}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="m-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-start gap-2 text-foreground">
                  <Shield className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.08em]">
                      Agent Controls
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Toggle what the MCP agent can do on this board.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveControls}
                  disabled={!controlsDirty || isControlsSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> {isControlsSaving ? 'Saving...' : 'Save Controls'}
                </button>
              </div>

              <div className="min-h-0 overflow-y-auto p-4">
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-foreground">Allow Task Completion</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          If enabled, agents can move tickets to Done. Completed tickets are flagged for review.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleTaskCompletion}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                          allowTaskCompletion ? 'bg-primary' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                            allowTaskCompletion ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {CORE_MCP_TOOL_CATALOG.map((tool) => (
                    <div
                      key={tool.id}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-foreground">{tool.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{tool.description}</div>
                          <div className="mt-2 font-mono text-[11px] text-muted-foreground">{tool.id}</div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleTool(tool.id)}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                            toolToggles[tool.id] ? 'bg-primary' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                              toolToggles[tool.id] ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  ))}

                  {controlsErrorMessage ? (
                    <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {controlsErrorMessage}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

    </AnimatePresence>
  )
}
