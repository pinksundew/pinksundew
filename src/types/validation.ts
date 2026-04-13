/**
 * Validation utilities for parsing untrusted payloads at system boundaries.
 * All external input (API routes, bridge handlers, MCP tools) must pass through these helpers.
 */

import { z } from 'zod'
import { NextResponse } from 'next/server'
import { ApiError, ApiErrorResponse, validationError, errorCodeToStatus } from './errors'

/**
 * Result type for parse operations - either success with typed data or failure with error
 */
export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError }

/**
 * Parse untrusted input through a Zod schema.
 * Returns a discriminated union for type-safe error handling.
 */
export function parseSchema<T>(schema: z.ZodType<T>, input: unknown): ParseResult<T> {
  const result = schema.safeParse(input)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const firstIssue = result.error.issues[0]
  return {
    success: false,
    error: validationError(
      firstIssue?.message ?? 'Invalid input',
      firstIssue?.path?.map(String)
    ),
  }
}

/**
 * Parse and return typed data, throwing on failure.
 * Use only when you want exceptions (e.g., internal code paths).
 */
export function parseSchemaOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  return schema.parse(input)
}

/**
 * Create a NextResponse JSON error from an ApiError
 */
export function jsonError(error: ApiError): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ error }, { status: errorCodeToStatus(error.code) })
}

/**
 * Parse request body through schema, returning either typed data or error response.
 * This is the primary boundary validation helper for API routes.
 *
 * @example
 * ```ts
 * const parsed = await parseRequestBody(request, CreateTaskSchema)
 * if (!parsed.success) return parsed.response
 * const { project_id, title } = parsed.data
 * ```
 */
export async function parseRequestBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<
  | { success: true; data: T }
  | { success: false; response: NextResponse<ApiErrorResponse> }
> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return {
      success: false,
      response: jsonError(validationError('Invalid JSON body')),
    }
  }

  const result = parseSchema(schema, body)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return { success: false, response: jsonError(result.error) }
}

/**
 * Parse query parameters through schema
 */
export function parseQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodType<T>
): ParseResult<T> {
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })
  return parseSchema(schema, params)
}
