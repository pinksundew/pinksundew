'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  ChevronDown,
  Clipboard,
  GripVertical,
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

type ExportModalProps = {
  isOpen: boolean
  onClose: () => void
  tasks: TaskWithTags[]
  projectName: string
  mode?: 'authenticated' | 'guest'
}

type ExportFormat = 'numbered' | 'bullets' | 'checkboxes' | 'compact'

type ExportOptions = {
  format: ExportFormat
  includeTags: boolean
  includePriority: boolean
  includeTicketNumber: boolean
}

const FORMAT_OPTIONS: Array<{ value: ExportFormat; label: string }> = [
  { value: 'numbered', label: 'Numbered' },
  { value: 'bullets', label: 'Bullets' },
  { value: 'checkboxes', label: 'Checkboxes' },
  { value: 'compact', label: 'Compact' },
]

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

function generateExportText(tasks: TaskWithTags[], options: ExportOptions) {
  const taskSections = tasks.map((task, index) => formatTaskBlock(task, index, options))
  return `Implement these tasks:\n\n${taskSections.join('\n\n')}`
}

export function ExportModal({
  isOpen,
  onClose,
  tasks,
  projectName,
  mode = 'authenticated',
}: ExportModalProps) {
  const isGuestMode = mode === 'guest'
  const [orderedTasks, setOrderedTasks] = useState<TaskWithTags[]>(tasks)
  const [format, setFormat] = useState<ExportFormat>('numbered')
  const [includeTags, setIncludeTags] = useState(!isGuestMode)
  const [includePriority, setIncludePriority] = useState(true)
  const [includeTicketNumber, setIncludeTicketNumber] = useState(!isGuestMode)
  const [exportCopied, setExportCopied] = useState(false)
  
  // Card expansion states - all collapsed by default
  const [expandedCards, setExpandedCards] = useState({
    options: false,
    taskOrder: false,
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const exportText = useMemo(
    () =>
      generateExportText(orderedTasks, {
        format,
        includeTags: isGuestMode ? false : includeTags,
        includePriority,
        includeTicketNumber: isGuestMode ? false : includeTicketNumber,
      }),
    [orderedTasks, format, includeTags, includePriority, includeTicketNumber, isGuestMode]
  )

  const toggleCard = (card: keyof typeof expandedCards) => {
    setExpandedCards((prev) => ({ ...prev, [card]: !prev[card] }))
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
          <div className="flex items-center justify-between p-4 shrink-0">
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

          <div className="m-4 grid min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/40 md:grid-cols-[minmax(0,1.85fr)_minmax(270px,0.75fr)]">
            <div className="flex min-h-0 flex-col border-b border-slate-200 bg-white p-5 md:border-b-0 md:border-r">
              <div className="mb-2 flex items-center justify-between gap-3 shrink-0">
                <label className="block text-sm font-medium text-foreground">Prompt Preview</label>
                <span className="text-xs text-muted-foreground">Updates automatically from the controls.</span>
              </div>
              <textarea
                value={exportText}
                readOnly
                className="flex-1 w-full rounded-xl border border-slate-200 px-4 py-4 text-sm leading-6 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary overflow-y-auto"
              />
            </div>

            <div className="flex min-h-0 flex-col overflow-hidden bg-slate-50/60">
              <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <button
                    type="button"
                    onClick={() => toggleCard('options')}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Prompt Options</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Tighten the output format without changing the selected tasks.
                      </p>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedCards.options ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {expandedCards.options && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 space-y-4">
                          {isGuestMode ? (
                            <p className="rounded-md border border-rose-100 bg-rose-50 px-2.5 py-2 text-xs text-rose-700">
                              Guest exports always omit ticket numbers and tags.
                            </p>
                          ) : null}

                          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
                            <label className="text-sm font-medium text-foreground" htmlFor="export-format">
                              Format
                            </label>
                            <select
                              id="export-format"
                              value={format}
                              onChange={(event) => setFormat(event.target.value as ExportFormat)}
                              className="w-full max-w-[180px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              {FORMAT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="mt-4 flex flex-col gap-3">
                            {!isGuestMode ? (
                              <>
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
                              </>
                            ) : null}
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleCard('taskOrder')}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Task Order</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Reorder the exported list by dragging the handle.
                      </p>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedCards.taskOrder ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {expandedCards.taskOrder && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3">
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-slate-200 bg-white/90 px-4 py-3">
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
