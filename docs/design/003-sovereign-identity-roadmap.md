# 003 -- Sovereign Identity: Unified Authentication Roadmap

**Status:** Draft
**Date:** 2026-04-05
**Authors:** twentyone.life, Claude (architecture)
**Supersedes:** SHI 001 (OAuth Social Login), SHI 012 (Enterprise SSO)
**Related issues:** GitHub #70, #69, #91

---

## 1. Problem Statement

Three separate designs were converging on three different tables and three different APIs:

| Design | Scope | Tables introduced | API prefix |
|---|---|---|---|
| SHI 001 -- OAuth Social Login | Google, Apple, GitHub login | `user_oauth_accounts`, `oauth_providers` | `/auth/oauth/` |
| SHI 012 -- Enterprise SSO | SAML/OIDC per-org federation | `sso_connections`, `sso_sessions` | `/auth/sso/` |
| This doc -- NOSTR Login | NIP-07 Schnorr challenge/response | `nostr_identities`, `nostr_challenges` | `/auth/nostr/` |

If built independently, this gives us **six tables**, **three verification flows**, and **three sets of middleware** -- all doing fundamentally the same thing: proving "this external identity controls this BrickOS account."

This document replaces all three with a single **protocol-agnostic identity layer** that handles every authentication method through one trait, two tables, and two API endpoints.

---

## 2. Current Authentication Architecture

### 2.1 What exists today

The `brickos-auth` crate (`crates/brickos-auth/`) provides:

```
brickos-auth/src/
  lib.rs          -- Module declarations
  jwt.rs          -- JWT creation/verification (jsonwebtoken crate)
  password.rs     -- Argon2 hashing/verification
  mfa.rs          -- TOTP second-factor support
  tokens.rs       -- Refresh token utilities
  validation.rs   -- Input validation helpers
```

**Authentication flow today:**

1. User submits email + password to `POST /auth/login`
2. Server verifies Argon2 hash against `users.password_hash`
3. Server issues JWT (sub, role, tier, exp, iat) + refresh token
4. Client stores JWT, sends as `Authorization: Bearer <token>`

### 2.2 What stays the same

The JWT layer is **not changing**. Every identity provider -- NOSTR, Google, SAML, anything -- ultimately resolves to a BrickOS `user_id` and then issues the same JWT via `brickos_auth::jwt::create_jwt()`. The identity layer sits *in front of* the JWT layer, not beside it.

---

## 3. Unified Protocol-Agnostic Design

### 3.1 Core Trait: IdentityProvider

Every authentication method implements this single trait. The trait is deliberately minimal -- it captures only the two things every protocol must do: start an authentication flow and verify its result.

```rust
// crates/brickos-auth/src/identity/provider.rs

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

// ---------------------------------------------------------------------------
//  Enums
// ---------------------------------------------------------------------------

/// The broad category of an identity provider. Determines UI placement,
/// trust level, and which tiers can use it.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "provider_category", rename_all = "snake_case")]
pub enum ProviderCategory {
    /// Self-custody keys (NOSTR, DID:key, WebAuthn hardware keys)
    Sovereign,
    /// OAuth 2.0 / OIDC social providers (Google, Apple, GitHub)
    Social,
    /// Organization-managed federation (SAML, OIDC with custom IdP)
    Enterprise,
    /// Platform-native credentials (email/password)
    Local,
}

/// How the authentication flow begins. Determines whether the frontend
/// redirects the browser or presents an in-page signing challenge.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AuthInitiation {
    /// Browser redirect to an external URL (OIDC authorization endpoint,
    /// SAML IdP SSO URL). The frontend navigates here.
    Redirect {
        url: String,
        state: String,
    },
    /// In-page challenge that the client signs locally (NOSTR NIP-07,
    /// WebAuthn navigator.credentials.get, LNURL-auth). No redirect.
    Challenge {
        challenge_id: String,
        payload: serde_json::Value,
        expires_at: i64,
    },
}

/// The result of a successful identity verification.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifiedIdentity {
    /// The external identifier, unique within this provider.
    /// Examples: npub, email, OIDC sub claim, SAML NameID.
    pub external_id: String,
    /// Human-readable display name, if available.
    pub display_name: Option<String>,
    /// Email address, if the protocol provides one.
    pub email: Option<String>,
    /// Avatar URL, if available.
    pub avatar_url: Option<String>,
    /// Provider-specific metadata (token expiry, relay list, org claims).
    pub metadata: serde_json::Value,
}

/// Errors that any provider can return.
#[derive(Debug, thiserror::Error)]
pub enum IdentityError {
    #[error("challenge expired or not found")]
    ChallengeExpired,
    #[error("signature verification failed")]
    SignatureInvalid,
    #[error("provider configuration error: {0}")]
    Configuration(String),
    #[error("upstream provider error: {0}")]
    Upstream(String),
    #[error("user not authorized for this provider")]
    Unauthorized,
    #[error("internal error: {0}")]
    Internal(#[from] anyhow::Error),
}

// ---------------------------------------------------------------------------
//  Trait
// ---------------------------------------------------------------------------

/// The single trait every authentication protocol implements.
///
/// Implementors: NostrProvider, OidcProvider, SamlProvider,
/// EmailPasswordProvider, and future providers (DidKeyProvider,
/// WebAuthnProvider, LnurlAuthProvider).
#[async_trait]
pub trait IdentityProvider: Send + Sync {
    /// Unique slug for this provider instance (e.g. "nostr", "google",
    /// "acme-corp-saml"). Matches identity_providers.slug in the DB.
    fn name(&self) -> &str;

    /// The broad category of this provider.
    fn category(&self) -> ProviderCategory;

    /// Begin an authentication flow.
    ///
    /// For redirect-based protocols (OIDC, SAML), this returns a URL.
    /// For challenge-based protocols (NOSTR, WebAuthn), this creates a
    /// challenge in the DB and returns it to the client.
    async fn initiate(
        &self,
        db: &PgPool,
        redirect_uri: &str,
    ) -> Result<AuthInitiation, IdentityError>;

    /// Complete an authentication flow by verifying the proof.
    ///
    /// `payload` is protocol-specific:
    /// - NOSTR: the signed NIP-22242 event JSON
    /// - OIDC: the authorization code + state
    /// - SAML: the SAMLResponse POST body
    /// - Email/password: { "email": "...", "password": "..." }
    async fn verify(
        &self,
        db: &PgPool,
        payload: serde_json::Value,
    ) -> Result<VerifiedIdentity, IdentityError>;

    /// Optional: verify an HTTP request directly (for NIP-98 or similar).
    /// Default implementation returns Err (not supported).
    async fn verify_http_auth(
        &self,
        _db: &PgPool,
        _auth_header: &str,
        _request_url: &str,
        _request_method: &str,
    ) -> Result<VerifiedIdentity, IdentityError> {
        Err(IdentityError::Configuration(
            format!("HTTP auth not supported by provider '{}'", self.name()),
        ))
    }

    /// Optional: resolve a human-readable identifier to an external_id.
    /// For NOSTR: NIP-05 lookup. For OIDC: email -> sub. For SAML: NameID.
    async fn resolve_identifier(
        &self,
        _identifier: &str,
    ) -> Result<Option<String>, IdentityError> {
        Ok(None)
    }
}
```

