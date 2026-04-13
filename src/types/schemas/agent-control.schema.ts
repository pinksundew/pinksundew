/**
 * Agent control domain schemas for runtime validation at system boundaries.
 */

import { z } from 'zod'

// ============================================================================
// Core MCP Tool Definitions
// ============================================================================

export const CoreMcpToolIdSchema = z.enum([
  'get_project_board',
  'get_task_details',
  'list_abyss_tasks',
  'list_project_tags',
  'create_task',
  'update_task',
  'move_task',
  'set_task_signal',
  'list_task_messages',
  'add_task_message',
  'move_task_to_abyss',
  'restore_task',
  'add_plan_to_task',
  'create_tag',
  'delete_tag',
  'export_tasks',
  'list_projects',
  'sync_global_instructions',
])
export type CoreMcpToolId = z.infer<typeof CoreMcpToolIdSchema>

export const ToolToggleMapSchema = z.record(CoreMcpToolIdSchema, z.boolean())
export type ToolToggleMap = z.infer<typeof ToolToggleMapSchema>

// ============================================================================
// Entity Schemas
// ============================================================================

export const ProjectAgentControlsSchema = z.object({
  project_id: z.string().uuid(),
  allow_task_completion: z.boolean(),
  tool_toggles: ToolToggleMapSchema,
  created_at: z.string(),
  updated_at: z.string(),
  updated_by: z.string().uuid().nullable(),
})
export type ProjectAgentControls = z.infer<typeof ProjectAgentControlsSchema>

// ============================================================================
// Input Schemas
// ============================================================================

export const UpsertAgentControlsInputSchema = z.object({
  project_id: z.string().uuid('Invalid project_id'),
  allow_task_completion: z.boolean(),
  tool_toggles: ToolToggleMapSchema,
})
export type UpsertAgentControlsInput = z.infer<typeof UpsertAgentControlsInputSchema>

export const GetAgentControlsInputSchema = z.object({
  project_id: z.string().uuid('Invalid project_id'),
})
export type GetAgentControlsInput = z.infer<typeof GetAgentControlsInputSchema>
