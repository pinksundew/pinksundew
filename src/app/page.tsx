import { createClient } from '@/lib/supabase/server'
import { getUserProjects } from '@/domains/project/queries'
import { LandingPage } from '@/components/guest/landing-page'
import { PostAuthMerge } from '@/components/auth/post-auth-merge'

export default async function IndexRedirect() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.is_anonymous) {
    return <LandingPage />
  }

  let workspaceHref: string | null = null
  try {
    const projects = await getUserProjects(supabase)
    if (projects && projects.length > 0) {
      workspaceHref = `/${projects[0].id}`
    }
  } catch (error) {
    console.error('Error fetching projects', error)
  }

  return (
    <>
      <LandingPage isAuthenticated workspaceHref={workspaceHref} />
      <PostAuthMerge userId={user.id} />
    </>
  )
}
