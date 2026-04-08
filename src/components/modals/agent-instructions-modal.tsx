'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, Plus, Save, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AgentInstruction } from '@/domains/agent-instruction/types'
import { getProjectAgentInstructions } from '@/domains/agent-instruction/queries'
import {
  createAgentInstruction,
  deleteAgentInstruction,
  updateAgentInstruction,
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

function sortInstructions(instructions: AgentInstruction[]) {
  return [...instructions].sort((left, right) => {
    const updatedAtCompare =
      new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()

    if (updatedAtCompare !== 0) {
      return updatedAtCompare
    }

    return left.file_name.localeCompare(right.file_name)
  })
}

export function AgentInstructionsModal({
  isOpen,
  onClose,
  projectId,
}: AgentInstructionsModalProps) {
  const [instructions, setInstructions] = useState<AgentInstruction[]>([])
  const [selectedInstructionId, setSelectedInstructionId] = useState<string | null>(null)
  const [draftFileName, setDraftFileName] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [newFileName, setNewFileName] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [supabase] = useState(() => createClient())

  const selectedInstruction = useMemo(
    () => instructions.find((instruction) => instruction.id === selectedInstructionId) ?? null,
    [instructions, selectedInstructionId]
  )

  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null)
      setNewFileName('')
      return
    }

    void fetchInstructions()
  }, [isOpen, projectId])

  useEffect(() => {
    if (!selectedInstruction) {
      setDraftFileName('')
      setDraftContent('')
      return
    }

    setDraftFileName(selectedInstruction.file_name)
    setDraftContent(selectedInstruction.content)
  }, [selectedInstructionId, selectedInstruction])

  const fetchInstructions = async () => {
    setErrorMessage(null)

    try {
      const nextInstructions = await getProjectAgentInstructions(supabase, projectId)
      setInstructions(nextInstructions)
      setSelectedInstructionId((currentSelectedId) => {
        if (currentSelectedId && nextInstructions.some((item) => item.id === currentSelectedId)) {
          return currentSelectedId
        }

        return nextInstructions[0]?.id ?? null
      })
    } catch (error) {
      console.error('Error loading agent instructions:', error)
      setErrorMessage('Unable to load agent instructions right now.')
    }
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()

    const normalizedFileName = ensureMarkdownFileName(newFileName)
    if (!normalizedFileName) return

    setLoading(true)
    setErrorMessage(null)

    try {
      const created = await createAgentInstruction(supabase, {
        project_id: projectId,
        file_name: normalizedFileName,
        content: '',
      })

      setInstructions((prev) => sortInstructions([created, ...prev]))
      setSelectedInstructionId(created.id)
      setNewFileName('')
    } catch (error) {
      console.error('Error creating agent instruction:', error)
      setErrorMessage('Unable to create that instruction file. Check for duplicate names.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedInstruction) return

    const normalizedFileName = ensureMarkdownFileName(draftFileName)
    if (!normalizedFileName) return

    setLoading(true)
    setErrorMessage(null)

    try {
      const updated = await updateAgentInstruction(supabase, selectedInstruction.id, {
        file_name: normalizedFileName,
        content: draftContent,
      })

      setInstructions((prev) =>
        sortInstructions(prev.map((instruction) =>
          instruction.id === updated.id ? updated : instruction
        ))
      )
      setSelectedInstructionId(updated.id)
    } catch (error) {
      console.error('Error saving agent instruction:', error)
      setErrorMessage('Unable to save that instruction file.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedInstruction) return
    if (!confirm(`Delete ${selectedInstruction.file_name}?`)) return

    setLoading(true)
    setErrorMessage(null)

    try {
      await deleteAgentInstruction(supabase, selectedInstruction.id)
      setInstructions((prev) => {
        const nextInstructions = prev.filter((instruction) => instruction.id !== selectedInstruction.id)
        setSelectedInstructionId(nextInstructions[0]?.id ?? null)
        return nextInstructions
      })
    } catch (error) {
      console.error('Error deleting agent instruction:', error)
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
          className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b p-4 shrink-0">
            <div>
              <h2 className="text-xl font-semibold">Agent Instructions</h2>
              <p className="text-sm text-muted-foreground">
                Store project markdown files that MCP agents should follow when they pull board context.
              </p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid min-h-0 flex-1 md:grid-cols-[280px_minmax(0,1fr)]">
            <div className="border-b p-4 md:border-b-0 md:border-r">
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    New Instruction File
                  </label>
                  <input
                    value={newFileName}
                    onChange={(event) => setNewFileName(event.target.value)}
                    placeholder="default-agent.md"
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || ensureMarkdownFileName(newFileName).length === 0}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" /> Create File
                </button>
              </form>

              <div className="mt-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Project Files
                </div>
                <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1">
                  {instructions.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                      No agent instruction files yet.
                    </div>
                  ) : (
                    instructions.map((instruction) => {
                      const isSelected = instruction.id === selectedInstructionId
                      return (
                        <button
                          key={instruction.id}
                          type="button"
                          onClick={() => setSelectedInstructionId(instruction.id)}
                          className={`flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/30 hover:bg-muted/30'
                          }`}
                        >
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-foreground">
                              {instruction.file_name}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Updated {new Date(instruction.updated_at).toLocaleString()}
                            </div>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-col p-4">
              {selectedInstruction ? (
                <>
                  <div className="grid gap-4 shrink-0">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        File Name
                      </label>
                      <input
                        value={draftFileName}
                        onChange={(event) => setDraftFileName(event.target.value)}
                        placeholder="default-agent.md"
                        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Markdown Content
                      </label>
                      <textarea
                        value={draftContent}
                        onChange={(event) => setDraftContent(event.target.value)}
                        placeholder="## Working Agreement\n\n- Always read open review messages first\n- Prioritize database integrity over UI-only fixes"
                        className="min-h-[46vh] w-full rounded-md border border-border px-3 py-3 font-mono text-sm leading-6 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      These files are included in project board context for MCP agents.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={loading || ensureMarkdownFileName(draftFileName).length === 0}
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" /> Save Changes
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                  Create or select an instruction file to edit its markdown content.
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