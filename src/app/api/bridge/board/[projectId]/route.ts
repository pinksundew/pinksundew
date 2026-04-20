import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'
import { requireProjectMembership } from '@/lib/bridge-access'
import { getProjectAgentControls } from '@/domains/agent-control/queries'
import { getProjectInstructionSetMetadata } from '@/domains/agent-instruction/queries'
import { getProjectTasks } from '@/domains/task/queries'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await validateBridgeRequest(request)
  if (isBridgeAuthError(auth)) return auth

  const { projectId } = await params

  // Verify user is a member of this project
  const membershipError = await requireProjectMembership(auth.supabase, auth.userId, projectId, {
    recordMcpActivity: true,
    requestPath: request.nextUrl.pathname,
  })
  if (membershipError) {
    return membershipError
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

  const [instructionSetMetadata, agentControls] = await Promise.all([
    getProjectInstructionSetMetadata(auth.supabase, projectId),
    getProjectAgentControls(auth.supabase, projectId),
  ])

  return NextResponse.json({
    project,
    tasks,
    tags,
    instructions: instructionSetMetadata,
    instruction_sets: instructionSetMetadata,
    agent_controls: agentControls,
  })
}