### 3.2 Provider Implementations

#### 3.2.1 NostrProvider

```rust
// crates/brickos-auth/src/identity/nostr.rs

use super::provider::*;
use async_trait::async_trait;
use nostr::prelude::*;
use sqlx::PgPool;
use uuid::Uuid;

pub struct NostrProvider;

#[async_trait]
impl IdentityProvider for NostrProvider {
    fn name(&self) -> &str {
        "nostr"
    }

    fn category(&self) -> ProviderCategory {
        ProviderCategory::Sovereign
    }

    async fn initiate(
        &self,
        db: &PgPool,
        _redirect_uri: &str,
    ) -> Result<AuthInitiation, IdentityError> {
        let challenge_id = Uuid::new_v4().to_string();
        let nonce = Uuid::new_v4().to_string();
        let expires_at = chrono::Utc::now().timestamp() + 60; // 60s TTL

        // Store challenge for single-use verification
        sqlx::query(
            r#"
            INSERT INTO identity_challenges (id, provider_slug, nonce, expires_at)
            VALUES ($1, 'nostr', $2, to_timestamp($3))
            "#,
        )
        .bind(&challenge_id)
        .bind(&nonce)
        .bind(expires_at)
        .execute(db)
        .await
        .map_err(|e| IdentityError::Internal(e.into()))?;

        Ok(AuthInitiation::Challenge {
            challenge_id: challenge_id.clone(),
            payload: serde_json::json!({
                "kind": 22242,
                "content": "",
                "tags": [
                    ["relay", "wss://relay.brickos.io"],
                    ["challenge", nonce],
                ],
            }),
            expires_at,
        })
    }

    async fn verify(
        &self,
        db: &PgPool,
        payload: serde_json::Value,
    ) -> Result<VerifiedIdentity, IdentityError> {
        let challenge_id = payload["challenge_id"]
            .as_str()
            .ok_or(IdentityError::Configuration("missing challenge_id".into()))?;
        let signed_event_json = payload["signed_event"]
            .as_str()
            .ok_or(IdentityError::Configuration("missing signed_event".into()))?;

        // 1. Consume the challenge (single-use)
        let consumed = sqlx::query_scalar::<_, String>(
            r#"
            DELETE FROM identity_challenges
            WHERE id = $1
              AND provider_slug = 'nostr'
              AND expires_at > now()
            RETURNING nonce
            "#,
        )
        .fetch_optional(db)
        .await
        .map_err(|e| IdentityError::Internal(e.into()))?
        .ok_or(IdentityError::ChallengeExpired)?;

        // 2. Parse and verify the signed event
        let event: Event = Event::from_json(signed_event_json)
            .map_err(|_| IdentityError::SignatureInvalid)?;

        // 3. Verify Schnorr signature
        event.verify()
            .map_err(|_| IdentityError::SignatureInvalid)?;

        // 4. Verify kind 22242
        if event.kind != Kind::Custom(22242) {
            return Err(IdentityError::SignatureInvalid);
        }

        // 5. Verify challenge nonce matches
        let challenge_tag = event.tags.iter().find(|t| {
            t.as_slice().first().map(|s| s.as_str()) == Some("challenge")
        });
        let provided_nonce = challenge_tag
            .and_then(|t| t.as_slice().get(1))
            .map(|s| s.as_str())
            .ok_or(IdentityError::SignatureInvalid)?;
        if provided_nonce != consumed {
            return Err(IdentityError::SignatureInvalid);
        }

        // 6. Extract the public key (npub)
        let npub = event.author().to_bech32()
            .map_err(|e| IdentityError::Internal(e.into()))?;
        let hex_pubkey = event.author().to_hex();

        Ok(VerifiedIdentity {
            external_id: hex_pubkey,
            display_name: None,
            email: None,
            avatar_url: None,
            metadata: serde_json::json!({
                "npub": npub,
                "relay_hint": "wss://relay.brickos.io",
            }),
        })
    }

    async fn verify_http_auth(
        &self,
        db: &PgPool,
        auth_header: &str,
        request_url: &str,
        request_method: &str,
    ) -> Result<VerifiedIdentity, IdentityError> {
        // NIP-98 HTTP Auth -- Phase 5
        // Authorization: Nostr <base64-encoded-kind-27235-event>
        let encoded = auth_header
            .strip_prefix("Nostr ")
            .ok_or(IdentityError::SignatureInvalid)?;
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(encoded)
            .map_err(|_| IdentityError::SignatureInvalid)?;
        let event: Event = Event::from_json(
            String::from_utf8(decoded)
                .map_err(|_| IdentityError::SignatureInvalid)?,
        )
        .map_err(|_| IdentityError::SignatureInvalid)?;

        event.verify()
            .map_err(|_| IdentityError::SignatureInvalid)?;

        // Verify kind 27235 (NIP-98)
        if event.kind != Kind::Custom(27235) {
            return Err(IdentityError::SignatureInvalid);
        }

        // Verify URL and method tags match the request
        let url_tag = event.tags.iter().find(|t| {
            t.as_slice().first().map(|s| s.as_str()) == Some("u")
        });
        let method_tag = event.tags.iter().find(|t| {
            t.as_slice().first().map(|s| s.as_str()) == Some("method")
        });

        let tag_url = url_tag
            .and_then(|t| t.as_slice().get(1))
            .map(|s| s.as_str())
            .ok_or(IdentityError::SignatureInvalid)?;
        let tag_method = method_tag
            .and_then(|t| t.as_slice().get(1))
            .map(|s| s.as_str())
            .ok_or(IdentityError::SignatureInvalid)?;

        if tag_url != request_url || tag_method != request_method {
            return Err(IdentityError::SignatureInvalid);
        }

        // Verify timestamp within 60s
        let event_ts = event.created_at.as_u64() as i64;
        let now = chrono::Utc::now().timestamp();
        if (now - event_ts).unsigned_abs() > 60 {
            return Err(IdentityError::ChallengeExpired);
        }

        let npub = event.author().to_bech32()
            .map_err(|e| IdentityError::Internal(e.into()))?;
        let hex_pubkey = event.author().to_hex();

        Ok(VerifiedIdentity {
            external_id: hex_pubkey,
            display_name: None,
            email: None,
            avatar_url: None,
            metadata: serde_json::json!({
                "npub": npub,
                "nip98": true,
            }),
        })
    }

    async fn resolve_identifier(
        &self,
        identifier: &str,
    ) -> Result<Option<String>, IdentityError> {
        // NIP-05 resolution -- Phase 6
        // identifier format: "user@domain.com"
        let parts: Vec<&str> = identifier.splitn(2, '@').collect();
        if parts.len() != 2 {
            return Ok(None);
        }
        let (name, domain) = (parts[0], parts[1]);
        let url = format!(
            "https://{}/.well-known/nostr.json?name={}",
            domain, name,
        );

        let client = reqwest::Client::new();
        let resp = client
            .get(&url)
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await
            .map_err(|e| IdentityError::Upstream(e.to_string()))?;

        if !resp.status().is_success() {
            return Ok(None);
        }

        let json: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| IdentityError::Upstream(e.to_string()))?;

        let hex_pubkey = json["names"][name]
            .as_str()
            .map(|s| s.to_string());

        Ok(hex_pubkey)
    }
}
```

