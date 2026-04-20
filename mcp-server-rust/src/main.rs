mod arg_parse;
mod bridge;
mod cli;
mod config;
mod formatters;
mod models;
mod panic_guard;
mod resources;
mod server;
mod sync;
mod tools;
mod update;

use crate::bridge::BridgeClient;
use crate::cli::Cli;
use crate::config::{AppConfig, PanicPolicy};
use crate::resources::ResourceService;
use crate::server::PinkSundewServer;
use crate::sync::{start_background_sync_supervisor, BackgroundSyncOptions, SyncService};
use crate::tools::ToolService;
use crate::update::UpdateService;
use anyhow::Result;
use clap::Parser;
use rmcp::{transport::stdio, ServiceExt};
use std::sync::Arc;
use std::time::Duration;
use tracing::{error, info, warn};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    if let Some(command) = cli.command {
        cli::execute(command).await?;
        return Ok(());
    }

    run_server().await
}

async fn run_server() -> Result<()> {
    let panic_policy = std::env::var("PINKSUNDEW_MCP_PANIC_POLICY")
        .unwrap_or_else(|_| "graceful_exit".to_string());

    std::panic::set_hook(Box::new(move |panic_info| {
        let location = panic_info
            .location()
            .map(|loc| format!("{}:{}", loc.file(), loc.line()))
            .unwrap_or_else(|| "unknown".to_string());
        let payload = if let Some(value) = panic_info.payload().downcast_ref::<&str>() {
            (*value).to_string()
        } else if let Some(value) = panic_info.payload().downcast_ref::<String>() {
            value.clone()
        } else {
            "unknown panic payload".to_string()
        };

        eprintln!(
            "[pinksundew-mcp panic] location={} policy={} payload={}",
            location, panic_policy, payload
        );
    }));

    let config = AppConfig::from_env()?;

    let filter = EnvFilter::try_new(config.log_level.clone())
        .or_else(|_| EnvFilter::try_new("info"))
        .unwrap_or_else(|_| EnvFilter::new("info"));

    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_writer(std::io::stderr)
        .with_ansi(false)
        .without_time()
        .init();

    let distribution_channel = std::env::var("PINKSUNDEW_MCP_DISTRIBUTION_CHANNEL")
        .unwrap_or_default()
        .trim()
        .to_lowercase();
    if distribution_channel == "npm-wrapper" {
        warn!(
            "[pinksundew-mcp] DEPRECATED: npm wrapper channel is deprecated. Uninstall @pinksundew/mcp and install the native binary instead: brew install pinksundew/tap/pinksundew-mcp"
        );
    }

    info!(
        "[pinksundew-mcp] Linked workspace project: {} ({})",
        config.project_scope.project_name(),
        config.project_scope.project_id()
    );

    let bridge = BridgeClient::with_client(
        config.base_url.clone(),
        config.api_key.clone(),
        config.client.clone(),
    );
    let resources = ResourceService::new(bridge.clone(), config.project_scope.clone());
    let tools = ToolService::new(
        bridge.clone(),
        resources.clone(),
        config.project_scope.clone(),
    );
    let sync_service = Arc::new(SyncService::new(
        resources.clone(),
        config.project_scope.clone(),
    ));
    let update_service = Arc::new(UpdateService::new());
    update_service.spawn_background_refresh();

    let server = PinkSundewServer::new(
        resources.clone(),
        tools,
        sync_service.clone(),
        update_service.clone(),
        config.project_scope.clone(),
    );

    let background_sync = {
        let project_id = config.project_scope.project_id().to_string();
        let startup_sync = sync_service.sync_global_instructions(None, true).await;
        if startup_sync.success {
            let files = if startup_sync.files_written.is_empty() {
                "none".to_string()
            } else {
                startup_sync.files_written.join(", ")
            };
            info!(
                "[pinksundew-mcp] Startup sync: {} instruction(s) written to {}",
                startup_sync.instruction_count, files
            );

            if let Some(hash) = sync_service.fetch_cloud_hash(project_id.as_str()).await {
                sync_service.save_local_hash(hash.as_str(), None).await;
            }
        } else {
            error!(
                "[pinksundew-mcp] Startup sync failed: {}",
                startup_sync
                    .error
                    .unwrap_or_else(|| "Unknown sync failure".to_string())
            );
        }

        Some(start_background_sync_supervisor(
            sync_service.clone(),
            BackgroundSyncOptions {
                project_id,
                workspace_root: std::env::current_dir()
                    .unwrap_or_else(|_| std::path::PathBuf::from(".")),
                interval: Duration::from_secs(60),
                verbose: true,
                panic_policy: config.panic_policy,
            },
        ))
    };

    let service = server.serve(stdio()).await.inspect_err(|error| {
        error!("Failed to start MCP stdio service: {}", error);
    })?;

    let waiting_result = service.waiting().await;

    if let Some(background_sync) = background_sync {
        background_sync.shutdown().await;
    }

    waiting_result?;

    if config.panic_policy == PanicPolicy::GracefulExit {
        info!("[pinksundew-mcp] Shutdown complete.");
    }

    Ok(())
}
