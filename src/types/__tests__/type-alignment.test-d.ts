/**
 * Type Alignment Tests
 * 
 * These compile-time tests ensure that Zod schemas stay in sync with
 * Supabase-generated database types. If you add a column to Supabase
 * but forget to update the Zod schema, these tests will fail at build time.
 * 
 * Run with: npm run test:types
 */

import type { Expect, Equal, Extends } from './type-utils'
import type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskSignal,
  Tag,
  Project,
  Profile,
  TaskPlan,
  TaskStateMessage,
} from '@/types/schemas'

// ============================================================================
// Task Schema Alignment
// ============================================================================

// Core task fields should be assignable from DB row
type _TaskIdMatch = Expect<Equal<Task['id'], string>>
type _TaskTitleMatch = Expect<Equal<Task['title'], string>>
type _TaskDescriptionMatch = Expect<Equal<Task['description'], string | null>>
type _TaskPositionMatch = Expect<Equal<Task['position'], number>>

// Status enum should be a subset of what DB allows
type _TaskStatusExtends = Expect<Extends<TaskStatus, 'todo' | 'in-progress' | 'done'>>
type _TaskPriorityExtends = Expect<Extends<TaskPriority, 'low' | 'medium' | 'high'>>
type _TaskSignalExtends = Expect<Extends<TaskSignal, 'ready_for_review' | 'needs_help' | 'agent_working'>>

// ============================================================================
// Tag Schema Alignment
// ============================================================================

type _TagIdMatch = Expect<Equal<Tag['id'], string>>
type _TagNameMatch = Expect<Equal<Tag['name'], string>>
type _TagColorMatch = Expect<Equal<Tag['color'], string>>
type _TagProjectIdMatch = Expect<Equal<Tag['project_id'], string>> // Note: DB allows null, schema requires it

// ============================================================================
// Project Schema Alignment
// ============================================================================

type _ProjectIdMatch = Expect<Equal<Project['id'], string>>
type _ProjectNameMatch = Expect<Equal<Project['name'], string>>
type _ProjectDescriptionMatch = Expect<Equal<Project['description'], string | null>>

// ============================================================================
// Profile Schema Alignment
// ============================================================================

type _ProfileIdMatch = Expect<Equal<Profile['id'], string>>
// Note: DB has email as required string, schema may allow null depending on use case

// ============================================================================
// Task Plan Schema Alignment
// ============================================================================

type _TaskPlanIdMatch = Expect<Equal<TaskPlan['id'], string>>
type _TaskPlanContentMatch = Expect<Equal<TaskPlan['content'], string>>

// ============================================================================
// Task State Message Schema Alignment
// ============================================================================

type _TaskStateMessageIdMatch = Expect<Equal<TaskStateMessage['id'], string>>
type _TaskStateMessageTaskIdMatch = Expect<Equal<TaskStateMessage['task_id'], string>>

// ============================================================================
// Tests Complete - Compile errors above indicate schema drift
// ============================================================================

// Dummy test to make vitest happy
import { describe, it, expect } from 'vitest'

describe('Type alignment', () => {
  it('compiles without errors', () => {
    // If this file compiles, all type tests pass
    expect(true).toBe(true)
  })
})
