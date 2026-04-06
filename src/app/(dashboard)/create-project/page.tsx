'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { createProject } from '@/domains/project/mutations'

export default function CreateProjectPage() {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const project = await createProject(supabase, {
        name,
        description: desc,
        created_by: user.id
      })
      router.push(`/${project.id}`)
      router.refresh()
    } catch (err: any) {
      console.error(err)
      setErrorMsg('Failed to create project')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8 bg-white p-6 rounded-xl border border-border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Create your first project
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Let's get started by setting up a workspace for your tasks.
          </p>
        </div>

        {errorMsg && <div className="text-red-600 text-sm">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground">Project Name</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Acme Marketing"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Description (Optional)</label>
            <textarea
              className="mt-1 block w-full rounded-md border border-border px-3 py-2 border-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={3}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-70"
          >
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </div>
    </div>
  )
}
