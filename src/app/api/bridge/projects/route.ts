import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'

export async function GET(request: NextRequest) {
  const auth = await validateBridgeRequest(request)
  if (isBridgeAuthError(auth)) return auth

  // Get projects where user is a member
  const { data, error } = await auth.supabase
    .from('project_members')
    .select('project_id, role, projects (*)')
    .eq('user_id', auth.userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const projects = data.map((pm: any) => ({
    ...pm.projects,
    role: pm.role,
  }))

  return NextResponse.json(projects)
}
