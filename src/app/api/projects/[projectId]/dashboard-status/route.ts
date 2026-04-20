import { NextResponse } from 'next/server'
import { getProjectDashboardStatus } from '@/domains/project/dashboard-status'
import { requireProjectMembership } from '@/lib/bridge-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const membershipError = await requireProjectMembership(adminClient, user.id, projectId)
  if (membershipError) {
    return membershipError
  }

  const status = await getProjectDashboardStatus(adminClient, projectId, user.id)
  return NextResponse.json(status)
}
