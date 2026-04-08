import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'
import { requireProjectMembership } from '@/lib/bridge-access'
import { getProjectAgentControls } from '@/domains/agent-control/queries'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await validateBridgeRequest(request)
  if (isBridgeAuthError(auth)) return auth

  const { projectId } = await params
  const membershipError = await requireProjectMembership(auth.supabase, auth.userId, projectId)
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
