import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'
import { createTask } from '@/domains/task/mutations'

export async function POST(request: NextRequest) {
  const auth = await validateBridgeRequest(request)
  if (isBridgeAuthError(auth)) return auth

  const body = await request.json()
  const { project_id, title, description, status, priority, assignee_id, due_date, position } = body

  if (!project_id || !title) {
    return NextResponse.json({ error: 'project_id and title are required' }, { status: 400 })
  }

  // Verify user is a member of the project
  const { data: membership } = await auth.supabase
    .from('project_members')
    .select('id')
    .eq('project_id', project_id)
    .eq('user_id', auth.userId)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this project' }, { status: 403 })
  }

  const task = await createTask(auth.supabase, {
    project_id,
    title,
    description: description ?? null,
    status: status ?? 'todo',
    priority: priority ?? 'medium',
    assignee_id: assignee_id ?? null,
    due_date: due_date ?? null,
    predecessor_id: null,
    position: position ?? 0,
  })

  return NextResponse.json(task, { status: 201 })
}
