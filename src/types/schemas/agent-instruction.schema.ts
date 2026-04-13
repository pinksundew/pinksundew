/**
 * Agent instruction domain schemas for runtime validation at system boundaries.
 */

import { z } from 'zod'

// ============================================================================
// Enums
// ============================================================================

export const InstructionSetScopeSchema = z.enum(['global', 'specialized'])
export type InstructionSetScope = z.infer<typeof InstructionSetScopeSchema>

export function isInstructionSetScope(value: unknown): value is InstructionSetScope {
  return InstructionSetScopeSchema.safeParse(value).success
}

// ============================================================================
// Entity Schemas
// ============================================================================

export const AgentInstructionFileSchema = z.object({
  id: z.string().uuid(),
  set_id: z.string().uuid(),
  file_name: z.string().min(1),
  content_hash: z.string(),
  updated_at: z.string(),
  created_at: z.string().optional(),
  content: z.string().optional(),
})
export type AgentInstructionFile = z.infer<typeof AgentInstructionFileSchema>

export const AgentInstructionFileMetaSchema = AgentInstructionFileSchema.pick({
  id: true,
  set_id: true,
  file_name: true,
  content_hash: true,
  updated_at: true,
})
export type AgentInstructionFileMeta = z.infer<typeof AgentInstructionFileMetaSchema>

export const AgentInstructionSetSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid().nullable(),
  name: z.string().min(1),
  code: z.string().min(1),
  scope: InstructionSetScopeSchema,
  description: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})
export type AgentInstructionSet = z.infer<typeof AgentInstructionSetSchema>

export const AgentInstructionSetWithFilesSchema = AgentInstructionSetSchema.extend({
  files: z.array(AgentInstructionFileSchema),
})
export type AgentInstructionSetWithFiles = z.infer<typeof AgentInstructionSetWithFilesSchema>

export const AgentInstructionSetWithFileMetaSchema = AgentInstructionSetSchema.extend({
  files: z.array(AgentInstructionFileMetaSchema),
})
export type AgentInstructionSetWithFileMeta = z.infer<typeof AgentInstructionSetWithFileMetaSchema>

// ============================================================================
// Input Schemas
// ============================================================================

export const CreateInstructionSetInputSchema = z.object({
  project_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Code must be lowercase alphanumeric with hyphens'),
  scope: InstructionSetScopeSchema,
  description: z.string().max(500).nullish().transform((v) => v ?? null),
  sort_order: z.number().int().optional().default(0),
  is_active: z.boolean().optional().default(true),
})
export type CreateInstructionSetInput = z.infer<typeof CreateInstructionSetInputSchema>

export const UpdateInstructionSetInputSchema = z.object({
  set_id: z.string().uuid('Invalid set_id'),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullish(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
})
export type UpdateInstructionSetInput = z.infer<typeof UpdateInstructionSetInputSchema>

export const UpsertInstructionFileInputSchema = z.object({
  set_id: z.string().uuid('Invalid set_id'),
  file_name: z.string().min(1).max(255),
  content: z.string(),
})
export type UpsertInstructionFileInput = z.infer<typeof UpsertInstructionFileInputSchema>

export const SyncInstructionsInputSchema = z.object({
  project_id: z.string().uuid('Invalid project_id'),
  files: z.array(
    z.object({
      file_name: z.string().min(1),
      content: z.string(),
      content_hash: z.string(),
    })
  ),
})
export type SyncInstructionsInput = z.infer<typeof SyncInstructionsInputSchema>
