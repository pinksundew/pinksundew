/**
 * Plan domain schemas for runtime validation at system boundaries.
 */

import { z } from 'zod'

// ============================================================================
// Entity Schemas
// ============================================================================

export const TaskPlanSchema = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid(),
  content: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type TaskPlan = z.infer<typeof TaskPlanSchema>

// ============================================================================
// Input Schemas
// ============================================================================

export const CreateTaskPlanInputSchema = z.object({
  task_id: z.string().uuid('Invalid task_id'),
  content: z.string().min(1, 'Content is required'),
})
export type CreateTaskPlanInput = z.infer<typeof CreateTaskPlanInputSchema>

export const UpdateTaskPlanInputSchema = z.object({
  plan_id: z.string().uuid('Invalid plan_id'),
  content: z.string().min(1, 'Content is required'),
})
export type UpdateTaskPlanInput = z.infer<typeof UpdateTaskPlanInputSchema>

export const GetTaskPlanInputSchema = z.object({
  task_id: z.string().uuid('Invalid task_id'),
})
export type GetTaskPlanInput = z.infer<typeof GetTaskPlanInputSchema>
