/**
 * Central type exports for the AgentPlanner application.
 *
 * This barrel provides:
 * - Runtime schemas (Zod) for boundary validation
 * - Inferred TypeScript types from schemas
 * - Error taxonomy for consistent error handling
 * - Validation utilities
 *
 * Import patterns:
 * - `import { CreateTaskInputSchema, type CreateTaskInput } from '@/types'`
 * - `import { parseRequestBody, jsonError } from '@/types'`
 */

// Re-export all schemas and schema-derived types
export * from './schemas'

// Error taxonomy
export {
  type ErrorCode,
  type ApiError,
  type ApiErrorResponse,
  isApiError,
  validationError,
  authError,
  forbiddenError,
  notFoundError,
  conflictError,
  rateLimitedError,
  internalError,
  errorCodeToStatus,
} from './errors'

// Validation utilities
export {
  type ParseResult,
  parseSchema,
  parseSchemaOrThrow,
  jsonError,
  parseRequestBody,
  parseQueryParams,
} from './validation'
