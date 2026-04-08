export type TaskStatus = 'todo' | 'in-progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskSignal = 'ready_for_review' | 'needs_help'
export type TaskStateMessageSignal = TaskSignal | 'note'
export type ExportFormat = 'numbered' | 'bullets' | 'checkboxes' | 'compact'

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

export type AgentInstruction = {
  id: string
  project_id: string
  file_name: string
  content: string
  created_at: string
  updated_at: string
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
  instructions: AgentInstruction[]
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