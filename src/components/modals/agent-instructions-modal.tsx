'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, Plus, Save, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  AgentInstructionSet,
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

type AgentInstructionsModalProps = {
  isOpen: boolean
  onClose: () => void
  projectId: string
}

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
  const [instructionSets, setInstructionSets] = useState<AgentInstructionSetWithFiles[]>([])
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)

  const [newSetName, setNewSetName] = useState('')
  const [newSetCode, setNewSetCode] = useState('')
  const [newSetScope, setNewSetScope] = useState<InstructionSetScope>('specialized')

  const [newFileName, setNewFileName] = useState('')
  const [draftFileName, setDraftFileName] = useState('')
  const [draftContent, setDraftContent] = useState('')

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
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
      setErrorMessage(null)
      return
    }

    void fetchInstructionSets()
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
    setErrorMessage(null)

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
      setErrorMessage('Unable to load instruction sets right now.')
    }
  }

  const handleCreateSet = async (event: React.FormEvent) => {
    event.preventDefault()

    const name = newSetName.trim()
    if (!name) return

    setLoading(true)
    setErrorMessage(null)

    try {
      const createdSet = await createInstructionSet(supabase, {
        project_id: projectId,
        name,
        code: slugifyInstructionCode(newSetCode || name),
        scope: newSetScope,
      })

      setNewSetName('')
      setNewSetCode('')
      setNewSetScope('specialized')
      await fetchInstructionSets({ selectedSetId: createdSet.id })
    } catch (error) {
      console.error('Error creating instruction set:', error)
      setErrorMessage('Unable to create that set. Set code must be unique per project.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSet = async () => {
    if (!selectedSet) return
    if (!confirm(`Delete the set ${selectedSet.name}?`)) return

    setLoading(true)
    setErrorMessage(null)

    try {
      const deletedSetId = selectedSet.id
      await deleteInstructionSet(supabase, deletedSetId)
      await fetchInstructionSets({
        selectedSetId: instructionSets.find((set) => set.id !== deletedSetId)?.id ?? null,
      })
    } catch (error) {
      console.error('Error deleting instruction set:', error)
      setErrorMessage('Unable to delete that instruction set.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFile = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedSet) return

    const fileName = ensureMarkdownFileName(newFileName)
    if (!fileName) return

    setLoading(true)
    setErrorMessage(null)

    try {
      const createdFile = await createInstructionFile(supabase, {
        set_id: selectedSet.id,
        file_name: fileName,
        content: '',
      })

      setNewFileName('')
      await fetchInstructionSets({
        selectedSetId: selectedSet.id,
        selectedFileId: createdFile.id,
      })
    } catch (error) {
      console.error('Error creating instruction file:', error)
      setErrorMessage('Unable to create that file. File names must be unique per set.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveFile = async () => {
    if (!selectedFile) return

    const fileName = ensureMarkdownFileName(draftFileName)
    if (!fileName) return

    setLoading(true)
    setErrorMessage(null)

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
      setErrorMessage('Unable to save that instruction file.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteFile = async () => {
    if (!selectedSet || !selectedFile) return
    if (!confirm(`Delete ${selectedFile.file_name}?`)) return

    setLoading(true)
    setErrorMessage(null)

    try {
      await deleteInstructionFile(supabase, selectedFile.id)
      const fallbackFileId = selectedSet.files.find((file) => file.id !== selectedFile.id)?.id ?? null

      await fetchInstructionSets({
        selectedSetId: selectedSet.id,
        selectedFileId: fallbackFileId,
      })
    } catch (error) {
      console.error('Error deleting instruction file:', error)
      setErrorMessage('Unable to delete that instruction file.')
    } finally {
      setLoading(false)
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
          className="relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b p-4 shrink-0">
            <div>
              <h2 className="text-xl font-semibold">Agent Instructions</h2>
              <p className="text-sm text-muted-foreground">
                Create instruction sets and markdown files, then link specialized sets to tickets.
              </p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid min-h-0 flex-1 lg:grid-cols-[320px_300px_minmax(0,1fr)]">
            <div className="border-b p-4 lg:border-b-0 lg:border-r">
              <form onSubmit={handleCreateSet} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Set Name
                  </label>
                  <input
                    value={newSetName}
                    onChange={(event) => setNewSetName(event.target.value)}
                    placeholder="Default Workspace Rules"
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Set Code
                  </label>
                  <input
                    value={newSetCode}
                    onChange={(event) => setNewSetCode(event.target.value)}
                    placeholder="default-global"
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Scope
                  </label>
                  <select
                    value={newSetScope}
                    onChange={(event) => setNewSetScope(event.target.value as InstructionSetScope)}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {INSTRUCTION_SET_SCOPES.map((scope) => (
                      <option key={scope} value={scope}>
                        {scope === 'global' ? 'Global (always applied)' : 'Specialized (link to tasks)'}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={loading || newSetName.trim().length === 0}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" /> Create Set
                </button>
              </form>

              <div className="mt-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Instruction Sets
                </div>
                <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
                  {instructionSets.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                      No instruction sets yet.
                    </div>
                  ) : (
                    instructionSets.map((instructionSet) => {
                      const isSelected = instructionSet.id === selectedSetId
                      return (
                        <button
                          key={instructionSet.id}
                          type="button"
                          onClick={() => setSelectedSetId(instructionSet.id)}
                          className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/30 hover:bg-muted/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-foreground">
                                {instructionSet.name}
                              </div>
                              <div className="mt-1 truncate text-xs text-muted-foreground">
                                {instructionSet.code}
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
              </div>
            </div>

            <div className="border-b p-4 lg:border-b-0 lg:border-r">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Set Files</h3>
                <button
                  type="button"
                  onClick={handleDeleteSet}
                  disabled={loading || !selectedSet}
                  className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Set
                </button>
              </div>

              {selectedSet ? (
                <>
                  <form onSubmit={handleCreateFile} className="space-y-2">
                    <input
                      value={newFileName}
                      onChange={(event) => setNewFileName(event.target.value)}
                      placeholder="review-checklist.md"
                      className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="submit"
                      disabled={loading || ensureMarkdownFileName(newFileName).length === 0}
                      className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add File
                    </button>
                  </form>

                  <div className="mt-4 max-h-[54vh] space-y-2 overflow-y-auto pr-1">
                    {selectedSet.files.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
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
                                : 'border-border hover:border-primary/30 hover:bg-muted/30'
                            }`}
                          >
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate text-sm text-foreground">{file.file_name}</span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                  Select a set to manage its files.
                </div>
              )}
            </div>

            <div className="flex min-h-0 flex-col p-4">
              {selectedFile ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      File Name
                    </label>
                    <input
                      value={draftFileName}
                      onChange={(event) => setDraftFileName(event.target.value)}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="mt-3 flex min-h-0 flex-1 flex-col">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Markdown Content
                    </label>
                    <textarea
                      value={draftContent}
                      onChange={(event) => setDraftContent(event.target.value)}
                      placeholder="## Agent Notes\n\n- Read linked review thread first\n- Prefer smallest safe code change"
                      className="min-h-[45vh] w-full flex-1 rounded-md border border-border px-3 py-3 font-mono text-sm leading-6 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={handleDeleteFile}
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" /> Delete File
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveFile}
                      disabled={loading || ensureMarkdownFileName(draftFileName).length === 0}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" /> Save File
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                  Select or create a markdown file to edit.
                </div>
              )}

              {errorMessage ? (
                <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {errorMessage}
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
