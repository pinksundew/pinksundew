import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getProject } from '@/domains/project/queries'
import { updateProject, inviteMember, removeMember } from '@/domains/project/mutations'
import { getProjectMembers } from '@/domains/profile/queries'
import { revalidatePath } from 'next/cache'

export default async function ProjectSettingsPage({
  params,
}: {
  params: { projectId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const project = await getProject(supabase, params.projectId)
  if (!project) {
    redirect('/')
  }

  const members = await getProjectMembers(supabase, params.projectId)

  async function updateProjectAction(formData: FormData) {
    'use server'
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    
    if (!name) return
    const supabase = await createClient()
    await updateProject(supabase, params.projectId, { name, description })
    revalidatePath(`/${params.projectId}/settings`)
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-12">
      <div>
        <h1 className="text-2xl font-bold mb-6">Project Settings</h1>
        <form action={updateProjectAction} className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">General</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Project Name</label>
            <input
              name="name"
              type="text"
              required
              defaultValue={project.name}
              className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              name="description"
              rows={3}
              defaultValue={project.description || ''}
              className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Save Details
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border rounded-lg p-6 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Team Members</h2>
        </div>
        
        <div className="space-y-4 mb-6">
          {members.map(member => (
            <div key={member.id} className="flex justify-between items-center p-3 border rounded-md">
              <div className="flex flex-col">
                <span className="font-medium">{member.full_name || 'Anonymous User'}</span>
                <span className="text-sm text-gray-500">{member.id}</span>
              </div>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600 font-medium">Member</span>
            </div>
          ))}
        </div>

        <form action={async (formData: FormData) => {
          'use server'
          const email = formData.get('email') as string
          if (!email) return
          // Note: In a real app we'd resolve email to user_id, 
          // or send invitation link. For now assuming UUID is sent.
          const userId = formData.get('userId') as string
          if (userId) {
            const supabase = await createClient()
            await inviteMember(supabase, params.projectId, userId)
            revalidatePath(`/${params.projectId}/settings`)
          }
        }} className="flex flex-col gap-2 pt-4 border-t">
          <h3 className="text-sm font-semibold">Add Member</h3>
          <div className="flex gap-2">
            <input
              name="userId"
              type="text"
              placeholder="User ID UUID"
              className="flex-1 rounded-md border p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
            >
              Invite
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
