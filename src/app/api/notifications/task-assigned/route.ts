import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

type TaskWithProject = {
  title: string
  project_id: string
  projects:
    | {
        name: string | null
      }
    | {
        name: string | null
      }[]
    | null
}

// Initialize Resend
// fallback for dev if no token provided
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Service role required to read user emails securely if necessary
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export async function POST(req: Request) {
  try {
    const { taskId, assigneeId } = await req.json()

    if (!taskId || !assigneeId) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    // 1. Get task info
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('title, project_id, projects(name)')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // 2. Get user info (assuming profiles store the display email or getting auth user)
    // Here we query the auth.users via service role, or get it from profiles if public
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', assigneeId)
      .single()

    if (profileError || !profile || !profile.email) {
      return NextResponse.json({ error: 'Assignee profile / email not found' }, { status: 404 })
    }

    const typedTask = task as unknown as TaskWithProject
    const project = Array.isArray(typedTask.projects) ? typedTask.projects[0] : typedTask.projects
    const projectName = project?.name || 'A Project'

    // 3. Send email using Resend
    if (resend) {
      await resend.emails.send({
        from: 'Pink Sundew <notifications@pinksundew.com>',
        to: profile.email,
        subject: `You have been assigned to: ${typedTask.title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Task Assignment</h2>
            <p>Hi ${profile.full_name || 'there'},</p>
            <p>You've been assigned to a new task in <strong>${projectName}</strong>:</p>
            <div style="padding: 16px; background-color: #f4f4f5; border-left: 4px solid #3b82f6; margin-top: 16px;">
              <h3 style="margin: 0 0 8px 0;">${typedTask.title}</h3>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/${typedTask.project_id}?task=${taskId}" style="display: inline-block; padding: 8px 16px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 4px; margin-top: 12px;">
                View Task
              </a>
            </div>
          </div>
        `
      })
    } else {
      console.log('No RESEND_API_KEY set. Skipping email send but simulating success.', {
        to: profile.email,
        task: typedTask.title
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error sending notification', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
