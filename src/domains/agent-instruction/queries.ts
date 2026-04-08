import { SupabaseClient } from '@supabase/supabase-js'
import {
  AgentInstructionFile,
  AgentInstructionFileMeta,
  AgentInstructionSet,
  AgentInstructionSetWithFileMeta,
  AgentInstructionSetWithFiles,
  ResolvedInstructionSet,
} from './types'

type AgentInstructionSetWithFilesRow = AgentInstructionSet & {
  agent_instruction_set_files?: AgentInstructionFile[]
}

type AgentInstructionSetWithFileMetaRow = AgentInstructionSet & {
  agent_instruction_set_files?: AgentInstructionFileMeta[]
}

function sortInstructionSets<T extends AgentInstructionSet>(sets: T[]) {
  return [...sets].sort((left, right) => {
    if (left.scope !== right.scope) {
      return left.scope === 'global' ? -1 : 1
    }

    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order
    }

    return left.name.localeCompare(right.name)
  })
}

function sortInstructionFiles<T extends { file_name: string }>(files: T[]) {
  return [...files].sort((left, right) => left.file_name.localeCompare(right.file_name))
}

export async function getProjectInstructionSets(
  client: SupabaseClient,
  projectId: string
): Promise<AgentInstructionSetWithFiles[]> {
  const { data, error } = await client
    .from('agent_instruction_sets')
    .select(`
      *,
      agent_instruction_set_files(*)
    `)
    .eq('project_id', projectId)
    .order('scope')
    .order('sort_order')
    .order('name')

  if (error) throw error

  const mapped = (data as unknown as AgentInstructionSetWithFilesRow[]).map((set) => ({
    ...set,
    files: sortInstructionFiles(set.agent_instruction_set_files ?? []),
  }))

  return sortInstructionSets(mapped)
}

export async function getProjectInstructionSetMetadata(
  client: SupabaseClient,
  projectId: string
): Promise<AgentInstructionSetWithFileMeta[]> {
  const { data, error } = await client
    .from('agent_instruction_sets')
    .select(`
      *,
      agent_instruction_set_files(
        id,
        set_id,
        file_name,
        content_hash,
        created_at,
        updated_at
      )
    `)
    .eq('project_id', projectId)
    .eq('is_active', true)
    .order('scope')
    .order('sort_order')
    .order('name')

  if (error) throw error

  const mapped = (data as unknown as AgentInstructionSetWithFileMetaRow[]).map((set) => ({
    ...set,
    files: sortInstructionFiles(set.agent_instruction_set_files ?? []),
  }))

  return sortInstructionSets(mapped)
}

export async function getTaskLinkedInstructionSetIds(
  client: SupabaseClient,
  taskId: string
): Promise<string[]> {
  const { data, error } = await client
    .from('task_instruction_set_links')
    .select('set_id')
    .eq('task_id', taskId)

  if (error) throw error
  return (data ?? []).map((row) => row.set_id as string)
}

export async function getResolvedTaskInstructionSets(
  client: SupabaseClient,
  projectId: string,
  taskId: string
): Promise<ResolvedInstructionSet[]> {
  const globalSetsPromise = client
    .from('agent_instruction_sets')
    .select(`
      *,
      agent_instruction_set_files(*)
    `)
    .eq('project_id', projectId)
    .eq('scope', 'global')
    .eq('is_active', true)

  const linkedIdsPromise = getTaskLinkedInstructionSetIds(client, taskId)

  const [globalSetsResult, linkedSetIds] = await Promise.all([
    globalSetsPromise,
    linkedIdsPromise,
  ])

  if (globalSetsResult.error) throw globalSetsResult.error

  const globalSets = (globalSetsResult.data ?? []) as unknown as AgentInstructionSetWithFilesRow[]

  let linkedSets: AgentInstructionSetWithFilesRow[] = []
  if (linkedSetIds.length > 0) {
    const linkedSetsResult = await client
      .from('agent_instruction_sets')
      .select(`
        *,
        agent_instruction_set_files(*)
      `)
      .in('id', linkedSetIds)
      .eq('is_active', true)

    if (linkedSetsResult.error) throw linkedSetsResult.error
    linkedSets = (linkedSetsResult.data ?? []) as unknown as AgentInstructionSetWithFilesRow[]
  }

  const resolvedById = new Map<string, ResolvedInstructionSet>()

  for (const set of linkedSets) {
    resolvedById.set(set.id, {
      id: set.id,
      name: set.name,
      code: set.code,
      scope: set.scope,
      source: 'linked',
      files: sortInstructionFiles((set.agent_instruction_set_files ?? []).map((file) => ({
        file_name: file.file_name,
        content: file.content,
        content_hash: file.content_hash,
        updated_at: file.updated_at,
      }))),
    })
  }

  for (const set of globalSets) {
    const existing = resolvedById.get(set.id)
    resolvedById.set(set.id, {
      id: set.id,
      name: set.name,
      code: set.code,
      scope: set.scope,
      source: 'global',
      files:
        existing?.files ??
        sortInstructionFiles((set.agent_instruction_set_files ?? []).map((file) => ({
          file_name: file.file_name,
          content: file.content,
          content_hash: file.content_hash,
          updated_at: file.updated_at,
        }))),
    })
  }

  return Array.from(resolvedById.values()).sort((left, right) => {
    if (left.scope !== right.scope) {
      return left.scope === 'global' ? -1 : 1
    }

    return left.name.localeCompare(right.name)
  })
}