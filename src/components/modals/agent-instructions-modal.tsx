'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, FilePlus2, FileText, Save, Shield, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  AgentInstructionFile,
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
  INSTRUCTION_SYNC_TARGET_CATALOG,
  InstructionSyncTargetId,
  ToolToggleMap,
  getDefaultToolToggles,
} from '@/domains/agent-control/types'

type AgentInstructionsModalProps = {
  isOpen: boolean
  onClose: () => void
  projectId: string
}

type AgentSettingsTab = 'global' | 'custom' | 'controls'
const CONTEXT_DOCS_DIR = '.pinksundew/docs/'
const CONTEXT_DOCS_NOTE =
  'Project context documents live in .pinksundew/docs/. Read them before making architectural changes.'
const DEFAULT_INSTRUCTION_FILE_NAME = 'agent-rules.md'

function isContextDocument(file: Pick<AgentInstructionFile, 'file_name'>) {
  return file.file_name.replace(/\\/g, '/').startsWith(CONTEXT_DOCS_DIR)
}

function getInstructionFileLabel(file: Pick<AgentInstructionFile, 'file_name'>) {
  return isContextDocument(file)
    ? file.file_name.replace(/\\/g, '/').slice(CONTEXT_DOCS_DIR.length)
    : file.file_name
}

