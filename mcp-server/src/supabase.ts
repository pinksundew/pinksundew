import { TaskStatus } from './types.js'

const apiKey = process.env.AGENTPLANNER_API_KEY
const baseUrl = process.env.AGENTPLANNER_URL
const allowTaskCompletion = /^(1|true|yes)$/i.test(
  process.env.AGENTPLANNER_ALLOW_TASK_COMPLETION ?? 'false'
)

if (!apiKey || !baseUrl) {
  console.error('Missing AGENTPLANNER_API_KEY or AGENTPLANNER_URL environment variables.')
  process.exit(1)
}

const normalizedBaseUrl = baseUrl.replace(/\/$/, '')

export function isTaskCompletionAllowed() {
  return allowTaskCompletion
}

export function getAllowedTaskStatuses(): TaskStatus[] {
  return allowTaskCompletion ? ['todo', 'in-progress', 'done'] : ['todo', 'in-progress']
}

export function assertTaskCompletionAllowed(status: TaskStatus) {
  if (status === 'done' && !allowTaskCompletion) {
    throw new Error(
      'Task completion is disabled for this MCP server. Set AGENTPLANNER_ALLOW_TASK_COMPLETION=true to permit moves to done.'
    )
  }
}

export async function bridgeFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${normalizedBaseUrl}/api/bridge${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Bridge API error ${response.status}: ${body}`)
  }

  return response.json() as Promise<T>
}
