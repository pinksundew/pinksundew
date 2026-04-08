import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'
import { requireProjectMembership } from '@/lib/bridge-access'
import { createTag } from '@/domains/tag/mutations'
import { getProjectTags } from '@/domains/tag/queries'

export async function GET(request: NextRequest) {
  const auth = await validateBridgeRequest(request)
  if (isBridgeAuthError(auth)) return auth

  const projectId = request.nextUrl.searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  const membershipError = await requireProjectMembership(auth.supabase, auth.userId, projectId)
  if (membershipError) {
    return membershipError
  }

  const tags = await getProjectTags(auth.supabase, projectId)
  return NextResponse.json(tags)
}

export async function POST(request: NextRequest) {
  const auth = await validateBridgeRequest(request)
  if (isBridgeAuthError(auth)) return auth

  const body = await request.json()
  const projectId = typeof body.project_id === 'string' ? body.project_id : null
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const color = typeof body.color === 'string' ? body.color : '#3b82f6'

  if (!projectId || !name) {
    return NextResponse.json({ error: 'project_id and name are required' }, { status: 400 })
  }

  const membershipError = await requireProjectMembership(auth.supabase, auth.userId, projectId)
  if (membershipError) {
    return membershipError
  }

  const tag = await createTag(auth.supabase, {
    project_id: projectId,
    name,
    color,
  })

  return NextResponse.json(tag, { status: 201 })
}