#### 3.2.2 OidcProvider

```rust
// crates/brickos-auth/src/identity/oidc.rs

use super::provider::*;
use async_trait::async_trait;
use sqlx::PgPool;
use uuid::Uuid;

/// A generic OIDC provider. One instance per configured provider
/// (Google, Apple, GitHub, or a custom enterprise IdP).
pub struct OidcProvider {
    pub slug: String,
    pub client_id: String,
    pub client_secret: String,
    pub authorization_url: String,
    pub token_url: String,
    pub userinfo_url: String,
    pub scopes: Vec<String>,
    pub category: ProviderCategory,
}

#[async_trait]
impl IdentityProvider for OidcProvider {
    fn name(&self) -> &str {
        &self.slug
    }

    fn category(&self) -> ProviderCategory {
        self.category
    }

    async fn initiate(
        &self,
        db: &PgPool,
        redirect_uri: &str,
    ) -> Result<AuthInitiation, IdentityError> {
        let state = Uuid::new_v4().to_string();
        let nonce = Uuid::new_v4().to_string();

        // Store state for CSRF protection
        sqlx::query(
            r#"
            INSERT INTO identity_challenges (id, provider_slug, nonce, expires_at)
            VALUES ($1, $2, $3, now() + interval '10 minutes')
            "#,
        )
        .bind(&state)
        .bind(self.name())
        .bind(&nonce)
        .execute(db)
        .await
        .map_err(|e| IdentityError::Internal(e.into()))?;

        let scopes = self.scopes.join(" ");
        let url = format!(
            "{}?response_type=code&client_id={}&redirect_uri={}&scope={}&state={}&nonce={}",
            self.authorization_url,
            urlencoding::encode(&self.client_id),
            urlencoding::encode(redirect_uri),
            urlencoding::encode(&scopes),
            urlencoding::encode(&state),
            urlencoding::encode(&nonce),
        );

        Ok(AuthInitiation::Redirect { url, state })
    }

    async fn verify(
        &self,
        db: &PgPool,
        payload: serde_json::Value,
    ) -> Result<VerifiedIdentity, IdentityError> {
        let code = payload["code"]
            .as_str()
            .ok_or(IdentityError::Configuration("missing code".into()))?;
        let state = payload["state"]
            .as_str()
            .ok_or(IdentityError::Configuration("missing state".into()))?;
        let redirect_uri = payload["redirect_uri"]
            .as_str()
            .ok_or(IdentityError::Configuration("missing redirect_uri".into()))?;

        // 1. Consume the state (CSRF protection)
        sqlx::query(
            r#"
            DELETE FROM identity_challenges
            WHERE id = $1 AND provider_slug = $2 AND expires_at > now()
            "#,
        )
        .bind(state)
        .bind(self.name())
        .execute(db)
        .await
        .map_err(|e| IdentityError::Internal(e.into()))?;

        // 2. Exchange code for tokens
        let client = reqwest::Client::new();
        let token_resp = client
            .post(&self.token_url)
            .form(&[
                ("grant_type", "authorization_code"),
                ("code", code),
                ("redirect_uri", redirect_uri),
                ("client_id", &self.client_id),
                ("client_secret", &self.client_secret),
            ])
            .send()
            .await
            .map_err(|e| IdentityError::Upstream(e.to_string()))?;

        let token_json: serde_json::Value = token_resp
            .json()
            .await
            .map_err(|e| IdentityError::Upstream(e.to_string()))?;

        let access_token = token_json["access_token"]
            .as_str()
            .ok_or(IdentityError::Upstream("no access_token".into()))?;

        // 3. Fetch user info
        let userinfo_resp = client
            .get(&self.userinfo_url)
            .bearer_auth(access_token)
            .send()
            .await
            .map_err(|e| IdentityError::Upstream(e.to_string()))?;

        let userinfo: serde_json::Value = userinfo_resp
            .json()
            .await
            .map_err(|e| IdentityError::Upstream(e.to_string()))?;

        let sub = userinfo["sub"]
            .as_str()
            .ok_or(IdentityError::Upstream("no sub claim".into()))?;

        Ok(VerifiedIdentity {
            external_id: sub.to_string(),
            display_name: userinfo["name"].as_str().map(|s| s.to_string()),
            email: userinfo["email"].as_str().map(|s| s.to_string()),
            avatar_url: userinfo["picture"].as_str().map(|s| s.to_string()),
            metadata: serde_json::json!({
                "id_token": token_json.get("id_token"),
                "token_type": token_json.get("token_type"),
            }),
        })
    }
}
```

