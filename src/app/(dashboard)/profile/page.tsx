import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getProfile } from '@/domains/profile/queries'
import { syncProfileFromAuthUser, updateProfile } from '@/domains/profile/mutations'
import { getUserApiKeys } from '@/domains/api-key/queries'
import { revalidatePath } from 'next/cache'
import { LogOut, Mail, User } from 'lucide-react'
import ApiKeyManager from '@/components/api-key-manager'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  await syncProfileFromAuthUser(supabase, user).catch((error) => {
    console.error('Unable to sync profile from auth user:', error)
  })

  const [profile, apiKeys] = await Promise.all([
    getProfile(supabase, user.id),
    getUserApiKeys(supabase, user.id),
  ])

  async function updateProfileActions(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const fullName = formData.get('fullName') as string
    await updateProfile(supabase, user.id, { full_name: fullName })

    revalidatePath('/profile')
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
      <section className="rounded-3xl border border-border bg-gradient-to-br from-white via-white to-primary/10 p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary-foreground">
              <User size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Your Profile</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Update your account details and manage API keys for MCP access.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-white/80 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {user.email}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Email updates are currently handled by support.
            </p>
          </div>

          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
              Log Out
            </button>
          </form>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.25fr]">
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Personal Details</h2>
          <p className="mt-1 text-sm text-muted-foreground">This name appears across your workspace.</p>

          <form action={updateProfileActions} className="mt-5 space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Full Name</label>
              <input
                name="fullName"
                type="text"
                defaultValue={profile?.full_name || ''}
                className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Pink Sundew"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Email Address</label>
              <input
                type="email"
                disabled
                value={user.email || ''}
                className="w-full rounded-md border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                To change your email, please contact support.
              </p>
            </div>

            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Save Changes
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <ApiKeyManager initialKeys={apiKeys} />
        </section>
      </div>
    </div>
  )
}
