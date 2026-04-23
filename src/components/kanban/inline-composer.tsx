'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Maximize2, Send } from 'lucide-react'
import { TaskStatus, TaskPriority, TaskWithTags } from '@/domains/task/types'
import { getAnonymousTaskLimitPrompt } from '@/lib/anon-limits'

type InlineComposerProps = {
  projectId: string
  status: TaskStatus
  anonymousTaskLimitReached?: boolean
  onPromptAuth?: (message: string) => void
  onCreateTask: (task: CreateTaskInput) => Promise<TaskWithTags>
  onUpdateTaskTitle?: (taskId: string, title: string) => Promise<void>
  onExpandRequest?: (draft: { title: string; description: string }) => void
}

type CreateTaskInput = {
  project_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  position: number
  predecessor_id: string | null
  assignee_id: string | null
  due_date: string | null
}

const DRAFTING_PLACEHOLDER = 'Drafting...'

export function InlineComposer({
  projectId,
  status,
  anonymousTaskLimitReached = false,
  onPromptAuth,
  onCreateTask,
  onUpdateTaskTitle,
  onExpandRequest,
}: InlineComposerProps) {
  const [isComposing, setIsComposing] = useState(false)
  const [titleText, setTitleText] = useState('')
  const [descriptionText, setDescriptionText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const composerRef = useRef<HTMLDivElement>(null)

  // Auto-focus textarea when entering compose mode
  useEffect(() => {
    if (isComposing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isComposing])

  // Auto-resize textarea
  const handleTextareaInput = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }, [])

  // Click outside handler
  useEffect(() => {
    if (!isComposing) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        composerRef.current &&
        !composerRef.current.contains(event.target as Node)
      ) {
        // Only close if there's no text entered
        if (!titleText.trim() && !descriptionText.trim()) {
          setIsComposing(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isComposing, titleText, descriptionText])

  const handlePillClick = () => {
    if (anonymousTaskLimitReached && onPromptAuth) {
      onPromptAuth(getAnonymousTaskLimitPrompt())
      return
    }
    setIsComposing(true)
  }

  const handleCancel = () => {
    setIsComposing(false)
    setTitleText('')
    setDescriptionText('')
  }

  const handleSubmit = async () => {
    const description = descriptionText.trim()
    if (!description || isSubmitting) return

    setIsSubmitting(true)

    const hasCustomTitle = titleText.trim().length > 0
    const initialTitle = hasCustomTitle ? titleText.trim() : DRAFTING_PLACEHOLDER

    const taskInput: CreateTaskInput = {
      project_id: projectId,
      title: initialTitle,
      description,
      status,
      priority: 'medium',
      position: 0, // Will be computed by createTask
      predecessor_id: null,
      assignee_id: null,
      due_date: null,
    }

    try {
      // Optimistically create the task
      const newTask = await onCreateTask(taskInput)

      // Reset composer state immediately
      setIsComposing(false)
      setTitleText('')
      setDescriptionText('')
      setIsSubmitting(false)

      // If no custom title, fetch AI-generated title in background
      if (!hasCustomTitle && onUpdateTaskTitle) {
        generateAITitle(newTask.id, description)
      }
    } catch (error) {
      console.error('Failed to create task:', error)
      setIsSubmitting(false)
    }
  }

  const generateAITitle = async (taskId: string, description: string) => {
    try {
      const response = await fetch('/api/tasks/ai-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })

      if (!response.ok) {
        console.error('AI title generation failed')
        return
      }

      const { title } = await response.json()
      if (title && onUpdateTaskTitle) {
        await onUpdateTaskTitle(taskId, title)
      }
    } catch (error) {
      console.error('Error generating AI title:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter to submit
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
      return
    }

    // Escape to cancel (only if empty)
    if (e.key === 'Escape') {
      if (!titleText.trim() && !descriptionText.trim()) {
        handleCancel()
      }
    }
  }

  const handleExpandClick = () => {
    if (onExpandRequest) {
      onExpandRequest({
        title: titleText,
        description: descriptionText,
      })
      handleCancel()
    }
  }

  return (
    <motion.div
      layout
      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
      ref={composerRef}
      className="w-full"
    >
      <AnimatePresence mode="wait" initial={false}>
        {!isComposing ? (
          <motion.button
            key="pill"
            type="button"
            onClick={handlePillClick}
            initial={{ opacity: 0.92, scale: 0.98, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            className="group flex h-11 w-full items-center justify-center rounded-full border border-pink-300 bg-pink-50 px-6 text-sm font-semibold text-pink-700 shadow-md transition-all hover:bg-pink-100 hover:border-pink-400 hover:shadow-lg"
          >
            Add Task +
          </motion.button>
        ) : (
          <motion.div
            key="composer"
            initial={{ opacity: 0, scale: 0.98, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative left-1/2 w-[min(44rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-2xl border border-pink-200 bg-white shadow-xl"
          >
            <input
              type="text"
              value={titleText}
              onChange={(e) => setTitleText(e.target.value)}
              placeholder="Task Title (Optional - auto-generated if blank)"
              className="w-full rounded-t-2xl border-b border-pink-100 bg-transparent px-4 py-3 text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none"
            />

            <textarea
              ref={textareaRef}
              value={descriptionText}
              onChange={(e) => {
                setDescriptionText(e.target.value)
                handleTextareaInput()
              }}
              onKeyDown={handleKeyDown}
              placeholder="Describe the task... (Ctrl/Cmd + Enter to submit)"
              rows={3}
              className="w-full resize-none bg-transparent px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
              style={{ minHeight: '80px', maxHeight: '200px' }}
            />

            <div className="flex items-center justify-between border-t border-pink-100 px-3 py-2">
              <div className="flex items-center gap-1">
                {onExpandRequest && (
                  <button
                    type="button"
                    onClick={handleExpandClick}
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                    aria-label="Expand to full modal"
                    title="Open full task editor"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 py-2 text-sm text-gray-500 transition-colors hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!descriptionText.trim() || isSubmitting}
                className="flex h-11 min-w-[96px] items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Submit</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
