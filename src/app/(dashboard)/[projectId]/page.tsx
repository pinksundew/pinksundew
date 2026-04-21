import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProject } from '@/domains/project/queries'
import { getProjectDashboardStatus } from '@/domains/project/dashboard-status'
import { getProjectTasks } from '@/domains/task/queries'
import { KanbanBoard } from '@/components/kanban/board'
import { Metadata } from 'next'

type Props = {
  params: Promise<{ projectId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pageParams = await params
  const supabase = await createClient()
  
  try {
    const project = await getProject(supabase, pageParams.projectId)
    return {
      title: project?.name || 'Project',
    }
  } catch {
    return { title: 'Project' }
  }
}

export default async function ProjectBoardPage({
  params,
}: Props) {
  const pageParams = await params
  const supabase = await createClient()

  // Pre-fetch project data for SSR
  let initialTasks: import('@/domains/task/types').TaskWithTags[] = []
  let projectName = 'Project'
  let dashboardStatus: import('@/domains/project/dashboard-status').ProjectDashboardStatus | null = null
  let viewer: { id: string; isAnonymous: boolean } | null = null

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      viewer = {
        id: user.id,
        isAnonymous: Boolean(user.is_anonymous),
      }
    }
    const project = await getProject(supabase, pageParams.projectId)
    initialTasks = await getProjectTasks(supabase, pageParams.projectId)
    projectName = project?.name || projectName

    if (user && project) {
      dashboardStatus = await getProjectDashboardStatus(
        createAdminClient(),
        pageParams.projectId,
        user.id
      )
    }
  } catch (error) {
    console.error('Failed to load board data', error)
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden w-full h-[calc(100vh-3.5rem)]">
      <KanbanBoard
        projectId={pageParams.projectId}
        projectName={projectName}
        initialTasks={initialTasks}
        dashboardStatus={dashboardStatus}
        viewer={viewer}
      />
    </div>
  )
}
