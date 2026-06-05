use crate::error::WoxError;
use crate::models::download::{DownloadProgress, DownloadStatus};
use crate::utils::logger;
use crate::utils::paths;
use crate::utils::requests;
use std::hash::{Hash, Hasher};
use std::path::PathBuf;
use tauri::Emitter;
use tokio::io::AsyncWriteExt;

fn progress_file_name(dest: &std::path::Path) -> String {
    dest.file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}

fn cache_path_for(dest: &std::path::Path) -> PathBuf {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    dest.to_string_lossy().hash(&mut hasher);
    let key = hasher.finish();
    let file_name = dest
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .replace('\\', "_")
        .replace('/', "_")
        .replace(':', "_");
    paths::download_cache_dir().join(format!("{:016x}-{}.part", key, file_name))
}

pub async fn download_file(
    url: &str,
    dest: PathBuf,
    sha1: Option<&str>,
    on_progress: impl Fn(DownloadProgress) + Send + 'static,
) -> Result<(), WoxError> {
    logger::info(format!("download start: {} -> {}", url, dest.display()));
    if let Some(parent) = dest.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }
    tokio::fs::create_dir_all(paths::download_cache_dir()).await?;

    let final_dest = dest;
    let dest = cache_path_for(&final_dest);

    let client = requests::http_client();
    let mut request = client.get(url);

    let mut resume_from: u64 = 0;
    if let Ok(meta) = tokio::fs::metadata(&dest).await {
        resume_from = meta.len();
        if resume_from > 0 {
            request = request.header("Range", format!("bytes={}-", resume_from));
        }
    }

    let response = request.send().await?;
    let status = response.status();
    if !status.is_success() {
        let _ = tokio::fs::remove_file(&dest).await;
        logger::error(format!(
            "download http error: {} -> {} ({})",
            url,
            final_dest.display(),
            status
        ));
        return Err(WoxError::Network(format!(
            "Download failed with HTTP {}: {}",
            status, url
        )));
    }

    let can_resume = resume_from > 0 && status == reqwest::StatusCode::PARTIAL_CONTENT;
    let mut downloaded = if can_resume { resume_from } else { 0 };
    let total = response.content_length().unwrap_or(0) + downloaded;
    let start_time = std::time::Instant::now();

    let mut file = if can_resume {
        tokio::fs::OpenOptions::new()
            .append(true)
            .open(&dest)
            .await?
    } else {
        tokio::fs::File::create(&dest).await?
    };

    let file_name = progress_file_name(&dest);
    on_progress(DownloadProgress {
        downloaded,
        total,
        percent: if total > 0 {
            (downloaded as f64 / total as f64) * 100.0
        } else {
            0.0
        },
        speed: "Starting...".to_string(),
        status: DownloadStatus::Downloading,
        file_name: file_name.clone(),
    });

    let mut stream = response.bytes_stream();
    use futures_util::StreamExt;

    let mut last_emit = std::time::Instant::now();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        file.write_all(&chunk).await?;
        downloaded += chunk.len() as u64;

        // Throttle progress events to every 100ms
        let now = std::time::Instant::now();
        if now.duration_since(last_emit).as_millis() >= 100 {
            last_emit = now;
            let elapsed = start_time.elapsed().as_secs_f64();
            let speed = if elapsed > 0.0 {
                format!("{:.1} MB/s", (downloaded as f64 / 1048576.0) / elapsed)
            } else {
                "calculating...".to_string()
            };
            let percent = if total > 0 {
                (downloaded as f64 / total as f64) * 100.0
            } else {
                0.0
            };

            on_progress(DownloadProgress {
                downloaded,
                total,
                percent,
                speed,
                status: DownloadStatus::Downloading,
                file_name: file_name.clone(),
            });
        }
    }

    file.flush().await?;
    drop(file);

    if total > 0 && downloaded != total {
        let _ = tokio::fs::remove_file(&dest).await;
        let message = format!(
            "Incomplete download: expected {} bytes, got {} bytes",
            total, downloaded
        );
        logger::error(format!(
            "download incomplete: {} -> {} ({})",
            url,
            final_dest.display(),
            message
        ));
        return Err(WoxError::Network(message));
    }

    // SHA1 verification in a blocking task to avoid freezing the runtime
    if let Some(expected_sha1) = sha1 {
        let dest_clone = dest.clone();
        let expected = expected_sha1.to_string();

        on_progress(DownloadProgress {
            downloaded,
            total,
            percent: 100.0,
            speed: "Verifying...".to_string(),
            status: DownloadStatus::Verifying,
            file_name: file_name.clone(),
        });

        let result = tokio::task::spawn_blocking(move || {
            let file_bytes = std::fs::read(&dest_clone).map_err(|e| e.to_string())?;
            use sha1::Digest;
            let mut hasher = sha1::Sha1::new();
            hasher.update(&file_bytes);
            let actual = format!("{:x}", hasher.finalize());
            if actual != expected {
                Err(format!(
                    "SHA1 mismatch: expected {}, got {}",
                    expected, actual
                ))
            } else {
                Ok(())
            }
        })
        .await
        .map_err(|e| WoxError::Internal(e.to_string()))?;

        if let Err(e) = result {
            // Delete corrupted file so retry re-downloads it
            let _ = std::fs::remove_file(&dest);
            logger::error(format!(
                "download verification failed: {} -> {} ({})",
                url,
                final_dest.display(),
                e
            ));
            return Err(WoxError::Validation(e));
        }
    }

    if let Some(parent) = final_dest.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }
    let _ = tokio::fs::remove_file(&final_dest).await;
    if let Err(rename_error) = tokio::fs::rename(&dest, &final_dest).await {
        tokio::fs::copy(&dest, &final_dest)
            .await
            .map_err(|copy_error| {
                WoxError::Filesystem(format!(
                    "Failed to move download into place: {}; copy fallback failed: {}",
                    rename_error, copy_error
                ))
            })?;
        tokio::fs::remove_file(&dest).await?;
    }
    logger::info(format!(
        "download done: {} -> {}",
        url,
        final_dest.display()
    ));

    on_progress(DownloadProgress {
        downloaded,
        total,
        percent: 100.0,
        speed: "Done".to_string(),
        status: DownloadStatus::Done,
        file_name,
    });

    Ok(())
}

