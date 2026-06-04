use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum JavaVendor {
    Zulu,
    Oracle,
    Adoptium,
    GraalVM,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JavaRuntime {
    pub id: String,
    pub vendor: JavaVendor,
    pub version: String,
    pub path: String,
    pub installed: bool,
}
