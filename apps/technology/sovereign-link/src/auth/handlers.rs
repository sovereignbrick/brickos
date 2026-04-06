use actix_web::{web, HttpRequest, HttpResponse};
use serde::Deserialize;
use std::sync::Arc;

use crate::auth::{email, jwt};
use crate::config::StandaloneConfig;
use crate::db::UserStore;
use crate::models::NewUser;

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
            let token = match jwt::create_token(&user.id, &config.jwt_secret, config.jwt_expiry_secs) {
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
            HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}))
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
        Ok(None) => HttpResponse::Unauthorized()
            .json(serde_json::json!({"error": "User no longer exists"})),
        Err(e) => {
            tracing::error!("DB error during refresh: {}", e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

/// Extract Bearer token from Authorization header.
fn extract_bearer_token(req: &HttpRequest) -> Option<String> {
    let header = req.headers().get("Authorization")?.to_str().ok()?;
    let token = header.strip_prefix("Bearer ")?;
    Some(token.to_string())
}
