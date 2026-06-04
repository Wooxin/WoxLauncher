use crate::error::WoxError;
use crate::services::downloader;
use crate::utils::paths;
use tauri::AppHandle;

fn get_platform_params() -> (&'static str, &'static str, &'static str) {
    if cfg!(target_os = "windows") {
        ("windows", "x64", "zip")
    } else if cfg!(target_os = "macos") {
        ("mac", if cfg!(target_arch = "aarch64") { "aarch64" } else { "x64" }, "tar.gz")
    } else {
        ("linux", "x64", "tar.gz")
    }
}

/// Fetch Java download URL from vendor API
pub async fn fetch_download_url(vendor: &str, java_version: &str) -> Result<(String, String), WoxError> {
    let client = crate::utils::requests::http_client();
    let (os, arch, _ext) = get_platform_params();

    match vendor {
        "adoptium" => {
            // Adoptium API v3
            let url = format!(
                "https://api.adoptium.net/v3/assets/latest/{}/hotspot?os={}&architecture={}&image_type=jdk",
                java_version, os, arch
            );
            let resp: serde_json::Value = client.get(&url).send().await?.json().await?;
            let binary = resp.as_array()
                .and_then(|arr| arr.first())
                .and_then(|v| v["binaries"].as_array())
                .and_then(|bins| bins.first())
                .ok_or_else(|| WoxError::NotFound(format!("No Adoptium binary for Java {}", java_version)))?;

            let pkg = &binary["package"];
            let download_url = pkg["link"].as_str()
                .ok_or_else(|| WoxError::NotFound("No download link".into()))?
                .to_string();
            let name = pkg["name"].as_str().unwrap_or("adoptium-jdk").to_string();
            Ok((download_url, name))
        },
        "zulu" => {
            let url = format!(
                "https://api.azul.com/metadata/v1/zulu/packages/?java_version={}&os={}&arch={}&archive_type=zip&java_package_type=jdk&page_size=1",
                java_version, os, arch
            );
            let resp: serde_json::Value = client.get(&url).send().await?.json().await?;
            let items = resp.as_array()
                .and_then(|arr| arr.first())
                .ok_or_else(|| WoxError::NotFound(format!("No Zulu binary for Java {}", java_version)))?;

            let download_url = items["download_url"].as_str()
                .ok_or_else(|| WoxError::NotFound("No download link".into()))?
                .to_string();
            let name = items["name"].as_str().unwrap_or("zulu-jdk").to_string();
            Ok((download_url, name))
        },
        "graalvm" => {
            // GraalVM Community from GitHub releases
            let url = "https://api.github.com/repos/graalvm/graalvm-ce-builds/releases/latest";
            let resp: serde_json::Value = client
                .get(url)
                .header("User-Agent", "WoxLauncher/0.1.0")
                .header("Accept", "application/vnd.github.v3+json")
                .send().await?.json().await?;

            let tag = resp["tag_name"].as_str().unwrap_or("");
            let short_ver = tag.trim_start_matches("jdk-").split('-').next().unwrap_or("");
            let _graal_version = if short_ver.is_empty() { java_version } else { short_ver };

            // Search assets for matching file
            if let Some(assets) = resp["assets"].as_array() {
                for asset in assets {
                    let name = asset["name"].as_str().unwrap_or("");
                    if name.contains("graalvm") && name.contains("jdk") && name.contains("x64") {
                        let download_url = asset["browser_download_url"].as_str().unwrap_or("").to_string();
                        if !download_url.is_empty() {
                            return Ok((download_url, name.to_string()));
                        }
                    }
                }
            }
            Err(WoxError::NotFound(format!("No GraalVM binary for Java {}", java_version)))
        },
        _ => Err(WoxError::Validation(format!("Unknown vendor: {}", vendor))),
    }
}

/// Download and install Java from a vendor
pub async fn download_java(
    app_handle: &AppHandle,
    vendor: &str,
    java_version: &str,
) -> Result<String, WoxError> {
    let (url, _filename) = fetch_download_url(vendor, java_version).await?;

    let java_target_dir = paths::java_dir().join(format!("{}-{}", vendor, java_version));
    std::fs::create_dir_all(&java_target_dir)?;

    let (_, _, ext) = get_platform_params();
    let archive_path = java_target_dir.join(format!("jdk.{}", ext));

    // Download the archive
    downloader::download_file_with_events(
        app_handle,
        &url,
        archive_path.clone(),
        None,
        format!("{} JDK {}", vendor, java_version),
    ).await?;

    // Extract
    if ext == "zip" {
        extract_zip(&archive_path, &java_target_dir)?;
    } else {
        // tar.gz - decompress then untar
        extract_targz(&archive_path, &java_target_dir)?;
    }

    // Clean up archive
    let _ = std::fs::remove_file(&archive_path);

    // Find java executable
    let java_exe = if cfg!(target_os = "windows") { "java.exe" } else { "java" };
    let java_path = find_java_in_dir(&java_target_dir, java_exe)
        .ok_or_else(|| WoxError::NotFound(format!("Java binary not found after extraction for {}-{}", vendor, java_version)))?;

    Ok(java_path.to_string_lossy().to_string())
}

/// Find java executable recursively (handles nested extraction directories)
fn find_java_in_dir(dir: &std::path::Path, java_exe: &str) -> Option<std::path::PathBuf> {
    // First check direct bin/java
    let direct = dir.join("bin").join(java_exe);
    if direct.exists() {
        return Some(direct);
    }
    // Check one level deeper (some archives have a top-level dir)
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                let path = entry.path().join("bin").join(java_exe);
                if path.exists() {
                    return Some(path);
                }
            }
        }
    }
    None
}

fn extract_zip(archive: &std::path::Path, dest: &std::path::Path) -> Result<(), WoxError> {
    let file = std::fs::File::open(archive)?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| WoxError::Internal(format!("Failed to open ZIP: {}", e)))?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| WoxError::Internal(format!("ZIP entry error: {}", e)))?;
        let out_path = match file.enclosed_name() {
            Some(path) => dest.join(path),
            None => continue,
        };

        if file.name().ends_with('/') {
            std::fs::create_dir_all(&out_path)?;
        } else {
            if let Some(parent) = out_path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            let mut outfile = std::fs::File::create(&out_path)?;
            std::io::copy(&mut file, &mut outfile)?;
        }

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Some(mode) = file.unix_mode() {
                std::fs::set_permissions(&out_path, std::fs::Permissions::from_mode(mode))?;
            }
        }
    }
    Ok(())
}

fn extract_targz(archive: &std::path::Path, dest: &std::path::Path) -> Result<(), WoxError> {
    let file = std::fs::File::open(archive)?;
    let decoder = flate2::read::GzDecoder::new(file);
    let mut archive = tar::Archive::new(decoder);
    archive.unpack(dest)
        .map_err(|e| WoxError::Internal(format!("Failed to extract tar.gz: {}", e)))?;
    Ok(())
}
