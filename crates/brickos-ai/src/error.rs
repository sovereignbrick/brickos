#[derive(Debug, thiserror::Error)]
pub enum AiError {
    #[error("Provider error: {0}")]
    Provider(String),
    #[error("All providers failed")]
    AllProvidersFailed,
    #[error("Request error: {0}")]
    Request(#[from] reqwest::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Vision not supported by provider {0}")]
    VisionNotSupported(String),
}
