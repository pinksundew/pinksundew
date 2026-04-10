/**
 * Pink Sundew MCP Server - Bridge API Client
 */

const DEFAULT_URL = 'https://pinksundew.com'

const apiKey = process.env.AGENTPLANNER_API_KEY
const baseUrl = process.env.AGENTPLANNER_URL ?? DEFAULT_URL

if (!apiKey) {
  console.error('Missing AGENTPLANNER_API_KEY environment variable.')
  process.exit(1)
}

const normalizedBaseUrl = baseUrl.replace(/\/$/, '')

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
