use anyhow::{anyhow, bail, Context, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

pub const DEFAULT_URL: &str = "https://pinksundew.com";
pub const MISSING_WORKSPACE_LINK_ERROR: &str =
    "This directory is not linked to a Pink Sundew project. Run pinksundew-mcp init or pinksundew-mcp link.";
pub const WORKSPACE_DIR: &str = ".pinksundew";
pub const WORKSPACE_LINK_FILE: &str = "project.json";

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub api_key: String,
    pub base_url: String,
    pub client: Option<String>,
    pub project_scope: ProjectScope,
    pub panic_policy: PanicPolicy,
    pub log_level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GlobalAuth {
    pub api_key: String,
    pub key_prefix: String,
    pub base_url: String,
    pub saved_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct WorkspaceLink {
    pub project_id: String,
    pub project_name: String,
    pub linked_at: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_synced_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_instruction_hash: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ProjectScope {
    link: WorkspaceLink,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PanicPolicy {
    GracefulExit,
    Supervise,
}

impl AppConfig {
    pub fn from_env() -> Result<Self> {
        let cwd = std::env::current_dir().context("Unable to resolve current directory")?;
        let auth = load_global_auth()?;
        let base_url = std::env::var("PINKSUNDEW_URL")
            .ok()
            .map(|value| value.trim().trim_end_matches('/').to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or(auth.base_url.clone());
        let client = std::env::var("PINKSUNDEW_CLIENT")
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty());

        let project_scope = ProjectScope::from_workspace(&cwd)?;

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
            api_key: auth.api_key,
            base_url,
            client,
            project_scope,
            panic_policy,
            log_level,
        })
    }
}

impl GlobalAuth {
    pub fn new(api_key: String, base_url: String) -> Self {
        let key_prefix = api_key.chars().take(11).collect::<String>();
        Self {
            api_key,
            key_prefix,
            base_url: normalize_base_url(&base_url),
            saved_at: Utc::now().to_rfc3339(),
        }
    }
}

impl WorkspaceLink {
    pub fn new(project_id: String, project_name: String) -> Self {
        Self {
            project_id,
            project_name,
            linked_at: Utc::now().to_rfc3339(),
            last_synced_at: None,
            last_instruction_hash: None,
        }
    }
}

impl ProjectScope {
    pub fn from_workspace(workspace_root: &Path) -> Result<Self> {
        let link = load_workspace_link(workspace_root)?;
        Ok(Self { link })
    }

    pub fn project_id(&self) -> &str {
        self.link.project_id.as_str()
    }

    pub fn project_name(&self) -> &str {
        self.link.project_name.as_str()
    }

    pub fn is_project_allowed(&self, project_id: &str) -> bool {
        self.project_id() == project_id
    }

    pub fn assert_project_allowed(&self, project_id: &str, context: Option<&str>) -> Result<()> {
        if self.is_project_allowed(project_id) {
            return Ok(());
        }

        let context_suffix = context.map(|c| format!(" ({c})")).unwrap_or_default();
        Err(anyhow!(
            "Project {} is not linked to this workspace{}. Linked project ID: {}",
            project_id,
            context_suffix,
            self.project_id()
        ))
    }

    pub fn filter_by_project_scope<T, F>(&self, items: Vec<T>, mut project_id_getter: F) -> Vec<T>
    where
        F: FnMut(&T) -> Option<&str>,
    {
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

pub fn normalize_base_url(value: &str) -> String {
    let trimmed = value.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        DEFAULT_URL.to_string()
    } else {
        trimmed.to_string()
    }
}

pub fn global_auth_path() -> Result<PathBuf> {
    let config_root =
        dirs::config_dir().ok_or_else(|| anyhow!("Unable to determine config directory"))?;
    Ok(config_root.join("pinksundew-mcp").join("auth.json"))
}

pub fn load_global_auth() -> Result<GlobalAuth> {
    let path = global_auth_path()?;
    let raw = fs::read_to_string(&path).with_context(|| {
        format!(
            "Pink Sundew auth is not configured. Run pinksundew-mcp init or pinksundew-mcp setup. Expected auth file at {}",
            path.display()
        )
    })?;
    serde_json::from_str(&raw).with_context(|| format!("Failed to parse {}", path.display()))
}

pub fn save_global_auth(auth: &GlobalAuth) -> Result<()> {
    let path = global_auth_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("Failed to create {}", parent.display()))?;
    }
    let content = serde_json::to_vec_pretty(auth).context("Failed to serialize auth config")?;
    fs::write(&path, content).with_context(|| format!("Failed to write {}", path.display()))
}

pub fn workspace_link_path(workspace_root: &Path) -> PathBuf {
    workspace_root.join(WORKSPACE_DIR).join(WORKSPACE_LINK_FILE)
}

pub fn load_workspace_link(workspace_root: &Path) -> Result<WorkspaceLink> {
    let path = workspace_link_path(workspace_root);
    let raw = fs::read_to_string(&path).map_err(|_| anyhow!(MISSING_WORKSPACE_LINK_ERROR))?;
    serde_json::from_str(&raw).with_context(|| format!("Failed to parse {}", path.display()))
}

pub fn save_workspace_link(workspace_root: &Path, link: &WorkspaceLink) -> Result<()> {
    let path = workspace_link_path(workspace_root);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("Failed to create {}", parent.display()))?;
    }
    let content = serde_json::to_vec_pretty(link).context("Failed to serialize workspace link")?;
    fs::write(&path, content).with_context(|| format!("Failed to write {}", path.display()))
}

