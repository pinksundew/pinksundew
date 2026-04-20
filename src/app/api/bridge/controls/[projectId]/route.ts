import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'
import { requireProjectMembership } from '@/lib/bridge-access'
import { upsertProjectAgentControls } from '@/domains/agent-control/mutations'
import { getProjectAgentControls } from '@/domains/agent-control/queries'
import { INSTRUCTION_SYNC_TARGET_CATALOG } from '@/domains/agent-control/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await validateBridgeRequest(request)
  if (isBridgeAuthError(auth)) return auth

  const { projectId } = await params
  const membershipError = await requireProjectMembership(auth.supabase, auth.userId, projectId, {
    recordMcpActivity: true,
    requestPath: request.nextUrl.pathname,
  })
  if (membershipError) {
    return membershipError
  }

  try {
    const controls = await getProjectAgentControls(auth.supabase, projectId)
    return NextResponse.json(controls)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load agent controls' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await validateBridgeRequest(request)
  if (isBridgeAuthError(auth)) return auth

  const { projectId } = await params
  const membershipError = await requireProjectMembership(auth.supabase, auth.userId, projectId, {
    recordMcpActivity: true,
    requestPath: request.nextUrl.pathname,
  })
  if (membershipError) {
    return membershipError
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const syncTarget =
    body && typeof body === 'object' && 'syncTarget' in body
      ? (body as { syncTarget?: unknown }).syncTarget
      : null

  if (typeof syncTarget !== 'string') {
    return NextResponse.json({ error: 'syncTarget must be a string' }, { status: 400 })
  }

  const allowedTargets = new Set(INSTRUCTION_SYNC_TARGET_CATALOG.map((target) => target.id))
  if (!allowedTargets.has(syncTarget as (typeof INSTRUCTION_SYNC_TARGET_CATALOG)[number]['id'])) {
    return NextResponse.json({ error: 'Invalid syncTarget' }, { status: 400 })
  }

  try {
    const current = await getProjectAgentControls(auth.supabase, projectId)
    const controls = await upsertProjectAgentControls(auth.supabase, {
      project_id: projectId,
      allow_task_completion: current.allow_task_completion,
      tool_toggles: {
        ...current.tool_toggles,
        [syncTarget]: true,
      },
      updated_by: auth.userId,
    })

    return NextResponse.json(controls)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update agent controls' },
      { status: 500 }
    )
  }
}
