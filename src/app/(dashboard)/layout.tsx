import { createClient } from '@/lib/supabase/server'
import { getUserProjects } from '@/domains/project/queries'
import { ProjectTabs } from '@/components/project-tabs'
import Link from 'next/link'
import { LayoutDashboard, LogOut, PlusSquare, User } from 'lucide-react'
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar'

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
    <div className="flex min-h-screen bg-muted/20">
      {user ? <DashboardSidebar projects={projects} userEmail={user.email} /> : null}

      <div className="flex min-h-screen flex-1 flex-col">
        {user ? (
          <header className="sticky top-0 z-40 flex h-24 flex-col border-b border-border/80 bg-white/80 shadow-sm backdrop-blur">
            <div className="hidden h-12 items-center justify-between border-b border-border/70 px-6 md:flex">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-primary" />
                <Link href="/" className="text-lg font-bold text-foreground">
                  AgentPlanner
                </Link>
              </div>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </div>

            <div className="flex h-12 items-center justify-between border-b border-border/70 px-4 md:hidden">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-foreground">AgentPlanner</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  href="/create-project"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <PlusSquare className="h-4 w-4" />
                  <span className="sr-only">Create project</span>
                </Link>
                <Link
                  href="/profile"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <User className="h-4 w-4" />
                  <span className="sr-only">Profile</span>
                </Link>
                <form action="/api/auth/signout" method="POST">
                  <button
                    type="submit"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">Sign out</span>
                  </button>
                </form>
              </div>
            </div>

            <div className="flex h-12 min-h-[3rem] items-center overflow-hidden">
              <ProjectTabs projects={projects} />
            </div>
          </header>
        ) : null}

        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  )
}
