use crate::models::java::{JavaRuntime, JavaVendor};
use crate::error::WoxError;
use crate::utils::paths;
use std::path::PathBuf;

/// Detect installed Java runtimes (both system and managed).
/// If custom_path is provided, also scan that directory.
pub fn detect_installed(custom_path: Option<&str>) -> Result<Vec<JavaRuntime>, WoxError> {
    let mut runtimes = Vec::new();

    // Check managed Java dir
    scan_java_dir(&paths::java_dir(), &mut runtimes, "managed");

    // Check custom path if provided
    if let Some(p) = custom_path {
        if !p.is_empty() {
            scan_java_dir(&PathBuf::from(p), &mut runtimes, "custom");
        }
    }

    // Check JAVA_HOME
    if let Ok(java_home) = std::env::var("JAVA_HOME") {
        let java_exe = if cfg!(target_os = "windows") {
            PathBuf::from(&java_home).join("bin").join("java.exe")
        } else {
            PathBuf::from(&java_home).join("bin").join("java")
        };
        if java_exe.exists() {
            runtimes.push(JavaRuntime {
                id: "system-java-home".to_string(),
                vendor: JavaVendor::Adoptium,
                version: detect_java_version(&java_exe.to_string_lossy()),
                path: java_exe.to_string_lossy().to_string(),
                installed: true,
            });
        }
    }

    // Check PATH for java
    let which_cmd = if cfg!(target_os = "windows") { "where" } else { "which" };
    if let Ok(output) = std::process::Command::new(which_cmd)
        .arg("java")
        .output()
    {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout)
                .lines()
                .next()
                .unwrap_or("")
                .trim()
                .to_string();
            if !path.is_empty() && !runtimes.iter().any(|r| r.path == path) {
                runtimes.push(JavaRuntime {
                    id: "system-path".to_string(),
                    vendor: JavaVendor::Adoptium,
                    version: detect_java_version(&path),
                    path,
                    installed: true,
                });
            }
        }
    }

    Ok(runtimes)
}

fn scan_java_dir(dir: &PathBuf, runtimes: &mut Vec<JavaRuntime>, id_prefix: &str) {
    if !dir.exists() { return; }
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let java_exe = if cfg!(target_os = "windows") {
                entry.path().join("bin").join("java.exe")
            } else {
                entry.path().join("bin").join("java")
            };
            if java_exe.exists() {
                let folder_name = entry.file_name().to_string_lossy().to_string();
                let (vendor, version) = parse_java_folder(&folder_name);
                runtimes.push(JavaRuntime {
                    id: format!("{}-{}", id_prefix, entry.file_name().to_string_lossy()),
                    vendor,
                    version,
                    path: java_exe.to_string_lossy().to_string(),
                    installed: true,
                });
            }
        }
    }
}

fn detect_java_version(java_path: &str) -> String {
    if let Ok(output) = std::process::Command::new(java_path).arg("-version").output() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        for part in stderr.split('"') {
            if part.contains('.') && part.chars().any(|c| c.is_ascii_digit()) {
                return part.to_string();
            }
        }
    }
    "unknown".to_string()
}

fn parse_java_folder(name: &str) -> (JavaVendor, String) {
    let lower = name.to_lowercase();
    let vendor = if lower.contains("zulu") {
        JavaVendor::Zulu
    } else if lower.contains("oracle") {
        JavaVendor::Oracle
    } else if lower.contains("graalvm") {
        JavaVendor::GraalVM
    } else {
        JavaVendor::Adoptium
    };
    let version = name
        .split('-')
        .last()
        .unwrap_or(name)
        .to_string();
    (vendor, version)
}
