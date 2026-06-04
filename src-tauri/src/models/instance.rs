use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LoaderType {
    Vanilla,
    Fabric,
    Forge,
    Quilt,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstanceConfig {
    pub id: String,
    pub name: String,
    pub game_version: String,
    pub loader_type: LoaderType,
    pub loader_version: String,
    pub java_version: String,
    pub jvm_args: Vec<String>,
    pub game_args: Vec<String>,
    pub resolution_width: u32,
    pub resolution_height: u32,
    pub created_at: DateTime<Utc>,
    pub last_played_at: Option<DateTime<Utc>>,
}

impl Default for InstanceConfig {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name: String::new(),
            game_version: "1.21".to_string(),
            loader_type: LoaderType::Vanilla,
            loader_version: String::new(),
            java_version: "17".to_string(),
            jvm_args: vec!["-Xmx2G".to_string()],
            game_args: vec![],
            resolution_width: 1920,
            resolution_height: 1080,
            created_at: Utc::now(),
            last_played_at: None,
        }
    }
}
