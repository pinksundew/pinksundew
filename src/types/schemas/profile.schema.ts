/**
 * Profile domain schemas for runtime validation at system boundaries.
 */

import { z } from 'zod'

// ============================================================================
// Entity Schemas
// ============================================================================

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  full_name: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type Profile = z.infer<typeof ProfileSchema>

// ============================================================================
// Input Schemas
// ============================================================================

export const UpdateProfileInputSchema = z.object({
  full_name: z.string().min(1).max(100).nullish(),
  avatar_url: z.string().url().nullish(),
})
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>
