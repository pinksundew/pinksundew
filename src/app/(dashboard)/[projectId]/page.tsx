import { createClient } from '@/lib/supabase/server'
import { getProjectTasks } from '@/domains/task/queries'
import { getProjectTags } from '@/domains/tag/queries'
import { KanbanBoard } from '@/components/kanban/board'

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const pageParams = await params
  const supabase = await createClient()

  // Pre-fetch tasks and tags for SSR
  let initialTasks = []
  let projectTags = []

  try {
    initialTasks = await getProjectTasks(supabase, pageParams.projectId)
    projectTags = await getProjectTags(supabase, pageParams.projectId)
  } catch (error) {
    console.error('Failed to load board data', error)
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 ovezrflow-hidden w-full h-[calc(100vh-6rem)]">
      <KanbanBoard
        projectId={pageParams.projectId}
        initialTasks={initialTasks}
        projectTags={projectTags}
      />
    </div>
  )
}
