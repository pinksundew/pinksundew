/**
 * API Key domain schemas for runtime validation at system boundaries.
 */

import { z } from 'zod'

// ============================================================================
// Entity Schemas
// ============================================================================

export const ApiKeySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1),
  key_prefix: z.string(),
  key_hash: z.string(),
  created_at: z.string(),
  last_used_at: z.string().nullable(),
  expires_at: z.string().nullable(),
})
export type ApiKey = z.infer<typeof ApiKeySchema>

/** Partial key returned to user (without hash) */
export const ApiKeyPublicSchema = ApiKeySchema.omit({ key_hash: true })
export type ApiKeyPublic = z.infer<typeof ApiKeyPublicSchema>

// ============================================================================
// Input Schemas
// ============================================================================

export const CreateApiKeyInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  expires_in_days: z.number().int().positive().optional(),
})
export type CreateApiKeyInput = z.infer<typeof CreateApiKeyInputSchema>

export const RevokeApiKeyInputSchema = z.object({
  key_id: z.string().uuid('Invalid key_id'),
})
export type RevokeApiKeyInput = z.infer<typeof RevokeApiKeyInputSchema>
