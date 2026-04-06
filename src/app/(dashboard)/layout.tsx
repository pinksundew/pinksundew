import { createClient } from '@/lib/supabase/server'
import { getUserProjects } from '@/domains/project/queries'
import { ProjectTabs } from '@/components/project-tabs'
import Link from 'next/link'
import { LayoutDashboard, LogOut, User } from 'lucide-react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch user projects
  const projects = user ? await getUserProjects(supabase).catch(() => []) : []

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <header className="sticky top-0 z-40 bg-white border-b border-border shadow-sm flex flex-col h-24">
        {/* Top Nav */}
        <div className="flex h-12 items-center justify-between px-4 shrink-0 gap-4">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <Link href="/" className="font-bold text-foreground text-lg hidden sm:block">
              AgentPlanner
            </Link>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:block">{user.email}</span>
              <div className="flex items-center gap-2">
                <Link href="/profile" className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors">
                  <User className="h-5 w-5" />
                  <span className="sr-only">Profile</span>
                </Link>
                <form action="/api/auth/signout" method="POST">
                  <button type="submit" className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors">
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">Sign out</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Nav: Project Tabs */}
        {user && (
          <div className="flex-1 min-h-[3rem] max-h-12 overflow-hidden flex">
            <ProjectTabs projects={projects} />
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  )
}
