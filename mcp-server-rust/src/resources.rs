use crate::bridge::BridgeClient;
use crate::config::ProjectScope;
use crate::models::{
    AbyssState, AgentControls, AgentInstructionFile, BoardState, Project, Tag, Task,
};
use anyhow::Result;
use serde_json::{json, Value};

#[derive(Clone)]
pub struct ResourceService {
    pub bridge: BridgeClient,
    pub scope: ProjectScope,
}

impl ResourceService {
    pub fn new(bridge: BridgeClient, scope: ProjectScope) -> Self {
        Self { bridge, scope }
    }

    pub async fn get_projects(&self) -> Result<Vec<Project>> {
        let projects = self.bridge.get_json::<Vec<Project>>("/projects").await?;
        Ok(self
            .scope
            .filter_by_project_scope(projects, |project| Some(project.id.as_str())))
    }

    pub async fn get_board_state(&self, project_id: &str) -> Result<BoardState> {
        self.scope
            .assert_project_allowed(project_id, Some("getBoardState"))?;
        self.bridge
            .get_json::<BoardState>(&format!("/board/{project_id}"))
            .await
    }

    pub async fn get_task_details(&self, task_id: &str) -> Result<Task> {
        let task = self
            .bridge
            .get_json::<Task>(&format!("/task/{task_id}"))
            .await?;
        self.scope
            .assert_project_allowed(task.project_id.as_str(), Some("getTaskDetails"))?;
        Ok(task)
    }

    pub async fn get_project_agent_controls(&self, project_id: &str) -> Result<AgentControls> {
        self.scope
            .assert_project_allowed(project_id, Some("getProjectAgentControls"))?;
        self.bridge
            .get_json::<AgentControls>(&format!("/controls/{project_id}"))
            .await
    }

    pub async fn get_abyss_state(&self, project_id: &str) -> Result<AbyssState> {
        self.scope
            .assert_project_allowed(project_id, Some("getAbyssState"))?;
        self.bridge
            .get_json::<AbyssState>(&format!("/abyss/{project_id}"))
            .await
    }

    pub async fn get_tag_details(&self, tag_id: &str) -> Result<Tag> {
        let tag = self
            .bridge
            .get_json::<Tag>(&format!("/tags/{tag_id}"))
            .await?;
        self.scope
            .assert_project_allowed(tag.project_id.as_str(), Some("getTagDetails"))?;
        Ok(tag)
    }

    pub async fn get_instruction_files_for_project(
        &self,
        project_id: &str,
        file_ids: &[String],
        env_name: Option<&str>,
    ) -> Result<Vec<AgentInstructionFile>> {
        if file_ids.is_empty() {
            return Ok(Vec::new());
        }

        let mut body = json!({
            "projectId": project_id,
            "fileIds": file_ids,
        });

        if let Some(env_name) = env_name {
            if let Some(map) = body.as_object_mut() {
                map.insert("envName".to_string(), Value::String(env_name.to_string()));
            }
        }

        self.bridge
            .post_json::<Value, Vec<AgentInstructionFile>>("/instructions/files", &body)
            .await
    }
}
