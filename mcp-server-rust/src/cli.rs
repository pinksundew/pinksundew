use anyhow::{anyhow, bail, Context, Result};
use clap::{Args, Parser, Subcommand, ValueEnum};
use serde_json::{json, Map, Value};
use std::collections::HashMap;
use std::fs;
use std::io::{self, IsTerminal, Read, Write};
use std::path::{Path, PathBuf};
use toml_edit::{value, Array, DocumentMut, Item, Table};

const API_KEY_ENV: &str = "AGENTPLANNER_API_KEY";
const PROJECT_ID_ENV: &str = "AGENTPLANNER_PROJECT_ID";
const CLIENT_ENV_ENV: &str = "AGENTPLANNER_CLIENT_ENV";
const DISTRIBUTION_CHANNEL_ENV: &str = "PINKSUNDEW_MCP_DISTRIBUTION_CHANNEL";

#[derive(Debug, Parser)]
#[command(
    name = "pinksundew-mcp",
    version,
    about = "Pink Sundew MCP server and setup CLI"
)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Option<Command>,
}

#[derive(Debug, Subcommand)]
pub enum Command {
    /// Register MCP config for a client
    Register(RegisterArgs),
}

#[derive(Debug, Args)]
pub struct RegisterArgs {
    /// Client target to register
    #[arg(value_enum)]
    client: RegisterClient,

    /// AGENTPLANNER_API_KEY override
    #[arg(long)]
    api_key: Option<String>,

    /// AGENTPLANNER_PROJECT_ID override
    #[arg(long)]
    project_id: Option<String>,

    /// AGENTPLANNER_CLIENT_ENV override
    #[arg(long)]
    client_env: Option<String>,

    /// Custom config file path override
    #[arg(long)]
    file: Option<PathBuf>,

    /// Skip interactive confirmation prompt
    #[arg(long)]
    yes: bool,
}

#[derive(Debug, Clone, Copy, ValueEnum, PartialEq, Eq)]
pub enum RegisterClient {
    Codex,
    Antigravity,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct CommandTuple {
    command: String,
    args: Vec<String>,
}

#[derive(Debug)]
struct ResolvedRegisterConfig {
    client: RegisterClient,
    api_key: String,
    project_id: String,
    client_env: String,
    target_file: PathBuf,
    command_tuple: CommandTuple,
}

#[derive(Debug)]
struct RenderedConfig {
    preview: String,
    content: String,
}

pub fn execute(command: Command) -> Result<()> {
    match command {
        Command::Register(args) => register(args),
    }
}

fn register(args: RegisterArgs) -> Result<()> {
    let cwd = std::env::current_dir().context("Unable to resolve current directory")?;
    let auto_yes = args.yes;
    let resolved = resolve_register_config(args, &cwd)?;

    let existing = if resolved.target_file.exists() {
        Some(
            fs::read_to_string(&resolved.target_file)
                .with_context(|| format!("Failed to read {}", resolved.target_file.display()))?,
        )
    } else {
        None
    };

    let rendered = render_config(&resolved, existing.as_deref())?;

    eprintln!(
        "[pinksundew-mcp] Register target ({}) -> {}",
        client_label(resolved.client),
        resolved.target_file.display()
    );
    eprintln!("[pinksundew-mcp] Planned MCP block:");
    eprintln!("{}", rendered.preview);

    confirm_write(&resolved.target_file, resolved.client, auto_yes)?;

    let backup_path = backup_existing_file(&resolved.target_file)?;
    if let Some(path) = backup_path {
        eprintln!("[pinksundew-mcp] Backup created at {}", path.display());
    }

    write_atomic(&resolved.target_file, rendered.content.as_bytes())?;
    eprintln!(
        "[pinksundew-mcp] Wrote {} configuration to {}",
        client_label(resolved.client),
        resolved.target_file.display()
    );

    Ok(())
}

fn resolve_register_config(args: RegisterArgs, cwd: &Path) -> Result<ResolvedRegisterConfig> {
    let file_values = DotenvValues::from_workspace(cwd);
    let api_key = resolve_required_value(API_KEY_ENV, args.api_key, &file_values)?;
    let project_id = resolve_required_value(PROJECT_ID_ENV, args.project_id, &file_values)?;
    let client_env = resolve_client_env(args.client_env, args.client);
    let target_file = resolve_target_file(args.client, args.file, cwd)?;
    let command_tuple = resolve_command_tuple()?;

    Ok(ResolvedRegisterConfig {
        client: args.client,
        api_key,
        project_id,
        client_env,
        target_file,
        command_tuple,
    })
}

fn resolve_client_env(flag_value: Option<String>, client: RegisterClient) -> String {
    flag_value
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| match client {
            RegisterClient::Codex => "codex".to_string(),
            RegisterClient::Antigravity => "antigravity".to_string(),
        })
}