#### 3.2.3 SamlProvider (Phase 4 -- stub)

```rust
// crates/brickos-auth/src/identity/saml.rs

use super::provider::*;
use async_trait::async_trait;
use sqlx::PgPool;

pub struct SamlProvider {
    pub slug: String,
    pub entity_id: String,
    pub sso_url: String,
    pub certificate_pem: String,
    pub org_id: uuid::Uuid,
}

#[async_trait]
impl IdentityProvider for SamlProvider {
    fn name(&self) -> &str {
        &self.slug
    }

    fn category(&self) -> ProviderCategory {
        ProviderCategory::Enterprise
    }

    async fn initiate(
        &self,
        _db: &PgPool,
        redirect_uri: &str,
    ) -> Result<AuthInitiation, IdentityError> {
        // Phase 4: Build SAML AuthnRequest, deflate, base64, redirect
        todo!("SAML initiation -- Phase 4")
    }

    async fn verify(
        &self,
        _db: &PgPool,
        _payload: serde_json::Value,
    ) -> Result<VerifiedIdentity, IdentityError> {
        // Phase 4: Parse SAMLResponse, verify XML signature, extract NameID
        todo!("SAML verification -- Phase 4")
    }
}
```

#### 3.2.4 EmailPasswordProvider

```rust
// crates/brickos-auth/src/identity/email_password.rs

use super::provider::*;
use crate::password;
use async_trait::async_trait;
use sqlx::PgPool;

pub struct EmailPasswordProvider;

#[async_trait]
impl IdentityProvider for EmailPasswordProvider {
    fn name(&self) -> &str {
        "email"
    }

    fn category(&self) -> ProviderCategory {
        ProviderCategory::Local
    }

    async fn initiate(
        &self,
        _db: &PgPool,
        _redirect_uri: &str,
    ) -> Result<AuthInitiation, IdentityError> {
        // Email/password has no initiation step -- the client sends
        // credentials directly to verify(). Return a no-op challenge.
        Ok(AuthInitiation::Challenge {
            challenge_id: "direct".to_string(),
            payload: serde_json::json!({"method": "password"}),
            expires_at: 0,
        })
    }

    async fn verify(
        &self,
        db: &PgPool,
        payload: serde_json::Value,
    ) -> Result<VerifiedIdentity, IdentityError> {
        let email = payload["email"]
            .as_str()
            .ok_or(IdentityError::Configuration("missing email".into()))?;
        let pwd = payload["password"]
            .as_str()
            .ok_or(IdentityError::Configuration("missing password".into()))?;

        // Look up the user by email
        let row = sqlx::query_as::<_, (String, String, String)>(
            r#"
            SELECT id::text, email, password_hash
            FROM users
            WHERE email = $1
            "#,
        )
        .bind(email)
        .fetch_optional(db)
        .await
        .map_err(|e| IdentityError::Internal(e.into()))?
        .ok_or(IdentityError::SignatureInvalid)?;

        let (_user_id, user_email, hash) = row;

        if !password::verify_password(pwd, &hash) {
            return Err(IdentityError::SignatureInvalid);
        }

        Ok(VerifiedIdentity {
            external_id: user_email.clone(),
            display_name: None,
            email: Some(user_email),
            avatar_url: None,
            metadata: serde_json::json!({}),
        })
    }
}
```

### 3.3 Identity Registry

The registry holds all configured providers and routes requests to the correct one.

```rust
// crates/brickos-auth/src/identity/registry.rs

use super::provider::{IdentityError, IdentityProvider, ProviderCategory};
use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::Arc;

/// Central registry of all configured identity providers.
/// Built at application startup, immutable during runtime.
pub struct IdentityRegistry {
    providers: HashMap<String, Arc<dyn IdentityProvider>>,
}

impl IdentityRegistry {
    pub fn new() -> Self {
        Self {
            providers: HashMap::new(),
        }
    }

    /// Register a provider. The slug must be unique.
    pub fn register(&mut self, provider: Arc<dyn IdentityProvider>) {
        self.providers.insert(provider.name().to_string(), provider);
    }

    /// Look up a provider by slug.
    pub fn get(&self, slug: &str) -> Option<&Arc<dyn IdentityProvider>> {
        self.providers.get(slug)
    }

    /// Return all providers in a given category.
    pub fn by_category(&self, category: ProviderCategory) -> Vec<&Arc<dyn IdentityProvider>> {
        self.providers
            .values()
            .filter(|p| p.category() == category)
            .collect()
    }

    /// Return all provider slugs (for the /discover endpoint).
    pub fn slugs(&self) -> Vec<String> {
        self.providers.keys().cloned().collect()
    }

    /// Build the default registry from database configuration.
    /// Loads all rows from identity_providers, instantiates the
    /// correct struct for each, and registers it.
    pub async fn from_database(db: &PgPool) -> Result<Self, IdentityError> {
        let mut registry = Self::new();

        // Always register built-in providers
        registry.register(Arc::new(
            super::email_password::EmailPasswordProvider,
        ));
        registry.register(Arc::new(super::nostr::NostrProvider));

        // Load OIDC/SAML providers from the database
        let rows = sqlx::query_as::<_, ProviderRow>(
            r#"
            SELECT slug, category::text, protocol,
                   oidc_client_id, oidc_client_secret,
                   oidc_authorization_url, oidc_token_url,
                   oidc_userinfo_url, oidc_scopes
            FROM identity_providers
            WHERE is_active = true
              AND protocol IN ('oidc', 'saml')
            "#,
        )
        .fetch_all(db)
        .await
        .map_err(|e| IdentityError::Internal(e.into()))?;

        for row in rows {
            match row.protocol.as_str() {
                "oidc" => {
                    let provider = super::oidc::OidcProvider {
                        slug: row.slug,
                        client_id: row.oidc_client_id.unwrap_or_default(),
                        client_secret: row.oidc_client_secret.unwrap_or_default(),
                        authorization_url: row.oidc_authorization_url.unwrap_or_default(),
                        token_url: row.oidc_token_url.unwrap_or_default(),
                        userinfo_url: row.oidc_userinfo_url.unwrap_or_default(),
                        scopes: row
                            .oidc_scopes
                            .unwrap_or_default()
                            .split(',')
                            .map(|s| s.trim().to_string())
                            .collect(),
                        category: parse_category(&row.category),
                    };
                    registry.register(Arc::new(provider));
                }
                "saml" => {
                    // Phase 4
                    tracing::info!("SAML provider '{}' found but not yet implemented", row.slug);
                }
                _ => {}
            }
        }

        Ok(registry)
    }
}

fn parse_category(s: &str) -> ProviderCategory {
    match s {
        "sovereign" => ProviderCategory::Sovereign,
        "social" => ProviderCategory::Social,
        "enterprise" => ProviderCategory::Enterprise,
        _ => ProviderCategory::Local,
    }
}

#[derive(sqlx::FromRow)]
struct ProviderRow {
    slug: String,
    category: String,
    protocol: String,
    oidc_client_id: Option<String>,
    oidc_client_secret: Option<String>,
    oidc_authorization_url: Option<String>,
    oidc_token_url: Option<String>,
    oidc_userinfo_url: Option<String>,
    oidc_scopes: Option<String>,
}
```

