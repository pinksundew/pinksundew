use anyhow::{anyhow, Result};
use std::collections::HashSet;

const DEFAULT_URL: &str = "https://pinksundew.com";
const UUID_REGEX: &str =
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";
const CLIENT_ENV_VALUES: [&str; 6] = [
    "cursor",
    "claude",
    "windsurf",
    "vscode",
    "codex",
    "antigravity",
];

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub api_key: String,
    pub base_url: String,
    pub project_scope: ProjectScope,
    pub panic_policy: PanicPolicy,
    pub log_level: String,
}

#[derive(Debug, Clone)]
pub struct ProjectScope {
    project_id: Option<String>,
    client_envs: Vec<String>,
    target_files: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PanicPolicy {
    GracefulExit,
    Supervise,
}

impl AppConfig {
    pub fn from_env() -> Result<Self> {
        let api_key = std::env::var("AGENTPLANNER_API_KEY")
            .map_err(|_| anyhow!("Missing AGENTPLANNER_API_KEY environment variable."))?;

        let base_url = std::env::var("AGENTPLANNER_URL")
            .unwrap_or_else(|_| DEFAULT_URL.to_string())
            .trim_end_matches('/')
            .to_string();

        let project_scope = ProjectScope::from_env()?;

        let panic_policy = match std::env::var("PINKSUNDEW_MCP_PANIC_POLICY")
            .unwrap_or_else(|_| "graceful_exit".to_string())
            .to_lowercase()
            .as_str()
        {
            "supervise" => PanicPolicy::Supervise,
            _ => PanicPolicy::GracefulExit,
        };

        let log_level =
            std::env::var("PINKSUNDEW_MCP_LOG_LEVEL").unwrap_or_else(|_| "info".to_string());

        Ok(Self {
            api_key,
            base_url,
            project_scope,
            panic_policy,
            log_level,
        })
    }
}

impl ProjectScope {
    pub fn from_env() -> Result<Self> {
        let project_id = parse_project_id()?;
        let client_envs = parse_client_envs()?;
        let target_files = parse_target_files()?;

        Ok(Self {
            project_id,
            client_envs,
            target_files,
        })
    }

    pub fn project_id(&self) -> Option<&str> {
        self.project_id.as_deref()
    }

    pub fn client_envs(&self) -> &[String] {
        &self.client_envs
    }

    pub fn client_env(&self) -> Option<&str> {
        self.client_envs.first().map(|s| s.as_str())
    }

    pub fn target_files(&self) -> &[String] {
        &self.target_files
    }

    pub fn is_enabled(&self) -> bool {
        self.project_id.is_some()
    }

    pub fn is_project_allowed(&self, project_id: &str) -> bool {
        if let Some(configured) = &self.project_id {
            configured == project_id
        } else {
            true
        }
    }

    pub fn assert_project_allowed(&self, project_id: &str, context: Option<&str>) -> Result<()> {
        if self.is_project_allowed(project_id) {
            return Ok(());
        }

        let context_suffix = context.map(|c| format!(" ({c})")).unwrap_or_default();
        Err(anyhow!(
            "Project {} is not in scope{}. Configured project ID: {}",
            project_id,
            context_suffix,
            self.project_id.as_deref().unwrap_or("none")
        ))
    }

    pub fn filter_by_project_scope<T, F>(&self, items: Vec<T>, mut project_id_getter: F) -> Vec<T>
    where
        F: FnMut(&T) -> Option<&str>,
    {
        if !self.is_enabled() {
            return items;
        }

        items
            .into_iter()
            .filter(|item| {
                project_id_getter(item)
                    .map(|project_id| self.is_project_allowed(project_id))
                    .unwrap_or(false)
            })
            .collect()
    }
}

fn parse_project_id() -> Result<Option<String>> {
    let raw = std::env::var("AGENTPLANNER_PROJECT_ID").unwrap_or_default();
    if raw.trim().is_empty() {
        return Ok(None);
    }

    if raw.contains(',') {
        return Err(anyhow!(
            "Strict Mode: Only one AGENTPLANNER_PROJECT_ID is allowed per workspace to prevent context drift. Remove extra project IDs from your configuration."
        ));
    }

    let value = raw.trim().to_string();
    let valid = regex_like_uuid_check(&value);
    if !valid {
        return Err(anyhow!(
            "Invalid AGENTPLANNER_PROJECT_ID format (expected UUID): {}",
            value
        ));
    }

    Ok(Some(value))
}

fn regex_like_uuid_check(value: &str) -> bool {
    let _ = UUID_REGEX;

    if value.len() != 36 {
        return false;
    }

    let bytes = value.as_bytes();
    for (index, byte) in bytes.iter().enumerate() {
        let is_dash = matches!(index, 8 | 13 | 18 | 23);
        if is_dash {
            if *byte != b'-' {
                return false;
            }
            continue;
        }

        let is_hex = byte.is_ascii_hexdigit();
        if !is_hex {
            return false;
        }
    }

    true
}

fn parse_client_envs() -> Result<Vec<String>> {
    let raw = std::env::var("AGENTPLANNER_CLIENT_ENV").unwrap_or_default();
    if raw.trim().is_empty() {
        return Ok(Vec::new());
    }

    let allowed: HashSet<&str> = CLIENT_ENV_VALUES.iter().copied().collect();
    let mut seen = HashSet::new();
    let mut unique = Vec::new();

    for part in raw
        .split(',')
        .map(|entry| entry.trim().to_lowercase())
        .filter(|entry| !entry.is_empty())
    {
        if !allowed.contains(part.as_str()) {
            return Err(anyhow!(
                "Invalid AGENTPLANNER_CLIENT_ENV value \"{}\". Valid values: {}",
                part,
                CLIENT_ENV_VALUES.join(", ")
            ));
        }

        if seen.insert(part.clone()) {
            unique.push(part);
        }
    }

    Ok(unique)
}

fn parse_target_files() -> Result<Vec<String>> {
    let raw = std::env::var("AGENTPLANNER_TARGET_FILES").unwrap_or_default();
    if raw.trim().is_empty() {
        return Ok(Vec::new());
    }

    let mut seen = HashSet::new();
    let mut unique = Vec::new();

    for part in raw
        .split(',')
        .map(|entry| entry.trim().replace('\\', "/"))
        .filter(|entry| !entry.is_empty())
    {
        if part.starts_with('/') {
            return Err(anyhow!(
                "Invalid AGENTPLANNER_TARGET_FILES entry \"{}\". Use workspace-relative paths only.",
                part
            ));
        }

        if part.split('/').any(|segment| segment == "..") {
            return Err(anyhow!(
                "Invalid AGENTPLANNER_TARGET_FILES entry \"{}\". Parent directory traversal is not allowed.",
                part
            ));
        }

        if seen.insert(part.clone()) {
            unique.push(part);
        }
    }

    Ok(unique)
}
