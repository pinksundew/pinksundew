import { SupabaseClient } from '@supabase/supabase-js'
import {
  AgentInstructionFile,
  AgentInstructionSet,
  InstructionSetScope,
} from './types'

type CreateInstructionSetInput = {
  project_id: string
  name: string
  code: string
  scope: InstructionSetScope
  description?: string | null
  sort_order?: number
}

type UpdateInstructionSetInput = Partial<
  Pick<AgentInstructionSet, 'name' | 'code' | 'scope' | 'description' | 'sort_order' | 'is_active'>
>

type CreateInstructionFileInput = {
  set_id: string
  file_name: string
  content: string
}

type UpdateInstructionFileInput = Partial<
  Pick<AgentInstructionFile, 'file_name' | 'content'>
>

type LinkTaskInstructionSetInput = {
  task_id: string
  set_id: string
  created_by?: string | null
}

export async function createInstructionSet(
  client: SupabaseClient,
  input: CreateInstructionSetInput
): Promise<AgentInstructionSet> {
  const { data, error } = await client
    .from('agent_instruction_sets')
    .insert({
      project_id: input.project_id,
      name: input.name,
      code: input.code,
      scope: input.scope,
      description: input.description ?? null,
      sort_order: input.sort_order ?? 0,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateInstructionSet(
  client: SupabaseClient,
  id: string,
  updates: UpdateInstructionSetInput
): Promise<AgentInstructionSet> {
  const { data, error } = await client
    .from('agent_instruction_sets')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteInstructionSet(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client
    .from('agent_instruction_sets')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function createInstructionFile(
  client: SupabaseClient,
  input: CreateInstructionFileInput
): Promise<AgentInstructionFile> {
  const { data, error } = await client
    .from('agent_instruction_set_files')
    .insert({
      set_id: input.set_id,
      file_name: input.file_name,
      content: input.content,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateInstructionFile(
  client: SupabaseClient,
  id: string,
  updates: UpdateInstructionFileInput
): Promise<AgentInstructionFile> {
  const { data, error } = await client
    .from('agent_instruction_set_files')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteInstructionFile(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client
    .from('agent_instruction_set_files')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function linkInstructionSetToTask(
  client: SupabaseClient,
  input: LinkTaskInstructionSetInput
): Promise<void> {
  const { error } = await client
    .from('task_instruction_set_links')
    .upsert(
      {
        task_id: input.task_id,
        set_id: input.set_id,
        created_by: input.created_by ?? null,
      },
      {
        onConflict: 'task_id,set_id',
      }
    )

  if (error) throw error
}

export async function unlinkInstructionSetFromTask(
  client: SupabaseClient,
  taskId: string,
  setId: string
): Promise<void> {
  const { error } = await client
    .from('task_instruction_set_links')
    .delete()
    .eq('task_id', taskId)
    .eq('set_id', setId)

  if (error) throw error
}