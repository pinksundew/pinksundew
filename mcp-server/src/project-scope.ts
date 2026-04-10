/**
 * Pink Sundew MCP Server - Project Scoping
 *
 * Strict project filtering to prevent context drift.
 * The agent only sees projects explicitly allowed via AGENTPLANNER_PROJECT_IDS.
 */

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

function parseProjectIds(): string[] {
  // Support both singular and plural env var names
  const rawIds = process.env.AGENTPLANNER_PROJECT_IDS ?? process.env.AGENTPLANNER_PROJECT_ID ?? ''

  if (!rawIds.trim()) {
    return []
  }

  const ids = rawIds
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0)

  // Validate each ID looks like a UUID
  const validIds: string[] = []
  for (const id of ids) {
    if (!UUID_REGEX.test(id)) {
      console.warn(`Invalid project ID format (expected UUID): ${id}`)
      continue
    }
    validIds.push(id)
  }

  return validIds
}

// Parse once at module load
const allowedProjectIds = parseProjectIds()

/**
 * Returns the list of allowed project IDs parsed from environment variables.
 * If no IDs are configured, returns an empty array (zero access).
 */
export function getAllowedProjectIds(): string[] {
  return allowedProjectIds
}

/**
 * Returns true if project scoping is enabled (at least one project ID is configured).
 */
export function isProjectScopingEnabled(): boolean {
  return allowedProjectIds.length > 0
}

/**
 * Checks if a project ID is allowed by the current scope configuration.
 * Returns true if:
 * - Project scoping is disabled (no IDs configured - legacy mode, allow all)
 * - The project ID is in the allowed list
 */
export function isProjectAllowed(projectId: string): boolean {
  // If no scoping is configured, allow all (backwards compatibility)
  if (!isProjectScopingEnabled()) {
    return true
  }

  return allowedProjectIds.includes(projectId)
}

/**
 * Asserts that a project ID is allowed by the current scope configuration.
 * Throws an error if the project is not allowed.
 */
export function assertProjectAllowed(projectId: string, context?: string): void {
  if (!isProjectAllowed(projectId)) {
    const contextSuffix = context ? ` (${context})` : ''
    throw new Error(
      `Project ${projectId} is not in the allowed scope${contextSuffix}. ` +
        `Allowed project IDs: ${allowedProjectIds.join(', ') || 'none'}`
    )
  }
}

/**
 * Filters an array of items by their project_id property.
 * Only returns items whose project_id is in the allowed scope.
 */
export function filterByProjectScope<T extends { project_id?: string; id?: string }>(
  items: T[],
  projectIdGetter: (item: T) => string | undefined = (item) => item.project_id ?? item.id
): T[] {
  if (!isProjectScopingEnabled()) {
    return items
  }

  return items.filter((item) => {
    const projectId = projectIdGetter(item)
    return projectId ? isProjectAllowed(projectId) : false
  })
}