fn resolve_target_file(
    client: RegisterClient,
    explicit_file: Option<PathBuf>,
    cwd: &Path,
) -> Result<PathBuf> {
    if let Some(path) = explicit_file {
        return Ok(path);
    }

    match client {
        RegisterClient::Codex => resolve_codex_config_path(),
        RegisterClient::Antigravity => Ok(cwd.join(".mcp.json")),
    }
}

fn resolve_codex_config_path() -> Result<PathBuf> {
    if let Ok(codex_home) = std::env::var("CODEX_HOME") {
        let trimmed = codex_home.trim();
        if !trimmed.is_empty() {
            return Ok(PathBuf::from(trimmed).join("config.toml"));
        }
    }

    if let Some(home) = std::env::var_os("HOME") {
        return Ok(PathBuf::from(home).join(".codex").join("config.toml"));
    }

    if let Some(profile) = std::env::var_os("USERPROFILE") {
        return Ok(PathBuf::from(profile).join(".codex").join("config.toml"));
    }

    bail!("Unable to determine codex config location. Provide --file explicitly.")
}

fn resolve_command_tuple() -> Result<CommandTuple> {
    let channel = std::env::var(DISTRIBUTION_CHANNEL_ENV)
        .unwrap_or_default()
        .trim()
        .to_lowercase();

    if channel == "npm-wrapper" {
        return Ok(CommandTuple {
            command: "npx".to_string(),
            args: vec!["-y".to_string(), "@pinksundew/mcp".to_string()],
        });
    }

    let exe = std::env::current_exe().context("Unable to resolve current executable path")?;
    let command = exe
        .canonicalize()
        .unwrap_or(exe)
        .to_string_lossy()
        .to_string();

    Ok(CommandTuple {
        command,
        args: Vec::new(),
    })
}

fn resolve_required_value(
    key: &str,
    flag_value: Option<String>,
    file_values: &DotenvValues,
) -> Result<String> {
    let from_flag = flag_value
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    let from_env = std::env::var(key)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    let from_local = file_values.env_local.get(key).cloned();
    let from_env_file = file_values.env_file.get(key).cloned();

    resolve_value_from_sources(from_flag, from_env, from_local, from_env_file).ok_or_else(|| {
        anyhow!(
            "Missing required value for {}. Provide --{}, set the env var, or define it in .env.local/.env.",
            key,
            key.to_lowercase().replace('_', "-")
        )
    })
}

fn resolve_value_from_sources(
    from_flag: Option<String>,
    from_env: Option<String>,
    from_env_local: Option<String>,
    from_env_file: Option<String>,
) -> Option<String> {
    from_flag.or(from_env).or(from_env_local).or(from_env_file)
}

fn render_config(
    config: &ResolvedRegisterConfig,
    existing: Option<&str>,
) -> Result<RenderedConfig> {
    match config.client {
        RegisterClient::Codex => render_codex_config(config, existing),
        RegisterClient::Antigravity => render_antigravity_config(config, existing),
    }
}