### 3.4 Module Structure

After implementation, `brickos-auth` gains an `identity` submodule:

```
crates/brickos-auth/src/
  lib.rs                      -- add: pub mod identity;
  identity/
    mod.rs                    -- re-exports
    provider.rs               -- IdentityProvider trait + enums
    registry.rs               -- IdentityRegistry
    nostr.rs                  -- NostrProvider
    oidc.rs                   -- OidcProvider
    saml.rs                   -- SamlProvider (stub)
    email_password.rs         -- EmailPasswordProvider
```

---

## 4. Unified Database Schema

Two tables replace the six that the three separate designs would have created, plus one supporting table for challenge nonces.

### 4.1 Migration

```sql
-- Migration: XXXX_create_identity_tables.sql
-- Unified identity provider + user identity tables.
-- Replaces: user_oauth_accounts, oauth_providers, sso_connections,
--           sso_sessions, nostr_identities, nostr_challenges.

-- --------------------------------------------------------------------------
--  Enum type
-- --------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider_category') THEN
        CREATE TYPE provider_category AS ENUM (
            'sovereign',
            'social',
            'enterprise',
            'local'
        );
    END IF;
END
$$;

-- --------------------------------------------------------------------------
--  Table 1: identity_providers
--  One row per configured authentication method.
--  Global providers (email, nostr, google) have org_id = NULL.
--  Enterprise providers are scoped to an organization.
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS identity_providers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT NOT NULL UNIQUE,
    display_name    TEXT NOT NULL,
    category        provider_category NOT NULL,
    protocol        TEXT NOT NULL CHECK (protocol IN (
                        'password', 'nostr', 'oidc', 'saml',
                        'webauthn', 'did', 'lnurl'
                    )),

    -- Organization scoping (NULL = global / platform-wide)
    org_id          UUID REFERENCES organizations(id),

    -- Enterprise SSO: email domain routing (from SHI 012)
    email_domain    TEXT,

    -- OIDC configuration (Google, Apple, GitHub, custom)
    oidc_client_id          TEXT,
    oidc_client_secret      TEXT,  -- encrypted at rest via AES
    oidc_authorization_url  TEXT,
    oidc_token_url          TEXT,
    oidc_userinfo_url       TEXT,
    oidc_scopes             TEXT DEFAULT 'openid email profile',

    -- SAML configuration (Phase 4)
    saml_entity_id          TEXT,
    saml_sso_url            TEXT,
    saml_certificate_pem    TEXT,
    saml_name_id_format     TEXT DEFAULT 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',

    -- Access control
    required_tier   TEXT DEFAULT 'free',
    is_global       BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,

    -- Metadata
    icon_url        TEXT,
    sort_order      INT NOT NULL DEFAULT 100,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for email-domain SSO routing
CREATE INDEX IF NOT EXISTS idx_identity_providers_email_domain
    ON identity_providers (email_domain)
    WHERE email_domain IS NOT NULL;

-- Index for org-scoped provider lookup
CREATE INDEX IF NOT EXISTS idx_identity_providers_org_id
    ON identity_providers (org_id)
    WHERE org_id IS NOT NULL;

-- --------------------------------------------------------------------------
--  Table 2: user_identities
--  Links a BrickOS user to one or more external identities.
--  A user can have multiple identities (email + nostr + google).
--  The external_id is unique per provider (no two BrickOS users
--  can link the same Google account).
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_identities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id     UUID NOT NULL REFERENCES identity_providers(id),

    -- The identifier within the external system.
    -- NOSTR: hex public key. OIDC: sub claim. SAML: NameID.
    -- Email: the email address itself.
    external_id     TEXT NOT NULL,

    -- Optional human-readable label (npub, email, "John via Okta")
    display_label   TEXT,

    -- Provider-specific metadata (relay list, org claims, etc.)
    metadata        JSONB NOT NULL DEFAULT '{}',

    -- Encrypted OAuth/SAML tokens (refresh token, etc.)
    -- NULL for protocols that don't issue tokens (NOSTR, password).
    encrypted_tokens BYTEA,

    -- Account linking
    is_primary      BOOLEAN NOT NULL DEFAULT false,
    linked_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at    TIMESTAMPTZ,

    -- Unique: one external_id per provider
    CONSTRAINT uq_user_identities_provider_external
        UNIQUE (provider_id, external_id),

    -- Unique: one identity per provider per user
    CONSTRAINT uq_user_identities_user_provider
        UNIQUE (user_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_user_identities_user_id
    ON user_identities (user_id);

CREATE INDEX IF NOT EXISTS idx_user_identities_external_id
    ON user_identities (external_id);

-- --------------------------------------------------------------------------
--  Table 3: identity_challenges
--  Ephemeral challenge nonces for NOSTR, WebAuthn, OIDC state.
--  Rows are consumed (deleted) on verification. A cron job or
--  application-level sweep cleans expired rows.
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS identity_challenges (
    id              TEXT PRIMARY KEY,
    provider_slug   TEXT NOT NULL,
    nonce           TEXT NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_identity_challenges_expires
    ON identity_challenges (expires_at);

-- --------------------------------------------------------------------------
--  Seed data: global providers
-- --------------------------------------------------------------------------

INSERT INTO identity_providers (slug, display_name, category, protocol, is_global, sort_order)
VALUES
    ('email',  'Email & Password', 'local',     'password', true, 1),
    ('nostr',  'NOSTR',            'sovereign',  'nostr',   true, 2),
    ('google', 'Google',           'social',     'oidc',    true, 10),
    ('apple',  'Apple',            'social',     'oidc',    true, 11),
    ('github', 'GitHub',           'social',     'oidc',    true, 12)
ON CONFLICT (slug) DO NOTHING;

-- --------------------------------------------------------------------------
--  Backfill: create user_identities rows for existing email users.
--  Every existing user gets an email identity linked to the 'email'
--  provider, marked as primary.
-- --------------------------------------------------------------------------

INSERT INTO user_identities (user_id, provider_id, external_id, display_label, is_primary)
SELECT
    u.id,
    (SELECT id FROM identity_providers WHERE slug = 'email'),
    u.email,
    u.email,
    true
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_identities ui
    WHERE ui.user_id = u.id
      AND ui.provider_id = (SELECT id FROM identity_providers WHERE slug = 'email')
)
ON CONFLICT DO NOTHING;
```

