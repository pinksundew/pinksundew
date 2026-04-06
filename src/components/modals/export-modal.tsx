'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, FileJson, FileText } from 'lucide-react'
import { TaskWithTags } from '@/domains/task/types'

type ExportModalProps = {
  isOpen: boolean
  onClose: () => void
  tasks: TaskWithTags[]
  projectName: string
}

export function ExportModal({ isOpen, onClose, tasks, projectName }: ExportModalProps) {
  const [format, setFormat] = useState<'json' | 'csv' | 'markdown'>('json')

  const handleExport = () => {
    let content = ''
    let mimeType = 'text/plain'
    let ext = format

    if (format === 'json') {
      content = JSON.stringify(tasks, null, 2)
      mimeType = 'application/json'
    } else if (format === 'csv') {
      const headers = ['ID', 'Title', 'Status', 'Priority', 'Description']
      const rows = tasks.map(t => [
        t.id, 
        `"${t.title.replace(/"/g, '""')}"`, 
        t.status, 
        t.priority, 
        `"${(t.description || '').replace(/"/g, '""')}"`
      ])
      content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      mimeType = 'text/csv'
    } else if (format === 'markdown') {
      content = `# ${projectName} Tasks\n\n`
      const byStatus = tasks.reduce((acc, t) => {
        acc[t.status] = acc[t.status] || []
        acc[t.status].push(t)
        return acc
      }, {} as Record<string, TaskWithTags[]>)

      for (const [status, group] of Object.entries(byStatus)) {
        content += `## ${status.toUpperCase()}\n\n`
        group.forEach(t => {
          content += `- **${t.title}** (Priority: ${t.priority})\n`
          if (t.description) content += `  > ${t.description.split('\n').join('\n  > ')}\n`
        })
        content += '\n'
      }
      ext = 'markdown'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-export.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    onClose()
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
          className="relative w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-xl font-semibold">Export Tasks</h2>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <p className="text-sm text-gray-600">
              Export {tasks.length} tasks from &quot;{projectName}&quot;. Select your preferred format:
            </p>
            
            <div className="space-y-2">
              <label 
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 hover:border-blue-500 ${format === 'json' ? 'border-blue-500 bg-blue-50' : ''}`}
                onClick={() => setFormat('json')}
              >
                <div className="flex items-center gap-3">
                  <FileJson className={`h-5 w-5 ${format === 'json' ? 'text-blue-600' : 'text-gray-500'}`} />
                  <span className="font-medium">JSON File</span>
                </div>
                <input type="radio" name="format" checked={format === 'json'} readOnly className="h-4 w-4" />
              </label>

              <label 
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 hover:border-blue-500 ${format === 'csv' ? 'border-blue-500 bg-blue-50' : ''}`}
                onClick={() => setFormat('csv')}
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-5 w-5 items-center justify-center font-bold text-xs ${format === 'csv' ? 'text-blue-600' : 'text-gray-500'}`}>CSV</span>
                  <span className="font-medium">Spreadsheet (CSV)</span>
                </div>
                <input type="radio" name="format" checked={format === 'csv'} readOnly className="h-4 w-4" />
              </label>

              <label 
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 hover:border-blue-500 ${format === 'markdown' ? 'border-blue-500 bg-blue-50' : ''}`}
                onClick={() => setFormat('markdown')}
              >
                <div className="flex items-center gap-3">
                  <FileText className={`h-5 w-5 ${format === 'markdown' ? 'text-blue-600' : 'text-gray-500'}`} />
                  <span className="font-medium">Markdown</span>
                </div>
                <input type="radio" name="format" checked={format === 'markdown'} readOnly className="h-4 w-4" />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button onClick={onClose} className="rounded-md border px-4 py-2 hover:bg-gray-50">
                Cancel
              </button>
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                <Download className="h-4 w-4" /> Export
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
