/**
 * Schema Contract Tests
 * 
 * These tests verify that our Zod schemas correctly:
 * 1. Accept valid payloads
 * 2. Reject malformed payloads (including AI-hallucinated data)
 * 3. Handle edge cases (unknown keys, wrong enum values, etc.)
 */

import { describe, it, expect } from 'vitest'
import {
  CreateTaskInputSchema,
  UpdateTaskInputSchema,
  MoveTaskInputSchema,
  SetTaskSignalInputSchema,
  TaskStatusSchema,
  TaskPrioritySchema,
  TaskSignalSchema,
  CreateTagInputSchema,
  CreateProjectInputSchema,
} from '@/types/schemas'

describe('Task Schemas', () => {
  describe('CreateTaskInputSchema', () => {
    it('accepts valid task creation input', () => {
      const validInput = {
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Implement feature X',
        description: 'This is a description',
        status: 'todo',
        priority: 'high',
      }

      const result = CreateTaskInputSchema.safeParse(validInput)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe('Implement feature X')
        expect(result.data.status).toBe('todo')
        expect(result.data.priority).toBe('high')
      }
    })

    it('accepts minimal required fields', () => {
      const minimalInput = {
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Task title',
      }

      const result = CreateTaskInputSchema.safeParse(minimalInput)
      expect(result.success).toBe(true)
      if (result.success) {
        // Defaults should be applied
        expect(result.data.status).toBe('todo')
        expect(result.data.priority).toBe('medium')
        expect(result.data.position).toBe(0)
      }
    })

    it('rejects missing required fields', () => {
      const missingTitle = {
        project_id: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = CreateTaskInputSchema.safeParse(missingTitle)
      expect(result.success).toBe(false)
    })

    it('rejects invalid UUID for project_id', () => {
      const invalidUuid = {
        project_id: 'not-a-uuid',
        title: 'Task title',
      }

      const result = CreateTaskInputSchema.safeParse(invalidUuid)
      expect(result.success).toBe(false)
    })

    it('rejects empty title', () => {
      const emptyTitle = {
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        title: '',
      }

      const result = CreateTaskInputSchema.safeParse(emptyTitle)
      expect(result.success).toBe(false)
    })

    it('rejects invalid status enum value', () => {
      const invalidStatus = {
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Task',
        status: 'invalid-status',
      }

      const result = CreateTaskInputSchema.safeParse(invalidStatus)
      expect(result.success).toBe(false)
    })

    it('rejects hallucinated priority value', () => {
      // AI agents sometimes hallucinate enum values
      const hallucinatedPriority = {
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Task',
        priority: 'urgent', // Not in our enum
      }

      const result = CreateTaskInputSchema.safeParse(hallucinatedPriority)
      expect(result.success).toBe(false)
    })

    it('handles null description correctly', () => {
      const nullDescription = {
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Task',
        description: null,
      }

      const result = CreateTaskInputSchema.safeParse(nullDescription)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.description).toBeNull()
      }
    })
  })

  describe('MoveTaskInputSchema', () => {
    it('accepts valid move input', () => {
      const validMove = {
        task_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'in-progress',
        position: 5,
      }

      const result = MoveTaskInputSchema.safeParse(validMove)
      expect(result.success).toBe(true)
    })

    it('rejects invalid status for move', () => {
      const invalidMove = {
        task_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'completed', // Wrong enum value
      }

      const result = MoveTaskInputSchema.safeParse(invalidMove)
      expect(result.success).toBe(false)
    })
  })

  describe('SetTaskSignalInputSchema', () => {
    it('accepts valid signal input', () => {
      const validSignal = {
        task_id: '123e4567-e89b-12d3-a456-426614174000',
        signal: 'agent_working',
        message: 'Working on implementation',
        lock_minutes: 30,
      }

      const result = SetTaskSignalInputSchema.safeParse(validSignal)
      expect(result.success).toBe(true)
    })

    it('accepts null signal (clearing)', () => {
      const clearSignal = {
        task_id: '123e4567-e89b-12d3-a456-426614174000',
        signal: null,
      }

      const result = SetTaskSignalInputSchema.safeParse(clearSignal)
      expect(result.success).toBe(true)
    })

    it('rejects hallucinated signal values', () => {
      const hallucinated = {
        task_id: '123e4567-e89b-12d3-a456-426614174000',
        signal: 'blocked', // Not a valid signal
      }

      const result = SetTaskSignalInputSchema.safeParse(hallucinated)
      expect(result.success).toBe(false)
    })
  })
})

