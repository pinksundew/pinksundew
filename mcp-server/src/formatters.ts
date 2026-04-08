import { ExportFormat, ExportInstruction, Task } from './types.js'

type ExportOptions = {
  format: ExportFormat
  includeTags: boolean
  includePriority: boolean
  instructions?: ExportInstruction[]
}

function formatTaskBlock(task: Task, index: number, options: ExportOptions) {
  const description = task.description?.trim() || 'No description provided.'
  const tags = task.tags.length > 0 ? task.tags.map((tag) => tag.name).join(', ') : 'None'
  const detailLines = [
    `Description: ${description}`,
    options.includeTags ? `Tags: ${tags}` : null,
    options.includePriority ? `Priority: ${task.priority}` : null,
  ].filter(Boolean) as string[]

  if (options.format === 'compact') {
    return [`${index + 1}. ${task.title}`, ...detailLines].join(' | ')
  }

  const prefix =
    options.format === 'numbered'
      ? `${index + 1}. ${task.title}`
      : options.format === 'bullets'
        ? `- ${task.title}`
        : `[ ] ${task.title}`

  return [prefix, ...detailLines].join('\n')
}

export function generateExportText(tasks: Task[], options: ExportOptions) {
  const taskSections = tasks.map((task, index) => formatTaskBlock(task, index, options))
  let content = `Implement these tasks:\n\n${taskSections.join('\n\n')}`

  if (options.instructions && options.instructions.length > 0) {
    const instructionSections = options.instructions.map(
      (instruction) => `[${instruction.title}]\n${instruction.content}`
    )

    content += `\n\n--- CUSTOM INSTRUCTIONS ---\n\n${instructionSections.join('\n\n')}`
  }

  return content
}