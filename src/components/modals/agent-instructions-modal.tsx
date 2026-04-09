'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, Plus, Save, Shield, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  AgentInstructionSetWithFiles,
  INSTRUCTION_SET_SCOPES,
  InstructionSetScope,
} from '@/domains/agent-instruction/types'
import { getProjectInstructionSets } from '@/domains/agent-instruction/queries'
import {
  createInstructionFile,
  createInstructionSet,
  deleteInstructionFile,
  deleteInstructionSet,
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
import { ConfirmModal } from './confirm-modal'

type AgentInstructionsModalProps = {
  isOpen: boolean
  onClose: () => void
  projectId: string
}

type AgentSettingsTab = 'instructions' | 'controls'

function ensureMarkdownFileName(rawValue: string) {
  const trimmed = rawValue.trim()
  if (!trimmed) return ''
  return /\.md$/i.test(trimmed) ? trimmed : `${trimmed}.md`
}

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
    if (left.scope !== right.scope) {
      return left.scope === 'global' ? -1 : 1
    }

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

  const [newSetName, setNewSetName] = useState('')
  const [newSetScope, setNewSetScope] = useState<InstructionSetScope>('specialized')
  const [isCreateSetOpen, setIsCreateSetOpen] = useState(false)

  const [newFileName, setNewFileName] = useState('')
  const [isCreateFileOpen, setIsCreateFileOpen] = useState(false)
  const [draftFileName, setDraftFileName] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [isDeleteSetConfirmOpen, setIsDeleteSetConfirmOpen] = useState(false)
  const [isDeleteFileConfirmOpen, setIsDeleteFileConfirmOpen] = useState(false)

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
      setIsCreateSetOpen(false)
      setIsCreateFileOpen(false)
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
      setDraftFileName('')
      setDraftContent('')
      return
    }

    setDraftFileName(selectedFile.file_name)
    setDraftContent(selectedFile.content)
  }, [selectedFile])

  const fetchInstructionSets = async (options?: { selectedSetId?: string | null; selectedFileId?: string | null }) => {
    setInstructionErrorMessage(null)

    try {
      const nextSets = sortInstructionSets(
        await getProjectInstructionSets(supabase, projectId)
      )

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

      const nextSelectedFileId =
        options?.selectedFileId &&
        nextSelectedSet.files.some((file) => file.id === options.selectedFileId)
          ? options.selectedFileId
          : nextSelectedSet.files[0]?.id ?? null

      setSelectedFileId(nextSelectedFileId)
    } catch (error) {
      console.error('Error loading instruction sets:', error)
      setInstructionErrorMessage('Unable to load instruction sets right now.')
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

  const handleCreateSet = async (event: React.FormEvent) => {
    event.preventDefault()

    const name = newSetName.trim()
    if (!name) return

    const normalizedName = name.toLowerCase()
    if (
      instructionSets.some(
        (instructionSet) => instructionSet.name.trim().toLowerCase() === normalizedName
      )
    ) {
      setInstructionErrorMessage('Set names must be unique within this project.')
      return
    }

    setIsInstructionLoading(true)
    setInstructionErrorMessage(null)

    try {
      const createdSet = await createInstructionSet(supabase, {
        project_id: projectId,
        name,
        code: buildInstructionSetCode(name),
        scope: newSetScope,
      })

      setNewSetName('')
      setNewSetScope('specialized')
      setIsCreateSetOpen(false)
      await fetchInstructionSets({ selectedSetId: createdSet.id })
    } catch (error) {
      console.error('Error creating instruction set:', error)
      setInstructionErrorMessage('Unable to create that set. Set names must be unique per project.')
    } finally {
      setIsInstructionLoading(false)
    }
  }

  const handleDeleteSet = async () => {
    if (!selectedSet) {
      return
    }

    setIsInstructionLoading(true)
    setInstructionErrorMessage(null)

    try {
      const deletedSetId = selectedSet.id
      await deleteInstructionSet(supabase, deletedSetId)
      await fetchInstructionSets({
        selectedSetId: instructionSets.find((set) => set.id !== deletedSetId)?.id ?? null,
      })
    } catch (error) {
      console.error('Error deleting instruction set:', error)
      setInstructionErrorMessage('Unable to delete that instruction set.')
    } finally {
      setIsInstructionLoading(false)
      setIsDeleteSetConfirmOpen(false)
    }
  }

  const handleCreateFile = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedSet) return

    const fileName = ensureMarkdownFileName(newFileName)
    if (!fileName) return

    setIsInstructionLoading(true)
    setInstructionErrorMessage(null)

    try {
      const createdFile = await createInstructionFile(supabase, {
        set_id: selectedSet.id,
        file_name: fileName,
        content: '',
      })

      setNewFileName('')
      setIsCreateFileOpen(false)
      await fetchInstructionSets({
        selectedSetId: selectedSet.id,
        selectedFileId: createdFile.id,
      })
    } catch (error) {
      console.error('Error creating instruction file:', error)
      setInstructionErrorMessage('Unable to create that file. File names must be unique per set.')
    } finally {
      setIsInstructionLoading(false)
    }
  }

  const handleSaveFile = async () => {
    if (!selectedFile) return

    const fileName = ensureMarkdownFileName(draftFileName)
    if (!fileName) return

    setIsInstructionLoading(true)
    setInstructionErrorMessage(null)

    try {
      await updateInstructionFile(supabase, selectedFile.id, {
        file_name: fileName,
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

  const handleDeleteFile = async () => {
    if (!selectedSet || !selectedFile) {
      return
    }

    setIsInstructionLoading(true)
    setInstructionErrorMessage(null)

    try {
      await deleteInstructionFile(supabase, selectedFile.id)
      const fallbackFileId = selectedSet.files.find((file) => file.id !== selectedFile.id)?.id ?? null

      await fetchInstructionSets({
        selectedSetId: selectedSet.id,
        selectedFileId: fallbackFileId,
      })
    } catch (error) {
      console.error('Error deleting instruction file:', error)
      setInstructionErrorMessage('Unable to delete that instruction file.')
    } finally {
      setIsInstructionLoading(false)
      setIsDeleteFileConfirmOpen(false)
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
                  Instruction Sets
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
            <div className="m-4 grid min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/40 lg:grid-cols-[320px_300px_minmax(0,1fr)]">
              <div className="flex min-h-0 flex-col border-b border-slate-200 bg-white p-4 lg:border-b-0 lg:border-r">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Instruction Sets
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                  {instructionSets.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-muted-foreground">
                      No instruction sets yet.
                    </div>
                  ) : (
                    instructionSets.map((instructionSet) => {
                      const isSelected = instructionSet.id === selectedSetId
                      return (
                        <button
                          key={instructionSet.id}
                          type="button"
                          onClick={() => {
                            setSelectedSetId(instructionSet.id)
                            setIsCreateFileOpen(false)
                          }}
                          className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-slate-200 hover:border-primary/30 hover:bg-muted/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-foreground">
                                {instructionSet.name}
                              </div>
                            </div>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                instructionSet.scope === 'global'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-sky-100 text-sky-700'
                              }`}
                            >
                              {instructionSet.scope}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {instructionSet.files.length} file{instructionSet.files.length === 1 ? '' : 's'}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>

                <div className="mt-4 border-t border-slate-200 pt-3">
                  {isCreateSetOpen ? (
                    <form onSubmit={handleCreateSet} className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Set Name
                        </label>
                        <input
                          value={newSetName}
                          onChange={(event) => setNewSetName(event.target.value)}
                          placeholder="Default Workspace Rules"
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Scope
                        </label>
                        <select
                          value={newSetScope}
                          onChange={(event) => setNewSetScope(event.target.value as InstructionSetScope)}
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {INSTRUCTION_SET_SCOPES.map((scope) => (
                            <option key={scope} value={scope}>
                              {scope === 'global' ? 'Global (always applied)' : 'Specialized (link to tasks)'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreateSetOpen(false)
                            setNewSetName('')
                            setNewSetScope('specialized')
                          }}
                          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-foreground hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isInstructionLoading || newSetName.trim().length === 0}
                          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          <Plus className="h-4 w-4" /> Create Set
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateSetOpen(true)
                        setInstructionErrorMessage(null)
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <Plus className="h-4 w-4" /> Create Set
                    </button>
                  )}
                </div>
              </div>

              <div className="flex min-h-0 flex-col border-b border-slate-200 bg-white p-4 lg:border-b-0 lg:border-r">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Set Files</h3>
                  <button
                    type="button"
                    onClick={() => setIsDeleteSetConfirmOpen(true)}
                    disabled={isInstructionLoading || !selectedSet}
                    className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete Set
                  </button>
                </div>

                {selectedSet ? (
                  <>
                    <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                      {selectedSet.files.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-muted-foreground">
                          No files in this set.
                        </div>
                      ) : (
                        selectedSet.files.map((file) => {
                          const isSelected = file.id === selectedFileId
                          return (
                            <button
                              key={file.id}
                              type="button"
                              onClick={() => setSelectedFileId(file.id)}
                              className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors ${
                                isSelected
                                  ? 'border-primary bg-primary/5'
                                  : 'border-slate-200 hover:border-primary/30 hover:bg-muted/30'
                              }`}
                            >
                              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="truncate text-sm text-foreground">{file.file_name}</span>
                            </button>
                          )
                        })
                      )}
                    </div>

                    <div className="mt-4 border-t border-slate-200 pt-3">
                      {isCreateFileOpen ? (
                        <form onSubmit={handleCreateFile} className="space-y-2">
                          <input
                            value={newFileName}
                            onChange={(event) => setNewFileName(event.target.value)}
                            placeholder="review-checklist.md"
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsCreateFileOpen(false)
                                setNewFileName('')
                              }}
                              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-foreground hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isInstructionLoading || ensureMarkdownFileName(newFileName).length === 0}
                              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add File
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreateFileOpen(true)
                            setInstructionErrorMessage(null)
                          }}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        >
                          <Plus className="h-4 w-4" /> Add File
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-muted-foreground">
                    Select a set to manage its files.
                  </div>
                )}
              </div>

              <div className="flex min-h-0 flex-col overflow-hidden bg-white p-4">
                {selectedFile ? (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        File Name
                      </label>
                      <input
                        value={draftFileName}
                        onChange={(event) => setDraftFileName(event.target.value)}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Markdown Content
                      </label>
                      <textarea
                        value={draftContent}
                        onChange={(event) => setDraftContent(event.target.value)}
                        placeholder="## Agent Notes\n\n- Read linked review thread first\n- Prefer smallest safe code change"
                        className="h-full min-h-0 w-full flex-1 resize-none rounded-md border border-slate-200 px-3 py-3 font-mono text-sm leading-6 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setIsDeleteFileConfirmOpen(true)}
                        disabled={isInstructionLoading}
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" /> Delete File
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveFile}
                        disabled={isInstructionLoading || ensureMarkdownFileName(draftFileName).length === 0}
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" /> Save File
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                    Select or create a markdown file to edit.
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

      <ConfirmModal
        isOpen={isDeleteSetConfirmOpen}
        title="Delete Instruction Set"
        message={selectedSet ? `Delete ${selectedSet.name}? This also removes all files in the set.` : 'Delete this instruction set?'}
        confirmText="Delete Set"
        cancelText="Cancel"
        isDestructive
        onClose={() => setIsDeleteSetConfirmOpen(false)}
        onConfirm={() => {
          void handleDeleteSet()
        }}
      />

      <ConfirmModal
        isOpen={isDeleteFileConfirmOpen}
        title="Delete Instruction File"
        message={selectedFile ? `Delete ${selectedFile.file_name}?` : 'Delete this instruction file?'}
        confirmText="Delete File"
        cancelText="Cancel"
        isDestructive
        onClose={() => setIsDeleteFileConfirmOpen(false)}
        onConfirm={() => {
          void handleDeleteFile()
        }}
      />
    </AnimatePresence>
  )
}