fn render_codex_config(
    config: &ResolvedRegisterConfig,
    existing: Option<&str>,
) -> Result<RenderedConfig> {
    let mut doc = match existing {
        Some(raw) if !raw.trim().is_empty() => raw
            .parse::<DocumentMut>()
            .context("Failed to parse existing codex TOML config")?,
        _ => DocumentMut::new(),
    };

    if !doc.as_table().contains_key("mcp_servers") {
        doc["mcp_servers"] = Item::Table(Table::new());
    } else if !doc["mcp_servers"].is_table_like() {
        bail!("Existing `mcp_servers` entry in codex config is not a table.");
    }

    let mcp_servers = doc["mcp_servers"]
        .as_table_like_mut()
        .ok_or_else(|| anyhow!("`mcp_servers` could not be treated as a table"))?;
    if let Some(existing) = mcp_servers.get("pinksundew") {
        if !existing.is_table_like() {
            bail!("Existing `mcp_servers.pinksundew` entry is not a table.");
        }
    } else {
        mcp_servers.insert("pinksundew", Item::Table(Table::new()));
    }
    let pinksundew = mcp_servers
        .get_mut("pinksundew")
        .and_then(Item::as_table_like_mut)
        .ok_or_else(|| anyhow!("`mcp_servers.pinksundew` could not be treated as a table"))?;
    pinksundew.insert("command", value(config.command_tuple.command.clone()));

    let mut args_array = Array::new();
    for arg in &config.command_tuple.args {
        args_array.push(arg.as_str());
    }
    pinksundew.insert("args", value(args_array));

    if let Some(existing) = pinksundew.get("env") {
        if !existing.is_table_like() {
            bail!("Existing `mcp_servers.pinksundew.env` entry is not a table.");
        }
    } else {
        pinksundew.insert("env", Item::Table(Table::new()));
    }
    let env_table = pinksundew
        .get_mut("env")
        .and_then(Item::as_table_like_mut)
        .ok_or_else(|| anyhow!("`mcp_servers.pinksundew.env` could not be treated as a table"))?;
    env_table.insert(API_KEY_ENV, value(config.api_key.clone()));
    env_table.insert(PROJECT_ID_ENV, value(config.project_id.clone()));
    env_table.insert(CLIENT_ENV_ENV, value(config.client_env.clone()));

    let preview = build_codex_preview(config);
    let content = doc.to_string();

    Ok(RenderedConfig { preview, content })
}

fn build_codex_preview(config: &ResolvedRegisterConfig) -> String {
    let args_preview = format!("{:?}", config.command_tuple.args);
    format!(
        "[mcp_servers.pinksundew]\ncommand = {}\nargs = {}\n\n[mcp_servers.pinksundew.env]\nAGENTPLANNER_API_KEY = {}\nAGENTPLANNER_PROJECT_ID = {}\nAGENTPLANNER_CLIENT_ENV = {}",
        quote_toml_string(&config.command_tuple.command),
        args_preview,
        quote_toml_string(&config.api_key),
        quote_toml_string(&config.project_id),
        quote_toml_string(&config.client_env)
    )
}

fn quote_toml_string(value: &str) -> String {
    format!("{value:?}")
}

fn render_antigravity_config(
    config: &ResolvedRegisterConfig,
    existing: Option<&str>,
) -> Result<RenderedConfig> {
    let mut root_value = match existing {
        Some(raw) if !raw.trim().is_empty() => {
            serde_json::from_str::<Value>(raw).context("Failed to parse existing .mcp.json")?
        }
        _ => Value::Object(Map::new()),
    };

    let root = root_value
        .as_object_mut()
        .ok_or_else(|| anyhow!("Existing .mcp.json root must be a JSON object"))?;

    let mcp_servers_item = root
        .entry("mcpServers".to_string())
        .or_insert_with(|| Value::Object(Map::new()));
    let mcp_servers = mcp_servers_item
        .as_object_mut()
        .ok_or_else(|| anyhow!("Existing `mcpServers` entry in .mcp.json must be an object"))?;

    let server_object = build_antigravity_server_object(config);
    mcp_servers.insert("pinksundew".to_string(), server_object.clone());

    let preview =
        serde_json::to_string_pretty(&server_object).context("Failed to render JSON preview")?;
    let content =
        serde_json::to_string_pretty(&root_value).context("Failed to render merged JSON")?;

    Ok(RenderedConfig { preview, content })
}

fn build_antigravity_server_object(config: &ResolvedRegisterConfig) -> Value {
    json!({
        "type": "stdio",
        "command": config.command_tuple.command,
        "args": config.command_tuple.args,
        "env": {
            API_KEY_ENV: config.api_key,
            PROJECT_ID_ENV: config.project_id,
            CLIENT_ENV_ENV: config.client_env,
        }
    })
}

fn confirm_write(target_file: &Path, client: RegisterClient, yes: bool) -> Result<()> {
    if yes {
        return Ok(());
    }

    if !io::stdin().is_terminal() || !io::stderr().is_terminal() {
        bail!(
            "Refusing to update {} config at {} in non-interactive mode without --yes.",
            client_label(client),
            target_file.display()
        );
    }

    eprint!(
        "[pinksundew-mcp] Apply changes to {}? [Y/n]: ",
        target_file.display()
    );
    io::stderr().flush().ok();

    let mut response = String::new();
    io::stdin()
        .read_line(&mut response)
        .context("Failed to read prompt response")?;

    if !is_confirmation_accepted(&response) {
        bail!("Registration cancelled by user.");
    }

    Ok(())
}

