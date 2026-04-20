import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeRequest, isBridgeAuthError } from '@/lib/bridge-auth'
import { requireTaskAccess } from '@/lib/bridge-access'
import { getResolvedTaskInstructionSets } from '@/domains/agent-instruction/queries'
import { getTaskPlans } from '@/domains/plan/queries'
import { mapTaskWithTags, TaskWithTaskTagsRow } from '@/domains/task/normalization'
import { listTaskStateMessages } from '@/domains/task/mutations'

const TASK_TIMELINE_SELECT = 'id, title, status, priority, predecessor_id, is_deleted, completed_at'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await validateBridgeRequest(request)
  if (isBridgeAuthError(auth)) return auth

  const { taskId } = await params

  const taskResult = await requireTaskAccess<TaskWithTaskTagsRow>(
    auth.supabase,
    auth.userId,
    taskId,
    `
      *,
      task_tags(tags (*))
    `,
    {
      recordMcpActivity: true,
      requestPath: request.nextUrl.pathname,
    }
  )

  if (taskResult.response) {
    return taskResult.response
  }

  const taskData = mapTaskWithTags(taskResult.task)

  // Get plans for the task
  const plans = await getTaskPlans(auth.supabase, taskId)

  const predecessorQuery = taskData.predecessor_id
    ? auth.supabase
        .from('tasks')
        .select(TASK_TIMELINE_SELECT)
        .eq('id', taskData.predecessor_id)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const successorsQuery = auth.supabase
    .from('tasks')
    .select(TASK_TIMELINE_SELECT)
    .eq('predecessor_id', taskId)
    .order('created_at', { ascending: true })

  const [predecessorResult, successorsResult] = await Promise.all([
    predecessorQuery,
    successorsQuery,
  ])

  // Only global instruction sets are returned now (task linking is deprecated)
  const resolvedInstructionSets = await getResolvedTaskInstructionSets(
    auth.supabase,
    taskData.project_id,
    taskId
  )

  const signalMessages = await listTaskStateMessages(auth.supabase, taskId, 25)

  if (predecessorResult.error) {
    return NextResponse.json({ error: predecessorResult.error.message }, { status: 500 })
  }

  if (successorsResult.error) {
    return NextResponse.json({ error: successorsResult.error.message }, { status: 500 })
  }

  return NextResponse.json({
    ...taskData,
    plans,
    signal_messages: signalMessages,
    // Task linking is deprecated - these fields are kept for API compatibility
    linked_instruction_set_ids: [],
    linked_instruction_sets: [],
    resolved_instructions: resolvedInstructionSets,
    timeline: {
      predecessor: predecessorResult.data ?? null,
      successors: successorsResult.data ?? [],
    },
  })
}
