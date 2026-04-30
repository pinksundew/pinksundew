export const CURSOR_RULE_MODES = ['always', 'agent-requested', 'auto-attached'] as const

export type CursorRuleMode = (typeof CURSOR_RULE_MODES)[number]

export type CursorRuleConfig = {
  mode: CursorRuleMode
  description: string
  globs: string
}

export type ParsedCursorRuleDocument = {
  body: string
  config: CursorRuleConfig
}

const FRONTMATTER_START = '---\n'
const FRONTMATTER_END = '\n---\n'

function splitFrontmatter(source: string) {
  const normalized = source.replace(/\r\n/g, '\n')
  if (!normalized.startsWith(FRONTMATTER_START)) {
    return null
  }

  const closingIndex = normalized.indexOf(FRONTMATTER_END, FRONTMATTER_START.length)
  if (closingIndex === -1) {
    return null
  }

  return {
    frontmatter: normalized.slice(FRONTMATTER_START.length, closingIndex),
    body: normalized.slice(closingIndex + FRONTMATTER_END.length),
  }
}

function parseFrontmatterString(rawValue: string) {
  const trimmedValue = rawValue.trim()
  if (!trimmedValue) {
    return ''
  }

  if (trimmedValue.startsWith('"')) {
    try {
      const parsed = JSON.parse(trimmedValue)
      return typeof parsed === 'string' ? parsed : trimmedValue
    } catch {
      return trimmedValue
    }
  }

  if (
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'")) ||
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"'))
  ) {
    return trimmedValue.slice(1, -1)
  }

  return trimmedValue
}

function normalizeGlobs(globs: string) {
  return globs
    .split(',')
    .map((glob) => glob.trim())
    .filter(Boolean)
    .join(', ')
}

function humanizeRuleName(rawValue: string) {
  const normalized = rawValue
    .trim()
    .replace(/\.[^.]+$/u, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')

  if (!normalized) {
    return 'this instruction file'
  }

  return normalized.replace(/\b\w/g, (character) => character.toUpperCase())
}

export function buildDefaultCursorRuleDescription(ruleName: string) {
  return `Use when working with ${humanizeRuleName(ruleName)}.`
}

export function parseCursorRuleDocument(
  source: string,
  options?: { defaultDescription?: string }
): ParsedCursorRuleDocument {
  const defaultDescription = options?.defaultDescription ?? ''
  const frontmatter = splitFrontmatter(source)

  if (!frontmatter) {
    return {
      body: source,
      config: {
        mode: 'always',
        description: defaultDescription,
        globs: '',
      },
    }
  }

  let description = defaultDescription
  let globs = ''
  let alwaysApply = false

  for (const line of frontmatter.frontmatter.split('\n')) {
    const separatorIndex = line.indexOf(':')
    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1)

    if (key === 'description') {
      description = parseFrontmatterString(value)
      continue
    }

    if (key === 'globs') {
      globs = normalizeGlobs(parseFrontmatterString(value))
      continue
    }

    if (key === 'alwaysApply') {
      alwaysApply = value.trim() === 'true'
    }
  }

  const mode: CursorRuleMode = alwaysApply
    ? 'always'
    : globs
      ? 'auto-attached'
      : description
        ? 'agent-requested'
        : 'always'

  return {
    body: frontmatter.body.replace(/^\n+/, ''),
    config: {
      mode,
      description,
      globs,
    },
  }
}

export function serializeCursorRuleDocument(
  body: string,
  config: CursorRuleConfig
) {
  const normalizedGlobs = config.mode === 'auto-attached' ? normalizeGlobs(config.globs) : ''
  const normalizedDescription =
    config.mode === 'agent-requested' ? config.description.trim() : ''

  const lines = [
    '---',
    `description: ${JSON.stringify(normalizedDescription)}`,
    `globs: ${JSON.stringify(normalizedGlobs)}`,
    `alwaysApply: ${config.mode === 'always' ? 'true' : 'false'}`,
    '---',
    '',
    body.trim(),
  ]

  return lines.join('\n').trimEnd()
}
