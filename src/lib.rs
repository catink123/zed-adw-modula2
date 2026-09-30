//! Zed extension for ADW Modula-2.
//!
//! Syntax highlighting, outline, brackets and indentation come from the tree-sitter grammar in `grammar/`.
//! Everything semantic (go to definition, references, rename, hover, completion, diagnostics, ...) comes from
//! the ADW Modula-2 language server (https://github.com/catink123/adw-modula2-lsp), a Node.js program that is
//! located in this order:
//!
//! 1. `lsp.adw-modula2-lsp.binary.path` in Zed settings (a `.js` file is run with Zed's Node.js),
//! 2. an `adw-modula2-lsp` executable on the PATH,
//! 3. the `adw-modula2-lsp-server.js` asset of the latest GitHub release, downloaded once per version.

use std::fs;
use zed_extension_api::{self as zed, serde_json, settings::LspSettings, LanguageServerId, Result};

const SERVER_ID: &str = "adw-modula2-lsp";
const REPO: &str = "catink123/adw-modula2-lsp";
const ASSET: &str = "adw-modula2-lsp-server.js";

struct AdwModula2Extension {
    cached_server: Option<String>,
}

impl AdwModula2Extension {
    /// Path of a downloaded server script, downloading the latest release when needed.
    fn downloaded_server(&mut self, id: &LanguageServerId) -> Result<String> {
        if let Some(path) = &self.cached_server {
            if fs::metadata(path).is_ok_and(|m| m.is_file()) {
                return Ok(path.clone());
            }
        }

        zed::set_language_server_installation_status(id, &zed::LanguageServerInstallationStatus::CheckingForUpdate);
        let release = match zed::latest_github_release(
            REPO,
            zed::GithubReleaseOptions { require_assets: true, pre_release: false },
        ) {
            Ok(r) => r,
            Err(e) => {
                // offline: fall back to any version downloaded earlier
                if let Some(path) = newest_downloaded() {
                    self.cached_server = Some(path.clone());
                    return Ok(path);
                }
                return Err(format!("could not query {REPO} releases: {e}"));
            }
        };
        let asset = release
            .assets
            .iter()
            .find(|a| a.name == ASSET)
            .ok_or_else(|| format!("release {} of {REPO} has no asset named {ASSET}", release.version))?;

        let dir = format!("{SERVER_ID}-{}", release.version);
        let path = format!("{dir}/server.js");
        if !fs::metadata(&path).is_ok_and(|m| m.is_file()) {
            zed::set_language_server_installation_status(id, &zed::LanguageServerInstallationStatus::Downloading);
            fs::create_dir_all(&dir).map_err(|e| format!("failed to create {dir}: {e}"))?;
            zed::download_file(&asset.download_url, &path, zed::DownloadedFileType::Uncompressed)
                .map_err(|e| format!("failed to download {ASSET}: {e}"))?;
            // keep only the current version
            if let Ok(entries) = fs::read_dir(".") {
                for entry in entries.flatten() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.starts_with(&format!("{SERVER_ID}-")) && name != dir {
                        fs::remove_dir_all(entry.path()).ok();
                    }
                }
            }
        }
        zed::set_language_server_installation_status(id, &zed::LanguageServerInstallationStatus::None);
        self.cached_server = Some(path.clone());
        Ok(path)
    }
}

/// The most recent `adw-modula2-lsp-<version>/server.js` already present in the work directory.
fn newest_downloaded() -> Option<String> {
    let prefix = format!("{SERVER_ID}-");
    let mut found: Vec<String> = fs::read_dir(".")
        .ok()?
        .flatten()
        .map(|e| e.file_name().to_string_lossy().to_string())
        .filter(|n| n.starts_with(&prefix))
        .filter(|n| fs::metadata(format!("{n}/server.js")).is_ok())
        .collect();
    found.sort();
    found.pop().map(|n| format!("{n}/server.js"))
}

/// Make a path relative to the extension work directory absolute (the server runs with another cwd).
fn absolute(path: &str) -> String {
    std::env::current_dir()
        .map(|d| d.join(path).to_string_lossy().to_string())
        .unwrap_or_else(|_| path.to_string())
}

fn is_script(path: &str) -> bool {
    [".js", ".cjs", ".mjs"].iter().any(|ext| path.ends_with(ext))
}

impl zed::Extension for AdwModula2Extension {
    fn new() -> Self {
        Self { cached_server: None }
    }

    fn language_server_command(&mut self, id: &LanguageServerId, worktree: &zed::Worktree) -> Result<zed::Command> {
        let binary = LspSettings::for_worktree(SERVER_ID, worktree).ok().and_then(|s| s.binary);
        let (path, arguments, env) = match binary {
            Some(b) => (b.path, b.arguments, b.env.unwrap_or_default().into_iter().collect::<Vec<_>>()),
            None => (None, None, Vec::new()),
        };
        let args = arguments.unwrap_or_else(|| vec!["--stdio".into()]);

        // 1. explicit path from settings
        if let Some(path) = path {
            if is_script(&path) {
                return Ok(zed::Command { command: zed::node_binary_path()?, args: [vec![path], args].concat(), env });
            }
            return Ok(zed::Command { command: path, args, env });
        }

        // 2. on PATH
        if let Some(path) = worktree.which(SERVER_ID) {
            return Ok(zed::Command { command: path, args, env });
        }

        // 3. downloaded release, run with Zed's Node.js
        let script = absolute(&self.downloaded_server(id)?);
        Ok(zed::Command {
            command: zed::node_binary_path()?,
            args: [vec!["--max-old-space-size=4096".into(), script], args].concat(),
            env,
        })
    }

    fn language_server_initialization_options(
        &mut self,
        _id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<Option<serde_json::Value>> {
        Ok(LspSettings::for_worktree(SERVER_ID, worktree).ok().and_then(|s| s.initialization_options))
    }

    /// The server asks for the `modula2` section (adwPath, searchPaths, defines, diagnostics, ...), the same
    /// keys as the VS Code extension's `modula2.*` settings, configured in Zed under
    /// `lsp.adw-modula2-lsp.settings`.
    fn language_server_workspace_configuration(
        &mut self,
        _id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<Option<serde_json::Value>> {
        let settings = LspSettings::for_worktree(SERVER_ID, worktree)
            .ok()
            .and_then(|s| s.settings)
            .unwrap_or_else(|| serde_json::json!({}));
        Ok(Some(serde_json::json!({ "modula2": settings })))
    }
}

zed::register_extension!(AdwModula2Extension);
