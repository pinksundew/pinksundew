export type TaskStatus = 'todo' | 'in-progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'
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
  created_at: string
  updated_at: string
  tags: Tag[]
  plans?: TaskPlan[]
  timeline?: TaskTimeline
}

export type BoardState = {
  project: Project | null
  tasks: Task[]
  tags: Tag[]
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