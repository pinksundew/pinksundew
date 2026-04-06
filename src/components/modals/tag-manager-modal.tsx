'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Trash2, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Tag } from '@/domains/tag/types'
import { createTag, deleteTag } from '@/domains/tag/mutations'

type TagManagerModalProps = {
  isOpen: boolean
  onClose: () => void
  projectId: string
}

export function TagManagerModal({ isOpen, onClose, projectId }: TagManagerModalProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3b82f6')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (isOpen) fetchTags()
  }, [isOpen])

  const fetchTags = async () => {
    const { data } = await supabase.from('tags').select('*').eq('project_id', projectId)
    if (data) setTags(data)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTagName.trim()) return

    setLoading(true)
    try {
      const tag = await createTag(supabase, {
        project_id: projectId,
        name: newTagName.trim(),
        color: newTagColor
      })
      setTags([...tags, tag])
      setNewTagName('')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tag?')) return
    setLoading(true)
    try {
      await deleteTag(supabase, id)
      setTags(tags.filter(t => t.id !== id))
    } catch (e) {
      console.error(e)
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
          className="relative w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-xl font-semibold">Manage Tags</h2>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4">
            <form onSubmit={handleCreate} className="flex gap-2 mb-6 items-end">
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">New Tag Name</label>
                <input 
                  required
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  className="w-full rounded-md border p-2 text-sm"
                  placeholder="e.g. Bug, Feature"
                />
              </div>
              <div className="w-16">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Color</label>
                <input 
                  type="color"
                  value={newTagColor}
                  onChange={e => setNewTagColor(e.target.value)}
                  className="h-[38px] w-full rounded-md border p-1"
                />
              </div>
              <button 
                type="submit"
                disabled={loading || !newTagName.trim()}
                className="flex items-center justify-center h-[38px] rounded-md bg-blue-600 px-3 text-white disabled:opacity-50"
              >
                <Plus className="h-5 w-5" />
              </button>
            </form>

            <h3 className="text-sm font-semibold text-gray-500 mb-2">Existing Tags</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {tags.length === 0 ? (
                <p className="text-sm text-gray-400">No tags yet.</p>
              ) : tags.map(tag => (
                <div key={tag.id} className="flex items-center justify-between border rounded-md p-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: tag.color }}></div>
                    <span className="text-sm font-medium">{tag.name}</span>
                  </div>
                  <button 
                    type="button"
                    title="Delete Tag"
                    onClick={() => handleDelete(tag.id)}
                    className="text-red-500 p-1 rounded-md hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 mt-2">
              <button onClick={onClose} className="rounded-md border px-4 py-2 hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
