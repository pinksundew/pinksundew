/**
 * Tag domain schemas for runtime validation at system boundaries.
 */

import { z } from 'zod'

// ============================================================================
// Entity Schemas
// ============================================================================

export const TagSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color'),
  created_at: z.string().optional(),
})
export type Tag = z.infer<typeof TagSchema>

// ============================================================================
// Input Schemas
// ============================================================================

export const CreateTagInputSchema = z.object({
  project_id: z.string().uuid('Invalid project_id'),
  name: z.string().min(1, 'Name is required').max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color'),
})
export type CreateTagInput = z.infer<typeof CreateTagInputSchema>

export const UpdateTagInputSchema = z.object({
  tag_id: z.string().uuid('Invalid tag_id'),
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})
export type UpdateTagInput = z.infer<typeof UpdateTagInputSchema>

export const DeleteTagInputSchema = z.object({
  tag_id: z.string().uuid('Invalid tag_id'),
})
export type DeleteTagInput = z.infer<typeof DeleteTagInputSchema>

export const AssignTagsInputSchema = z.object({
  task_id: z.string().uuid('Invalid task_id'),
  tag_ids: z.array(z.string().uuid('Invalid tag_id')),
})
export type AssignTagsInput = z.infer<typeof AssignTagsInputSchema>
