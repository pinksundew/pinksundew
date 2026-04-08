'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clipboard,
  GripVertical,
  MoveDown,
  MoveUp,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
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

type ExportFormat = 'numbered' | 'bullets' | 'checkboxes' | 'compact'

type ExportOptions = {
  format: ExportFormat
  includeTags: boolean
  includePriority: boolean
}

const CUSTOM_INSTRUCTIONS_STORAGE_KEY = 'planner_custom_instructions'

const FORMAT_OPTIONS: Array<{ value: ExportFormat; label: string }> = [
  { value: 'numbered', label: 'Numbered' },
  { value: 'bullets', label: 'Bullets' },
  { value: 'checkboxes', label: 'Checkboxes' },
  { value: 'compact', label: 'Compact' },
]

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

function formatTaskBlock(task: TaskWithTags, index: number, options: ExportOptions) {
  const description = task.description?.trim() || 'No description provided.'
  const tags = task.tags.length > 0 ? task.tags.map((tag) => tag.name).join(', ') : 'None'
  const detailLines = [
    `Description: ${description}`,
    options.includeTags ? `Tags: ${tags}` : null,
    options.includePriority ? `Priority: ${task.priority}` : null,
  ].filter(Boolean) as string[]

  if (options.format === 'compact') {
    return [`${index + 1}. ${task.title}`, ...detailLines].join(' | ')
  }

  const prefix =
    options.format === 'numbered'
      ? `${index + 1}. ${task.title}`
      : options.format === 'bullets'
        ? `- ${task.title}`
        : `[ ] ${task.title}`

  return [prefix, ...detailLines].join('\n')
}

function generateExportText(
  tasks: TaskWithTags[],
  selectedInstructions: CustomInstruction[],
  options: ExportOptions
) {
  const taskSections = tasks.map((task, index) => formatTaskBlock(task, index, options))

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
  const [orderedTasks, setOrderedTasks] = useState<TaskWithTags[]>(tasks)
  const [selectedInstructionIds, setSelectedInstructionIds] = useState<Set<string>>(new Set())
  const selectedInstructions = useMemo(
    () => customInstructions.filter((instruction) => selectedInstructionIds.has(instruction.id)),
    [customInstructions, selectedInstructionIds]
  )
  const [format, setFormat] = useState<ExportFormat>('numbered')
  const [includeTags, setIncludeTags] = useState(true)
  const [includePriority, setIncludePriority] = useState(true)
  const [isAddInstructionOpen, setIsAddInstructionOpen] = useState(false)
  const [exportText, setExportText] = useState('')
  const [exportCopied, setExportCopied] = useState(false)
  const [instructionTitle, setInstructionTitle] = useState('')
  const [instructionContent, setInstructionContent] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(CUSTOM_INSTRUCTIONS_STORAGE_KEY, JSON.stringify(customInstructions))
  }, [customInstructions])

  useEffect(() => {
    if (!isOpen) return

    setOrderedTasks(tasks)
    setExportCopied(false)
  }, [isOpen, tasks])

  useEffect(() => {
    setExportText(
      generateExportText(orderedTasks, selectedInstructions, {
        format,
        includeTags,
        includePriority,
      })
    )
  }, [orderedTasks, selectedInstructions, format, includeTags, includePriority])

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
    setInstructionTitle('')
    setInstructionContent('')
    setIsAddInstructionOpen(false)
  }

  const handleDeleteInstruction = (instructionId: string) => {
    const nextInstructions = customInstructions.filter((instruction) => instruction.id !== instructionId)
    const nextSelectedInstructionIds = new Set(selectedInstructionIds)
    nextSelectedInstructionIds.delete(instructionId)

    setCustomInstructions(nextInstructions)
    setSelectedInstructionIds(nextSelectedInstructionIds)
  }

  const toggleInstruction = (instructionId: string) => {
    const nextSelectedInstructionIds = new Set(selectedInstructionIds)
    if (nextSelectedInstructionIds.has(instructionId)) {
      nextSelectedInstructionIds.delete(instructionId)
    } else {
      nextSelectedInstructionIds.add(instructionId)
    }

    setSelectedInstructionIds(nextSelectedInstructionIds)
  }

  const moveTask = (taskId: string, direction: 'up' | 'down') => {
    setOrderedTasks((prev) => {
      const currentIndex = prev.findIndex((task) => task.id === taskId)
      if (currentIndex === -1) return prev

      const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      if (nextIndex < 0 || nextIndex >= prev.length) return prev

      const nextTasks = [...prev]
      const [movedTask] = nextTasks.splice(currentIndex, 1)
      nextTasks.splice(nextIndex, 0, movedTask)
      return nextTasks
    })
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
          className="relative w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-xl"
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

          <div className="border-b bg-muted/20 px-4 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Format
                </div>
                <div className="flex flex-wrap gap-2">
                  {FORMAT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormat(option.value)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                        format === option.value
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-white text-foreground hover:bg-muted'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={includeTags}
                    onChange={(event) => setIncludeTags(event.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  Include tags
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={includePriority}
                    onChange={(event) => setIncludePriority(event.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  Include priority
                </label>
              </div>
            </div>
          </div>

          <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
            <div className="border-b p-4 md:border-b-0 md:border-r">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-foreground">Prompt Preview</label>
                <span className="text-xs text-muted-foreground">Updates automatically from the controls.</span>
              </div>
              <textarea
                value={exportText}
                onChange={(event) => setExportText(event.target.value)}
                className="min-h-[560px] w-full rounded-lg border border-border px-3 py-3 text-sm leading-6 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex min-h-[560px] flex-col">
              <div className="space-y-4 p-4">
                <div className="rounded-lg border border-border p-3">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Task Order</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Reorder the exported list without changing the board.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {orderedTasks.map((task, index) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-muted/10 px-3 py-2"
                      >
                        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-foreground">
                            {index + 1}. {task.title}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {task.description?.trim() || 'No description provided.'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveTask(task.id, 'up')}
                            disabled={index === 0}
                            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-white hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`Move ${task.title} up`}
                          >
                            <MoveUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveTask(task.id, 'down')}
                            disabled={index === orderedTasks.length - 1}
                            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-white hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`Move ${task.title} down`}
                          >
                            <MoveDown className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-border p-3">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Saved Instructions</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Choose reusable guidance to append below the task list.
                    </p>
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

                <div className="rounded-lg border border-border p-3">
                  <button
                    type="button"
                    onClick={() => setIsAddInstructionOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div>
                      <div className="text-sm font-semibold text-foreground">Add Custom Instruction</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Save a new reusable prompt snippet.
                      </div>
                    </div>
                    {isAddInstructionOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {isAddInstructionOpen ? (
                    <div className="mt-4 space-y-3 rounded-lg border border-border bg-muted/20 p-3">
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
                        <Plus className="h-4 w-4" /> Save Instruction
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between border-t bg-muted/20 px-4 py-3">
                <div className="text-sm text-muted-foreground">
                  {orderedTasks.length} task{orderedTasks.length === 1 ? '' : 's'} selected
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