pub async fn download_file_with_events(
    app_handle: &tauri::AppHandle,
    url: &str,
    dest: std::path::PathBuf,
    sha1: Option<&str>,
    file_label: String,
) -> Result<(), WoxError> {
    let max_retries = 3u32;
    let display_name = if file_label.is_empty() {
        dest.to_string_lossy().to_string()
    } else {
        file_label.clone()
    };

    for attempt in 1..=max_retries {
        if attempt > 1 {
            logger::warn(format!(
                "download retry {}/{}: {}",
                attempt, max_retries, display_name
            ));
            let _ = tokio::fs::remove_file(&dest).await;
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        }

        let handle = app_handle.clone();
        let label = file_label.clone();
        match download_file(url, dest.clone(), sha1, move |progress| {
            if label.is_empty() {
                return;
            }
            let mut p = progress;
            p.file_name = label.clone();
            let _ = handle.emit(crate::events::EVENT_DOWNLOAD_PROGRESS, &p);
        })
        .await
        {
            Ok(()) => return Ok(()),
            Err(WoxError::Network(_)) if attempt < max_retries => continue,
            Err(WoxError::Validation(e)) if e.starts_with("SHA1") && attempt < max_retries => {
                continue
            }
            Err(e) => {
                let message = e.to_string();
                logger::error(format!("download failed: {} ({})", display_name, message));
                let _ = app_handle.emit(
                    crate::events::EVENT_DOWNLOAD_PROGRESS,
                    &DownloadProgress {
                        downloaded: 0,
                        total: 0,
                        percent: 0.0,
                        speed: message.clone(),
                        status: DownloadStatus::Error(message),
                        file_name: display_name,
                    },
                );
                return Err(e);
            }
        }
    }

    let message = format!("Failed after {} retries: {}", max_retries, file_label);
    logger::error(&message);
    Err(WoxError::Network(message))
}
