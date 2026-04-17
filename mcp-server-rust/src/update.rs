use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tracing::{info, warn};

const DEFAULT_TTL_HOURS: u64 = 24;
const GITHUB_LATEST_RELEASE_URL: &str =
    "https://api.github.com/repos/pinksundew/pinksundew/releases/latest";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateStatus {
    pub installed_version: String,
    pub latest_known_version: Option<String>,
    pub update_available: bool,
    pub recommended_upgrade_command: String,
    pub last_checked_timestamp: Option<String>,
    pub distribution_channel: String,
    pub cache_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct UpdateCache {
    last_checked_timestamp: String,
    latest_known_version: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GithubRelease {
    tag_name: String,
}

#[derive(Clone)]
pub struct UpdateService {
    client: reqwest::Client,
    installed_version: String,
    state: Arc<RwLock<UpdateStatus>>,
    cache_path: PathBuf,
    ttl: Duration,
}

impl UpdateService {
    pub fn new() -> Self {
        let cache_path = resolve_cache_path();
        let distribution_channel = detect_distribution_channel();
        let installed_version = env!("CARGO_PKG_VERSION").to_string();
        let recommended_upgrade_command = recommended_upgrade_command(&distribution_channel);
        let status = UpdateStatus {
            installed_version: installed_version.clone(),
            latest_known_version: None,
            update_available: false,
            recommended_upgrade_command,
            last_checked_timestamp: None,
            distribution_channel,
            cache_path: cache_path.to_string_lossy().to_string(),
        };

        Self {
            client: reqwest::Client::builder()
                .user_agent("pinksundew-mcp-update-check")
                .timeout(Duration::from_secs(3))
                .build()
                .expect("failed to build reqwest client"),
            installed_version,
            state: Arc::new(RwLock::new(status)),
            cache_path,
            ttl: Duration::from_secs(resolve_ttl_hours() * 60 * 60),
        }
    }

    pub fn spawn_background_refresh(&self) {
        let this = self.clone();
        tokio::spawn(async move {
            if let Err(error) = this.refresh_if_stale().await {
                warn!(target: "pinksundew::update", "[update] Startup check failed: {}", error);
            }
        });
    }

    pub async fn current_status(&self) -> UpdateStatus {
        self.state.read().await.clone()
    }

    pub async fn refresh_if_stale(&self) -> Result<UpdateStatus> {
        if let Some(cached) = self.read_cache().await? {
            if !cache_expired(&cached.last_checked_timestamp, self.ttl) {
                let status = self.apply_cached(cached).await;
                return Ok(status);
            }
        }

        let latest_version = match self.fetch_latest_version().await {
            Ok(value) => Some(value),
            Err(error) => {
                warn!(
                    target: "pinksundew::update",
                    "[update] Remote check failed, continuing with cached/unknown status: {}",
                    error
                );
                None
            }
        };

        let now = chrono::Utc::now().to_rfc3339();
        let cache = UpdateCache {
            last_checked_timestamp: now.clone(),
            latest_known_version: latest_version.clone(),
        };

        if let Err(error) = self.write_cache(&cache).await {
            warn!(target: "pinksundew::update", "[update] Failed to persist cache: {}", error);
        }

        let update_available = latest_version
            .as_deref()
            .map(|latest| is_newer_semver(latest, &self.installed_version))
            .unwrap_or(false);

        let mut state = self.state.write().await;
        state.latest_known_version = latest_version;
        state.last_checked_timestamp = Some(now);
        state.update_available = update_available;
        Ok(state.clone())
    }

    async fn apply_cached(&self, cache: UpdateCache) -> UpdateStatus {
        let update_available = cache
            .latest_known_version
            .as_deref()
            .map(|latest| is_newer_semver(latest, &self.installed_version))
            .unwrap_or(false);

        let mut state = self.state.write().await;
        state.latest_known_version = cache.latest_known_version;
        state.last_checked_timestamp = Some(cache.last_checked_timestamp);
        state.update_available = update_available;
        state.clone()
    }

    async fn fetch_latest_version(&self) -> Result<String> {
        let response = self
            .client
            .get(GITHUB_LATEST_RELEASE_URL)
            .send()
            .await
            .context("request failed")?;

        if !response.status().is_success() {
            return Err(anyhow!("GitHub release API returned {}", response.status()));
        }

        let payload: GithubRelease = response.json().await.context("invalid release payload")?;
        normalize_release_tag(payload.tag_name.as_str())
            .ok_or_else(|| anyhow!("Unable to normalize tag {}", payload.tag_name))
    }

    async fn read_cache(&self) -> Result<Option<UpdateCache>> {
        if !self.cache_path.exists() {
            return Ok(None);
        }

        let raw = tokio::fs::read_to_string(&self.cache_path)
            .await
            .with_context(|| format!("failed reading {}", self.cache_path.display()))?;
        let parsed = serde_json::from_str::<UpdateCache>(&raw)
            .with_context(|| format!("failed parsing {}", self.cache_path.display()))?;
        Ok(Some(parsed))
    }

    async fn write_cache(&self, cache: &UpdateCache) -> Result<()> {
        ensure_parent_dir(&self.cache_path).await?;
        let data = serde_json::to_vec_pretty(cache)?;
        tokio::fs::write(&self.cache_path, data)
            .await
            .with_context(|| format!("failed writing {}", self.cache_path.display()))?;
        info!(
            target: "pinksundew::update",
            "[update] Wrote cache {}",
            self.cache_path.display()
        );
        Ok(())
    }
}

async fn ensure_parent_dir(path: &Path) -> Result<()> {
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .with_context(|| format!("failed to create {}", parent.display()))?;
    }
    Ok(())
}

fn cache_expired(last_checked: &str, ttl: Duration) -> bool {
    let parsed = chrono::DateTime::parse_from_rfc3339(last_checked);
    if let Ok(timestamp) = parsed {
        let age = chrono::Utc::now().signed_duration_since(timestamp.with_timezone(&chrono::Utc));
        let ttl_secs = i64::try_from(ttl.as_secs()).unwrap_or(i64::MAX);
        return age.num_seconds() >= ttl_secs;
    }

    true
}

fn resolve_ttl_hours() -> u64 {
    std::env::var("PINKSUNDEW_MCP_UPDATE_CHECK_TTL_HOURS")
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(DEFAULT_TTL_HOURS)
}

fn resolve_cache_path() -> PathBuf {
    if cfg!(windows) {
        if let Some(base) = std::env::var_os("LOCALAPPDATA") {
            return PathBuf::from(base)
                .join("pinksundew")
                .join("update_check.json");
        }
    }

    if let Some(base) = std::env::var_os("XDG_STATE_HOME") {
        return PathBuf::from(base)
            .join("pinksundew")
            .join("update_check.json");
    }

    if let Some(home) = std::env::var_os("HOME") {
        return PathBuf::from(home)
            .join(".local")
            .join("state")
            .join("pinksundew")
            .join("update_check.json");
    }

    PathBuf::from(".pinksundew-update-check.json")
}

fn detect_distribution_channel() -> String {
    if let Ok(channel) = std::env::var("PINKSUNDEW_MCP_DISTRIBUTION_CHANNEL") {
        let normalized = channel.trim().to_lowercase();
        if !normalized.is_empty() {
            return normalized;
        }
    }

    if let Ok(exe) = std::env::current_exe() {
        let path = exe.to_string_lossy().to_lowercase();
        if path.contains("/cellar/") || path.contains("homebrew") {
            return "brew".to_string();
        }
    }

    "unknown".to_string()
}

fn recommended_upgrade_command(channel: &str) -> String {
    match channel {
        "brew" => "brew upgrade pinksundew/tap/pinksundew-mcp".to_string(),
        "npm-wrapper" => "brew install pinksundew/tap/pinksundew-mcp".to_string(),
        _ => "brew upgrade pinksundew/tap/pinksundew-mcp".to_string(),
    }
}

fn normalize_release_tag(tag: &str) -> Option<String> {
    tag.strip_prefix("mcp-v")
        .or_else(|| tag.strip_prefix('v'))
        .or_else(|| tag.strip_prefix("pinksundew-mcp-v"))
        .map(ToString::to_string)
}

fn is_newer_semver(latest: &str, installed: &str) -> bool {
    let latest_parts = parse_semver_parts(latest);
    let installed_parts = parse_semver_parts(installed);

    match (latest_parts, installed_parts) {
        (Some(latest_parts), Some(installed_parts)) => latest_parts > installed_parts,
        _ => false,
    }
}

fn parse_semver_parts(value: &str) -> Option<(u64, u64, u64)> {
    let core = value.split('-').next().unwrap_or(value);
    let mut parts = core.split('.');
    let major = parts.next()?.parse::<u64>().ok()?;
    let minor = parts.next()?.parse::<u64>().ok()?;
    let patch = parts.next()?.parse::<u64>().ok()?;
    Some((major, minor, patch))
}
