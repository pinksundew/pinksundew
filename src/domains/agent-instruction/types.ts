export const INSTRUCTION_SET_SCOPES = ['global', 'specialized'] as const

export type InstructionSetScope = (typeof INSTRUCTION_SET_SCOPES)[number]

export function isInstructionSetScope(value: unknown): value is InstructionSetScope {
  return (
    typeof value === 'string' &&
    INSTRUCTION_SET_SCOPES.includes(value as InstructionSetScope)
  )
}

export type AgentInstructionSet = {
  id: string
  project_id: string
  name: string
  code: string
  scope: InstructionSetScope
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AgentInstructionFile = {
  id: string
  set_id: string
  file_name: string
  content: string
  content_hash: string
  created_at: string
  updated_at: string
}

export type AgentInstructionFileMeta = Omit<AgentInstructionFile, 'content'>

export type AgentInstructionSetWithFiles = AgentInstructionSet & {
  files: AgentInstructionFile[]
}

export type AgentInstructionSetWithFileMeta = AgentInstructionSet & {
  files: AgentInstructionFileMeta[]
}

export type TaskInstructionSetLink = {
  task_id: string
  set_id: string
  created_at: string
  created_by: string | null
}

export type ResolvedInstructionSet = {
  id: string
  name: string
  code: string
  scope: InstructionSetScope
  source: 'global' | 'linked'
  files: Pick<AgentInstructionFile, 'file_name' | 'content' | 'content_hash' | 'updated_at'>[]
}