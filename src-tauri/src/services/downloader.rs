use crate::error::WoxError;
use crate::models::download::{DownloadProgress, DownloadStatus};
use crate::utils::requests;
use std::path::PathBuf;
use tauri::Emitter;
use tokio::io::AsyncWriteExt;

pub async fn download_file(
    url: &str,
    dest: PathBuf,
    sha1: Option<&str>,
    on_progress: impl Fn(DownloadProgress) + Send + 'static,
) -> Result<(), WoxError> {
    if let Some(parent) = dest.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }

    let client = requests::http_client();
    let mut request = client.get(url);

    let mut downloaded: u64 = 0;
    if let Ok(meta) = tokio::fs::metadata(&dest).await {
        downloaded = meta.len();
        if downloaded > 0 {
            request = request.header("Range", format!("bytes={}-", downloaded));
        }
    }

    let response = request.send().await?;
    let total = response.content_length().unwrap_or(0) + downloaded;
    let start_time = std::time::Instant::now();

    let mut file = if downloaded > 0 {
        tokio::fs::OpenOptions::new().append(true).open(&dest).await?
    } else {
        tokio::fs::File::create(&dest).await?
    };

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
            let percent = if total > 0 { (downloaded as f64 / total as f64) * 100.0 } else { 0.0 };

            on_progress(DownloadProgress {
                downloaded,
                total,
                percent,
                speed,
                status: DownloadStatus::Downloading,
                file_name: dest.file_name().unwrap_or_default().to_string_lossy().to_string(),
            });
        }
    }

    // SHA1 verification in a blocking task to avoid freezing the runtime
    if let Some(expected_sha1) = sha1 {
        let dest_clone = dest.clone();
        let expected = expected_sha1.to_string();
        let file_name = dest.file_name().unwrap_or_default().to_string_lossy().to_string();

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
                Err(format!("SHA1 mismatch: expected {}, got {}", expected, actual))
            } else {
                Ok(())
            }
        }).await.map_err(|e| WoxError::Internal(e.to_string()))?;

        if let Err(e) = result {
            // Delete corrupted file so retry re-downloads it
            let _ = std::fs::remove_file(&dest);
            return Err(WoxError::Validation(e));
        }
    }

    let file_name = dest.file_name().unwrap_or_default().to_string_lossy().to_string();
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

    for attempt in 1..=max_retries {
        if attempt > 1 {
            let _ = tokio::fs::remove_file(&dest).await;
        }

        let handle = app_handle.clone();
        let label = file_label.clone();
        match download_file(url, dest.clone(), sha1, move |progress| {
            let mut p = progress;
            p.file_name = label.clone();
            let _ = handle.emit(crate::events::EVENT_DOWNLOAD_PROGRESS, &p);
        }).await {
            Ok(()) => return Ok(()),
            Err(WoxError::Validation(e)) if e.starts_with("SHA1") && attempt < max_retries => {
                eprintln!("Retry {}/{} for {}: {}", attempt, max_retries, file_label, e);
                continue;
            },
            Err(e) => return Err(e),
        }
    }

    Err(WoxError::Validation(format!("Failed after {} retries: {}", max_retries, file_label)))
}
