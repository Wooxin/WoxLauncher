use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum JavaVendor {
    Zulu,
    Oracle,
    Adoptium,
    GraalVM,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JavaRuntime {
    pub id: String,
    pub vendor: JavaVendor,
    pub version: String,
    pub path: String,
    pub installed: bool,
}
