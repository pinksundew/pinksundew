#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { getAbyssState, getBoardState, getProjects, getTaskDetails } from './resources.js'
import { getAllowedTaskStatuses, isTaskCompletionAllowed } from './supabase.js'
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
import { ExportFormat, TaskPriority } from './types.js'

const SERVER_VERSION = '1.2.0'
const allowedTaskStatuses = getAllowedTaskStatuses()
const completionEnabled = isTaskCompletionAllowed()

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

const toolDefinitions: ToolDefinition[] = [
  {
    name: 'list_projects',
    description: 'Lists the projects accessible to the current AgentPlanner API key.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    call: async () => listProjects(),
  },
  {
    name: 'get_project_board',
    description: 'Returns the current visible board state for a project, including tasks and tags.',
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
    description: 'Returns a task with tags, plans, and timeline information.',
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
    description: completionEnabled
      ? 'Moves a task between board stages and optionally updates its position within the destination column.'
      : 'Moves a task between active board stages. Completion is disabled until AGENTPLANNER_ALLOW_TASK_COMPLETION=true is set on the server.',
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
      'Sets or clears workflow overlays on a task (ready_for_review or needs_help), with optional lock metadata for AI ownership windows.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        signal: {
          anyOf: [
            { type: 'string', enum: ['ready_for_review', 'needs_help'] },
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
        signal: getOptionalNullableString(args, 'signal') as 'ready_for_review' | 'needs_help' | null | undefined,
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
        signal: { type: 'string', enum: ['ready_for_review', 'needs_help', 'note'] },
      },
      required: ['taskId', 'message'],
    },
    call: async (args) =>
      addTaskMessage(
        getString(args, 'taskId'),
        getString(args, 'message'),
        (getOptionalString(args, 'signal') as 'ready_for_review' | 'needs_help' | 'note' | undefined) ??
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
]

const toolMap = new Map(toolDefinitions.map((tool) => [tool.name, tool]))

const server = new Server(
  { name: 'agentplanner-mcp', version: SERVER_VERSION },
  { capabilities: { resources: {}, tools: {} } }
)

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const projects = await getProjects()
  return {
    resources: projects.flatMap((project) => [
      {
        uri: `agentplanner://board/${project.id}`,
        name: `Board: ${project.name}`,
        mimeType: 'application/json',
        description: `Visible board state for ${project.name}`,
      },
      {
        uri: `agentplanner://abyss/${project.id}`,
        name: `Abyss: ${project.name}`,
        mimeType: 'application/json',
        description: `Deleted and archived tasks for ${project.name}`,
      },
    ]),
  }
})

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const url = new URL(request.params.uri)

  if (url.protocol !== 'agentplanner:') {
    throw new Error(`Unknown resource uri: ${request.params.uri}`)
  }

  if (url.host === 'board') {
    const projectId = url.pathname.replace('/', '')
    const state = await getBoardState(projectId)
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

  if (url.host === 'abyss') {
    const projectId = url.pathname.replace('/', '')
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

const transport = new StdioServerTransport()
server.connect(transport).catch(console.error)
