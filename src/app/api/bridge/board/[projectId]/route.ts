import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'
import { getProjectTasks } from '@/domains/task/queries'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await validateBridgeRequest(request)
  if (isBridgeAuthError(auth)) return auth

  const { projectId } = await params

  // Verify user is a member of this project
  const { data: membership } = await auth.supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', auth.userId)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this project' }, { status: 403 })
  }

  // Get project info
  const { data: project } = await auth.supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  // Get all tasks with tags
  const tasks = await getProjectTasks(auth.supabase, projectId)

  // Get all tags for the project
  const { data: tags } = await auth.supabase
    .from('tags')
    .select('*')
    .eq('project_id', projectId)

  return NextResponse.json({ project, tasks, tags })
}
