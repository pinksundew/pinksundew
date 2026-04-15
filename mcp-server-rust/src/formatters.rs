use crate::models::{ExportInstruction, Task};

#[derive(Debug, Clone)]
pub struct ExportOptions {
    pub format: String,
    pub include_tags: bool,
    pub include_priority: bool,
    pub instructions: Vec<ExportInstruction>,
}

fn format_task_block(task: &Task, index: usize, options: &ExportOptions) -> String {
    let description = task
        .description
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("No description provided.");

    let tags = if task.tags.is_empty() {
        "None".to_string()
    } else {
        task.tags
            .iter()
            .map(|tag| tag.name.as_str())
            .collect::<Vec<_>>()
            .join(", ")
    };

    let mut detail_lines = vec![format!("Description: {description}")];
    if options.include_tags {
        detail_lines.push(format!("Tags: {tags}"));
    }
    if options.include_priority {
        detail_lines.push(format!("Priority: {}", task.priority));
    }

    if options.format == "compact" {
        let mut pieces = vec![format!("{}. {}", index + 1, task.title)];
        pieces.extend(detail_lines);
        return pieces.join(" | ");
    }

    let prefix = match options.format.as_str() {
        "numbered" => format!("{}. {}", index + 1, task.title),
        "bullets" => format!("- {}", task.title),
        "checkboxes" => format!("[ ] {}", task.title),
        _ => format!("{}. {}", index + 1, task.title),
    };

    let mut lines = vec![prefix];
    lines.extend(detail_lines);
    lines.join("\n")
}

pub fn generate_export_text(tasks: &[Task], options: &ExportOptions) -> String {
    let task_sections = tasks
        .iter()
        .enumerate()
        .map(|(index, task)| format_task_block(task, index, options))
        .collect::<Vec<_>>();

    let mut content = format!("Implement these tasks:\n\n{}", task_sections.join("\n\n"));

    if !options.instructions.is_empty() {
        let instruction_sections = options
            .instructions
            .iter()
            .map(|instruction| format!("[{}]\n{}", instruction.title, instruction.content))
            .collect::<Vec<_>>();

        content.push_str("\n\n--- CUSTOM INSTRUCTIONS ---\n\n");
        content.push_str(&instruction_sections.join("\n\n"));
    }

    content
}
