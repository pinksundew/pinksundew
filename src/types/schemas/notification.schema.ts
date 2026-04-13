/**
 * Notification domain schemas for runtime validation at system boundaries.
 */

import { z } from 'zod'

// ============================================================================
// Entity Schemas
// ============================================================================

export const NotificationTypeSchema = z.enum(['task_assigned', 'task_mentioned', 'task_completed'])
export type NotificationType = z.infer<typeof NotificationTypeSchema>

export const EmailNotificationSchema = z.object({
  to: z.string().email(),
  type: NotificationTypeSchema,
  subject: z.string().min(1),
  body: z.string().min(1),
})
export type EmailNotification = z.infer<typeof EmailNotificationSchema>

export const NotificationResultSchema = z.object({
  success: z.boolean(),
  messageId: z.string().optional(),
  error: z.string().optional(),
})
export type NotificationResult = z.infer<typeof NotificationResultSchema>

// ============================================================================
// Input Schemas
// ============================================================================

export const SendTaskAssignmentEmailInputSchema = z.object({
  assignee_email: z.string().email('Invalid email'),
  task_title: z.string().min(1),
  project_name: z.string().min(1),
  assigner_name: z.string().optional(),
  task_url: z.string().url().optional(),
})
export type SendTaskAssignmentEmailInput = z.infer<typeof SendTaskAssignmentEmailInputSchema>
