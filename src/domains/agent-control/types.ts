export const CORE_MCP_TOOL_CATALOG = [
  {
    id: 'get_project_board',
    name: 'Read Board',
    description: 'Allow agents to read project tasks, tags, and instruction context.',
  },
  {
    id: 'get_task_details',
    name: 'Read Task Details',
    description: 'Allow agents to inspect plans, timeline, and review thread details.',
  },
  {
    id: 'list_abyss_tasks',
    name: 'Read Abyss',
    description: 'Allow agents to inspect deleted and archived tasks.',
  },
  {
    id: 'list_project_tags',
    name: 'Read Tags',
    description: 'Allow agents to view tag metadata.',
  },
  {
    id: 'create_task',
    name: 'Create Tasks',
    description: 'Allow agents to create new tickets.',
  },
  {
    id: 'update_task',
    name: 'Update Task Fields',
    description: 'Allow agents to edit title, description, priority, and assignments.',
  },
  {
    id: 'move_task',
    name: 'Move Tasks',
    description: 'Allow agents to change board stage and ordering.',
  },
  {
    id: 'set_task_signal',
    name: 'Set Task Signals',
    description: 'Allow agents to set or clear review/help overlays.',
  },
  {
    id: 'list_task_messages',
    name: 'Read Task Messages',
    description: 'Allow agents to read workflow thread messages.',
  },
  {
    id: 'add_task_message',
    name: 'Add Task Messages',
    description: 'Allow agents to post workflow thread messages.',
  },
  {
    id: 'move_task_to_abyss',
    name: 'Move To Abyss',
    description: 'Allow agents to soft-delete tasks from the board.',
  },
  {
    id: 'restore_task',
    name: 'Restore From Abyss',
    description: 'Allow agents to restore deleted or archived tasks.',
  },
  {
    id: 'add_plan_to_task',
    name: 'Attach Plans',
    description: 'Allow agents to attach markdown implementation plans to tasks.',
  },
  {
    id: 'create_tag',
    name: 'Create Tags',
    description: 'Allow agents to create new tags.',
  },
  {
    id: 'delete_tag',
    name: 'Delete Tags',
    description: 'Allow agents to delete tags.',
  },
  {
    id: 'export_tasks',
    name: 'Export Tasks',
    description: 'Allow agents to generate prompt exports from board tasks.',
  },
] as const

export type CoreMcpToolId = (typeof CORE_MCP_TOOL_CATALOG)[number]['id']

export type ToolToggleMap = Record<CoreMcpToolId, boolean>

export type ProjectAgentControls = {
  project_id: string
  allow_task_completion: boolean
  tool_toggles: ToolToggleMap
  created_at: string
  updated_at: string
  updated_by: string | null
}

export function getDefaultToolToggles(): ToolToggleMap {
  const entries = CORE_MCP_TOOL_CATALOG.map((tool) => [tool.id, true] as const)
  return Object.fromEntries(entries) as ToolToggleMap
}

export function normalizeToolToggles(rawValue: unknown): ToolToggleMap {
  const defaults = getDefaultToolToggles()

  if (!rawValue || typeof rawValue !== 'object') {
    return defaults
  }

  for (const tool of CORE_MCP_TOOL_CATALOG) {
    const value = (rawValue as Record<string, unknown>)[tool.id]
    if (typeof value === 'boolean') {
      defaults[tool.id] = value
    }
  }

  return defaults
}
