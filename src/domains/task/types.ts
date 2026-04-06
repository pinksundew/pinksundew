import { Tag } from '../tag/types'

export type TaskStatus = 'todo' | 'in-progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

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
  created_at: string
  updated_at: string
}

export type TaskWithTags = Task & {
  tags: Tag[]
}
