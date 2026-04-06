export type ProjectRole = 'owner' | 'admin' | 'member'

export type Project = {
  id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type ProjectMember = {
  id: string
  project_id: string
  user_id: string
  role: ProjectRole
}
