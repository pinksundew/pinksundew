import { SupabaseClient } from '@supabase/supabase-js'
import { AgentInstruction } from './types'

type CreateAgentInstructionInput = Omit<AgentInstruction, 'id' | 'created_at' | 'updated_at'>

export async function createAgentInstruction(
  client: SupabaseClient,
  instruction: CreateAgentInstructionInput
): Promise<AgentInstruction> {
  const { data, error } = await client
    .from('agent_instructions')
    .insert(instruction)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateAgentInstruction(
  client: SupabaseClient,
  id: string,
  updates: Partial<Pick<AgentInstruction, 'file_name' | 'content'>>
): Promise<AgentInstruction> {
  const { data, error } = await client
    .from('agent_instructions')
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

export async function deleteAgentInstruction(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client
    .from('agent_instructions')
    .delete()
    .eq('id', id)

  if (error) throw error
}