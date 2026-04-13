'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ConfirmModal } from './confirm-modal'

type ProjectSettingsModalProps = {
  isOpen: boolean
  projectId: string
  projectName: string
  onClose: () => void
  onProjectUpdated?: (name: string) => void
  onProjectDeleted?: () => void
}

export function ProjectSettingsModal({
  isOpen,
  projectId,
  projectName,
  onClose,
  onProjectUpdated,
  onProjectDeleted,
}: ProjectSettingsModalProps) {
  const [name, setName] = useState(projectName)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!name.trim() || name === projectName) return

    setIsSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('projects')
        .update({ name: name.trim() })
        .eq('id', projectId)

      if (updateError) throw updateError

      onProjectUpdated?.(name.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (deleteError) throw deleteError

      onProjectDeleted?.()
      onClose()
      // Redirect to home after deletion
      window.location.href = '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project')
      setIsDeleting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Settings className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Project Settings</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-6 p-6">
              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              {/* Project Name */}
              <div>
                <label htmlFor="project-name" className="mb-2 block text-sm font-medium text-foreground">
                  Project Name
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter project name..."
                />
              </div>

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !name.trim() || name === projectName}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>

              {/* Danger Zone */}
              <div className="border-t border-border pt-6">
                <h3 className="mb-3 text-sm font-semibold text-rose-600">Danger Zone</h3>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? 'Deleting...' : 'Delete Project'}
                </button>
                <p className="mt-2 text-xs text-muted-foreground">
                  This action cannot be undone. All tasks and data will be permanently deleted.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Project"
        message={`Are you sure you want to delete "${projectName}"? This will permanently remove all tasks, tags, and project data.`}
        confirmText="Delete Project"
        cancelText="Cancel"
        isDestructive
        onConfirm={handleDelete}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </>
  )
}