pub fn delete_workspace_link(workspace_root: &Path) -> Result<bool> {
    let path = workspace_link_path(workspace_root);
    if !path.exists() {
        return Ok(false);
    }
    fs::remove_file(&path).with_context(|| format!("Failed to delete {}", path.display()))?;
    Ok(true)
}

pub fn update_workspace_sync_metadata(
    workspace_root: &Path,
    last_instruction_hash: Option<&str>,
) -> Result<WorkspaceLink> {
    let mut link = load_workspace_link(workspace_root)?;
    link.last_synced_at = Some(Utc::now().to_rfc3339());
    if let Some(hash) = last_instruction_hash {
        link.last_instruction_hash = Some(hash.to_string());
    }
    save_workspace_link(workspace_root, &link)?;
    Ok(link)
}

pub fn ensure_workspace_gitignored(workspace_root: &Path) -> Result<bool> {
    let gitignore_path = workspace_root.join(".gitignore");
    if !gitignore_path.exists() {
        eprintln!(
            "[pinksundew-mcp] Warning: no .gitignore found. Add .pinksundew/ to your ignore rules to keep local workspace metadata out of git."
        );
        return Ok(false);
    }

    let content = fs::read_to_string(&gitignore_path)
        .with_context(|| format!("Failed to read {}", gitignore_path.display()))?;
    if content
        .lines()
        .map(str::trim)
        .any(|line| line == ".pinksundew/" || line == ".pinksundew")
    {
        return Ok(false);
    }

    let needs_leading_newline = !content.is_empty() && !content.ends_with('\n');
    let mut next = content;
    if needs_leading_newline {
        next.push('\n');
    }
    next.push_str(".pinksundew/\n");
    fs::write(&gitignore_path, next)
        .with_context(|| format!("Failed to update {}", gitignore_path.display()))?;
    Ok(true)
}

pub fn validate_uuid_like(value: &str) -> Result<()> {
    if value.len() != 36 {
        bail!("Invalid project id format (expected UUID): {}", value);
    }

    for (index, byte) in value.as_bytes().iter().enumerate() {
        let is_dash = matches!(index, 8 | 13 | 18 | 23);
        if is_dash {
            if *byte != b'-' {
                bail!("Invalid project id format (expected UUID): {}", value);
            }
            continue;
        }

        if !byte.is_ascii_hexdigit() {
            bail!("Invalid project id format (expected UUID): {}", value);
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    #[test]
    fn auth_prefix_redacts_to_key_prefix() {
        let auth = GlobalAuth::new(
            "ap_1234567890abcdef".to_string(),
            "https://pinksundew.com/".to_string(),
        );
        assert_eq!(auth.key_prefix, "ap_12345678");
        assert_eq!(auth.base_url, "https://pinksundew.com");
    }

    #[test]
    fn workspace_link_round_trips() {
        let temp = tempfile::tempdir().expect("tempdir");
        let link = WorkspaceLink::new(
            "8cd4fe92-63ad-49af-ae3a-c404f4576cc7".to_string(),
            "Pink Sundew".to_string(),
        );

        save_workspace_link(temp.path(), &link).expect("save should work");
        let loaded = load_workspace_link(temp.path()).expect("load should work");

        assert_eq!(loaded.project_id, link.project_id);
        assert_eq!(loaded.project_name, link.project_name);
    }

    #[test]
    fn missing_workspace_link_returns_expected_error() {
        let temp = tempfile::tempdir().expect("tempdir");
        let error = load_workspace_link(temp.path()).expect_err("link should be missing");
        assert_eq!(error.to_string(), MISSING_WORKSPACE_LINK_ERROR);
    }
}
