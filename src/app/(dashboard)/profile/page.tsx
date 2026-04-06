import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getProfile } from '@/domains/profile/queries'
import { updateProfile } from '@/domains/profile/mutations'
import { revalidatePath } from 'next/cache'
import { User } from 'lucide-react'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getProfile(supabase, user.id)

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
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 border-b pb-6 mb-6">
        <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
          <User size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Your Profile</h1>
          <p className="text-gray-500">{user.email}</p>
        </div>
      </div>

      <form action={updateProfileActions} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input
            name="fullName"
            type="text"
            defaultValue={profile?.full_name || ''}
            className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email Address</label>
          <input
            type="email"
            disabled
            value={user.email || ''}
            className="w-full rounded-md border bg-gray-50 p-2 text-gray-500"
          />
          <p className="text-xs text-gray-500 mt-1">To change your email, please contact support.</p>
        </div>

        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Save Changes
        </button>
      </form>
    </div>
  )
}
