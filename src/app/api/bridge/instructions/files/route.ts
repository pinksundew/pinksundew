import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'
import { requireProjectMembership } from '@/lib/bridge-access'
import { getProjectInstructionFilesByIds } from '@/domains/agent-instruction/queries'

const MAX_FILE_IDS_PER_REQUEST = 200

export async function POST(request: NextRequest) {
  const auth = await validateBridgeRequest(request)
  if (isBridgeAuthError(auth)) return auth

  const body = (await request.json().catch(() => null)) as {
    projectId?: unknown
    fileIds?: unknown
  } | null

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : ''
  const rawFileIds = Array.isArray(body.fileIds) ? body.fileIds : null

  if (!projectId || !rawFileIds) {
    return NextResponse.json({ error: 'projectId and fileIds are required' }, { status: 400 })
  }

  const fileIds = Array.from(
    new Set(
      rawFileIds
        .filter((fileId: unknown): fileId is string => typeof fileId === 'string')
        .map((fileId) => fileId.trim())
        .filter((fileId) => fileId.length > 0)
    )
  )

  if (fileIds.length > MAX_FILE_IDS_PER_REQUEST) {
    return NextResponse.json(
      {
        error: `Too many fileIds. Maximum ${MAX_FILE_IDS_PER_REQUEST} per request.`,
      },
      { status: 400 }
    )
  }

  if (fileIds.length === 0) {
    return NextResponse.json([])
  }

  const membershipError = await requireProjectMembership(auth.supabase, auth.userId, projectId, {
    recordMcpActivity: true,
    requestPath: request.nextUrl.pathname,
  })
  if (membershipError) {
    return membershipError
  }

  const files = await getProjectInstructionFilesByIds(auth.supabase, projectId, fileIds)

  return NextResponse.json(
    files.map((file) => ({
      id: file.id,
      set_id: file.set_id,
      file_name: file.file_name,
      content: file.content,
      content_hash: file.content_hash,
      updated_at: file.updated_at,
    }))
  )
}
