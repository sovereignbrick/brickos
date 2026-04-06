use actix_web::{web, HttpRequest, HttpResponse};
use serde::Deserialize;
use std::sync::Arc;

use crate::auth::{api_key, email, jwt, nostr};
use crate::config::StandaloneConfig;
use crate::db::UserStore;
use crate::models::{NewUser, UpdateUser};

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub display_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

/// Form-based login (from the web UI). Sets a cookie and redirects.
#[derive(Debug, Deserialize)]
pub struct LoginFormRequest {
    pub email: String,
    pub password: String,
}

/// Form-based register (from the web UI). Sets a cookie and redirects.
#[derive(Debug, Deserialize)]
pub struct RegisterFormRequest {
    pub email: String,
    pub password: String,
    pub display_name: Option<String>,
}

/// POST /auth/register -- Create a new user account. First user becomes admin.
pub async fn register(
    body: web::Json<RegisterRequest>,
    user_store: web::Data<Arc<dyn UserStore>>,
    config: web::Data<StandaloneConfig>,
) -> HttpResponse {
    if !config.allow_registration {
        return HttpResponse::Forbidden()
            .json(serde_json::json!({"error": "Registration is disabled"}));
    }

    // Check for existing user with this email
    match user_store.get_by_email(&body.email).await {
        Ok(Some(_)) => {
            return HttpResponse::Conflict()
                .json(serde_json::json!({"error": "Email already registered"}));
        }
        Err(e) => {
            tracing::error!("DB error checking email: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}));
        }
        Ok(None) => {}
    }

    // Validate
    if body.email.is_empty() || !body.email.contains('@') {
        return HttpResponse::BadRequest()
            .json(serde_json::json!({"error": "Invalid email address"}));
    }
    if body.password.len() < 8 {
        return HttpResponse::BadRequest()
            .json(serde_json::json!({"error": "Password must be at least 8 characters"}));
    }

    let password_hash = match email::hash_password(&body.password) {
        Ok(h) => h,
        Err(e) => {
            tracing::error!("Failed to hash password: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}));
        }
    };

    let new_user = NewUser {
        email: Some(body.email.clone()),
        password_hash: Some(password_hash),
        nostr_pubkey: None,
        display_name: body.display_name.clone(),
    };

    match user_store.create(new_user).await {
        Ok(user) => {
            let token =
                match jwt::create_token(&user.id, &config.jwt_secret, config.jwt_expiry_secs) {
                    Ok(t) => t,
                    Err(e) => {
                        tracing::error!("Failed to create JWT: {}", e);
                        return HttpResponse::InternalServerError()
                            .json(serde_json::json!({"error": "Internal error"}));
                    }
                };

            HttpResponse::Created().json(serde_json::json!({
                "token": token,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "display_name": user.display_name,
                    "is_admin": user.is_admin,
                }
            }))
        }
        Err(e) => {
            tracing::error!("Failed to create user: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

/// POST /auth/login -- Authenticate with email and password.
pub async fn login(
    body: web::Json<LoginRequest>,
    user_store: web::Data<Arc<dyn UserStore>>,
    config: web::Data<StandaloneConfig>,
) -> HttpResponse {
    let user = match user_store.get_by_email(&body.email).await {
        Ok(Some(u)) => u,
        Ok(None) => {
            return HttpResponse::Unauthorized()
                .json(serde_json::json!({"error": "Invalid email or password"}));
        }
        Err(e) => {
            tracing::error!("DB error during login: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}));
        }
    };

    let password_hash = match &user.password_hash {
        Some(h) => h,
        None => {
            return HttpResponse::Unauthorized()
                .json(serde_json::json!({"error": "Invalid email or password"}));
        }
    };

    if !email::verify_password(&body.password, password_hash) {
        return HttpResponse::Unauthorized()
            .json(serde_json::json!({"error": "Invalid email or password"}));
    }

    let token = match jwt::create_token(&user.id, &config.jwt_secret, config.jwt_expiry_secs) {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to create JWT: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}));
        }
    };

    HttpResponse::Ok().json(serde_json::json!({
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "is_admin": user.is_admin,
        }
    }))
}

/// POST /auth/refresh -- Issue a new JWT from an existing valid token.
pub async fn refresh(
    req: HttpRequest,
    user_store: web::Data<Arc<dyn UserStore>>,
    config: web::Data<StandaloneConfig>,
) -> HttpResponse {
    let token = match extract_bearer_token(&req) {
        Some(t) => t,
        None => {
            return HttpResponse::Unauthorized()
                .json(serde_json::json!({"error": "Missing or invalid Authorization header"}));
        }
    };

    let claims = match jwt::verify_token(&token, &config.jwt_secret) {
        Ok(c) => c,
        Err(_) => {
            return HttpResponse::Unauthorized()
                .json(serde_json::json!({"error": "Invalid or expired token"}));
        }
    };

    // Verify user still exists
    match user_store.get_by_id(&claims.sub).await {
        Ok(Some(user)) => {
            let new_token =
                match jwt::create_token(&user.id, &config.jwt_secret, config.jwt_expiry_secs) {
                    Ok(t) => t,
                    Err(e) => {
                        tracing::error!("Failed to create JWT: {}", e);
                        return HttpResponse::InternalServerError()
                            .json(serde_json::json!({"error": "Internal error"}));
                    }
                };

            HttpResponse::Ok().json(serde_json::json!({
                "token": new_token,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "display_name": user.display_name,
                    "is_admin": user.is_admin,
                }
            }))
        }
        Ok(None) => {
            HttpResponse::Unauthorized().json(serde_json::json!({"error": "User no longer exists"}))
        }
        Err(e) => {
            tracing::error!("DB error during refresh: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

/// POST /auth/nostr -- Authenticate with a NIP-98 signed event.
pub async fn nostr_login(
    body: web::Json<nostr::Nip98AuthRequest>,
    config: web::Data<StandaloneConfig>,
    user_store: web::Data<Arc<dyn UserStore>>,
) -> HttpResponse {
    if !config.nostr_enabled {
        return HttpResponse::BadRequest()
            .json(serde_json::json!({"error": "NOSTR authentication is disabled"}));
    }

    let expected_url = format!("{}/auth/nostr", config.base_url);
    if let Err(e) = nostr::verify_nip98_event(&body.event, &expected_url) {
        return HttpResponse::BadRequest().json(serde_json::json!({"error": e}));
    }

    let pubkey = &body.event.pubkey;

    let (user, created) = match user_store.get_by_nostr_pubkey(pubkey).await {
        Ok(Some(u)) => (u, false),
        Ok(None) => {
            // Auto-create user on first NOSTR login
            let display = format!("nostr:{}", &pubkey[..8.min(pubkey.len())]);
            let new_user = NewUser {
                email: None,
                password_hash: None,
                nostr_pubkey: Some(pubkey.clone()),
                display_name: Some(display),
            };
            match user_store.create(new_user).await {
                Ok(u) => (u, true),
                Err(e) => {
                    tracing::error!("Failed to create NOSTR user: {}", e);
                    return HttpResponse::InternalServerError()
                        .json(serde_json::json!({"error": "Internal error"}));
                }
            }
        }
        Err(e) => {
            tracing::error!("DB error during NOSTR login: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}));
        }
    };

    let token = match jwt::create_token(&user.id, &config.jwt_secret, config.jwt_expiry_secs) {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to create JWT: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}));
        }
    };

    HttpResponse::Ok().json(serde_json::json!({
        "token": token,
        "user": {
            "id": user.id,
            "display_name": user.display_name,
            "nostr_pubkey": user.nostr_pubkey,
            "is_admin": user.is_admin,
        },
        "created": created,
    }))
}

/// POST /api/v1/me/api-key -- Generate a new API key for the authenticated user.
/// Requires JWT auth. Returns the raw key ONCE; only the hash is stored.
pub async fn generate_user_api_key(
    req: HttpRequest,
    user_store: web::Data<Arc<dyn UserStore>>,
    config: web::Data<StandaloneConfig>,
) -> HttpResponse {
    let token = match extract_bearer_token(&req) {
        Some(t) => t,
        None => {
            return HttpResponse::Unauthorized()
                .json(serde_json::json!({"error": "Missing or invalid Authorization header"}));
        }
    };

    let claims = match jwt::verify_token(&token, &config.jwt_secret) {
        Ok(c) => c,
        Err(_) => {
            return HttpResponse::Unauthorized()
                .json(serde_json::json!({"error": "Invalid or expired token"}));
        }
    };

    let raw_key = api_key::generate_api_key();
    let key_hash = api_key::hash_api_key(&raw_key);

    match user_store
        .update(
            &claims.sub,
            UpdateUser {
                display_name: None,
                password_hash: None,
                api_key_hash: Some(key_hash),
            },
        )
        .await
    {
        Ok(Some(_)) => HttpResponse::Ok().json(serde_json::json!({
            "api_key": raw_key,
            "warning": "Store this key securely. It will not be shown again.",
        })),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({"error": "User not found"})),
        Err(e) => {
            tracing::error!("Failed to store API key: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

/// Authenticate a request by trying JWT first, then API key.
/// Returns the user ID on success.
pub async fn authenticate_request(
    req: &HttpRequest,
    config: &StandaloneConfig,
    user_store: &Arc<dyn UserStore>,
) -> Option<String> {
    let token = extract_bearer_token(req)?;

    // Try JWT first
    if let Ok(claims) = jwt::verify_token(&token, &config.jwt_secret) {
        return Some(claims.sub);
    }

    // Try API key
    let key_hash = api_key::hash_api_key(&token);
    if let Ok(Some(user)) = user_store.get_by_api_key_hash(&key_hash).await {
        return Some(user.id);
    }

    None
}

/// POST /auth/login/form -- Form-based login. Sets cookie and redirects.
pub async fn login_form(
    body: web::Form<LoginFormRequest>,
    user_store: web::Data<Arc<dyn UserStore>>,
    config: web::Data<StandaloneConfig>,
) -> HttpResponse {
    let user = match user_store.get_by_email(&body.email).await {
        Ok(Some(u)) => u,
        Ok(None) | Err(_) => {
            return HttpResponse::SeeOther()
                .insert_header(("Location", "/login?error=invalid"))
                .finish();
        }
    };

    let password_hash = match &user.password_hash {
        Some(h) => h,
        None => {
            return HttpResponse::SeeOther()
                .insert_header(("Location", "/login?error=invalid"))
                .finish();
        }
    };

    if !email::verify_password(&body.password, password_hash) {
        return HttpResponse::SeeOther()
            .insert_header(("Location", "/login?error=invalid"))
            .finish();
    }

    let token = match jwt::create_token(&user.id, &config.jwt_secret, config.jwt_expiry_secs) {
        Ok(t) => t,
        Err(_) => {
            return HttpResponse::SeeOther()
                .insert_header(("Location", "/login?error=internal"))
                .finish();
        }
    };

    HttpResponse::SeeOther()
        .insert_header(("Location", "/dashboard"))
        .insert_header((
            "Set-Cookie",
            format!("auth_token={}; Path=/; HttpOnly; SameSite=Strict", token),
        ))
        .finish()
}

/// POST /auth/register/form -- Form-based registration. Sets cookie and redirects.
pub async fn register_form(
    body: web::Form<RegisterFormRequest>,
    user_store: web::Data<Arc<dyn UserStore>>,
    config: web::Data<StandaloneConfig>,
) -> HttpResponse {
    if !config.allow_registration {
        return HttpResponse::SeeOther()
            .insert_header(("Location", "/register?error=disabled"))
            .finish();
    }

    if body.email.is_empty() || !body.email.contains('@') {
        return HttpResponse::SeeOther()
            .insert_header(("Location", "/register?error=invalid_email"))
            .finish();
    }
    if body.password.len() < 8 {
        return HttpResponse::SeeOther()
            .insert_header(("Location", "/register?error=short_password"))
            .finish();
    }

    // Check existing
    if let Ok(Some(_)) = user_store.get_by_email(&body.email).await {
        return HttpResponse::SeeOther()
            .insert_header(("Location", "/register?error=exists"))
            .finish();
    }

    let password_hash = match email::hash_password(&body.password) {
        Ok(h) => h,
        Err(_) => {
            return HttpResponse::SeeOther()
                .insert_header(("Location", "/register?error=internal"))
                .finish();
        }
    };

    let new_user = NewUser {
        email: Some(body.email.clone()),
        password_hash: Some(password_hash),
        nostr_pubkey: None,
        display_name: body.display_name.clone(),
    };

    match user_store.create(new_user).await {
        Ok(user) => {
            let token =
                match jwt::create_token(&user.id, &config.jwt_secret, config.jwt_expiry_secs) {
                    Ok(t) => t,
                    Err(_) => {
                        return HttpResponse::SeeOther()
                            .insert_header(("Location", "/login"))
                            .finish();
                    }
                };

            HttpResponse::SeeOther()
                .insert_header(("Location", "/dashboard"))
                .insert_header((
                    "Set-Cookie",
                    format!("auth_token={}; Path=/; HttpOnly; SameSite=Strict", token),
                ))
                .finish()
        }
        Err(_) => HttpResponse::SeeOther()
            .insert_header(("Location", "/register?error=internal"))
            .finish(),
    }
}

/// POST /api/v1/me/link-nostr -- Link a NOSTR key to an existing account.
pub async fn link_nostr_account(
    req: HttpRequest,
    body: web::Json<nostr::Nip98AuthRequest>,
    config: web::Data<StandaloneConfig>,
    user_store: web::Data<Arc<dyn crate::db::UserStore>>,
) -> HttpResponse {
    if !config.nostr_enabled {
        return HttpResponse::BadRequest()
            .json(serde_json::json!({"error": "NOSTR authentication is disabled"}));
    }

    let token = match extract_bearer_token(&req) {
        Some(t) => t,
        None => {
            return HttpResponse::Unauthorized()
                .json(serde_json::json!({"error": "Missing Authorization header"}));
        }
    };

    let claims = match jwt::verify_token(&token, &config.jwt_secret) {
        Ok(c) => c,
        Err(_) => {
            return HttpResponse::Unauthorized()
                .json(serde_json::json!({"error": "Invalid or expired token"}));
        }
    };

    let expected_url = format!("{}/api/v1/me/link-nostr", config.base_url);
    if let Err(e) = nostr::verify_nip98_event(&body.event, &expected_url) {
        return HttpResponse::BadRequest().json(serde_json::json!({"error": e}));
    }

    let pubkey = &body.event.pubkey;

    // Check if this pubkey is already used by another account
    if let Ok(Some(existing)) = user_store.get_by_nostr_pubkey(pubkey).await {
        if existing.id != claims.sub {
            return HttpResponse::Conflict().json(
                serde_json::json!({"error": "This NOSTR key is already linked to another account"}),
            );
        }
        // Already linked to this account
        return HttpResponse::Ok()
            .json(serde_json::json!({"linked": true, "already_linked": true}));
    }

    match user_store.link_nostr(&claims.sub, pubkey).await {
        Ok(()) => HttpResponse::Ok().json(serde_json::json!({"linked": true})),
        Err(e) => {
            tracing::error!("Failed to link NOSTR key: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct LinkEmailRequest {
    pub email: String,
    pub password: String,
}

/// POST /api/v1/me/link-email -- Link email+password to an existing (NOSTR-only) account.
pub async fn link_email_account(
    req: HttpRequest,
    body: web::Json<LinkEmailRequest>,
    config: web::Data<StandaloneConfig>,
    user_store: web::Data<Arc<dyn crate::db::UserStore>>,
) -> HttpResponse {
    let token = match extract_bearer_token(&req) {
        Some(t) => t,
        None => {
            return HttpResponse::Unauthorized()
                .json(serde_json::json!({"error": "Missing Authorization header"}));
        }
    };

    let claims = match jwt::verify_token(&token, &config.jwt_secret) {
        Ok(c) => c,
        Err(_) => {
            return HttpResponse::Unauthorized()
                .json(serde_json::json!({"error": "Invalid or expired token"}));
        }
    };

    // Validate email
    let email = body.email.trim().to_lowercase();
    if email.is_empty() || !email.contains('@') {
        return HttpResponse::BadRequest()
            .json(serde_json::json!({"error": "Invalid email address"}));
    }
    if body.password.len() < 8 {
        return HttpResponse::BadRequest()
            .json(serde_json::json!({"error": "Password must be at least 8 characters"}));
    }

    // Check if email is already used
    if let Ok(Some(existing)) = user_store.get_by_email(&email).await {
        if existing.id != claims.sub {
            return HttpResponse::Conflict().json(
                serde_json::json!({"error": "This email is already used by another account"}),
            );
        }
        return HttpResponse::Ok()
            .json(serde_json::json!({"linked": true, "already_linked": true}));
    }

    let password_hash = match email::hash_password(&body.password) {
        Ok(h) => h,
        Err(e) => {
            tracing::error!("Failed to hash password: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}));
        }
    };

    match user_store
        .link_email(&claims.sub, &email, &password_hash)
        .await
    {
        Ok(()) => HttpResponse::Ok().json(serde_json::json!({"linked": true})),
        Err(e) => {
            tracing::error!("Failed to link email: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

/// DELETE /api/v1/me/api-key -- Revoke the user's API key.
pub async fn revoke_user_api_key(
    req: HttpRequest,
    user_store: web::Data<Arc<dyn crate::db::UserStore>>,
    config: web::Data<StandaloneConfig>,
) -> HttpResponse {
    let token = match extract_bearer_token(&req) {
        Some(t) => t,
        None => {
            return HttpResponse::Unauthorized()
                .json(serde_json::json!({"error": "Missing Authorization header"}));
        }
    };

    let claims = match jwt::verify_token(&token, &config.jwt_secret) {
        Ok(c) => c,
        Err(_) => {
            return HttpResponse::Unauthorized()
                .json(serde_json::json!({"error": "Invalid or expired token"}));
        }
    };

    // Set api_key_hash to empty string to clear it, then we need a way to set None.
    // We'll use UpdateUser with a special sentinel. Actually, let's just set it to empty.
    // But our UpdateUser only sets when Some. We need to handle this.
    // For simplicity, let's add a dedicated revoke that sets api_key_hash = NULL.
    match user_store
        .update(
            &claims.sub,
            UpdateUser {
                display_name: None,
                password_hash: None,
                api_key_hash: Some(String::new()), // Empty string signals revoke
            },
        )
        .await
    {
        Ok(Some(_)) => HttpResponse::Ok().json(serde_json::json!({"revoked": true})),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({"error": "User not found"})),
        Err(e) => {
            tracing::error!("Failed to revoke API key: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

/// Extract Bearer token from Authorization header.
fn extract_bearer_token(req: &HttpRequest) -> Option<String> {
    let header = req.headers().get("Authorization")?.to_str().ok()?;
    let token = header.strip_prefix("Bearer ")?;
    Some(token.to_string())
}
