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

export async function getProjectInstructionFilesByIds(
  client: SupabaseClient,
  projectId: string,
  fileIds: string[]
): Promise<AgentInstructionFile[]> {
  const uniqueFileIds = Array.from(
    new Set(fileIds.map((fileId) => fileId.trim()).filter((fileId) => fileId.length > 0))
  )

  if (uniqueFileIds.length === 0) {
    return []
  }

  const { data: files, error: filesError } = await client
    .from('agent_instruction_set_files')
    .select('*')
    .in('id', uniqueFileIds)

  if (filesError) throw filesError

  const typedFiles = (files ?? []) as AgentInstructionFile[]
  if (typedFiles.length === 0) {
    return []
  }

  const setIds = Array.from(new Set(typedFiles.map((file) => file.set_id)))

  const { data: sets, error: setsError } = await client
    .from('agent_instruction_sets')
    .select('id')
    .eq('project_id', projectId)
    .in('id', setIds)

  if (setsError) throw setsError

  const allowedSetIds = new Set((sets ?? []).map((set) => set.id as string))

  const filesById = new Map(
    typedFiles
      .filter((file) => allowedSetIds.has(file.set_id))
      .map((file) => [file.id, file] as const)
  )

  return uniqueFileIds
    .map((fileId) => filesById.get(fileId))
    .filter((file): file is AgentInstructionFile => Boolean(file))
}

// Task linking is no longer supported - only global instruction sets are used
// Keeping function for API compatibility, returns empty array
export async function getTaskLinkedInstructionSetIds(
  _client: SupabaseClient,
  _taskId: string
): Promise<string[]> {
  return []
}

// Simplified: only returns global instruction sets (no task linking)
export async function getResolvedTaskInstructionSets(
  client: SupabaseClient,
  projectId: string,
  _taskId: string
): Promise<ResolvedInstructionSet[]> {
  const { data, error } = await client
    .from('agent_instruction_sets')
    .select(`
      *,
      agent_instruction_set_files(*)
    `)
    .eq('project_id', projectId)
    .eq('scope', 'global')
    .eq('is_active', true)
    .order('sort_order')
    .order('name')

  if (error) throw error

  const globalSets = (data ?? []) as unknown as AgentInstructionSetWithFilesRow[]

  return globalSets.map((set) => ({
    id: set.id,
    name: set.name,
    code: set.code,
    scope: set.scope,
    source: 'global' as const,
    files: sortInstructionFiles((set.agent_instruction_set_files ?? []).map((file) => ({
      file_name: file.file_name,
      content: file.content,
      content_hash: file.content_hash,
      updated_at: file.updated_at,
    }))),
  }))
}