function normalizePathSegment(rawValue: string) {
  return rawValue
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function ensureMarkdownExtension(fileName: string) {
  return fileName.endsWith('.md') ? fileName : `${fileName}.md`
}

function normalizeInstructionFileName(
  rawValue: string,
  selectedFile: Pick<AgentInstructionFile, 'file_name'>
) {
  const normalizedValue = rawValue.trim().replace(/\\/g, '/')
  const isContext = isContextDocument(selectedFile)

  if (!isContext) {
    const lastSegment = normalizedValue.split('/').filter(Boolean).pop() ?? ''
    return ensureMarkdownExtension(normalizePathSegment(lastSegment) || DEFAULT_INSTRUCTION_FILE_NAME)
  }

  const withoutPrefix = normalizedValue.startsWith(CONTEXT_DOCS_DIR)
    ? normalizedValue.slice(CONTEXT_DOCS_DIR.length)
    : normalizedValue

  const segments = withoutPrefix
    .split('/')
    .map(normalizePathSegment)
    .filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..')

  const docPath = ensureMarkdownExtension(segments.join('/') || 'project-context.md')
  return `${CONTEXT_DOCS_DIR}${docPath}`
}

function buildNextContextFileName(files: AgentInstructionFile[]) {
  const existingNames = new Set(files.map((file) => file.file_name))
  let index = 1

  while (existingNames.has(`${CONTEXT_DOCS_DIR}context-${index}.md`)) {
    index += 1
  }

  return `${CONTEXT_DOCS_DIR}context-${index}.md`
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
  const [activeTab, setActiveTab] = useState<AgentSettingsTab>('global')

  const [instructionSets, setInstructionSets] = useState<AgentInstructionSetWithFiles[]>([])
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)

  const [draftContent, setDraftContent] = useState('')
  const [draftFileName, setDraftFileName] = useState('')

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

  const ruleFiles = useMemo(
    () => selectedSet?.files.filter((file) => !isContextDocument(file)) ?? [],
    [selectedSet]
  )

  const contextFiles = useMemo(
    () => selectedSet?.files.filter(isContextDocument) ?? [],
    [selectedSet]
  )

  const selectedFileIsContextDocument = selectedFile ? isContextDocument(selectedFile) : false

  const fetchInstructionSets = useCallback(async (options?: { selectedSetId?: string | null; selectedFileId?: string | null }) => {
    setInstructionErrorMessage(null)

    try {
      const loadInstructionSets = async (
        nextOptions?: { selectedSetId?: string | null; selectedFileId?: string | null }
      ): Promise<void> => {
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
          nextOptions?.selectedSetId && nextSets.some((set) => set.id === nextOptions.selectedSetId)
            ? nextOptions.selectedSetId
            : nextSets[0]?.id ?? null
        setSelectedSetId(nextSelectedSetId)

        const nextSelectedSet = nextSets.find((set) => set.id === nextSelectedSetId) ?? null
        if (!nextSelectedSet) {
          setSelectedFileId(null)
          return
        }

        const nextRuleFiles = nextSelectedSet.files.filter((file) => !isContextDocument(file))
        if (nextRuleFiles.length === 0) {
          const createdFile = await createInstructionFile(supabase, {
            set_id: nextSelectedSet.id,
            file_name: DEFAULT_INSTRUCTION_FILE_NAME,
            content: CONTEXT_DOCS_NOTE,
          })

          await loadInstructionSets({
            selectedSetId: nextSelectedSet.id,
            selectedFileId: createdFile.id,
          })
          return
        }

        const nextSelectedFileId =
          nextOptions?.selectedFileId &&
          nextSelectedSet.files.some((file) => file.id === nextOptions.selectedFileId)
            ? nextOptions.selectedFileId
            : nextRuleFiles[0]?.id ?? nextSelectedSet.files[0]?.id ?? null

        setSelectedFileId(nextSelectedFileId)
      }

      await loadInstructionSets(options)
    } catch (error) {
      console.error('Error loading instruction sets:', error)
      setInstructionErrorMessage('Unable to load instruction files right now.')
    }
  }, [projectId, supabase])

  const fetchAgentControls = useCallback(async () => {
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
  }, [projectId, supabase])

  useEffect(() => {
    if (!isOpen) {
      setInstructionErrorMessage(null)
      setControlsErrorMessage(null)
      setActiveTab('global')
      return
    }

    void fetchInstructionSets()
    void fetchAgentControls()
  }, [fetchAgentControls, fetchInstructionSets, isOpen])

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

    const nextRuleFile = selectedSet.files.find((file) => !isContextDocument(file))
    setSelectedFileId(nextRuleFile?.id ?? selectedSet.files[0]?.id ?? null)
  }, [selectedSetId, selectedSet, selectedFileId])

  useEffect(() => {
    if (!selectedFile) {
      setDraftContent('')
      setDraftFileName('')
      return
    }

    setDraftContent(selectedFile.content)
    setDraftFileName(getInstructionFileLabel(selectedFile))
  }, [selectedFile])

  useEffect(() => {
    if (activeTab === 'global') {
      if (selectedFileIsContextDocument && ruleFiles.length > 0) {
        setSelectedFileId(ruleFiles[0].id)
      }
      return
    }

    if (activeTab === 'custom') {
      if (contextFiles.length === 0) {
        setSelectedFileId(null)
        return
      }

      if (!selectedFileIsContextDocument) {
        setSelectedFileId(contextFiles[0].id)
      }
    }
  }, [activeTab, contextFiles, ruleFiles, selectedFileIsContextDocument])

  const handleToggleTool = (toolId: CoreMcpToolId) => {
    setToolToggles((previous) => ({
      ...previous,
      [toolId]: !previous[toolId],
    }))
    setControlsDirty(true)
    setControlsErrorMessage(null)
  }

  const handleToggleSyncTarget = (targetId: InstructionSyncTargetId) => {
    setToolToggles((previous) => ({
      ...previous,
      [targetId]: !previous[targetId],
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
        file_name: normalizeInstructionFileName(draftFileName, selectedFile),
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

  const handleAddContextDocument = async () => {
    if (!selectedSet) return

    setIsInstructionLoading(true)
    setInstructionErrorMessage(null)

    try {
      const fileName = buildNextContextFileName(selectedSet.files)
      const createdFile = await createInstructionFile(supabase, {
        set_id: selectedSet.id,
        file_name: fileName,
        content: `# ${getInstructionFileLabel({ file_name: fileName }).replace(/\.md$/i, '')}\n\n`,
      })

      await fetchInstructionSets({
        selectedSetId: selectedSet.id,
        selectedFileId: createdFile.id,
      })
    } catch (error) {
      console.error('Error creating context document:', error)
      setInstructionErrorMessage('Unable to create a context document right now.')
    } finally {
      setIsInstructionLoading(false)
    }
  }

  const handleSaveAll = async () => {
    const promises = []
    if (selectedFile) promises.push(handleSaveFile())
    if (controlsDirty) promises.push(handleSaveControls())
    await Promise.all(promises)
  }

  const isGlobalTab = activeTab === 'global'
  const currentInstructionFiles = isGlobalTab ? ruleFiles : contextFiles
  const currentInstructionIcon = isGlobalTab ? FileText : BookOpen
  const currentInstructionTitle = isGlobalTab ? 'Global Agent Rules' : 'Custom Context Document'
  const currentInstructionDescription = isGlobalTab
    ? 'Behavioral rules applied to connected AI sessions.'
    : 'Custom markdown documents sync as separate files in .pinksundew/docs/.'
  const currentInstructionPlaceholder = isGlobalTab
    ? `# Agent Rules\n\n${CONTEXT_DOCS_NOTE}`
    : '# Architecture\n\nDescribe important domain, data, and product context here.'
  const emptyInstructionState = isGlobalTab
    ? 'Preparing your global instruction file...'
    : 'Create a custom file on the left to start writing context for agents.'
  const CurrentInstructionIcon = currentInstructionIcon

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
                Configure global rules, custom context documents, and what MCP agents are allowed
                to do on this board.
              </p>
              <div className="mt-3 inline-flex rounded-lg border border-border bg-muted/20 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('global')}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    activeTab === 'global'
                      ? 'bg-white text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Global Instructions
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('custom')}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    activeTab === 'custom'
                      ? 'bg-white text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Custom Instructions
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

          {activeTab !== 'controls' ? (
            <div className="m-3 flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-inner">
              <div className="flex w-80 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-slate-50/50 p-5">
                {isGlobalTab ? (
                  <>
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                        Sync Targets
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-slate-500">
                        Toggle the target rules files for connected MCP clients.
                      </p>
                    </div>

                    <div className="mt-4 space-y-2">
                      {INSTRUCTION_SYNC_TARGET_CATALOG.map((target) => (
                        <button
                          key={target.id}
                          type="button"
                          className={`group w-full rounded-lg border p-3 text-left transition-all ${
                            toolToggles[target.id]
                              ? 'border-primary/40 bg-zinc-50 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-primary/20 hover:shadow-sm'
                          }`}
                          onClick={() => handleToggleSyncTarget(target.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <div
                                className={`text-sm font-semibold ${
                                  toolToggles[target.id] ? 'text-primary' : 'text-slate-700'
                                }`}
                              >
                                {target.name}
                              </div>
                              <div className="mt-1 inline-block max-w-full truncate rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-600">
                                {target.file_path}
                              </div>
                            </div>
                            <div
                              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                                toolToggles[target.id]
                                  ? 'bg-primary'
                                  : 'bg-slate-200 group-hover:bg-slate-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                                  toolToggles[target.id] ? 'translate-x-4' : 'translate-x-1'
                                }`}
                              />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                          Custom Files
                        </h3>
                        <p className="mt-2 text-xs leading-relaxed text-slate-500">
                          These files sync separately into .pinksundew/docs/ and are not appended to
                          your global rules file.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddContextDocument}
                        disabled={!selectedSet || isInstructionLoading}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary-foreground transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Add custom instruction file"
                      >
                        <FilePlus2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div className={`border-slate-200 pt-5 ${isGlobalTab ? 'mt-6 border-t' : 'mt-4'}`}>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                    {isGlobalTab ? 'Rules File' : 'Custom Instructions'}
                  </div>
                  <div className="space-y-2">
                    {currentInstructionFiles.length > 0 ? (
                      currentInstructionFiles.map((file) => (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => setSelectedFileId(file.id)}
                          className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                            selectedFileId === file.id
                              ? 'border-primary/40 bg-primary/10 text-primary-foreground'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-primary/20'
                          }`}
                        >
                          {isGlobalTab ? (
                            <FileText className="h-4 w-4 shrink-0" />
                          ) : (
                            <BookOpen className="h-4 w-4 shrink-0" />
                          )}
                          <span className="min-w-0 truncate">{getInstructionFileLabel(file)}</span>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 px-3 py-3 text-xs leading-5 text-slate-500">
                        {isGlobalTab
                          ? 'A default global rules file will be created automatically.'
                          : 'Create a markdown file to keep architecture, schema, or product context separate from the global rules file.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 shrink-0">
                  <div className="flex items-center gap-2.5 text-foreground">
                    <CurrentInstructionIcon className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold text-slate-800">{currentInstructionTitle}</h3>
                      <p className="hidden text-xs text-slate-500 sm:block">
                        {currentInstructionDescription}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveAll}
                    disabled={
                      (!selectedFile && !controlsDirty) || isInstructionLoading || isControlsSaving
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
                  >
                    <Save className="h-4 w-4" />{' '}
                    {isInstructionLoading || isControlsSaving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col bg-slate-50 p-4">
                  {selectedFile ? (
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3">
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                          File
                        </label>
                        <div className="flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-700">
                          {!isGlobalTab ? (
                            <span className="mr-1 shrink-0 text-slate-400">{CONTEXT_DOCS_DIR}</span>
                          ) : null}
                          <input
                            value={draftFileName}
                            onChange={(event) => setDraftFileName(event.target.value)}
                            className="min-w-0 flex-1 bg-transparent outline-none"
                            aria-label="Instruction file name"
                          />
                        </div>
                      </div>
                      <textarea
                        value={draftContent}
                        onChange={(event) => setDraftContent(event.target.value)}
                        placeholder={currentInstructionPlaceholder}
                        className="h-full min-h-0 w-full resize-none overflow-y-auto bg-white p-5 font-mono text-sm leading-loose text-slate-700 outline-none focus:ring-0"
                      />
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 px-6 text-center text-sm text-slate-500">
                      {emptyInstructionState}
                    </div>
                  )}

                  {instructionErrorMessage ? (
                    <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-sm">
                      {instructionErrorMessage}
                    </div>
                  ) : null}
                  {controlsErrorMessage ? (
                    <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-sm">
                      {controlsErrorMessage}
                    </div>
                  ) : null}
                </div>
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
