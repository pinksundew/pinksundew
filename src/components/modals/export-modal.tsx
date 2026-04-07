'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Clipboard, Plus, Trash2, X } from 'lucide-react'
import { TaskWithTags } from '@/domains/task/types'

type CustomInstruction = {
  id: string
  title: string
  content: string
}

type ExportModalProps = {
  isOpen: boolean
  onClose: () => void
  tasks: TaskWithTags[]
  projectName: string
}

const CUSTOM_INSTRUCTIONS_STORAGE_KEY = 'planner_custom_instructions'

function loadCustomInstructions() {
  if (typeof window === 'undefined') return [] as CustomInstruction[]

  const rawValue = window.localStorage.getItem(CUSTOM_INSTRUCTIONS_STORAGE_KEY)
  if (!rawValue) return [] as CustomInstruction[]

  try {
    const parsed = JSON.parse(rawValue) as CustomInstruction[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    window.localStorage.removeItem(CUSTOM_INSTRUCTIONS_STORAGE_KEY)
    return [] as CustomInstruction[]
  }
}

function generateExportText(
  tasks: TaskWithTags[],
  selectedInstructions: CustomInstruction[]
) {
  const taskSections = tasks.map((task, index) => {
    const tags = task.tags.length > 0 ? task.tags.map((tag) => tag.name).join(', ') : 'None'
    const description = task.description?.trim() || 'No description provided.'

    return [
      `${index + 1}. ${task.title.toUpperCase()}`,
      `Description: ${description}`,
      `Tags: ${tags}`,
      `Priority: ${task.priority}`,
    ].join('\n')
  })

  let content = `Implement these tasks:\n\n${taskSections.join('\n\n')}`

  if (selectedInstructions.length > 0) {
    const instructionSections = selectedInstructions.map(
      (instruction) => `[${instruction.title}]\n${instruction.content}`
    )

    content += `\n\n--- CUSTOM INSTRUCTIONS ---\n\n${instructionSections.join('\n\n')}`
  }

  return content
}

export function ExportModal({ isOpen, onClose, tasks, projectName }: ExportModalProps) {
  const [customInstructions, setCustomInstructions] = useState<CustomInstruction[]>(loadCustomInstructions)
  const [selectedInstructionIds, setSelectedInstructionIds] = useState<Set<string>>(new Set())
  const selectedInstructions = useMemo(
    () => customInstructions.filter((instruction) => selectedInstructionIds.has(instruction.id)),
    [customInstructions, selectedInstructionIds]
  )
  const [exportText, setExportText] = useState(() => generateExportText(tasks, selectedInstructions))
  const [exportCopied, setExportCopied] = useState(false)
  const [instructionTitle, setInstructionTitle] = useState('')
  const [instructionContent, setInstructionContent] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(CUSTOM_INSTRUCTIONS_STORAGE_KEY, JSON.stringify(customInstructions))
  }, [customInstructions])

  const handleAddInstruction = () => {
    const nextTitle = instructionTitle.trim()
    const nextContent = instructionContent.trim()

    if (!nextTitle || !nextContent) return

    const instruction: CustomInstruction = {
      id: crypto.randomUUID(),
      title: nextTitle,
      content: nextContent,
    }

    const nextInstructions = [...customInstructions, instruction]
    const nextSelectedInstructionIds = new Set(selectedInstructionIds)
    nextSelectedInstructionIds.add(instruction.id)

    setCustomInstructions(nextInstructions)
    setSelectedInstructionIds(nextSelectedInstructionIds)
    setExportText(
      generateExportText(
        tasks,
        nextInstructions.filter((item) => nextSelectedInstructionIds.has(item.id))
      )
    )
    setInstructionTitle('')
    setInstructionContent('')
  }

  const handleDeleteInstruction = (instructionId: string) => {
    const nextInstructions = customInstructions.filter((instruction) => instruction.id !== instructionId)
    const nextSelectedInstructionIds = new Set(selectedInstructionIds)
    nextSelectedInstructionIds.delete(instructionId)

    setCustomInstructions(nextInstructions)
    setSelectedInstructionIds(nextSelectedInstructionIds)
    setExportText(
      generateExportText(
        tasks,
        nextInstructions.filter((item) => nextSelectedInstructionIds.has(item.id))
      )
    )
  }

  const toggleInstruction = (instructionId: string) => {
    const nextSelectedInstructionIds = new Set(selectedInstructionIds)
    if (nextSelectedInstructionIds.has(instructionId)) {
      nextSelectedInstructionIds.delete(instructionId)
    } else {
      nextSelectedInstructionIds.add(instructionId)
    }

    setSelectedInstructionIds(nextSelectedInstructionIds)
    setExportText(
      generateExportText(
        tasks,
        customInstructions.filter((instruction) => nextSelectedInstructionIds.has(instruction.id))
      )
    )
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(exportText)
    setExportCopied(true)
    window.setTimeout(() => {
      setExportCopied(false)
    }, 2000)
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
          className="relative w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2 className="text-xl font-semibold">Export Prompt</h2>
              <p className="text-sm text-muted-foreground">
                Build an AI-ready prompt from {tasks.length} selected task{tasks.length === 1 ? '' : 's'} in {projectName}.
              </p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
            <div className="border-b p-4 md:border-b-0 md:border-r">
              <label className="mb-2 block text-sm font-medium text-foreground">Prompt Preview</label>
              <textarea
                value={exportText}
                onChange={(event) => setExportText(event.target.value)}
                className="min-h-[420px] w-full rounded-lg border border-border px-3 py-3 text-sm leading-6 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex min-h-[420px] flex-col">
              <div className="space-y-4 p-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Custom Instructions</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Save reusable AI guidance and choose which snippets to append.
                  </p>
                </div>

                <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Title
                    </label>
                    <input
                      value={instructionTitle}
                      onChange={(event) => setInstructionTitle(event.target.value)}
                      placeholder="Use Tailwind CSS"
                      className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Content
                    </label>
                    <textarea
                      value={instructionContent}
                      onChange={(event) => setInstructionContent(event.target.value)}
                      placeholder="Prefer utility classes, keep components small, and preserve the existing design tokens."
                      rows={4}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddInstruction}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" /> Add Instruction
                  </button>
                </div>

                <div className="space-y-2">
                  {customInstructions.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                      No saved instructions yet.
                    </div>
                  ) : (
                    customInstructions.map((instruction) => (
                      <div
                        key={instruction.id}
                        className="rounded-lg border border-border p-3 transition-colors hover:border-primary/40"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <label className="flex flex-1 cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedInstructionIds.has(instruction.id)}
                              onChange={() => toggleInstruction(instruction.id)}
                              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                            />
                            <div>
                              <div className="text-sm font-medium text-foreground">{instruction.title}</div>
                              <div className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                                {instruction.content}
                              </div>
                            </div>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleDeleteInstruction(instruction.id)}
                            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={`Delete ${instruction.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between border-t bg-muted/20 px-4 py-3">
                <div className="text-sm text-muted-foreground">
                  {tasks.length} task{tasks.length === 1 ? '' : 's'} selected
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {exportCopied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  {exportCopied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
