use async_trait::async_trait;

use super::nostr::Nip98Event;

/// Unified authentication request -- covers all supported auth methods.
#[derive(Debug)]
pub enum AuthRequest {
    EmailPassword { email: String, password: String },
    NostrNip98 { event: Nip98Event },
    ApiKey { key: String },
}

/// Result of a successful authentication.
#[derive(Debug)]
pub struct AuthResult {
    pub user_id: String,
    pub display_name: Option<String>,
    /// True if the user was just created (first login with this method).
    pub created: bool,
}

/// Extensible authentication provider trait.
///
/// This is the API contract for adding new auth methods (e.g., LNURL-auth, SSO).
/// Each provider handles one authentication method and can look up or create users.
#[async_trait]
pub trait AuthProvider: Send + Sync {
    /// Attempt to authenticate the given request. Returns an error string on failure.
    async fn authenticate(&self, req: &AuthRequest) -> Result<AuthResult, String>;

    /// Human-readable name for this provider (e.g., "email", "nostr", "api_key").
    fn provider_name(&self) -> &'static str;
}
