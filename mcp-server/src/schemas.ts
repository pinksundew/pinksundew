/**
 * MCP Server Schemas - Runtime validation for all tool inputs and API responses.
 * These schemas enforce type safety for AI-generated payloads.
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

export const ExportFormatSchema = z.enum(['numbered', 'bullets', 'checkboxes', 'compact'])
export type ExportFormat = z.infer<typeof ExportFormatSchema>

export const InstructionSetScopeSchema = z.enum(['global', 'specialized'])
export type InstructionSetScope = z.infer<typeof InstructionSetScopeSchema>

export const CoreMcpToolNameSchema = z.enum([
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
])
export type CoreMcpToolName = z.infer<typeof CoreMcpToolNameSchema>

// ============================================================================
// Type Guards
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

// ============================================================================
// Entity Schemas
// ============================================================================

export const ToolToggleMapSchema = z.record(CoreMcpToolNameSchema, z.boolean())
export type ToolToggleMap = Partial<z.infer<typeof ToolToggleMapSchema>>

export const AgentControlsSchema = z.object({
  project_id: z.string(),
  allow_task_completion: z.boolean(),
  tool_toggles: ToolToggleMapSchema,
  created_at: z.string(),
  updated_at: z.string(),
  updated_by: z.string().nullable(),
})
export type AgentControls = z.infer<typeof AgentControlsSchema>

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  role: z.string(),
})
export type Project = z.infer<typeof ProjectSchema>

export const TagSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  name: z.string(),
  color: z.string(),
})
export type Tag = z.infer<typeof TagSchema>

export const AgentInstructionFileSchema = z.object({
  id: z.string(),
  set_id: z.string(),
  file_name: z.string(),
  content_hash: z.string(),
  updated_at: z.string(),
  created_at: z.string().optional(),
  content: z.string().optional(),
})
export type AgentInstructionFile = z.infer<typeof AgentInstructionFileSchema>

export const AgentInstructionSetSchema = z.object({
  id: z.string(),
  project_id: z.string().optional(),
  name: z.string(),
  code: z.string(),
  scope: InstructionSetScopeSchema,
  description: z.string().nullable().optional(),
  sort_order: z.number().optional(),
  is_active: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  files: z.array(AgentInstructionFileSchema),
})
export type AgentInstructionSet = z.infer<typeof AgentInstructionSetSchema>

export const LinkedInstructionSetSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  scope: InstructionSetScopeSchema,
})
export type LinkedInstructionSetSummary = z.infer<typeof LinkedInstructionSetSummarySchema>

export const ResolvedInstructionSetSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  scope: InstructionSetScopeSchema,
  source: z.enum(['global', 'linked']),
  files: z.array(
    z.object({
      file_name: z.string(),
      content: z.string(),
      content_hash: z.string(),
      updated_at: z.string(),
    })
  ),
})
export type ResolvedInstructionSet = z.infer<typeof ResolvedInstructionSetSchema>

export const TaskPlanSchema = z.object({
  id: z.string(),
  task_id: z.string(),
  content: z.string(),
  created_by: z.string(),
  created_at: z.string(),
})
export type TaskPlan = z.infer<typeof TaskPlanSchema>

export const TaskTimelineEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  predecessor_id: z.string().nullable(),
  is_deleted: z.boolean(),
  completed_at: z.string().nullable(),
})
export type TaskTimelineEntry = z.infer<typeof TaskTimelineEntrySchema>

export const TaskTimelineSchema = z.object({
  predecessor: TaskTimelineEntrySchema.nullable(),
  successors: z.array(TaskTimelineEntrySchema),
})
export type TaskTimeline = z.infer<typeof TaskTimelineSchema>

export const TaskStateMessageSchema = z.object({
  id: z.string(),
  task_id: z.string(),
  signal: TaskStateMessageSignalSchema,
  message: z.string(),
  created_by: z.string().nullable(),
  created_at: z.string(),
})
export type TaskStateMessage = z.infer<typeof TaskStateMessageSchema>

export const TaskSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  assignee_id: z.string().nullable(),
  due_date: z.string().nullable(),
  predecessor_id: z.string().nullable(),
  position: z.number(),
  is_deleted: z.boolean(),
  completed_at: z.string().nullable(),
  workflow_signal: TaskSignalSchema.nullable(),
  workflow_signal_message: z.string().nullable(),
  workflow_signal_updated_at: z.string().nullable(),
  workflow_signal_updated_by: z.string().nullable(),
  agent_lock_until: z.string().nullable(),
  agent_lock_reason: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  tags: z.array(TagSchema),
  plans: z.array(TaskPlanSchema).optional(),
  signal_messages: z.array(TaskStateMessageSchema).optional(),
  linked_instruction_set_ids: z.array(z.string()).optional(),
  linked_instruction_sets: z.array(LinkedInstructionSetSummarySchema).optional(),
  resolved_instructions: z.array(ResolvedInstructionSetSchema).optional(),
  timeline: TaskTimelineSchema.optional(),
})
export type Task = z.infer<typeof TaskSchema>

export const BoardStateSchema = z.object({
  project: ProjectSchema.nullable(),
  tasks: z.array(TaskSchema),
  tags: z.array(TagSchema),
  instructions: z.array(AgentInstructionSetSchema),
  instruction_sets: z.array(AgentInstructionSetSchema).optional(),
  agent_controls: AgentControlsSchema.optional(),
})
export type BoardState = z.infer<typeof BoardStateSchema>

export const AbyssStateSchema = z.object({
  deletedTasks: z.array(TaskSchema),
  archivedTasks: z.array(TaskSchema),
})
export type AbyssState = z.infer<typeof AbyssStateSchema>

export const ExportInstructionSchema = z.object({
  title: z.string(),
  content: z.string(),
})
export type ExportInstruction = z.infer<typeof ExportInstructionSchema>

export const ExportTasksResultSchema = z.object({
  project: ProjectSchema.pick({ id: true, name: true }).nullable(),
  taskCount: z.number(),
  tasks: z.array(TaskSchema.pick({ id: true, title: true, status: true, priority: true })),
  content: z.string(),
})
export type ExportTasksResult = z.infer<typeof ExportTasksResultSchema>

// ============================================================================
// Tool Input Schemas (for AI-generated payloads)
// ============================================================================

export const CreateTaskInputSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  predecessorId: z.string().nullable().optional(),
  position: z.number().optional(),
})
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>

export const UpdateTaskInputSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  priority: TaskPrioritySchema.optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  predecessorId: z.string().nullable().optional(),
})
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>

export const MoveTaskInputSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
  status: TaskStatusSchema,
  position: z.number().optional(),
})
export type MoveTaskInput = z.infer<typeof MoveTaskInputSchema>

export const SetTaskSignalInputSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
  signal: TaskSignalSchema.nullable().optional(),
  message: z.string().nullable().optional(),
  lockMinutes: z.number().nullable().optional(),
  lockReason: z.string().nullable().optional(),
})
export type SetTaskSignalInput = z.infer<typeof SetTaskSignalInputSchema>

export const AddTaskMessageInputSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
  signal: TaskStateMessageSignalSchema,
  message: z.string().nullable().optional(),
})
export type AddTaskMessageInput = z.infer<typeof AddTaskMessageInputSchema>

export const AddPlanInputSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
  content: z.string().min(1, 'content is required'),
})
export type AddPlanInput = z.infer<typeof AddPlanInputSchema>

export const CreateTagInputSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
  name: z.string().min(1, 'name is required'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'color must be a valid hex color'),
})
export type CreateTagInput = z.infer<typeof CreateTagInputSchema>

export const DeleteTagInputSchema = z.object({
  tagId: z.string().min(1, 'tagId is required'),
})
export type DeleteTagInput = z.infer<typeof DeleteTagInputSchema>

export const ExportTasksInputSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
  format: ExportFormatSchema.optional().default('numbered'),
  includeDescription: z.boolean().optional().default(false),
  statuses: z.array(TaskStatusSchema).optional(),
})
export type ExportTasksInput = z.infer<typeof ExportTasksInputSchema>

export const SyncInstructionsInputSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
  files: z.array(
    z.object({
      file_name: z.string().min(1),
      content: z.string(),
      content_hash: z.string(),
    })
  ),
})
export type SyncInstructionsInput = z.infer<typeof SyncInstructionsInputSchema>
