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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
  includeTicketNumber: boolean
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
    options.includeTicketNumber ? `Ticket Number: ${task.id}` : null,
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

type SortableTaskItemProps = {
  task: TaskWithTags
  index: number
}

function SortableTaskItem({ task, index }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border border-border bg-white px-2 py-1.5 transition-shadow ${
        isDragging ? 'shadow-lg ring-2 ring-primary/20 bg-muted/20' : 'hover:border-primary/30'
      }`}
    >
      <div 
        {...attributes} 
        {...listeners} 
        className="cursor-grab p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 shrink-0" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">
          {index + 1}. {task.title}
        </div>
      </div>
    </div>
  )
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
  const [includeTicketNumber, setIncludeTicketNumber] = useState(true)
  const [isAddInstructionOpen, setIsAddInstructionOpen] = useState(false)
  const [exportText, setExportText] = useState('')
  const [exportCopied, setExportCopied] = useState(false)
  const [instructionTitle, setInstructionTitle] = useState('')
  const [instructionContent, setInstructionContent] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

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
        includeTicketNumber,
      })
    )
  }, [orderedTasks, selectedInstructions, format, includeTags, includePriority, includeTicketNumber])

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setOrderedTasks((prev) => {
      const oldIndex = prev.findIndex((t) => t.id === active.id)
      const newIndex = prev.findIndex((t) => t.id === over.id)
      return arrayMove(prev, oldIndex, newIndex)
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
          className="relative flex flex-col w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b p-4 shrink-0">
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

          <div className="grid flex-1 min-h-0 overflow-hidden md:grid-cols-[minmax(0,1.85fr)_minmax(270px,0.75fr)]">
            <div className="flex flex-col border-b p-5 md:border-b-0 md:border-r min-h-0">
              <div className="mb-2 flex items-center justify-between gap-3 shrink-0">
                <label className="block text-sm font-medium text-foreground">Prompt Preview</label>
                <span className="text-xs text-muted-foreground">Updates automatically from the controls.</span>
              </div>
              <textarea
                value={exportText}
                readOnly
                className="flex-1 w-full rounded-xl border border-border px-4 py-4 text-sm leading-6 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary overflow-y-auto"
              />
            </div>

            <div className="flex flex-col min-h-0 bg-muted/10 overflow-hidden">
              <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
                <div className="rounded-xl border border-border bg-white p-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Prompt Options</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Tighten the output format without changing the selected tasks.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
                    <label className="text-sm font-medium text-foreground" htmlFor="export-format">
                      Format
                    </label>
                    <select
                      id="export-format"
                      value={format}
                      onChange={(event) => setFormat(event.target.value as ExportFormat)}
                      className="w-full max-w-[180px] rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {FORMAT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-4 flex flex-col gap-3">
                    <label className="inline-flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={includeTicketNumber}
                        onChange={(event) => setIncludeTicketNumber(event.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      Include ticket number
                    </label>
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

                <div className="rounded-xl border border-border bg-white p-4 shrink-0">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Task Order</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Reorder the exported list by dragging the handle.
                    </p>
                  </div>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={orderedTasks.map((t) => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1 flex flex-col min-h-0">
                        {orderedTasks.map((task, index) => (
                          <SortableTaskItem key={task.id} task={task} index={index} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>

                <div className="rounded-xl border border-border bg-white p-4">
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

                <div className="rounded-xl border border-border bg-white p-4">
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

              <div className="mt-auto flex items-center justify-between border-t bg-white/90 px-4 py-3">
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
