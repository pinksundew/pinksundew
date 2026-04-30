import { describe, expect, it } from 'vitest'
import {
  buildDefaultCursorRuleDescription,
  parseCursorRuleDocument,
  serializeCursorRuleDocument,
} from '@/domains/agent-instruction/cursor-rules'

describe('buildDefaultCursorRuleDescription', () => {
  it('humanizes file names into a readable default description', () => {
    expect(buildDefaultCursorRuleDescription('database-schema.md')).toBe(
      'Use when working with Database Schema.'
    )
  })
})

describe('parseCursorRuleDocument', () => {
  it('defaults legacy content to an always-applied Cursor rule', () => {
    const parsed = parseCursorRuleDocument('# Architecture\n\nImportant context', {
      defaultDescription: 'Use when editing architecture docs.',
    })

    expect(parsed).toEqual({
      body: '# Architecture\n\nImportant context',
      config: {
        mode: 'always',
        description: 'Use when editing architecture docs.',
        globs: '',
      },
    })
  })

  it('parses agent-requested metadata and strips frontmatter from the body', () => {
    const parsed = parseCursorRuleDocument(`---
description: "Use when debugging auth flows."
globs: ""
alwaysApply: false
---

# Auth

Review login and merge behavior.`)

    expect(parsed).toEqual({
      body: '# Auth\n\nReview login and merge behavior.',
      config: {
        mode: 'agent-requested',
        description: 'Use when debugging auth flows.',
        globs: '',
      },
    })
  })
})

describe('serializeCursorRuleDocument', () => {
  it('writes auto-attached metadata with normalized globs', () => {
    const serialized = serializeCursorRuleDocument('# UI\n\nFollow the design system.', {
      mode: 'auto-attached',
      description: '',
      globs: 'src/components/**/*.tsx, src/app/**/*.tsx ',
    })

    expect(serialized).toContain('globs: "src/components/**/*.tsx, src/app/**/*.tsx"')
    expect(serialized).toContain('alwaysApply: false')
    expect(serialized).toContain('# UI\n\nFollow the design system.')
  })

  it('round-trips always-applied metadata', () => {
    const serialized = serializeCursorRuleDocument('Important note', {
      mode: 'always',
      description: 'ignored',
      globs: 'ignored',
    })

    expect(parseCursorRuleDocument(serialized)).toEqual({
      body: 'Important note',
      config: {
        mode: 'always',
        description: '',
        globs: '',
      },
    })
  })
})
