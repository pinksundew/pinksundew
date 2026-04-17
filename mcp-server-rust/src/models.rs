use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub created_by: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub role: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Tag {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Task {
    pub id: String,
    pub project_id: String,
    pub title: String,
    #[serde(default)]
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    #[serde(default)]
    pub assignee_id: Option<String>,
    #[serde(default)]
    pub due_date: Option<String>,
    #[serde(default)]
    pub predecessor_id: Option<String>,
    pub position: f64,
    pub is_deleted: bool,
    #[serde(default)]
    pub completed_at: Option<String>,
    #[serde(default)]
    pub workflow_signal: Option<String>,
    #[serde(default)]
    pub workflow_signal_message: Option<String>,
    #[serde(default)]
    pub workflow_signal_updated_at: Option<String>,
    #[serde(default)]
    pub workflow_signal_updated_by: Option<String>,
    #[serde(default)]
    pub agent_lock_until: Option<String>,
    #[serde(default)]
    pub agent_lock_reason: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub tags: Vec<Tag>,
    #[serde(flatten)]
    pub extra: HashMap<String, Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AgentInstructionFile {
    pub id: String,
    pub set_id: String,
    pub file_name: String,
    pub content_hash: String,
    pub updated_at: String,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub content: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AgentInstructionSet {
    pub id: String,
    #[serde(default)]
    pub project_id: Option<String>,
    pub name: String,
    pub code: String,
    pub scope: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub sort_order: Option<f64>,
    #[serde(default)]
    pub is_active: Option<bool>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub files: Vec<AgentInstructionFile>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BoardState {
    pub project: Option<Project>,
    #[serde(default)]
    pub tasks: Vec<Task>,
    #[serde(default)]
    pub tags: Vec<Tag>,
    #[serde(default)]
    pub instructions: Vec<AgentInstructionSet>,
    #[serde(flatten)]
    pub extra: HashMap<String, Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AbyssState {
    #[serde(rename = "deletedTasks", default)]
    pub deleted_tasks: Vec<Task>,
    #[serde(default)]
    #[serde(rename = "archivedTasks")]
    pub archived_tasks: Vec<Task>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AgentControls {
    pub project_id: String,
    pub allow_task_completion: bool,
    #[serde(default)]
    pub tool_toggles: HashMap<String, bool>,
    #[serde(flatten)]
    pub extra: HashMap<String, Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ExportInstruction {
    pub title: String,
    pub content: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ExportTaskSummary {
    pub id: String,
    pub title: String,
    pub status: String,
    pub priority: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ExportTasksResult {
    pub project: Option<ProjectSummary>,
    #[serde(rename = "taskCount")]
    pub task_count: usize,
    pub tasks: Vec<ExportTaskSummary>,
    pub content: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ProjectSummary {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct TaskStateMessage {
    pub id: String,
    pub task_id: String,
    pub signal: String,
    pub message: String,
    #[serde(default)]
    pub created_by: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct InstructionHashResponse {
    pub hash: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SyncResult {
    pub success: bool,
    #[serde(rename = "projectId")]
    pub project_id: Option<String>,
    #[serde(rename = "projectName")]
    pub project_name: Option<String>,
    #[serde(rename = "fileWritten")]
    pub file_written: Option<String>,
    #[serde(rename = "filesWritten")]
    pub files_written: Vec<String>,
    #[serde(rename = "instructionCount")]
    pub instruction_count: usize,
    pub error: Option<String>,
}
