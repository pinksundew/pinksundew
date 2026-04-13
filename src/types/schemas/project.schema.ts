/**
 * Project domain schemas for runtime validation at system boundaries.
 */

import { z } from 'zod'

// ============================================================================
// Enums
// ============================================================================

export const ProjectRoleSchema = z.enum(['owner', 'admin', 'member'])
export type ProjectRole = z.infer<typeof ProjectRoleSchema>

// ============================================================================
// Entity Schemas
// ============================================================================

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  created_by: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type Project = z.infer<typeof ProjectSchema>

export const ProjectMemberSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: ProjectRoleSchema,
  created_at: z.string(),
})
export type ProjectMember = z.infer<typeof ProjectMemberSchema>

export const ProjectWithRoleSchema = ProjectSchema.extend({
  role: ProjectRoleSchema,
})
export type ProjectWithRole = z.infer<typeof ProjectWithRoleSchema>

// ============================================================================
// Input Schemas
// ============================================================================

export const CreateProjectInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).nullish().transform((v) => v ?? null),
})
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>

export const UpdateProjectInputSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullish(),
})
export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>
