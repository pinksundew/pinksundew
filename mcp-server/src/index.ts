#!/usr/bin/env node

/**
 * Pink Sundew MCP Server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { assertProjectAllowed, isProjectScopingEnabled, getProjectId, getClientEnv } from './project-scope.js'
import { syncGlobalInstructions, startBackgroundSync } from './sync.js'
import {
  getAbyssState,
  getBoardState,
  getProjectAgentControls,
  getProjects,
  getTagDetails,
  getTaskDetails,
} from './resources.js'
import {
  addTaskMessage,
  addPlanToTask,
  createTag,
  createTask,
  deleteTag,
  exportTasks,
  getProjectBoard,
  getTask,
  listAbyssTasks,
  listProjects,
  listTags,
  moveTask,
  moveTaskToAbyss,
  restoreTask,
  setTaskSignal,
  listTaskMessages,
  updateTask,
} from './tools.js'
import { CoreMcpToolName, ExportFormat, TaskPriority, TaskStatus } from './types.js'

const SERVER_NAME = 'pinksundew-mcp'
const SERVER_VERSION = '1.0.0'
const allowedTaskStatuses: TaskStatus[] = ['todo', 'in-progress', 'done']

// Log project scoping status at startup
if (isProjectScopingEnabled()) {
  const clientEnv = getClientEnv()
  console.error(`[${SERVER_NAME}] Project scoping enabled. Project ID: ${getProjectId()}`)
  if (clientEnv) {
    console.error(`[${SERVER_NAME}] Client environment: ${clientEnv}`)
  }
} else {
  console.error(`[${SERVER_NAME}] Warning: No AGENTPLANNER_PROJECT_ID configured. All projects accessible.`)
}

const projectScopedToolNames = new Set<CoreMcpToolName>([
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

type ToolDefinition = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  call: (args: Record<string, unknown>) => Promise<unknown>
}

function getString(args: Record<string, unknown>, key: string, required = true) {
  const value = args[key]
  if (typeof value === 'string') {
    return value
  }
  throw new Error(`${key} must be a string`)
}

function getOptionalString(args: Record<string, unknown>, key: string) {
  const value = args[key]
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value !== 'string') {
    throw new Error(`${key} must be a string if provided`)
  }
  return value
}

function getOptionalNullableString(args: Record<string, unknown>, key: string) {
  const value = args[key]
  if (value === undefined) {
    return undefined
  }
  if (value === null) {
    return null
  }
  if (typeof value !== 'string') {
    throw new Error(`${key} must be a string or null if provided`)
  }
  return value
}

function getOptionalNumber(args: Record<string, unknown>, key: string) {
  const value = args[key]
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value !== 'number') {
    throw new Error(`${key} must be a number if provided`)
  }
  return value
}

function getOptionalBoolean(args: Record<string, unknown>, key: string) {
  const value = args[key]
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value !== 'boolean') {
    throw new Error(`${key} must be a boolean if provided`)
  }
  return value
}

function getOptionalStringArray(args: Record<string, unknown>, key: string) {
  const value = args[key]
  if (value === undefined || value === null) {
    return undefined
  }
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`${key} must be an array of strings if provided`)
  }
  return value
}

function getOptionalInstructions(args: Record<string, unknown>, key: string) {
  const value = args[key]
  if (value === undefined || value === null) {
    return undefined
  }
  if (!Array.isArray(value)) {
    throw new Error(`${key} must be an array if provided`)
  }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`${key}[${index}] must be an object`)
    }

    const instruction = entry as Record<string, unknown>
    const title = getString(instruction, 'title')
    const content = getString(instruction, 'content')
    return { title, content }
  })
}

function isProjectScopedToolName(toolName: string): toolName is CoreMcpToolName {
  return projectScopedToolNames.has(toolName as CoreMcpToolName)
}

function isToolEnabled(
  controls: Awaited<ReturnType<typeof getProjectAgentControls>>,
  toolName: CoreMcpToolName
) {
  const toggles = controls.tool_toggles as Record<string, boolean> | undefined
  return toggles?.[toolName] !== false
}

async function resolveProjectIdForTool(
  toolName: CoreMcpToolName,
  args: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case 'get_project_board':
    case 'list_abyss_tasks':
    case 'list_project_tags':
    case 'create_task':
    case 'create_tag':
    case 'export_tasks':
      return getString(args, 'projectId')

    case 'get_task_details':
    case 'update_task':
    case 'move_task':
    case 'set_task_signal':
    case 'list_task_messages':
    case 'add_task_message':
    case 'move_task_to_abyss':
    case 'restore_task':
    case 'add_plan_to_task': {
      const task = await getTaskDetails(getString(args, 'taskId'))
      return task.project_id
    }

    case 'delete_tag': {
      const tag = await getTagDetails(getString(args, 'tagId'))
      return tag.project_id
    }

    default:
      throw new Error(`Unable to resolve project for tool ${toolName}`)
  }
}

const toolDefinitions: ToolDefinition[] = [
  {
    name: 'list_projects',
    description: 'Lists the projects accessible to the current Pink Sundew API key and project scope.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    call: async () => listProjects(),
  },
  {
    name: 'get_project_board',
    description: 'Returns the current visible board state for a project, including tasks, tags, and instruction sets.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
      },
      required: ['projectId'],
    },
    call: async (args) => getProjectBoard(getString(args, 'projectId')),
  },
  {
    name: 'get_task_details',
    description: 'Returns a task with tags, plans, timeline, linked instruction sets, and resolved instruction content.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
      },
      required: ['taskId'],
    },
    call: async (args) => getTask(getString(args, 'taskId')),
  },
  {
    name: 'list_abyss_tasks',
    description: 'Lists deleted and archived tasks for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
      },
      required: ['projectId'],
    },
    call: async (args) => listAbyssTasks(getString(args, 'projectId')),
  },
  {
    name: 'list_project_tags',
    description: 'Lists the tags configured for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
      },
      required: ['projectId'],
    },
    call: async (args) => listTags(getString(args, 'projectId')),
  },
  {
    name: 'create_task',
    description:
      'Creates a new task for a project. Use predecessorId to create a follow-up ticket instead of subtasks.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', enum: allowedTaskStatuses },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        assigneeId: { type: ['string', 'null'] },
        dueDate: { type: ['string', 'null'] },
        predecessorId: { type: ['string', 'null'] },
        position: { type: 'number' },
      },
      required: ['projectId', 'title'],
    },
    call: async (args) =>
      createTask({
        projectId: getString(args, 'projectId'),
        title: getString(args, 'title'),
        description: getOptionalString(args, 'description'),
        status: getOptionalString(args, 'status') as typeof allowedTaskStatuses[number] | undefined,
        priority: getOptionalString(args, 'priority') as TaskPriority | undefined,
        assigneeId: getOptionalString(args, 'assigneeId') ?? null,
        dueDate: getOptionalString(args, 'dueDate') ?? null,
        predecessorId: getOptionalString(args, 'predecessorId') ?? null,
        position: getOptionalNumber(args, 'position'),
      }),
  },
  {
    name: 'update_task',
    description: 'Updates task details other than board stage movement.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        title: { type: 'string' },
        description: { type: ['string', 'null'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        assigneeId: { type: ['string', 'null'] },
        dueDate: { type: ['string', 'null'] },
        predecessorId: { type: ['string', 'null'] },
      },
      required: ['taskId'],
    },
    call: async (args) =>
      updateTask({
        taskId: getString(args, 'taskId'),
        title: getOptionalString(args, 'title'),
        description: args.description === null ? null : getOptionalString(args, 'description'),
        priority: getOptionalString(args, 'priority') as TaskPriority | undefined,
        assigneeId: args.assigneeId === null ? null : getOptionalString(args, 'assigneeId'),
        dueDate: args.dueDate === null ? null : getOptionalString(args, 'dueDate'),
        predecessorId: args.predecessorId === null ? null : getOptionalString(args, 'predecessorId'),
      }),
  },
  {
    name: 'move_task',
    description:
      'Moves a task between board stages and optionally updates its position within the destination column. Completion behavior is controlled by project Agent Controls.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        status: { type: 'string', enum: allowedTaskStatuses },
        position: { type: 'number' },
      },
      required: ['taskId', 'status'],
    },
    call: async (args) =>
      moveTask(
        getString(args, 'taskId'),
        getString(args, 'status') as typeof allowedTaskStatuses[number],
        getOptionalNumber(args, 'position')
      ),
  },
  {
    name: 'set_task_signal',
    description:
      'Sets or clears workflow overlays on a task (ready_for_review, needs_help, or agent_working), with optional lock metadata for AI ownership windows.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        signal: {
          anyOf: [
            { type: 'string', enum: ['ready_for_review', 'needs_help', 'agent_working'] },
            { type: 'null' },
          ],
        },
        message: { type: ['string', 'null'] },
        lockMinutes: { type: 'number' },
        lockReason: { type: ['string', 'null'] },
      },
      required: ['taskId'],
    },
    call: async (args) =>
      setTaskSignal({
        taskId: getString(args, 'taskId'),
        signal: getOptionalNullableString(args, 'signal') as
          | 'ready_for_review'
          | 'needs_help'
          | 'agent_working'
          | null
          | undefined,
        message: getOptionalNullableString(args, 'message'),
        lockMinutes: getOptionalNumber(args, 'lockMinutes'),
        lockReason: getOptionalNullableString(args, 'lockReason'),
      }),
  },
  {
    name: 'list_task_messages',
    description: 'Lists workflow signal messages for a task (most recent first).',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['taskId'],
    },
    call: async (args) =>
      listTaskMessages(getString(args, 'taskId'), getOptionalNumber(args, 'limit')),
  },
  {
    name: 'add_task_message',
    description: 'Adds a note or signal-specific message to a task without changing its board status.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        message: { type: 'string' },
        signal: { type: 'string', enum: ['ready_for_review', 'needs_help', 'agent_working', 'note'] },
      },
      required: ['taskId', 'message'],
    },
    call: async (args) =>
      addTaskMessage(
        getString(args, 'taskId'),
        getString(args, 'message'),
        (getOptionalString(args, 'signal') as
          | 'ready_for_review'
          | 'needs_help'
          | 'agent_working'
          | 'note'
          | undefined) ??
          'note'
      ),
  },
  {
    name: 'move_task_to_abyss',
    description: 'Soft-deletes a task so it leaves the board and can later be restored from the abyss.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
      },
      required: ['taskId'],
    },
    call: async (args) => moveTaskToAbyss(getString(args, 'taskId')),
  },
  {
    name: 'restore_task',
    description: 'Restores a deleted or archived task back into active board visibility.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
      },
      required: ['taskId'],
    },
    call: async (args) => restoreTask(getString(args, 'taskId')),
  },
  {
    name: 'add_plan_to_task',
    description: 'Attaches an implementation plan to a task as markdown content.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['taskId', 'content'],
    },
    call: async (args) => addPlanToTask(getString(args, 'taskId'), getString(args, 'content')),
  },
  {
    name: 'create_tag',
    description: 'Creates a new project tag.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        name: { type: 'string' },
        color: { type: 'string' },
      },
      required: ['projectId', 'name'],
    },
    call: async (args) =>
      createTag(
        getString(args, 'projectId'),
        getString(args, 'name'),
        getOptionalString(args, 'color') ?? '#3b82f6'
      ),
  },
  {
    name: 'delete_tag',
    description: 'Deletes a project tag.',
    inputSchema: {
      type: 'object',
      properties: {
        tagId: { type: 'string' },
      },
      required: ['tagId'],
    },
    call: async (args) => deleteTag(getString(args, 'tagId')),
  },
  {
    name: 'export_tasks',
    description: 'Builds an AI-ready export prompt from project tasks using the same formatting options as the UI export modal.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        taskIds: {
          type: 'array',
          items: { type: 'string' },
        },
        format: { type: 'string', enum: ['numbered', 'bullets', 'checkboxes', 'compact'] },
        includeTags: { type: 'boolean' },
        includePriority: { type: 'boolean' },
        includeDeleted: { type: 'boolean' },
        includeArchived: { type: 'boolean' },
        additionalInstructions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              content: { type: 'string' },
            },
            required: ['title', 'content'],
          },
        },
      },
      required: ['projectId'],
    },
    call: async (args) =>
      exportTasks({
        projectId: getString(args, 'projectId'),
        taskIds: getOptionalStringArray(args, 'taskIds'),
        format: getOptionalString(args, 'format') as ExportFormat | undefined,
        includeTags: getOptionalBoolean(args, 'includeTags'),
        includePriority: getOptionalBoolean(args, 'includePriority'),
        includeDeleted: getOptionalBoolean(args, 'includeDeleted'),
        includeArchived: getOptionalBoolean(args, 'includeArchived'),
        additionalInstructions: getOptionalInstructions(args, 'additionalInstructions'),
      }),
  },
  {
    name: 'sync_global_instructions',
    description:
      'Triggers a background sync of the latest global agent instructions from the Pink Sundew server and writes them to local IDE instruction files (.cursorrules, CLAUDE.md, codex.md, antigravity.md, .github/copilot-instructions.md). Call this to refresh instructions mid-session without restarting the MCP server.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    call: async () => {
      const result = await syncGlobalInstructions({ verbose: false })
      if (result.success) {
        return {
          success: true,
          message: `Global instructions synced to workspace successfully. ${result.instructionCount} instruction file(s) written to: ${result.fileWritten}. Your IDE will use these updated rules on your next message.`,
          projectId: result.projectId,
          projectName: result.projectName,
          clientEnv: result.clientEnv,
          fileWritten: result.fileWritten,
          instructionCount: result.instructionCount,
        }
      } else {
        throw new Error(result.error ?? 'Failed to sync instructions')
      }
    },
  },
]

const toolMap = new Map(toolDefinitions.map((tool) => [tool.name, tool]))

const server = new Server(
  { name: SERVER_NAME, version: SERVER_VERSION },
  { capabilities: { resources: {}, tools: {} } }
)

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const projects = await getProjects()
  return {
    resources: projects.flatMap((project) => [
      {
        uri: `pinksundew://board/${project.id}`,
        name: `Board: ${project.name}`,
        mimeType: 'application/json',
        description: `Visible board state for ${project.name}`,
      },
      {
        uri: `pinksundew://abyss/${project.id}`,
        name: `Abyss: ${project.name}`,
        mimeType: 'application/json',
        description: `Deleted and archived tasks for ${project.name}`,
      },
    ]),
  }
})

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const url = new URL(request.params.uri)

  if (url.protocol !== 'pinksundew:') {
    throw new Error(`Unknown resource uri: ${request.params.uri}`)
  }

  if (url.host === 'board') {
    const projectId = url.pathname.replace('/', '')
    assertProjectAllowed(projectId, 'ReadResource:board')
    const state = await getBoardState(projectId)

    // Strip instruction file content from resource response
    // Instructions are now synced to local workspace files (.cursorrules, CLAUDE.md, etc.)
    const strippedState = {
      ...state,
      instructions: (state.instructions || []).map((instructionSet) => ({
        ...instructionSet,
        files: instructionSet.files.map(({ content, ...fileMetadata }) => fileMetadata),
      })),
    }

    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: 'application/json',
          text: JSON.stringify(strippedState, null, 2),
        },
      ],
    }
  }

  if (url.host === 'abyss') {
    const projectId = url.pathname.replace('/', '')
    assertProjectAllowed(projectId, 'ReadResource:abyss')
    const state = await getAbyssState(projectId)
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: 'application/json',
          text: JSON.stringify(state, null, 2),
        },
      ],
    }
  }

  if (url.host === 'task') {
    const taskId = url.pathname.replace('/', '')
    const task = await getTaskDetails(taskId)
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: 'application/json',
          text: JSON.stringify(task, null, 2),
        },
      ],
    }
  }

  throw new Error(`Unknown resource uri: ${request.params.uri}`)
})

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: toolDefinitions.map(({ name, description, inputSchema }) => ({
      name,
      description,
      inputSchema,
    })),
  }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = toolMap.get(request.params.name)

  if (!tool) {
    return {
      content: [{ type: 'text', text: `Error: Unknown tool: ${request.params.name}` }],
      isError: true,
    }
  }

  const args = (request.params.arguments ?? {}) as Record<string, unknown>

  try {
    if (isProjectScopedToolName(tool.name)) {
      const projectId = await resolveProjectIdForTool(tool.name, args)
      const controls = await getProjectAgentControls(projectId)

      if (!isToolEnabled(controls, tool.name)) {
        throw new Error(`Tool ${tool.name} is disabled for this project in Agent Controls.`)
      }

      if (tool.name === 'move_task') {
        const status = getString(args, 'status') as TaskStatus
        if (status === 'done' && !controls.allow_task_completion) {
          throw new Error(
            'Task completion is disabled for this project. Enable "Allow Task Completion" in Agent Controls to move tasks to done.'
          )
        }
      }

      if (tool.name === 'create_task') {
        const requestedStatus = getOptionalString(args, 'status') as TaskStatus | undefined
        if (requestedStatus === 'done' && !controls.allow_task_completion) {
          throw new Error(
            'Task completion is disabled for this project. Enable "Allow Task Completion" in Agent Controls to create done tasks.'
          )
        }
      }
    }

    const result = await tool.call(args)
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    }
  }
})

// Fire startup sync asynchronously - don't block server startup
if (isProjectScopingEnabled()) {
  const projectId = getProjectId()!
  
  syncGlobalInstructions({ verbose: true })
    .then((result) => {
      if (result.success) {
        console.error(
          `[${SERVER_NAME}] Startup sync: ${result.instructionCount} instruction(s) written to ${result.fileWritten}`
        )
      } else {
        console.error(`[${SERVER_NAME}] Startup sync failed: ${result.error}`)
      }
      
      // Start background polling regardless of initial sync result
      // This allows retry in restricted environments (e.g., Codex sandbox)
      startBackgroundSync({
        projectId,
        intervalMs: 60000, // 1 minute
        verbose: true,
      })
    })
    .catch((err) => {
      console.error(`[${SERVER_NAME}] Startup sync error:`, err)
      
      // Still start background sync so it can retry later
      startBackgroundSync({
        projectId,
        intervalMs: 60000,
        verbose: true,
      })
    })
}

const transport = new StdioServerTransport()
server.connect(transport).catch(console.error)
