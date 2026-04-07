#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListResourcesRequestSchema, ReadResourceRequestSchema, ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as resources from './resources.js';
import * as tools from './tools.js';

const server = new Server(
  { name: 'agentplanner-mcp', version: '1.0.0' },
  { capabilities: { resources: {}, tools: {} } }
);

// --- Resources ---
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const projects = await resources.getProjects();
  return {
    resources: projects.map((p: any) => ({
      uri: `kanban://board/${p.id}`,
      name: `Board: ${p.name}`,
      mimeType: 'application/json',
      description: `State of Kanban project: ${p.name}`
    }))
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const url = new URL(request.params.uri);
  
  if (url.protocol === 'kanban:' && url.host === 'board') {
    const projectId = url.pathname.replace('/', '');
    const state = await resources.getBoardState(projectId);
    return {
      contents: [{
        uri: request.params.uri,
        mimeType: 'application/json',
        text: JSON.stringify(state, null, 2)
      }]
    };
  }

  throw new Error(`Unknown resource uri: ${request.params.uri}`);
});

// --- Tools ---
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'create_task',
        description: 'Creates a new Kanban task on a project board',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string', enum: ['todo', 'in-progress', 'done'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] }
          },
          required: ['projectId', 'title']
        }
      },
      {
        name: 'update_task_status',
        description: 'Moves a task to a different Kanban column (status)',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string' },
            status: { type: 'string', enum: ['todo', 'in-progress', 'done'] },
            position: { type: 'number' }
          },
          required: ['taskId', 'status']
        }
      },
      {
        name: 'create_subtasks',
        description: 'Breaks down a parent task into subtasks in the backlog',
        inputSchema: {
          type: 'object',
          properties: {
            parentId: { type: 'string' },
            subtasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' }
                },
                required: ['title']
              }
            }
          },
          required: ['parentId', 'subtasks']
        }
      },
      {
        name: 'add_plan_to_task',
        description: 'Attaches an AI-generated implementation plan to a task',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string' },
            content: { type: 'string', description: 'Markdown string format' }
          },
          required: ['taskId', 'content']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  if (!args) throw new Error('Missing arguments');

  try {
    let result;
    if (name === 'create_task') {
      result = await tools.createTask(args.projectId as string, args.title as string, args.description as string, args.status as string, args.priority as string);
    } else if (name === 'update_task_status') {
      result = await tools.updateTaskStatus(args.taskId as string, args.status as string, args.position as number);
    } else if (name === 'create_subtasks') {
      const subtasks = args.subtasks as { title: string, description?: string }[];
      result = await tools.createSubtasks(args.parentId as string, subtasks);
    } else if (name === 'add_plan_to_task') {
      result = await tools.addPlanToTask(args.taskId as string, args.content as string);
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    }
  }
});

// Run server
const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
