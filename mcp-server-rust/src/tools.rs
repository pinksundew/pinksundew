use crate::bridge::BridgeClient;
use crate::config::ProjectScope;
use crate::formatters::{generate_export_text, ExportOptions};
use crate::models::{
    AgentInstructionFile, AgentInstructionSet, BoardState, ExportInstruction, ExportTaskSummary,
    ExportTasksResult, ProjectSummary, Tag, Task, TaskStateMessage,
};
use crate::resources::ResourceService;
use anyhow::{anyhow, Result};
use chrono::{Duration, Utc};
use serde_json::{json, Value};
use std::collections::HashMap;
use tokio::sync::RwLock;
use tracing::warn;

#[derive(Debug, Clone)]
struct CachedInstructionFile {
    content_hash: String,
    content: String,
}

#[derive(Clone)]
pub struct ToolService {
    bridge: BridgeClient,
    resources: ResourceService,
    scope: ProjectScope,
    instruction_file_cache: std::sync::Arc<RwLock<HashMap<String, CachedInstructionFile>>>,
}

impl ToolService {
    pub fn new(bridge: BridgeClient, resources: ResourceService, scope: ProjectScope) -> Self {
        Self {
            bridge,
            resources,
            scope,
            instruction_file_cache: std::sync::Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn list_projects(&self) -> Result<Value> {
        let projects = self.resources.get_projects().await?;
        serde_json::to_value(projects).map_err(Into::into)
    }

    pub async fn get_project_board(&self) -> Result<Value> {
        let project_id = self.scope.project_id();
        let board = self.resources.get_board_state(project_id).await?;
        let hydrated = self.hydrate_board_instructions(board).await?;
        serde_json::to_value(hydrated).map_err(Into::into)
    }

    pub async fn get_task(&self, task_id: &str) -> Result<Value> {
        let task = self.resources.get_task_details(task_id).await?;
        serde_json::to_value(task).map_err(Into::into)
    }

    pub async fn list_abyss_tasks(&self) -> Result<Value> {
        let project_id = self.scope.project_id();
        let abyss = self.resources.get_abyss_state(project_id).await?;
        serde_json::to_value(abyss).map_err(Into::into)
    }

    pub async fn list_tags(&self) -> Result<Value> {
        let project_id = self.scope.project_id();
        let tags = self
            .bridge
            .get_json::<Vec<Tag>>(&format!(
                "/tags?projectId={}",
                urlencoding::encode(project_id)
            ))
            .await?;

        serde_json::to_value(tags).map_err(Into::into)
    }

    pub async fn create_task(&self, payload: Value) -> Result<Value> {
        let project_id = self.scope.project_id();

        let title = payload
            .get("title")
            .and_then(Value::as_str)
            .ok_or_else(|| anyhow!("title must be a string"))?;

        let status = payload
            .get("status")
            .and_then(Value::as_str)
            .unwrap_or("todo");
        let priority = payload
            .get("priority")
            .and_then(Value::as_str)
            .unwrap_or("medium");

        let body = json!({
            "project_id": project_id,
            "title": title,
            "description": payload.get("description").and_then(Value::as_str),
            "status": status,
            "priority": priority,
            "assignee_id": nullable_string(payload.get("assigneeId")),
            "due_date": nullable_string(payload.get("dueDate")),
            "predecessor_id": nullable_string(payload.get("predecessorId")),
            "position": payload.get("position").and_then(Value::as_f64).unwrap_or(0.0),
        });

        let task = self
            .bridge
            .post_json::<Value, Task>("/tasks", &body)
            .await?;
        serde_json::to_value(task).map_err(Into::into)
    }

    pub async fn update_task(&self, payload: Value) -> Result<Value> {
        let task_id = payload
            .get("taskId")
            .and_then(Value::as_str)
            .ok_or_else(|| anyhow!("taskId must be a string"))?;

        let mut updates = serde_json::Map::new();

        if let Some(title) = payload.get("title").and_then(Value::as_str) {
            updates.insert("title".to_string(), Value::String(title.to_string()));
        }
        if payload.get("description").is_some() {
            updates.insert(
                "description".to_string(),
                payload.get("description").cloned().unwrap_or(Value::Null),
            );
        }
        if let Some(priority) = payload.get("priority").and_then(Value::as_str) {
            updates.insert("priority".to_string(), Value::String(priority.to_string()));
        }
        if payload.get("assigneeId").is_some() {
            updates.insert(
                "assignee_id".to_string(),
                payload.get("assigneeId").cloned().unwrap_or(Value::Null),
            );
        }
        if payload.get("dueDate").is_some() {
            updates.insert(
                "due_date".to_string(),
                payload.get("dueDate").cloned().unwrap_or(Value::Null),
            );
        }
        if payload.get("predecessorId").is_some() {
            updates.insert(
                "predecessor_id".to_string(),
                payload.get("predecessorId").cloned().unwrap_or(Value::Null),
            );
        }

        if updates.is_empty() {
            return Err(anyhow!("No task updates were provided"));
        }

        let task = self
            .bridge
            .patch_json::<Value, Task>(&format!("/tasks/{task_id}"), &Value::Object(updates))
            .await?;

        serde_json::to_value(task).map_err(Into::into)
    }

    pub async fn move_task(&self, payload: Value) -> Result<Value> {
        let task_id = payload
            .get("taskId")
            .and_then(Value::as_str)
            .ok_or_else(|| anyhow!("taskId must be a string"))?;
        let status = payload
            .get("status")
            .and_then(Value::as_str)
            .ok_or_else(|| anyhow!("status must be a string"))?;

        let mut body = json!({ "status": status });
        if let Some(position) = payload.get("position").and_then(Value::as_f64) {
            body["position"] = json!(position);
        }

        if status == "done" {
            body["workflow_signal"] = Value::String("ready_for_review".to_string());
            body["workflow_signal_message"] = Value::String(
                "Completed by MCP agent. Please review before final acceptance.".to_string(),
            );
            body["agent_lock_until"] = Value::Null;
            body["agent_lock_reason"] = Value::Null;
        }

        let task = self
            .bridge
            .patch_json::<Value, Task>(&format!("/tasks/{task_id}"), &body)
            .await?;

        serde_json::to_value(task).map_err(Into::into)
    }

    pub async fn set_task_signal(&self, payload: Value) -> Result<Value> {
        let task_id = payload
            .get("taskId")
            .and_then(Value::as_str)
            .ok_or_else(|| anyhow!("taskId must be a string"))?;

        let mut updates = serde_json::Map::new();

        if payload.get("signal").is_some() {
            updates.insert(
                "workflow_signal".to_string(),
                payload.get("signal").cloned().unwrap_or(Value::Null),
            );
        }

        if payload.get("message").is_some() {
            updates.insert(
                "workflow_signal_message".to_string(),
                payload.get("message").cloned().unwrap_or(Value::Null),
            );
        }

        if payload.get("lockMinutes").is_some() {
            let lock_minutes = payload.get("lockMinutes").and_then(Value::as_f64);
            if let Some(lock_minutes) = lock_minutes {
                if lock_minutes <= 0.0 {
                    updates.insert("agent_lock_until".to_string(), Value::Null);
                } else {
                    let lock_until =
                        (Utc::now() + Duration::minutes(lock_minutes as i64)).to_rfc3339();
                    updates.insert("agent_lock_until".to_string(), Value::String(lock_until));
                }
            } else {
                updates.insert("agent_lock_until".to_string(), Value::Null);
            }
        }

        if payload.get("lockReason").is_some() {
            updates.insert(
                "agent_lock_reason".to_string(),
                payload.get("lockReason").cloned().unwrap_or(Value::Null),
            );
        }

        if updates.is_empty() {
            return Err(anyhow!(
                "At least one of signal, message, lockMinutes, or lockReason must be provided"
            ));
        }

        let patch_result = self
            .bridge
            .patch_json::<Value, Task>(
                &format!("/tasks/{task_id}"),
                &Value::Object(updates.clone()),
            )
            .await;

        match patch_result {
            Ok(task) => serde_json::to_value(task).map_err(Into::into),
            Err(err) => {
                let message = err.to_string();
                let is_server_error = message.contains("Bridge API error 5");
                if !is_server_error {
                    return Err(err);
                }

                let current_task = self.resources.get_task_details(task_id).await?;
                let signal_matches = payload.get("signal").is_none()
                    || current_task.workflow_signal
                        == payload
                            .get("signal")
                            .and_then(Value::as_str)
                            .map(ToString::to_string);
                let message_matches = payload.get("message").is_none()
                    || current_task.workflow_signal_message
                        == payload
                            .get("message")
                            .and_then(Value::as_str)
                            .map(ToString::to_string);
                let lock_reason_matches = payload.get("lockReason").is_none()
                    || current_task.agent_lock_reason
                        == payload
                            .get("lockReason")
                            .and_then(Value::as_str)
                            .map(ToString::to_string);
                let lock_until_matches = if payload.get("lockMinutes").is_none() {
                    true
                } else {
                    let lock_minutes = payload
                        .get("lockMinutes")
                        .and_then(Value::as_f64)
                        .unwrap_or(0.0);
                    if lock_minutes <= 0.0 {
                        current_task.agent_lock_until.is_none()
                    } else {
                        current_task.agent_lock_until.is_some()
                    }
                };

                if signal_matches && message_matches && lock_reason_matches && lock_until_matches {
                    warn!(
                        "Recovered from transient bridge 5xx while setting signal for task {}.",
                        task_id
                    );
                    return serde_json::to_value(current_task).map_err(Into::into);
                }

                Err(err)
            }
        }
    }

    pub async fn list_task_messages(&self, payload: Value) -> Result<Value> {
        let task_id = payload
            .get("taskId")
            .and_then(Value::as_str)
            .ok_or_else(|| anyhow!("taskId must be a string"))?;

        let limit = payload
            .get("limit")
            .and_then(Value::as_u64)
            .unwrap_or(25)
            .clamp(1, 100);

        let messages = self
            .bridge
            .get_json::<Vec<TaskStateMessage>>(&format!(
                "/tasks/{task_id}/messages?limit={}",
                limit
            ))
            .await?;

        serde_json::to_value(messages).map_err(Into::into)
    }

    pub async fn add_task_message(&self, payload: Value) -> Result<Value> {
        let task_id = payload
            .get("taskId")
            .and_then(Value::as_str)
            .ok_or_else(|| anyhow!("taskId must be a string"))?;
        let message = payload
            .get("message")
            .and_then(Value::as_str)
            .ok_or_else(|| anyhow!("message must be a string"))?;

        let signal = payload
            .get("signal")
            .and_then(Value::as_str)
            .unwrap_or("note");

        let body = json!({
            "message": message,
            "signal": signal,
        });

        let result = self
            .bridge
            .post_json::<Value, TaskStateMessage>(&format!("/tasks/{task_id}/messages"), &body)
            .await?;

        serde_json::to_value(result).map_err(Into::into)
    }

    pub async fn move_task_to_abyss(&self, payload: Value) -> Result<Value> {
        let task_id = payload
            .get("taskId")
            .and_then(Value::as_str)
            .ok_or_else(|| anyhow!("taskId must be a string"))?;

        let result = self
            .bridge
            .delete_json::<Value>(&format!("/tasks/{task_id}"))
            .await?;
        Ok(result)
    }

    pub async fn restore_task(&self, payload: Value) -> Result<Value> {
        let task_id = payload
            .get("taskId")
            .and_then(Value::as_str)
            .ok_or_else(|| anyhow!("taskId must be a string"))?;

        let result = self
            .bridge
            .post_json::<Value, Task>(&format!("/tasks/{task_id}/restore"), &json!({}))
            .await?;
        serde_json::to_value(result).map_err(Into::into)
    }

    pub async fn add_plan_to_task(&self, payload: Value) -> Result<Value> {
        let task_id = payload
            .get("taskId")
            .and_then(Value::as_str)
            .ok_or_else(|| anyhow!("taskId must be a string"))?;
        let content = payload
            .get("content")
            .and_then(Value::as_str)
            .ok_or_else(|| anyhow!("content must be a string"))?;

        self.bridge
            .post_json::<Value, Value>(
                &format!("/tasks/{task_id}/plan"),
                &json!({ "content": content }),
            )
            .await
    }

    pub async fn create_tag(&self, payload: Value) -> Result<Value> {
        let project_id = self.scope.project_id();
        let name = payload
            .get("name")
            .and_then(Value::as_str)
            .ok_or_else(|| anyhow!("name must be a string"))?;

        let color = payload
            .get("color")
            .and_then(Value::as_str)
            .unwrap_or("#3b82f6");

        let tag = self
            .bridge
            .post_json::<Value, Tag>(
                "/tags",
                &json!({
                    "project_id": project_id,
                    "name": name,
                    "color": color,
                }),
            )
            .await?;

        serde_json::to_value(tag).map_err(Into::into)
    }

    pub async fn delete_tag(&self, payload: Value) -> Result<Value> {
        let tag_id = payload
            .get("tagId")
            .and_then(Value::as_str)
            .ok_or_else(|| anyhow!("tagId must be a string"))?;

        self.bridge
            .delete_json::<Value>(&format!("/tags/{tag_id}"))
            .await
    }

    pub async fn export_tasks(&self, payload: Value) -> Result<Value> {
        let project_id = self.scope.project_id();
        let board = self.resources.get_board_state(project_id).await?;
        let mut tasks_by_id = HashMap::new();
        for task in board.tasks.iter().cloned() {
            tasks_by_id.insert(task.id.clone(), task);
        }

        let include_deleted = payload
            .get("includeDeleted")
            .and_then(Value::as_bool)
            .unwrap_or(false);
        let include_archived = payload
            .get("includeArchived")
            .and_then(Value::as_bool)
            .unwrap_or(false);

        if include_deleted || include_archived {
            let abyss = self.resources.get_abyss_state(project_id).await?;

            if include_deleted {
                for task in abyss.deleted_tasks {
                    tasks_by_id.insert(task.id.clone(), task);
                }
            }

            if include_archived {
                for task in abyss.archived_tasks {
                    tasks_by_id.insert(task.id.clone(), task);
                }
            }
        }

        let ordered_tasks = if let Some(task_ids) = payload.get("taskIds").and_then(Value::as_array)
        {
            let mut selected = Vec::new();
            for task_id in task_ids {
                let task_id = task_id
                    .as_str()
                    .ok_or_else(|| anyhow!("taskIds must be an array of strings"))?;
                let task = tasks_by_id.get(task_id).ok_or_else(|| {
                    anyhow!(
                        "Task {} was not found in the selected project context",
                        task_id
                    )
                })?;
                selected.push(task.clone());
            }
            selected
        } else {
            board.tasks.clone()
        };

        let format = payload
            .get("format")
            .and_then(Value::as_str)
            .unwrap_or("numbered")
            .to_string();

        let include_tags = payload
            .get("includeTags")
            .and_then(Value::as_bool)
            .unwrap_or(true);

        let include_priority = payload
            .get("includePriority")
            .and_then(Value::as_bool)
            .unwrap_or(true);

        let instructions = parse_export_instructions(payload.get("additionalInstructions"))?;

        let content = generate_export_text(
            ordered_tasks.as_slice(),
            &ExportOptions {
                format,
                include_tags,
                include_priority,
                instructions,
            },
        );

        let project_summary = board.project.map(|project| ProjectSummary {
            id: project.id,
            name: project.name,
        });

        let result = ExportTasksResult {
            project: project_summary,
            task_count: ordered_tasks.len(),
            tasks: ordered_tasks
                .iter()
                .map(|task| ExportTaskSummary {
                    id: task.id.clone(),
                    title: task.title.clone(),
                    status: task.status.clone(),
                    priority: task.priority.clone(),
                })
                .collect(),
            content,
        };

        serde_json::to_value(result).map_err(Into::into)
    }

    fn apply_cached_instruction_content(
        &self,
        instruction_sets: Vec<AgentInstructionSet>,
        cache: &HashMap<String, CachedInstructionFile>,
    ) -> Vec<AgentInstructionSet> {
        instruction_sets
            .into_iter()
            .map(|mut instruction_set| {
                for file in &mut instruction_set.files {
                    if let Some(cached_file) = cache.get(file.id.as_str()) {
                        if cached_file.content_hash == file.content_hash {
                            file.content = Some(cached_file.content.clone());
                        }
                    }
                }
                instruction_set
            })
            .collect()
    }

    async fn hydrate_board_instructions(&self, mut board: BoardState) -> Result<BoardState> {
        let project_id = board.project.as_ref().map(|project| project.id.clone());
        let Some(project_id) = project_id else {
            return Ok(board);
        };

        if board.instructions.is_empty() {
            return Ok(board);
        }

        let mut file_ids_to_fetch = Vec::new();
        {
            let cache = self.instruction_file_cache.read().await;
            for instruction_set in &board.instructions {
                for file in &instruction_set.files {
                    if !is_markdown_instruction_file(file) {
                        continue;
                    }

                    let needs_fetch = match cache.get(file.id.as_str()) {
                        Some(cached) => cached.content_hash != file.content_hash,
                        None => true,
                    };

                    if needs_fetch {
                        file_ids_to_fetch.push(file.id.clone());
                    }
                }
            }
        }

        if !file_ids_to_fetch.is_empty() {
            let files = self
                .resources
                .get_instruction_files_for_project(project_id.as_str(), &file_ids_to_fetch)
                .await?;

            let mut cache = self.instruction_file_cache.write().await;
            for file in files {
                if let Some(content) = file.content {
                    cache.insert(
                        file.id,
                        CachedInstructionFile {
                            content_hash: file.content_hash,
                            content,
                        },
                    );
                }
            }
        }

        let unresolved_file_ids = {
            let cache = self.instruction_file_cache.read().await;
            board
                .instructions
                .iter()
                .flat_map(|set| set.files.iter())
                .filter(|file| {
                    if !is_markdown_instruction_file(file) {
                        return false;
                    }

                    match cache.get(file.id.as_str()) {
                        Some(cached) => cached.content_hash != file.content_hash,
                        None => true,
                    }
                })
                .map(|file| file.id.clone())
                .collect::<Vec<_>>()
        };

        if !unresolved_file_ids.is_empty() {
            return Err(anyhow!(
                "Instruction content hydration incomplete for project {}. Missing file ids: {}",
                project_id,
                unresolved_file_ids.join(", ")
            ));
        }

        let cache = self.instruction_file_cache.read().await;
        board.instructions = self.apply_cached_instruction_content(board.instructions, &cache);
        Ok(board)
    }
}

pub fn nullable_string(value: Option<&Value>) -> Value {
    match value {
        Some(Value::String(value)) => Value::String(value.clone()),
        Some(Value::Null) | None => Value::Null,
        _ => Value::Null,
    }
}

fn is_markdown_instruction_file(file: &AgentInstructionFile) -> bool {
    file.file_name.to_lowercase().ends_with(".md")
}

fn parse_export_instructions(value: Option<&Value>) -> Result<Vec<ExportInstruction>> {
    let Some(value) = value else {
        return Ok(Vec::new());
    };

    let Some(entries) = value.as_array() else {
        return Err(anyhow!(
            "additionalInstructions must be an array if provided"
        ));
    };

    let mut instructions = Vec::new();
    for (index, entry) in entries.iter().enumerate() {
        let Some(object) = entry.as_object() else {
            return Err(anyhow!(
                "additionalInstructions[{}] must be an object",
                index
            ));
        };

        let title = object
            .get("title")
            .and_then(Value::as_str)
            .ok_or_else(|| anyhow!("additionalInstructions[{}].title must be a string", index))?;
        let content = object
            .get("content")
            .and_then(Value::as_str)
            .ok_or_else(|| anyhow!("additionalInstructions[{}].content must be a string", index))?;

        instructions.push(ExportInstruction {
            title: title.to_string(),
            content: content.to_string(),
        });
    }

    Ok(instructions)
}
