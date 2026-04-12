import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'
import { requireProjectMembership } from '@/lib/bridge-access'

/**
 * Lightweight endpoint that returns only the concatenated content hashes
 * of active global instruction files for a project.
 * 
 * Used by MCP servers to efficiently poll for instruction changes without
 * fetching full content. Returns a single hash string that changes when
 * any active global instruction is modified.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const auth = await validateBridgeRequest(request)
  if (isBridgeAuthError(auth)) return auth

  const { projectId } = await context.params

  if (!projectId || typeof projectId !== 'string') {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  const membershipError = await requireProjectMembership(auth.supabase, auth.userId, projectId)
  if (membershipError) {
    return membershipError
  }

  // Query only active global instruction sets and their file content_hash values
  const { data: sets, error } = await auth.supabase
    .from('agent_instruction_sets')
    .select(`
      id,
      agent_instruction_set_files(
        content_hash
      )
    `)
    .eq('project_id', projectId)
    .eq('is_active', true)
    .eq('scope', 'global')

  if (error) {
    console.error('[instructions/hash] Query error:', error)
    return NextResponse.json({ error: 'Failed to fetch instruction hashes' }, { status: 500 })
  }

  // Concatenate all content hashes in a deterministic order
  const hashes: string[] = []
  for (const set of sets || []) {
    const files = set.agent_instruction_set_files as { content_hash: string }[] | null
    if (files) {
      for (const file of files) {
        if (file.content_hash) {
          hashes.push(file.content_hash)
        }
      }
    }
  }

  // Sort for deterministic ordering and join
  const combinedHash = hashes.sort().join(':')

  return NextResponse.json({ hash: combinedHash })
}