### 4.2 Table Mapping

| Old design | Old table | New table | Notes |
|---|---|---|---|
| SHI 001 | `oauth_providers` | `identity_providers` | category = social |
| SHI 001 | `user_oauth_accounts` | `user_identities` | external_id = OAuth sub |
| SHI 012 | `sso_connections` | `identity_providers` | category = enterprise, org_id set |
| SHI 012 | `sso_sessions` | `identity_challenges` | ephemeral, consumed on verify |
| NOSTR | `nostr_identities` | `user_identities` | external_id = hex pubkey |
| NOSTR | `nostr_challenges` | `identity_challenges` | provider_slug = 'nostr' |

---

## 5. Unified API Endpoints

### 5.1 Endpoint Definitions

All identity operations go through two endpoints, replacing the per-protocol routes.

#### POST /auth/identity/initiate

Begins an authentication flow for any provider.

**Request:**
```json
{
    "provider": "nostr",
    "redirect_uri": "https://app.brickos.io/auth/callback"
}
```

**Response (challenge-based -- NOSTR, WebAuthn):**
```json
{
    "type": "challenge",
    "challenge_id": "550e8400-e29b-41d4-a716-446655440000",
    "payload": {
        "kind": 22242,
        "content": "",
        "tags": [
            ["relay", "wss://relay.brickos.io"],
            ["challenge", "a1b2c3d4..."]
        ]
    },
    "expires_at": 1743868800
}
```

**Response (redirect-based -- OIDC, SAML):**
```json
{
    "type": "redirect",
    "url": "https://accounts.google.com/o/oauth2/auth?...",
    "state": "xyz789"
}
```

#### POST /auth/identity/verify

Completes an authentication flow by verifying the proof.

**Request (NOSTR):**
```json
{
    "provider": "nostr",
    "challenge_id": "550e8400-e29b-41d4-a716-446655440000",
    "signed_event": "{\"kind\":22242,\"pubkey\":\"abc...\",\"sig\":\"def...\",...}"
}
```

**Request (OIDC):**
```json
{
    "provider": "google",
    "code": "4/0AX4XfWh...",
    "state": "xyz789",
    "redirect_uri": "https://app.brickos.io/auth/callback"
}
```

**Response (all providers, on success):**
```json
{
    "access_token": "eyJ...",
    "refresh_token": "rt_...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
        "id": "550e8400-...",
        "email": "user@example.com",
        "role": "user",
        "tier": "sovereign"
    },
    "identity": {
        "provider": "nostr",
        "external_id": "abc123...",
        "is_new_account": false
    }
}
```

#### GET /auth/identity/discover

Domain-based SSO routing (carried forward from SHI 012). Given an email domain, returns the configured enterprise provider.

**Request:** `GET /auth/identity/discover?domain=acme-corp.com`

**Response:**
```json
{
    "provider": "acme-corp-okta",
    "category": "enterprise",
    "protocol": "saml",
    "display_name": "Acme Corp (Okta)"
}
```

**Response (no enterprise provider):**
```json
{
    "provider": null,
    "available": ["email", "nostr", "google", "apple", "github"]
}
```

### 5.2 Endpoint Mapping (Old to New)

| Old endpoint | New endpoint | Notes |
|---|---|---|
| `POST /auth/oauth/:provider/start` | `POST /auth/identity/initiate` | provider in body, not URL |
| `GET /auth/oauth/:provider/callback` | `POST /auth/identity/verify` | POST, not GET with query params |
| `POST /auth/nostr/challenge` | `POST /auth/identity/initiate` | provider = "nostr" |
| `POST /auth/nostr/verify` | `POST /auth/identity/verify` | provider = "nostr" |
| `POST /auth/sso/callback` | `POST /auth/identity/verify` | provider = enterprise slug |
| `GET /auth/sso/discover` | `GET /auth/identity/discover` | unchanged semantics |
| `POST /auth/login` | `POST /auth/identity/verify` | provider = "email" (backward compat alias kept) |

---

## 6. NOSTR Login Flow

The complete NOSTR authentication flow using NIP-07 (browser extension signing):

