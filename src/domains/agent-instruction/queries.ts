import { SupabaseClient } from '@supabase/supabase-js'
import { AgentInstruction } from './types'

export async function getProjectAgentInstructions(
  client: SupabaseClient,
  projectId: string
): Promise<AgentInstruction[]> {
  const { data, error } = await client
    .from('agent_instructions')
    .select('*')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false })
    .order('file_name', { ascending: true })

  if (error) throw error
  return data
}