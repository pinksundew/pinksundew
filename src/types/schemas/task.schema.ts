/**
 * Task domain schemas for runtime validation at system boundaries.
 * These schemas define the contract for external input - AI agents, API consumers, etc.
 */

import { z } from 'zod'

// ============================================================================
// Enums
// ============================================================================

export const TaskStatusSchema = z.enum(['todo', 'in-progress', 'done'])
export type TaskStatus = z.infer<typeof TaskStatusSchema>

export const TaskPrioritySchema = z.enum(['low', 'medium', 'high'])
export type TaskPriority = z.infer<typeof TaskPrioritySchema>

export const TaskSignalSchema = z.enum(['ready_for_review', 'needs_help', 'agent_working'])
export type TaskSignal = z.infer<typeof TaskSignalSchema>

export const TaskStateMessageSignalSchema = z.enum([
  'ready_for_review',
  'needs_help',
  'agent_working',
  'note',
])
export type TaskStateMessageSignal = z.infer<typeof TaskStateMessageSignalSchema>

// ============================================================================
// Type Guards (for backward compatibility during migration)
// ============================================================================

export function isTaskStatus(value: unknown): value is TaskStatus {
  return TaskStatusSchema.safeParse(value).success
}

export function isTaskPriority(value: unknown): value is TaskPriority {
  return TaskPrioritySchema.safeParse(value).success
}

export function isTaskSignal(value: unknown): value is TaskSignal {
  return TaskSignalSchema.safeParse(value).success
}

export function isTaskStateMessageSignal(value: unknown): value is TaskStateMessageSignal {
  return TaskStateMessageSignalSchema.safeParse(value).success
}

// ============================================================================
// Entity Schemas
// ============================================================================

export const TaskSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  position: z.number().int(),
  assignee_id: z.string().uuid().nullable(),
  due_date: z.string().nullable(), // ISO date string
  predecessor_id: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  archived_at: z.string().nullable(),
  signal: TaskSignalSchema.nullable(),
  signal_expires_at: z.string().nullable(),
  lock_expires_at: z.string().nullable(),
  lock_reason: z.string().nullable(),
})
export type Task = z.infer<typeof TaskSchema>

export const TagSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  name: z.string().min(1),
  color: z.string(),
})
export type Tag = z.infer<typeof TagSchema>

export const TaskWithTagsSchema = TaskSchema.extend({
  tags: z.array(TagSchema),
})
export type TaskWithTags = z.infer<typeof TaskWithTagsSchema>

export const TaskStateMessageSchema = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid(),
  signal: TaskStateMessageSignalSchema,
  message: z.string().nullable(),
  created_at: z.string(),
  created_by: z.string().uuid().nullable(),
})
export type TaskStateMessage = z.infer<typeof TaskStateMessageSchema>

// ============================================================================
// Input Schemas (API/MCP boundaries)
// ============================================================================

export const CreateTaskInputSchema = z.object({
  project_id: z.string().uuid('Invalid project_id'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullish().transform((v) => v ?? null),
  status: TaskStatusSchema.optional().default('todo'),
  priority: TaskPrioritySchema.optional().default('medium'),
  assignee_id: z.string().uuid().nullish().transform((v) => v ?? null),
  due_date: z.string().nullish().transform((v) => v ?? null),
  predecessor_id: z.string().uuid().nullish().transform((v) => v ?? null),
  position: z.number().int().optional().default(0),
})
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>

export const UpdateTaskInputSchema = z.object({
  task_id: z.string().uuid('Invalid task_id'),
  title: z.string().min(1).optional(),
  description: z.string().nullish(),
  priority: TaskPrioritySchema.optional(),
  assignee_id: z.string().uuid().nullish(),
  due_date: z.string().nullish(),
  predecessor_id: z.string().uuid().nullish(),
})
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>

export const MoveTaskInputSchema = z.object({
  task_id: z.string().uuid('Invalid task_id'),
  status: TaskStatusSchema,
  position: z.number().int().optional(),
})
export type MoveTaskInput = z.infer<typeof MoveTaskInputSchema>

export const SetTaskSignalInputSchema = z.object({
  task_id: z.string().uuid('Invalid task_id'),
  signal: TaskSignalSchema.nullish().transform((v) => v ?? null),
  message: z.string().nullish().transform((v) => v ?? null),
  lock_minutes: z.number().int().positive().nullish().transform((v) => v ?? null),
  lock_reason: z.string().nullish().transform((v) => v ?? null),
})
export type SetTaskSignalInput = z.infer<typeof SetTaskSignalInputSchema>

export const AddTaskMessageInputSchema = z.object({
  task_id: z.string().uuid('Invalid task_id'),
  signal: TaskStateMessageSignalSchema,
  message: z.string().nullish().transform((v) => v ?? null),
})
export type AddTaskMessageInput = z.infer<typeof AddTaskMessageInputSchema>

// ============================================================================
// Query Parameter Schemas
// ============================================================================

export const TaskIdParamSchema = z.object({
  task_id: z.string().uuid('Invalid task_id'),
})

export const ProjectIdParamSchema = z.object({
  project_id: z.string().uuid('Invalid project_id'),
})