```
Client                        Server                       NIP-07 Extension
  |                              |                              |
  |  POST /auth/identity/initiate                               |
  |  { "provider": "nostr" }     |                              |
  |----------------------------->|                              |
  |                              |                              |
  |                     Create challenge:                       |
  |                     - Generate nonce                        |
  |                     - Store in identity_challenges          |
  |                     - 60s TTL, single-use                   |
  |                              |                              |
  |  { challenge_id, payload }   |                              |
  |<-----------------------------|                              |
  |                              |                              |
  |  Build unsigned event (kind 22242)                          |
  |  with challenge nonce in tags                               |
  |                              |                              |
  |  window.nostr.signEvent(event)                              |
  |--------------------------------------------->|              |
  |                              |               |              |
  |                              |    User confirms in extension|
  |                              |               |              |
  |  signed_event (with Schnorr sig)             |              |
  |<---------------------------------------------|              |
  |                              |                              |
  |  POST /auth/identity/verify                                 |
  |  { "provider": "nostr",     |                              |
  |    "challenge_id": "...",    |                              |
  |    "signed_event": "..." }   |                              |
  |----------------------------->|                              |
  |                              |                              |
  |                     Verify:                                 |
  |                     1. Consume challenge (DELETE + check TTL)|
  |                     2. Parse event JSON                     |
  |                     3. Verify Schnorr signature             |
  |                     4. Check kind == 22242                  |
  |                     5. Check challenge nonce matches         |
  |                     6. Extract hex pubkey                   |
  |                              |                              |
  |                     Find or create user:                    |
  |                     - Lookup user_identities by external_id |
  |                     - If found: load user, update last_used |
  |                     - If not found: create user + identity  |
  |                              |                              |
  |                     Issue JWT + refresh token               |
  |                              |                              |
  |  { access_token, refresh_token, user, identity }            |
  |<-----------------------------|                              |
```

### 6.1 Challenge Nonce Security

- **TTL:** 60 seconds. Challenge rows with `expires_at < now()` are rejected and periodically swept.
- **Single-use:** The `DELETE ... RETURNING` query atomically consumes the challenge. A replayed proof finds no row and fails.
- **Nonce binding:** The challenge nonce is embedded in the event's tags. The server verifies it matches the stored nonce. This prevents an attacker from intercepting a signed event and replaying it against a different challenge.
- **No relay publication:** The signed event is sent directly to the server via HTTPS, never published to a relay. This prevents third-party capture.

---

## 7. Implementation Roadmap

### Phase 1: Unified Schema + NOSTR Login

**Scope:** Deploy the identity tables, implement NostrProvider and EmailPasswordProvider inside `brickos-auth`, wire up the unified endpoints in Sovereign Health.

**Files to create:**
- `crates/brickos-auth/src/identity/mod.rs`
- `crates/brickos-auth/src/identity/provider.rs`
- `crates/brickos-auth/src/identity/registry.rs`
- `crates/brickos-auth/src/identity/nostr.rs`
- `crates/brickos-auth/src/identity/email_password.rs`
- `apps/health/sovereign-health/api/migrations/XXXX_create_identity_tables.sql`

**Files to modify:**
- `crates/brickos-auth/src/lib.rs` -- add `pub mod identity;`
- `crates/brickos-auth/Cargo.toml` -- add `nostr`, `async-trait`, `thiserror` deps
- `apps/health/sovereign-health/api/src/handlers/auth.rs` -- add unified endpoints
- `apps/health/sovereign-health/api/src/routes.rs` -- register `/auth/identity/*`
- `apps/health/sovereign-health/frontend/` -- NOSTR login button + NIP-07 integration

**Outcome:** Users can log in with email/password (existing) or NOSTR key (new). Both go through the unified API.

### Phase 2: Social Login (Google, Apple)

**Scope:** Configure Google and Apple as OIDC providers in the database, implement frontend OAuth buttons.

**Files to create:**
- `crates/brickos-auth/src/identity/oidc.rs`

**Files to modify:**
- `crates/brickos-auth/Cargo.toml` -- add `reqwest`, `urlencoding` deps
- `apps/health/sovereign-health/api/migrations/XXXX_configure_social_providers.sql`
- `apps/health/sovereign-health/frontend/` -- Google/Apple sign-in buttons

**Outcome:** Users can log in with Google or Apple accounts. All three methods (email, NOSTR, OIDC) use the same two endpoints.

### Phase 3: Extract brickos-identity Crate

**Scope:** If a second BrickOS application needs identity (e.g., Sovereign Link), extract the identity module into its own crate.

**Files to create:**
- `crates/brickos-identity/Cargo.toml`
- `crates/brickos-identity/src/lib.rs`
- Move `identity/*` from `brickos-auth` to `brickos-identity`

**Files to modify:**
- `crates/brickos-auth/Cargo.toml` -- add `brickos-identity` dependency
- `crates/brickos-auth/src/lib.rs` -- re-export `brickos_identity`
- `Cargo.toml` (workspace) -- add `brickos-identity` member

**Outcome:** Identity is a standalone crate, reusable across all BrickOS applications.

### Phase 4: Enterprise SSO (SAML)

**Scope:** Implement SamlProvider, admin UI for SSO configuration, email-domain routing.

**Files to create:**
- `crates/brickos-auth/src/identity/saml.rs` -- replace stub with full implementation

**Files to modify:**
- `crates/brickos-auth/Cargo.toml` -- add `samael` or equivalent SAML crate
- Admin panel: SSO configuration page (identity provider CRUD)
- Frontend: email-domain-based SSO discovery flow

**Outcome:** Enterprise customers can configure SAML IdPs (Okta, Azure AD, etc.) and their users are automatically routed to SSO login.

### Phase 5: NIP-98 HTTP Auth + NIP-46 Remote Signing

**Scope:** Support NOSTR-native HTTP authentication (NIP-98) for API calls and NIP-46 for mobile/remote signing.

**Files to modify:**
- `crates/brickos-auth/src/identity/nostr.rs` -- implement `verify_http_auth` fully
- Middleware: accept `Authorization: Nostr <base64>` header
- Frontend: NIP-46 bunker URL support for users without browser extensions

**Outcome:** NOSTR users can authenticate API requests directly with signed events, no JWT needed. Mobile users can sign via NIP-46 remote signer apps.

### Phase 6: NIP-05 Verification + Trust Badges + Full SSO

**Scope:** NIP-05 identity verification, trust badges on user profiles, and complete SSO feature parity with SHI 012.

**Files to modify:**
- `crates/brickos-auth/src/identity/nostr.rs` -- implement `resolve_identifier` fully
- Frontend: NIP-05 verification flow, trust badges, identity management page
- Admin panel: full SSO dashboard, provider analytics

**Outcome:** Complete identity platform. Users can verify their NOSTR identity via NIP-05, see trust indicators, and organizations have full SSO management.

---

## 8. Why Protocol-Agnostic Matters

The `IdentityProvider` trait adds no runtime cost for providers that don't exist yet. But it gives us the ability to add new protocols without touching any existing code outside the provider implementation itself.

Concrete scenarios where this pays off:

