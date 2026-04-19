import { createClient } from '@/lib/supabase/server'
import { getUserProjects } from '@/domains/project/queries'
import Link from 'next/link'
import Image from 'next/image'
import { User } from 'lucide-react'
import { ProjectBreadcrumb } from '@/components/dashboard/project-breadcrumb'

function AppLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/favicon.png"
      alt="Pink Sundew logo"
      width={28}
      height={28}
      className={className}
      priority
    />
  )
}

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
    <div className="min-h-screen bg-muted/20">
      {/* Single-row header with breadcrumb navigation */}
      {user ? (
        <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border/70 bg-white px-4 shadow-sm">
          {/* Left: Logo + Breadcrumb */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-primary transition-colors hover:text-primary/80">
              <AppLogo className="h-7 w-7 rounded-md" />
            </Link>
            <ProjectBreadcrumb projects={projects} userEmail={user.email} />
          </div>

          {/* Right: Profile */}
          <Link
            href="/profile"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <User className="h-4 w-4" />
            <span className="sr-only">Profile</span>
          </Link>
        </header>
      ) : null}

      {/* Main content area */}
      <div className={`flex min-h-screen flex-col ${user ? 'pt-14' : ''}`}>
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  )
}
