export type TaskStatus = 'todo' | 'in-progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskSignal = 'ready_for_review' | 'needs_help'
export type TaskStateMessageSignal = TaskSignal | 'note'
export type ExportFormat = 'numbered' | 'bullets' | 'checkboxes' | 'compact'
export type InstructionSetScope = 'global' | 'specialized'

export type CoreMcpToolName =
  | 'get_project_board'
  | 'get_task_details'
  | 'list_abyss_tasks'
  | 'list_project_tags'
  | 'create_task'
  | 'update_task'
  | 'move_task'
  | 'set_task_signal'
  | 'list_task_messages'
  | 'add_task_message'
  | 'move_task_to_abyss'
  | 'restore_task'
  | 'add_plan_to_task'
  | 'create_tag'
  | 'delete_tag'
  | 'export_tasks'

export type ToolToggleMap = Partial<Record<CoreMcpToolName, boolean>>

export type AgentControls = {
  project_id: string
  allow_task_completion: boolean
  tool_toggles: ToolToggleMap
  created_at: string
  updated_at: string
  updated_by: string | null
}

export type Project = {
  id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
  role: string
}

export type Tag = {
  id: string
  project_id: string
  name: string
  color: string
}

export type AgentInstructionFile = {
  file_name: string
  content?: string
  content_hash?: string
  updated_at?: string
}

export type AgentInstructionSet = {
  id: string
  project_id?: string
  name: string
  code: string
  scope: InstructionSetScope
  description?: string | null
  sort_order?: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
  files: AgentInstructionFile[]
}

export type LinkedInstructionSetSummary = {
  id: string
  name: string
  code: string
  scope: InstructionSetScope
}

export type ResolvedInstructionSet = {
  id: string
  name: string
  code: string
  scope: InstructionSetScope
  source: 'global' | 'linked'
  files: Array<{
    file_name: string
    content: string
    content_hash: string
    updated_at: string
  }>
}

export type TaskPlan = {
  id: string
  task_id: string
  content: string
  created_by: string
  created_at: string
}

export type TaskTimelineEntry = {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  predecessor_id: string | null
  is_deleted: boolean
  completed_at: string | null
}

export type TaskTimeline = {
  predecessor: TaskTimelineEntry | null
  successors: TaskTimelineEntry[]
}

export type Task = {
  id: string
  project_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assignee_id: string | null
  due_date: string | null
  predecessor_id: string | null
  position: number
  is_deleted: boolean
  completed_at: string | null
  workflow_signal: TaskSignal | null
  workflow_signal_message: string | null
  workflow_signal_updated_at: string | null
  workflow_signal_updated_by: string | null
  agent_lock_until: string | null
  agent_lock_reason: string | null
  created_at: string
  updated_at: string
  tags: Tag[]
  plans?: TaskPlan[]
  signal_messages?: TaskStateMessage[]
  linked_instruction_set_ids?: string[]
  linked_instruction_sets?: LinkedInstructionSetSummary[]
  resolved_instructions?: ResolvedInstructionSet[]
  timeline?: TaskTimeline
}

export type TaskStateMessage = {
  id: string
  task_id: string
  signal: TaskStateMessageSignal
  message: string
  created_by: string | null
  created_at: string
}

export type BoardState = {
  project: Project | null
  tasks: Task[]
  tags: Tag[]
  instructions: AgentInstructionSet[]
  instruction_sets?: AgentInstructionSet[]
  agent_controls?: AgentControls
}

export type AbyssState = {
  deletedTasks: Task[]
  archivedTasks: Task[]
}

export type ExportInstruction = {
  title: string
  content: string
}

export type ExportTasksResult = {
  project: Pick<Project, 'id' | 'name'> | null
  taskCount: number
  tasks: Array<Pick<Task, 'id' | 'title' | 'status' | 'priority'>>
  content: string
}