fn is_confirmation_accepted(input: &str) -> bool {
    let normalized = input.trim().to_lowercase();
    normalized.is_empty() || normalized == "y" || normalized == "yes"
}

fn backup_existing_file(path: &Path) -> Result<Option<PathBuf>> {
    if !path.exists() {
        return Ok(None);
    }

    let backup_root = std::env::temp_dir().join("pinksundew-mcp-backups");
    fs::create_dir_all(&backup_root).with_context(|| {
        format!(
            "Failed to create backup directory {}",
            backup_root.display()
        )
    })?;

    let base_name = path
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| "config".to_string());
    let timestamp = chrono::Utc::now().format("%Y%m%d%H%M%S%3f");
    let backup_path = backup_root.join(format!("{base_name}.bak.{timestamp}"));

    fs::copy(path, &backup_path).with_context(|| {
        format!(
            "Failed to backup {} to {}",
            path.display(),
            backup_path.display()
        )
    })?;

    Ok(Some(backup_path))
}

fn write_atomic(path: &Path, content: &[u8]) -> Result<()> {
    let parent = path
        .parent()
        .filter(|dir| !dir.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));
    fs::create_dir_all(parent)
        .with_context(|| format!("Failed to create directory {}", parent.display()))?;

    let file_name = path
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| "config".to_string());
    let temp_name = format!(
        ".{file_name}.tmp.{}.{}",
        std::process::id(),
        chrono::Utc::now()
            .timestamp_nanos_opt()
            .unwrap_or_else(|| chrono::Utc::now().timestamp_micros() * 1000)
    );
    let temp_path = parent.join(temp_name);

    {
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp_path)
            .with_context(|| format!("Failed to create temp file {}", temp_path.display()))?;
        file.write_all(content)
            .with_context(|| format!("Failed to write {}", temp_path.display()))?;
        file.sync_all()
            .with_context(|| format!("Failed to sync {}", temp_path.display()))?;
    }

    if path.exists() {
        fs::remove_file(path).with_context(|| format!("Failed to replace {}", path.display()))?;
    }

    if let Err(error) = fs::rename(&temp_path, path) {
        let _ = fs::remove_file(&temp_path);
        return Err(error).with_context(|| {
            format!(
                "Failed to atomically move {} to {}",
                temp_path.display(),
                path.display()
            )
        });
    }

    Ok(())
}

fn client_label(client: RegisterClient) -> &'static str {
    match client {
        RegisterClient::Codex => "codex",
        RegisterClient::Antigravity => "antigravity",
    }
}

#[derive(Debug, Default)]
struct DotenvValues {
    env_local: HashMap<String, String>,
    env_file: HashMap<String, String>,
}

impl DotenvValues {
    fn from_workspace(cwd: &Path) -> Self {
        let env_local = read_dotenv_file(&cwd.join(".env.local")).unwrap_or_default();
        let env_file = read_dotenv_file(&cwd.join(".env")).unwrap_or_default();
        Self {
            env_local,
            env_file,
        }
    }
}

fn read_dotenv_file(path: &Path) -> Result<HashMap<String, String>> {
    if !path.exists() {
        return Ok(HashMap::new());
    }

    let mut buffer = String::new();
    fs::File::open(path)
        .and_then(|mut file| file.read_to_string(&mut buffer))
        .with_context(|| format!("Failed to read {}", path.display()))?;

    Ok(parse_dotenv_map(&buffer))
}

fn parse_dotenv_map(content: &str) -> HashMap<String, String> {
    let mut output = HashMap::new();

    for raw_line in content.lines() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        let line = line
            .strip_prefix("export ")
            .map(str::trim_start)
            .unwrap_or(line);

        let Some((key, value_raw)) = line.split_once('=') else {
            continue;
        };

        let key = key.trim();
        if key.is_empty() {
            continue;
        }

        let value = normalize_dotenv_value(value_raw);
        if value.is_empty() {
            continue;
        }

        output.insert(key.to_string(), value);
    }

    output
}