| Scenario | What changes | What stays the same |
|---|---|---|
| Post-quantum crypto (ML-DSA replaces Schnorr) | New `PostQuantumNostrProvider` | DB schema, API endpoints, JWT layer, frontend |
| DID:key interop (Decentralized Identifiers) | New `DidKeyProvider` | DB schema, API endpoints, JWT layer, frontend |
| Fedimint ecash login | New `FedimintProvider` | DB schema, API endpoints, JWT layer, frontend |
| WebAuthn / passkeys | New `WebAuthnProvider` | DB schema, API endpoints, JWT layer, frontend |
| LNURL-auth (Lightning login) | New `LnurlAuthProvider` | DB schema, API endpoints, JWT layer, frontend |
| Corporate LDAP (legacy) | New `LdapProvider` | DB schema, API endpoints, JWT layer, frontend |
| Unknown future protocol | New `XyzProvider` | DB schema, API endpoints, JWT layer, frontend |

Each new provider is:
1. A Rust file implementing `IdentityProvider`
2. A row in `identity_providers`
3. A frontend button

That is it. No new tables, no new endpoints, no new middleware.

---

## 9. Security Considerations

### 9.1 Challenge Nonce Management

- **60-second TTL** for NOSTR challenges. Longer for OIDC/SAML state (10 minutes) because redirects involve user interaction with external IdPs.
- **Single-use enforcement** via atomic `DELETE ... RETURNING`. The database guarantees at-most-once consumption even under concurrent requests.
- **Periodic sweep** of expired challenges. A background task runs `DELETE FROM identity_challenges WHERE expires_at < now()` every 5 minutes.

### 9.2 Key Rotation

- JWT signing keys: rotated via existing `brickos-auth` mechanism, unaffected by identity changes.
- OIDC client secrets: stored encrypted (AES) in `identity_providers.oidc_client_secret`. Rotation is a row update.
- SAML certificates: stored as PEM in `identity_providers.saml_certificate_pem`. IdP-initiated rotation requires admin update.

### 9.3 Account Recovery

Multiple linked identities provide natural recovery paths:

- User loses NOSTR key? Log in with email, unlink old key, link new one.
- User loses email access? Log in with NOSTR key, update email.
- User loses both? Admin-assisted recovery via identity verification (out of band).

The `is_primary` flag on `user_identities` determines which identity is authoritative for account recovery decisions.

### 9.4 Phishing Prevention

- **NOSTR:** Challenge nonces are bound to the server. A phishing site cannot generate valid challenges because it cannot insert into our `identity_challenges` table.
- **OIDC:** Standard `state` parameter for CSRF prevention. The redirect URI is validated server-side against the registered callback URL.
- **SAML:** Response signature verification against the stored certificate PEM. Assertion consumer service URL validation.

### 9.5 Account Linking Security

- A user cannot link an external identity that is already linked to another BrickOS account (`UNIQUE (provider_id, external_id)` constraint).
- Linking a new identity requires an active session (authenticated user). Anonymous users can only create new accounts.
- Unlinking the last identity is forbidden -- the system ensures at least one identity remains.

---

## 10. Cross-References

### 10.1 Superseded Documents

| Document | Status | Disposition |
|---|---|---|
| SHI 001 -- OAuth Social Login | Superseded | OIDC portions absorbed into Phase 2 |
| SHI 012 -- Enterprise SSO | Superseded | SAML + domain routing absorbed into Phase 4 |

### 10.2 Related GitHub Issues

| Issue | Title | Relationship |
|---|---|---|
| #70 | NOSTR login integration | Directly implemented by Phase 1 |
| #69 | Social login (Google/Apple) | Directly implemented by Phase 2 |
| #91 | Enterprise SSO support | Directly implemented by Phase 4 |

### 10.3 Related Design Documents

| Document | Relationship |
|---|---|
| [002-nostr-bitchat-integration.md](002-nostr-bitchat-integration.md) | NOSTR relay infrastructure, complements identity |
| [004-cashu-tollgate-zapstore.md](004-cashu-tollgate-zapstore.md) | Uses NOSTR identity for Cashu wallet binding |

---

## 11. Files to Create/Modify by Phase

Summary of all file changes across the full roadmap:

### New Files (all phases)

```
crates/brickos-auth/src/identity/
    mod.rs                          -- Phase 1
    provider.rs                     -- Phase 1
    registry.rs                     -- Phase 1
    nostr.rs                        -- Phase 1
    email_password.rs               -- Phase 1
    oidc.rs                         -- Phase 2
    saml.rs                         -- Phase 4

apps/health/sovereign-health/api/migrations/
    XXXX_create_identity_tables.sql -- Phase 1
    XXXX_configure_social_providers.sql -- Phase 2

crates/brickos-identity/           -- Phase 3 (optional extraction)
    Cargo.toml
    src/lib.rs
```

### Modified Files (all phases)

```
crates/brickos-auth/
    Cargo.toml                      -- Phase 1 (nostr, async-trait, thiserror)
                                    -- Phase 2 (reqwest, urlencoding)
                                    -- Phase 4 (samael)
    src/lib.rs                      -- Phase 1 (pub mod identity)

apps/health/sovereign-health/api/
    src/handlers/auth.rs            -- Phase 1 (unified endpoints)
    src/routes.rs                   -- Phase 1 (/auth/identity/*)

apps/health/sovereign-health/frontend/
    src/components/auth/             -- Phase 1 (NOSTR button)
                                     -- Phase 2 (Google/Apple buttons)
    src/lib/nostr.ts                 -- Phase 1 (NIP-07 integration)

Cargo.toml (workspace)              -- Phase 3 (brickos-identity member)
```

---

## 12. Open Questions

1. **NIP-46 vs NIP-07 priority:** Should Phase 1 include NIP-46 (remote signing) for mobile, or is NIP-07 (browser extension) sufficient for initial launch?

2. **Account merge policy:** When a user logs in with Google and the email matches an existing email-password account, should we auto-merge or prompt?

3. **Tier gating:** Should NOSTR login be available on the free tier, or gated to sovereign tier to preserve it as a premium differentiator?

4. **Relay infrastructure:** Does Phase 1 depend on our own relay (`wss://relay.brickos.io`), or can we use public relays for challenge relay hints?

---

*This document is the single source of truth for BrickOS identity architecture. All implementation work should reference this design and update it as decisions are made.*
