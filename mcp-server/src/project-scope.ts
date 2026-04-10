/**
 * Pink Sundew MCP Server - Project Scoping
 *
 * Strict project filtering to prevent context drift.
 * STRICT MODE: Only one project ID is allowed per workspace.
 * This enforces a 1:1 mapping between workspace and project.
 */

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/**
 * Parses and validates the single project ID from environment.
 * Throws a fatal error if multiple IDs are detected (comma-separated).
 */
function parseProjectId(): string | null {
  const rawId = process.env.AGENTPLANNER_PROJECT_ID ?? ''

  if (!rawId.trim()) {
    return null
  }

  // Strict mode: reject comma-separated values
  if (rawId.includes(',')) {
    throw new Error(
      'Strict Mode: Only one AGENTPLANNER_PROJECT_ID is allowed per workspace to prevent context drift. ' +
      'Remove extra project IDs from your configuration.'
    )
  }

  const projectId = rawId.trim()

  if (!UUID_REGEX.test(projectId)) {
    throw new Error(`Invalid AGENTPLANNER_PROJECT_ID format (expected UUID): ${projectId}`)
  }

  return projectId
}

// Parse once at module load - will throw if invalid
const projectId = parseProjectId()

/**
 * Returns the configured project ID.
 * Returns null if no project is configured.
 */
export function getProjectId(): string | null {
  return projectId
}

/**
 * Returns the list of allowed project IDs for backwards compatibility.
 * @deprecated Use getProjectId() instead
 */
export function getAllowedProjectIds(): string[] {
  return projectId ? [projectId] : []
}

/**
 * Returns true if project scoping is enabled (a project ID is configured).
 */
export function isProjectScopingEnabled(): boolean {
  return projectId !== null
}

/**
 * Checks if a project ID matches the configured project scope.
 * Returns true if:
 * - Project scoping is disabled (no ID configured - legacy mode, allow all)
 * - The project ID matches the configured ID
 */
export function isProjectAllowed(projectIdToCheck: string): boolean {
  // If no scoping is configured, allow all (backwards compatibility)
  if (!isProjectScopingEnabled()) {
    return true
  }

  return projectIdToCheck === projectId
}

/**
 * Asserts that a project ID matches the configured project scope.
 * Throws an error if the project is not allowed.
 */
export function assertProjectAllowed(projectIdToCheck: string, context?: string): void {
  if (!isProjectAllowed(projectIdToCheck)) {
    const contextSuffix = context ? ` (${context})` : ''
    throw new Error(
      `Project ${projectIdToCheck} is not in scope${contextSuffix}. ` +
        `Configured project ID: ${projectId ?? 'none'}`
    )
  }
}

/**
 * Filters an array of items by their project_id property.
 * Only returns items whose project_id matches the configured scope.
 */
export function filterByProjectScope<T extends { project_id?: string; id?: string }>(
  items: T[],
  projectIdGetter: (item: T) => string | undefined = (item) => item.project_id ?? item.id
): T[] {
  if (!isProjectScopingEnabled()) {
    return items
  }

  return items.filter((item) => {
    const itemProjectId = projectIdGetter(item)
    return itemProjectId ? isProjectAllowed(itemProjectId) : false
  })
}

/**
 * Returns the configured client environment.
 * Used for targeting IDE-specific instruction files.
 */
export function getClientEnv(): string | null {
  return process.env.AGENTPLANNER_CLIENT_ENV?.trim() || null
}