fn normalize_dotenv_value(raw_value: &str) -> String {
    let trimmed = raw_value.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    if (trimmed.starts_with('"') && trimmed.ends_with('"'))
        || (trimmed.starts_with('\'') && trimmed.ends_with('\''))
    {
        return trimmed[1..trimmed.len() - 1].to_string();
    }

    if let Some((before_comment, _)) = trimmed.split_once(" #") {
        return before_comment.trim().to_string();
    }

    trimmed.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    #[test]
    fn cli_parses_register_subcommand() {
        let parsed = Cli::try_parse_from(["pinksundew-mcp", "register", "codex"])
            .expect("parse should work");
        let command = parsed.command.expect("command expected");
        match command {
            Command::Register(args) => assert_eq!(args.client, RegisterClient::Codex),
        }
    }

    #[test]
    fn cli_parses_no_subcommand_as_none() {
        let parsed = Cli::try_parse_from(["pinksundew-mcp"]).expect("parse should work");
        assert!(parsed.command.is_none());
    }

    #[test]
    fn resolve_value_prefers_flag_then_env_then_files() {
        let resolved = resolve_value_from_sources(
            Some("flag".to_string()),
            Some("env".to_string()),
            Some("local".to_string()),
            Some("file".to_string()),
        );
        assert_eq!(resolved, Some("flag".to_string()));

        let resolved = resolve_value_from_sources(
            None,
            Some("env".to_string()),
            Some("local".to_string()),
            Some("file".to_string()),
        );
        assert_eq!(resolved, Some("env".to_string()));

        let resolved = resolve_value_from_sources(
            None,
            None,
            Some("local".to_string()),
            Some("file".to_string()),
        );
        assert_eq!(resolved, Some("local".to_string()));
    }

    #[test]
    fn parse_dotenv_map_reads_export_and_quotes() {
        let parsed = parse_dotenv_map(
            r#"
            export AGENTPLANNER_API_KEY="ap_123"
            AGENTPLANNER_PROJECT_ID=project-uuid
            IGNORED=
            "#,
        );

        assert_eq!(parsed.get(API_KEY_ENV).map(String::as_str), Some("ap_123"));
        assert_eq!(
            parsed.get(PROJECT_ID_ENV).map(String::as_str),
            Some("project-uuid")
        );
    }

    #[test]
    fn codex_render_preserves_existing_comments() {
        let existing = r#"# keep this comment
[workspace]
name = "test"
"#;

        let config = ResolvedRegisterConfig {
            client: RegisterClient::Codex,
            api_key: "ap_abc".to_string(),
            project_id: "8cd4fe92-63ad-49af-ae3a-c404f4576cc7".to_string(),
            client_env: "codex".to_string(),
            target_file: PathBuf::from("/tmp/config.toml"),
            command_tuple: CommandTuple {
                command: "pinksundew-mcp".to_string(),
                args: Vec::new(),
            },
        };

        let rendered = render_codex_config(&config, Some(existing)).expect("render should work");
        assert!(rendered.content.contains("# keep this comment"));
        assert!(rendered.content.contains("[workspace]"));
        assert!(rendered.content.contains("[mcp_servers.pinksundew]"));
        assert!(rendered.content.contains("[mcp_servers.pinksundew.env]"));
    }

    #[test]
    fn antigravity_render_keeps_other_servers() {
        let existing = r#"{
  "mcpServers": {
    "other": {
      "type": "stdio",
      "command": "other-mcp",
      "args": []
    }
  }
}"#;

        let config = ResolvedRegisterConfig {
            client: RegisterClient::Antigravity,
            api_key: "ap_abc".to_string(),
            project_id: "8cd4fe92-63ad-49af-ae3a-c404f4576cc7".to_string(),
            client_env: "antigravity".to_string(),
            target_file: PathBuf::from(".mcp.json"),
            command_tuple: CommandTuple {
                command: "pinksundew-mcp".to_string(),
                args: Vec::new(),
            },
        };

        let rendered =
            render_antigravity_config(&config, Some(existing)).expect("render should work");
        let root: Value = serde_json::from_str(&rendered.content).expect("valid json");
        let servers = root
            .get("mcpServers")
            .and_then(Value::as_object)
            .expect("mcpServers object");

        assert!(servers.contains_key("other"));
        assert!(servers.contains_key("pinksundew"));
    }

    #[test]
    fn confirmation_parser_accepts_expected_values() {
        assert!(is_confirmation_accepted(""));
        assert!(is_confirmation_accepted("y"));
        assert!(is_confirmation_accepted("Yes"));
        assert!(!is_confirmation_accepted("n"));
    }
}
