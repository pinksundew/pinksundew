import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserProjects } from '@/domains/project/queries'
import { GuestBoardShell } from '@/components/guest/guest-board-shell'

export default async function IndexRedirect() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Show guest board directly without redirect - removes friction
    return <GuestBoardShell />
  }

  try {
    const projects = await getUserProjects(supabase)
    if (projects && projects.length > 0) {
      redirect(`/${projects[0].id}`)
    }
  } catch (error) {
    console.error('Error fetching projects', error)
  }

  redirect('/create-project')
}
