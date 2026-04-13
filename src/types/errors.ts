/**
 * Shared error taxonomy for type-safe error handling across boundaries.
 * All errors have a stable `code` for programmatic matching and a human-readable `message`.
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_ERROR'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'

export interface ApiError {
  code: ErrorCode
  message: string
  /** Path to the invalid field (for validation errors) */
  path?: string[]
  /** Additional context for debugging */
  details?: Record<string, unknown>
}

export interface ApiErrorResponse {
  error: ApiError
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof (value as ApiError).code === 'string' &&
    typeof (value as ApiError).message === 'string'
  )
}

export function validationError(message: string, path?: string[]): ApiError {
  return { code: 'VALIDATION_ERROR', message, path }
}

export function authError(message: string): ApiError {
  return { code: 'AUTH_ERROR', message }
}

export function forbiddenError(message: string): ApiError {
  return { code: 'FORBIDDEN', message }
}

export function notFoundError(message: string): ApiError {
  return { code: 'NOT_FOUND', message }
}

export function conflictError(message: string): ApiError {
  return { code: 'CONFLICT', message }
}

export function rateLimitedError(message: string): ApiError {
  return { code: 'RATE_LIMITED', message }
}

export function internalError(message: string): ApiError {
  return { code: 'INTERNAL_ERROR', message }
}

/** Map error codes to HTTP status codes */
export function errorCodeToStatus(code: ErrorCode): number {
  switch (code) {
    case 'VALIDATION_ERROR':
      return 400
    case 'AUTH_ERROR':
      return 401
    case 'FORBIDDEN':
      return 403
    case 'NOT_FOUND':
      return 404
    case 'CONFLICT':
      return 409
    case 'RATE_LIMITED':
      return 429
    case 'INTERNAL_ERROR':
      return 500
  }
}
