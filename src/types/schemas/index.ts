/**
 * Central export for all boundary schemas.
 * Import from '@/types/schemas' for schema-based validation.
 */

// Task domain
export {
  // Enums & Guards
  TaskStatusSchema,
  TaskPrioritySchema,
  TaskSignalSchema,
  TaskStateMessageSignalSchema,
  isTaskStatus,
  isTaskPriority,
  isTaskSignal,
  isTaskStateMessageSignal,
  // Entity schemas
  TaskSchema,
  TagSchema,
  TaskWithTagsSchema,
  TaskStateMessageSchema,
  // Input schemas
  CreateTaskInputSchema,
  UpdateTaskInputSchema,
  MoveTaskInputSchema,
  SetTaskSignalInputSchema,
  AddTaskMessageInputSchema,
  TaskIdParamSchema,
  ProjectIdParamSchema,
  // Types
  type TaskStatus,
  type TaskPriority,
  type TaskSignal,
  type TaskStateMessageSignal,
  type Task,
  type Tag,
  type TaskWithTags,
  type TaskStateMessage,
  type CreateTaskInput,
  type UpdateTaskInput,
  type MoveTaskInput,
  type SetTaskSignalInput,
  type AddTaskMessageInput,
} from './task.schema'

// Project domain
export {
  ProjectRoleSchema,
  ProjectSchema,
  ProjectMemberSchema,
  ProjectWithRoleSchema,
  CreateProjectInputSchema,
  UpdateProjectInputSchema,
  type ProjectRole,
  type Project,
  type ProjectMember,
  type ProjectWithRole,
  type CreateProjectInput,
  type UpdateProjectInput,
} from './project.schema'

// Tag domain (re-export from tag.schema, not task.schema)
export {
  TagSchema as TagEntitySchema,
  CreateTagInputSchema,
  UpdateTagInputSchema,
  DeleteTagInputSchema,
  AssignTagsInputSchema,
  type CreateTagInput,
  type UpdateTagInput,
  type DeleteTagInput,
  type AssignTagsInput,
} from './tag.schema'

// Agent control domain
export {
  CoreMcpToolIdSchema,
  ToolToggleMapSchema,
  ProjectAgentControlsSchema,
  UpsertAgentControlsInputSchema,
  GetAgentControlsInputSchema,
  type CoreMcpToolId,
  type ToolToggleMap,
  type ProjectAgentControls,
  type UpsertAgentControlsInput,
  type GetAgentControlsInput,
} from './agent-control.schema'

// Agent instruction domain
export {
  InstructionSetScopeSchema,
  isInstructionSetScope,
  AgentInstructionFileSchema,
  AgentInstructionFileMetaSchema,
  AgentInstructionSetSchema,
  AgentInstructionSetWithFilesSchema,
  AgentInstructionSetWithFileMetaSchema,
  CreateInstructionSetInputSchema,
  UpdateInstructionSetInputSchema,
  UpsertInstructionFileInputSchema,
  SyncInstructionsInputSchema,
  type InstructionSetScope,
  type AgentInstructionFile,
  type AgentInstructionFileMeta,
  type AgentInstructionSet,
  type AgentInstructionSetWithFiles,
  type AgentInstructionSetWithFileMeta,
  type CreateInstructionSetInput,
  type UpdateInstructionSetInput,
  type UpsertInstructionFileInput,
  type SyncInstructionsInput,
} from './agent-instruction.schema'

// Plan domain
export {
  TaskPlanSchema,
  CreateTaskPlanInputSchema,
  UpdateTaskPlanInputSchema,
  GetTaskPlanInputSchema,
  type TaskPlan,
  type CreateTaskPlanInput,
  type UpdateTaskPlanInput,
  type GetTaskPlanInput,
} from './plan.schema'

// Profile domain
export {
  ProfileSchema,
  UpdateProfileInputSchema,
  type Profile,
  type UpdateProfileInput,
} from './profile.schema'

// Notification domain
export {
  NotificationTypeSchema,
  EmailNotificationSchema,
  NotificationResultSchema,
  SendTaskAssignmentEmailInputSchema,
  type NotificationType,
  type EmailNotification,
  type NotificationResult,
  type SendTaskAssignmentEmailInput,
} from './notification.schema'

// API Key domain
export {
  ApiKeySchema,
  ApiKeyPublicSchema,
  CreateApiKeyInputSchema,
  RevokeApiKeyInputSchema,
  type ApiKey,
  type ApiKeyPublic,
  type CreateApiKeyInput,
  type RevokeApiKeyInput,
} from './api-key.schema'
