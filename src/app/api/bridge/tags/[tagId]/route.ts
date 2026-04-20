import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'
import { requireProjectMembership } from '@/lib/bridge-access'
import { deleteTag, updateTag } from '@/domains/tag/mutations'

type TagProjectRow = {
  project_id: string
}

async function getTagProject(
  request: NextRequest,
  tagId: string
): Promise<
  | { auth: Awaited<ReturnType<typeof validateBridgeRequest>>; projectId?: undefined; response: NextResponse }
  | { auth: Exclude<Awaited<ReturnType<typeof validateBridgeRequest>>, NextResponse>; projectId: string; response?: undefined }
> {
  const auth = await validateBridgeRequest(request)
  if (isBridgeAuthError(auth)) {
    return { auth, response: auth }
  }

  const { data: tag, error } = await auth.supabase
    .from('tags')
    .select('project_id')
    .eq('id', tagId)
    .single()

  if (error || !tag) {
    return {
      auth,
      response: NextResponse.json({ error: 'Tag not found' }, { status: 404 }),
    }
  }

  const membershipError = await requireProjectMembership(
    auth.supabase,
    auth.userId,
    (tag as TagProjectRow).project_id,
    {
      recordMcpActivity: true,
      requestPath: request.nextUrl.pathname,
    }
  )
  if (membershipError) {
    return { auth, response: membershipError }
  }

  return { auth, projectId: (tag as TagProjectRow).project_id }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  const { tagId } = await params
  const access = await getTagProject(request, tagId)
  if (access.response) {
    return access.response
  }

  const body = await request.json()
  const updates: Record<string, string> = {}

  if (typeof body.name === 'string' && body.name.trim()) {
    updates.name = body.name.trim()
  }

  if (typeof body.color === 'string') {
    updates.color = body.color
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid tag updates provided' }, { status: 400 })
  }

  try {
    const updated = await updateTag(access.auth.supabase, tagId, updates)
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update tag' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  const { tagId } = await params
  const access = await getTagProject(request, tagId)
  if (access.response) {
    return access.response
  }

  const { data: tag, error } = await access.auth.supabase
    .from('tags')
    .select('*')
    .eq('id', tagId)
    .single()

  if (error || !tag) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
  }

  return NextResponse.json(tag)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  const { tagId } = await params
  const access = await getTagProject(request, tagId)
  if (access.response) {
    return access.response
  }

  try {
    await deleteTag(access.auth.supabase, tagId)
    return NextResponse.json({ deleted: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete tag' },
      { status: 500 }
    )
  }
}
