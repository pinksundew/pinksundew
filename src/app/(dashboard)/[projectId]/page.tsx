import { createClient } from '@/lib/supabase/server'
import { getProject } from '@/domains/project/queries'
import { getProjectTasks } from '@/domains/task/queries'
import { KanbanBoard } from '@/components/kanban/board'

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const pageParams = await params
  const supabase = await createClient()

  // Pre-fetch project data for SSR
  let initialTasks: import("/Users/quentinadolphe/My Projects/AgentPlanner/src/domains/task/types").TaskWithTags[] = []
  let projectName = 'Project'

  try {
    const project = await getProject(supabase, pageParams.projectId)
    initialTasks = await getProjectTasks(supabase, pageParams.projectId)
    projectName = project?.name || projectName
  } catch (error) {
    console.error('Failed to load board data', error)
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 ovezrflow-hidden w-full h-[calc(100vh-6rem)]">
      <KanbanBoard
        projectId={pageParams.projectId}
        projectName={projectName}
        initialTasks={initialTasks}
      />
    </div>
  )
}
