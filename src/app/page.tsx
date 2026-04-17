import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserProjects } from '@/domains/project/queries'
import { LandingPage } from '@/components/guest/landing-page'

export default async function IndexRedirect() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <LandingPage />
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