describe('Enum Schemas', () => {
  describe('TaskStatusSchema', () => {
    it('accepts valid statuses', () => {
      expect(TaskStatusSchema.safeParse('todo').success).toBe(true)
      expect(TaskStatusSchema.safeParse('in-progress').success).toBe(true)
      expect(TaskStatusSchema.safeParse('done').success).toBe(true)
    })

    it('rejects invalid statuses', () => {
      expect(TaskStatusSchema.safeParse('pending').success).toBe(false)
      expect(TaskStatusSchema.safeParse('completed').success).toBe(false)
      expect(TaskStatusSchema.safeParse('').success).toBe(false)
      expect(TaskStatusSchema.safeParse(null).success).toBe(false)
      expect(TaskStatusSchema.safeParse(undefined).success).toBe(false)
      expect(TaskStatusSchema.safeParse(123).success).toBe(false)
    })
  })

  describe('TaskPrioritySchema', () => {
    it('accepts valid priorities', () => {
      expect(TaskPrioritySchema.safeParse('low').success).toBe(true)
      expect(TaskPrioritySchema.safeParse('medium').success).toBe(true)
      expect(TaskPrioritySchema.safeParse('high').success).toBe(true)
    })

    it('rejects hallucinated priorities', () => {
      expect(TaskPrioritySchema.safeParse('urgent').success).toBe(false)
      expect(TaskPrioritySchema.safeParse('critical').success).toBe(false)
      expect(TaskPrioritySchema.safeParse('p0').success).toBe(false)
      expect(TaskPrioritySchema.safeParse('P1').success).toBe(false)
    })
  })

  describe('TaskSignalSchema', () => {
    it('accepts valid signals', () => {
      expect(TaskSignalSchema.safeParse('ready_for_review').success).toBe(true)
      expect(TaskSignalSchema.safeParse('needs_help').success).toBe(true)
      expect(TaskSignalSchema.safeParse('agent_working').success).toBe(true)
    })

    it('rejects invalid signals', () => {
      expect(TaskSignalSchema.safeParse('blocked').success).toBe(false)
      expect(TaskSignalSchema.safeParse('in_review').success).toBe(false)
      expect(TaskSignalSchema.safeParse('completed').success).toBe(false)
    })
  })
})

describe('Tag Schemas', () => {
  describe('CreateTagInputSchema', () => {
    it('accepts valid tag input', () => {
      const validTag = {
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Bug',
        color: '#ff0000',
      }

      const result = CreateTagInputSchema.safeParse(validTag)
      expect(result.success).toBe(true)
    })

    it('rejects invalid hex color', () => {
      const invalidColor = {
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Bug',
        color: 'red', // Not hex
      }

      const result = CreateTagInputSchema.safeParse(invalidColor)
      expect(result.success).toBe(false)
    })

    it('rejects 3-digit hex color', () => {
      const shortHex = {
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Bug',
        color: '#f00', // 3-digit hex, we require 6
      }

      const result = CreateTagInputSchema.safeParse(shortHex)
      expect(result.success).toBe(false)
    })
  })
})

describe('Project Schemas', () => {
  describe('CreateProjectInputSchema', () => {
    it('accepts valid project input', () => {
      const validProject = {
        name: 'My Project',
        description: 'A test project',
      }

      const result = CreateProjectInputSchema.safeParse(validProject)
      expect(result.success).toBe(true)
    })

    it('accepts project without description', () => {
      const noDescription = {
        name: 'My Project',
      }

      const result = CreateProjectInputSchema.safeParse(noDescription)
      expect(result.success).toBe(true)
    })

    it('rejects empty name', () => {
      const emptyName = {
        name: '',
      }

      const result = CreateProjectInputSchema.safeParse(emptyName)
      expect(result.success).toBe(false)
    })

    it('rejects overly long name', () => {
      const longName = {
        name: 'a'.repeat(101), // > 100 chars
      }

      const result = CreateProjectInputSchema.safeParse(longName)
      expect(result.success).toBe(false)
    })
  })
})

describe('AI Hallucination Edge Cases', () => {
  it('rejects object when string expected', () => {
    const objectInsteadOfString = {
      project_id: '123e4567-e89b-12d3-a456-426614174000',
      title: { text: 'Task title' }, // Object instead of string
    }

    const result = CreateTaskInputSchema.safeParse(objectInsteadOfString)
    expect(result.success).toBe(false)
  })

  it('rejects array when single value expected', () => {
    const arrayInsteadOfString = {
      project_id: '123e4567-e89b-12d3-a456-426614174000',
      title: ['Task 1', 'Task 2'], // Array instead of string
    }

    const result = CreateTaskInputSchema.safeParse(arrayInsteadOfString)
    expect(result.success).toBe(false)
  })

  it('rejects number when string UUID expected', () => {
    const numberUuid = {
      project_id: 12345, // Number instead of UUID string
      title: 'Task',
    }

    const result = CreateTaskInputSchema.safeParse(numberUuid)
    expect(result.success).toBe(false)
  })

  it('handles deeply nested invalid data', () => {
    const deeplyNested = {
      project_id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Task',
      extra: {
        deeply: {
          nested: {
            invalid: true,
          },
        },
      },
    }

    // Should still pass - extra keys are stripped/ignored by Zod by default
    const result = CreateTaskInputSchema.safeParse(deeplyNested)
    expect(result.success).toBe(true)
  })
})
