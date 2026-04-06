import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendTaskAssignmentEmail(
  assigneeEmail: string,
  taskTitle: string,
  projectName: string
) {
  try {
    await resend.emails.send({
      from: 'AgentPlanner <notifications@agentplanner.app>', // Need an actual domain in prod
      to: assigneeEmail,
      subject: `You've been assigned a new task: ${taskTitle}`,
      html: `<p>You have been assigned to <strong>${taskTitle}</strong> in the project <em>${projectName}</em>.</p>
             <p><a href="https://agentplanner.app">Log in to view your task</a></p>`,
    });
  } catch (error) {
    console.error('Error sending assignment email:', error);
  }
}
