// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use chrono::Utc;
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    middleware::auth::AuthenticatedUser,
    services::{
        auth::{hash_password, verify_password},
        encryption::Encryptor,
        mfa,
    },
};

// ---------------------------------------------------------------------------
// POST /auth/mfa/setup (authenticated)
// ---------------------------------------------------------------------------

pub async fn mfa_setup(
    pool: web::Data<PgPool>,
    config: web::Data<crate::config::Config>,
    auth: AuthenticatedUser,
    enc: web::Data<Encryptor>,
) -> Result<HttpResponse, AppError> {
    // Check if MFA already enabled
    let existing: Option<bool> =
        sqlx::query_scalar("SELECT enabled FROM user_mfa WHERE user_id = $1")
            .bind(auth.user_id)
            .fetch_optional(pool.get_ref())
            .await?;

    if existing == Some(true) {
        return Ok(HttpResponse::Conflict().json(json!({
            "data": null,
            "error": { "code": "MFA_ALREADY_ENABLED", "message": "Two-factor authentication is already enabled." }
        })));
    }

    // Get user email
    let email: String = sqlx::query_scalar("SELECT email FROM users WHERE id = $1")
        .bind(auth.user_id)
        .fetch_one(pool.get_ref())
        .await?;

    // Generate TOTP secret
    let secret_base32 = mfa::generate_totp_secret();

    // Build TOTP for URI
    let totp = mfa::build_totp(&secret_base32, &email).map_err(|_| AppError::Internal)?;
    let uri = totp.get_url();

    // Generate QR SVG
    let qr_svg = mfa::generate_qr_svg(&uri).map_err(|_| AppError::Internal)?;

    // Store setup token with encrypted secret
    let setup_token = crate::services::auth::generate_verification_token();
    let encrypted_secret = enc.encrypt(&secret_base32);
    let expires_at = Utc::now() + chrono::Duration::minutes(config.mfa_setup_expiry_minutes);

    // Invalidate any previous MFA setup tokens
    sqlx::query(
        "UPDATE email_verifications SET used_at = NOW() WHERE user_id = $1 AND purpose = 'mfa_setup' AND used_at IS NULL",
    )
    .bind(auth.user_id)
    .execute(pool.get_ref())
    .await?;

    // Store "setup_token::encrypted_secret" in the token field
    sqlx::query(
        "INSERT INTO email_verifications (user_id, token, purpose, expires_at) VALUES ($1, $2, 'mfa_setup', $3)",
    )
    .bind(auth.user_id)
    .bind(format!("{}::{}", setup_token, encrypted_secret))
    .bind(expires_at)
    .execute(pool.get_ref())
    .await?;

    let display_secret = mfa::format_secret_for_display(&secret_base32);

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "setup_token": setup_token,
            "qr_svg": qr_svg,
            "secret_base32": display_secret,
            "uri": uri
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// POST /auth/mfa/verify-setup (authenticated)
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct MfaVerifySetupRequest {
    pub setup_token: String,
    pub code: String,
}

pub async fn mfa_verify_setup(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    enc: web::Data<Encryptor>,
    body: web::Json<MfaVerifySetupRequest>,
) -> Result<HttpResponse, AppError> {
    // Find setup token
    let row = sqlx::query(
        "SELECT id, token, expires_at, used_at FROM email_verifications WHERE user_id = $1 AND purpose = 'mfa_setup' AND used_at IS NULL ORDER BY created_at DESC LIMIT 1",
    )
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?;

    let row = match row {
        Some(r) => r,
        None => {
            return Ok(HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "INVALID_TOKEN", "message": "Setup session expired. Please start again." }
            })));
        }
    };

    use sqlx::Row;
    let verification_id: Uuid = row.try_get("id").map_err(|_| AppError::Internal)?;
    let stored_token: String = row.try_get("token").map_err(|_| AppError::Internal)?;
    let expires_at: chrono::DateTime<Utc> =
        row.try_get("expires_at").map_err(|_| AppError::Internal)?;

    if Utc::now() > expires_at {
        return Ok(HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": { "code": "TOKEN_EXPIRED", "message": "Setup session expired. Please start again." }
        })));
    }

    // Parse "setup_token::encrypted_secret"
    let parts: Vec<&str> = stored_token.splitn(2, "::").collect();
    if parts.len() != 2 || parts[0] != body.setup_token {
        return Ok(HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": { "code": "INVALID_TOKEN", "message": "Invalid setup token." }
        })));
    }

    let encrypted_secret = parts[1];
    let secret_base32 = enc
        .decrypt(encrypted_secret)
        .map_err(|_| AppError::Internal)?;

    // Get user email for TOTP verification
    let email: String = sqlx::query_scalar("SELECT email FROM users WHERE id = $1")
        .bind(auth.user_id)
        .fetch_one(pool.get_ref())
        .await?;

    // Verify TOTP code
    let valid =
        mfa::verify_totp(&secret_base32, &email, &body.code).map_err(|_| AppError::Internal)?;

    if !valid {
        return Ok(HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": { "code": "INVALID_CODE", "message": "Invalid code. Try again." }
        })));
    }

    // Generate recovery codes
    let recovery_codes = mfa::generate_recovery_codes();

    // Hash each recovery code with Argon2
    let mut hashed_codes: Vec<String> = Vec::with_capacity(8);
    for code in &recovery_codes {
        let normalized = code.replace('-', "");
        let hash = hash_password(&normalized)?;
        hashed_codes.push(hash);
    }

    // Encrypt the hashed codes JSON array
    let hashed_json = serde_json::to_string(&hashed_codes).map_err(|_| AppError::Internal)?;
    let encrypted_recovery = enc.encrypt(&hashed_json);

    // Re-encrypt the secret for permanent storage
    let permanent_encrypted_secret = enc.encrypt(&secret_base32);

    // Upsert into user_mfa
    sqlx::query(
        r#"INSERT INTO user_mfa (user_id, totp_secret_encrypted, enabled, verified_at, recovery_codes_encrypted)
           VALUES ($1, $2, true, NOW(), $3)
           ON CONFLICT (user_id) DO UPDATE SET
             totp_secret_encrypted = EXCLUDED.totp_secret_encrypted,
             enabled = true,
             verified_at = NOW(),
             recovery_codes_encrypted = EXCLUDED.recovery_codes_encrypted,
             updated_at = NOW()"#,
    )
    .bind(auth.user_id)
    .bind(&permanent_encrypted_secret)
    .bind(&encrypted_recovery)
    .execute(pool.get_ref())
    .await?;

    // Mark setup token as used
    sqlx::query("UPDATE email_verifications SET used_at = NOW() WHERE id = $1")
        .bind(verification_id)
        .execute(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "enabled": true,
            "recovery_codes": recovery_codes
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// POST /auth/mfa/disable (authenticated)
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct MfaDisableRequest {
    pub code: String,
}

pub async fn mfa_disable(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    enc: web::Data<Encryptor>,
    body: web::Json<MfaDisableRequest>,
) -> Result<HttpResponse, AppError> {
    // Get MFA record
    let row = sqlx::query(
        "SELECT totp_secret_encrypted, recovery_codes_encrypted FROM user_mfa WHERE user_id = $1 AND enabled = true",
    )
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?;

    let row = match row {
        Some(r) => r,
        None => {
            return Ok(HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "MFA_NOT_ENABLED", "message": "Two-factor authentication is not enabled." }
            })));
        }
    };

    use sqlx::Row;
    let encrypted_secret: String = row
        .try_get("totp_secret_encrypted")
        .map_err(|_| AppError::Internal)?;
    let recovery_encrypted: Option<String> = row.try_get("recovery_codes_encrypted").ok();

    let secret = enc
        .decrypt(&encrypted_secret)
        .map_err(|_| AppError::Internal)?;

    let email: String = sqlx::query_scalar("SELECT email FROM users WHERE id = $1")
        .bind(auth.user_id)
        .fetch_one(pool.get_ref())
        .await?;

    // Try TOTP verification first
    let totp_valid = mfa::verify_totp(&secret, &email, &body.code).unwrap_or(false);

    if !totp_valid {
        // Try as recovery code
        let recovery_valid = verify_recovery_code(&enc, recovery_encrypted.as_deref(), &body.code)?;

        if !recovery_valid {
            return Ok(HttpResponse::Unauthorized().json(json!({
                "data": null,
                "error": { "code": "INVALID_CODE", "message": "Invalid code." }
            })));
        }
    }

    // Delete MFA record
    sqlx::query("DELETE FROM user_mfa WHERE user_id = $1")
        .bind(auth.user_id)
        .execute(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "enabled": false },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// POST /auth/mfa/verify-login (Task 4)
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct MfaVerifyLoginRequest {
    pub mfa_token: String,
    #[serde(default)]
    pub code: Option<String>,
    #[serde(default)]
    pub recovery_code: Option<String>,
}

pub async fn mfa_verify_login(
    pool: web::Data<PgPool>,
    config: web::Data<crate::config::Config>,
    enc: web::Data<Encryptor>,
    body: web::Json<MfaVerifyLoginRequest>,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    // Find MFA login token
    let row = sqlx::query(
        "SELECT id, user_id, token, expires_at FROM email_verifications WHERE purpose = 'mfa_login' AND used_at IS NULL AND token LIKE $1",
    )
    .bind(format!("{}%", body.mfa_token))
    .fetch_optional(pool.get_ref())
    .await?;

    let row = match row {
        Some(r) => r,
        None => {
            return Ok(HttpResponse::Unauthorized().json(json!({
                "data": null,
                "error": { "code": "INVALID_TOKEN", "message": "Session expired. Please log in again." }
            })));
        }
    };

    let verification_id: Uuid = row.try_get("id").map_err(|_| AppError::Internal)?;
    let user_id: Uuid = row.try_get("user_id").map_err(|_| AppError::Internal)?;
    let stored_token: String = row.try_get("token").map_err(|_| AppError::Internal)?;
    let expires_at: chrono::DateTime<Utc> =
        row.try_get("expires_at").map_err(|_| AppError::Internal)?;

    if Utc::now() > expires_at {
        sqlx::query("UPDATE email_verifications SET used_at = NOW() WHERE id = $1")
            .bind(verification_id)
            .execute(pool.get_ref())
            .await?;
        return Ok(HttpResponse::Unauthorized().json(json!({
            "data": null,
            "error": { "code": "TOKEN_EXPIRED", "message": "Session expired. Please log in again." }
        })));
    }

    // Parse "mfa_token::attempts" from stored token
    let parts: Vec<&str> = stored_token.splitn(2, "::").collect();
    let attempts: i32 = if parts.len() == 2 {
        parts[1].parse().unwrap_or(0)
    } else {
        0
    };

    if attempts >= 5 {
        sqlx::query("UPDATE email_verifications SET used_at = NOW() WHERE id = $1")
            .bind(verification_id)
            .execute(pool.get_ref())
            .await?;
        return Ok(HttpResponse::Unauthorized().json(json!({
            "data": null,
            "error": { "code": "MAX_ATTEMPTS", "message": "Too many attempts. Please log in again." }
        })));
    }

    // Get MFA record
    let mfa_row = sqlx::query(
        "SELECT totp_secret_encrypted, recovery_codes_encrypted FROM user_mfa WHERE user_id = $1 AND enabled = true",
    )
    .bind(user_id)
    .fetch_optional(pool.get_ref())
    .await?;

    let mfa_row = match mfa_row {
        Some(r) => r,
        None => {
            return Ok(HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "MFA_NOT_ENABLED", "message": "MFA is not enabled for this account." }
            })));
        }
    };

    let encrypted_secret: String = mfa_row
        .try_get("totp_secret_encrypted")
        .map_err(|_| AppError::Internal)?;
    let recovery_encrypted: Option<String> = mfa_row.try_get("recovery_codes_encrypted").ok();

    let secret = enc
        .decrypt(&encrypted_secret)
        .map_err(|_| AppError::Internal)?;

    let email: String = sqlx::query_scalar("SELECT email FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_one(pool.get_ref())
        .await?;

    let mut valid = false;
    let mut used_recovery = false;
    let mut remaining_recovery_count: Option<i32> = None;

    // Check TOTP code
    if let Some(ref code) = body.code {
        valid = mfa::verify_totp(&secret, &email, code).unwrap_or(false);
    }

    // Check recovery code
    if !valid {
        if let Some(ref rc) = body.recovery_code {
            let (is_valid, remaining, updated_encrypted) =
                verify_and_consume_recovery_code(&enc, recovery_encrypted.as_deref(), rc)?;
            if is_valid {
                valid = true;
                used_recovery = true;
                remaining_recovery_count = Some(remaining);
                // Update recovery codes in DB
                if let Some(updated) = updated_encrypted {
                    sqlx::query(
                        "UPDATE user_mfa SET recovery_codes_encrypted = $1, updated_at = NOW() WHERE user_id = $2",
                    )
                    .bind(&updated)
                    .bind(user_id)
                    .execute(pool.get_ref())
                    .await?;
                }
            }
        }
    }

    if !valid {
        // Increment attempts
        let new_attempts = attempts + 1;
        let new_token = format!("{}::{}", body.mfa_token, new_attempts);
        sqlx::query("UPDATE email_verifications SET token = $1 WHERE id = $2")
            .bind(&new_token)
            .bind(verification_id)
            .execute(pool.get_ref())
            .await?;

        return Ok(HttpResponse::Unauthorized().json(json!({
            "data": null,
            "error": {
                "code": "INVALID_CODE",
                "message": "Invalid code.",
                "attempts_remaining": 5 - new_attempts
            }
        })));
    }

    // Mark token as used
    sqlx::query("UPDATE email_verifications SET used_at = NOW() WHERE id = $1")
        .bind(verification_id)
        .execute(pool.get_ref())
        .await?;

    // Issue JWT
    let user = sqlx::query_as::<_, crate::models::user::User>(
        "SELECT id, email, password_hash, display_name, role, tier, created_at FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_one(pool.get_ref())
    .await?;

    let token = crate::services::auth::create_jwt(
        &user.id.to_string(),
        &user.role,
        &user.tier,
        &config.jwt_secret,
        config.jwt_expiry_secs,
    )?;
    let refresh_token = crate::services::auth::generate_refresh_token();
    let token_hash = crate::services::auth::hash_refresh_token(&refresh_token);
    let rt_expires_at = Utc::now() + chrono::Duration::seconds(config.refresh_expiry_secs);

    sqlx::query("INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)")
        .bind(user.id)
        .bind(&token_hash)
        .bind(rt_expires_at)
        .execute(pool.get_ref())
        .await?;

    let user_response = crate::models::user::UserResponse::from(user);

    let mut response_data = json!({
        "user": user_response,
        "token": token,
        "refresh_token": refresh_token
    });

    if used_recovery {
        if let Some(remaining) = remaining_recovery_count {
            response_data["recovery_warning"] = json!(format!(
                "You used a recovery code. {} remaining. Consider regenerating your recovery codes.",
                remaining
            ));
        }
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": response_data,
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// POST /auth/mfa/regenerate-recovery (authenticated, Task 5)
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct MfaRegenerateRequest {
    pub code: String,
}

pub async fn mfa_regenerate_recovery(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    enc: web::Data<Encryptor>,
    body: web::Json<MfaRegenerateRequest>,
) -> Result<HttpResponse, AppError> {
    // Get MFA record
    let row = sqlx::query(
        "SELECT totp_secret_encrypted FROM user_mfa WHERE user_id = $1 AND enabled = true",
    )
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?;

    let row = match row {
        Some(r) => r,
        None => {
            return Ok(HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "MFA_NOT_ENABLED", "message": "Two-factor authentication is not enabled." }
            })));
        }
    };

    use sqlx::Row;
    let encrypted_secret: String = row
        .try_get("totp_secret_encrypted")
        .map_err(|_| AppError::Internal)?;
    let secret = enc
        .decrypt(&encrypted_secret)
        .map_err(|_| AppError::Internal)?;

    let email: String = sqlx::query_scalar("SELECT email FROM users WHERE id = $1")
        .bind(auth.user_id)
        .fetch_one(pool.get_ref())
        .await?;

    // Verify current TOTP code
    let valid = mfa::verify_totp(&secret, &email, &body.code).unwrap_or(false);
    if !valid {
        return Ok(HttpResponse::Unauthorized().json(json!({
            "data": null,
            "error": { "code": "INVALID_CODE", "message": "Invalid code." }
        })));
    }

    // Generate new recovery codes
    let recovery_codes = mfa::generate_recovery_codes();
    let mut hashed_codes: Vec<String> = Vec::with_capacity(8);
    for code in &recovery_codes {
        let normalized = code.replace('-', "");
        let hash = hash_password(&normalized)?;
        hashed_codes.push(hash);
    }

    let hashed_json = serde_json::to_string(&hashed_codes).map_err(|_| AppError::Internal)?;
    let encrypted_recovery = enc.encrypt(&hashed_json);

    sqlx::query(
        "UPDATE user_mfa SET recovery_codes_encrypted = $1, updated_at = NOW() WHERE user_id = $2",
    )
    .bind(&encrypted_recovery)
    .bind(auth.user_id)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "recovery_codes": recovery_codes
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// GET /auth/mfa/status (authenticated)
// ---------------------------------------------------------------------------

pub async fn mfa_status(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    let row = sqlx::query("SELECT enabled, verified_at FROM user_mfa WHERE user_id = $1")
        .bind(auth.user_id)
        .fetch_optional(pool.get_ref())
        .await?;

    let (enabled, verified_at) = match row {
        Some(r) => {
            let enabled: bool = r.try_get("enabled").unwrap_or(false);
            let verified_at: Option<chrono::DateTime<Utc>> = r.try_get("verified_at").ok();
            (enabled, verified_at)
        }
        None => (false, None),
    };

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "enabled": enabled,
            "verified_at": verified_at
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// POST /auth/change-password (authenticated, Task 7 backend)
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
    #[serde(default)]
    pub mfa_code: Option<String>,
}

pub async fn change_password(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    enc: web::Data<Encryptor>,
    body: web::Json<ChangePasswordRequest>,
) -> Result<HttpResponse, AppError> {
    // Get current user
    let user = sqlx::query_as::<_, crate::models::user::User>(
        "SELECT id, email, password_hash, display_name, role, tier, created_at FROM users WHERE id = $1",
    )
    .bind(auth.user_id)
    .fetch_one(pool.get_ref())
    .await?;

    // Verify current password
    if !verify_password(&body.current_password, &user.password_hash) {
        return Ok(HttpResponse::Unauthorized().json(json!({
            "data": null,
            "error": { "code": "INVALID_PASSWORD", "message": "Current password is incorrect." }
        })));
    }

    // Check if MFA is enabled - if so, require MFA code
    let mfa_row = sqlx::query(
        "SELECT totp_secret_encrypted FROM user_mfa WHERE user_id = $1 AND enabled = true",
    )
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?;

    if let Some(mfa_row) = mfa_row {
        use sqlx::Row;
        let mfa_code = match &body.mfa_code {
            Some(c) => c,
            None => {
                return Ok(HttpResponse::BadRequest().json(json!({
                    "data": null,
                    "error": { "code": "MFA_REQUIRED", "message": "MFA code is required to change password." }
                })));
            }
        };

        let encrypted_secret: String = mfa_row
            .try_get("totp_secret_encrypted")
            .map_err(|_| AppError::Internal)?;
        let secret = enc
            .decrypt(&encrypted_secret)
            .map_err(|_| AppError::Internal)?;

        let valid = mfa::verify_totp(&secret, &user.email, mfa_code).unwrap_or(false);
        if !valid {
            return Ok(HttpResponse::Unauthorized().json(json!({
                "data": null,
                "error": { "code": "INVALID_CODE", "message": "Invalid MFA code." }
            })));
        }
    }

    // Validate new password
    crate::services::auth::validate_password(&body.new_password)
        .map_err(|e| AppError::Validation(e.to_string()))?;

    // Hash new password
    let new_hash = hash_password(&body.new_password)?;

    // Update password
    sqlx::query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2")
        .bind(&new_hash)
        .bind(auth.user_id)
        .execute(pool.get_ref())
        .await?;

    // Revoke all refresh tokens (logout other sessions)
    sqlx::query("UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND revoked = false")
        .bind(auth.user_id)
        .execute(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "message": "Password updated successfully." },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn verify_recovery_code(
    enc: &Encryptor,
    recovery_encrypted: Option<&str>,
    code: &str,
) -> Result<bool, AppError> {
    let encrypted = match recovery_encrypted {
        Some(e) => e,
        None => return Ok(false),
    };

    let decrypted = enc.decrypt(encrypted).map_err(|_| AppError::Internal)?;
    let hashed_codes: Vec<String> =
        serde_json::from_str(&decrypted).map_err(|_| AppError::Internal)?;

    let normalized = code.replace('-', "");

    for hash in &hashed_codes {
        if hash.is_empty() {
            continue; // Already used
        }
        if verify_password(&normalized, hash) {
            return Ok(true);
        }
    }

    Ok(false)
}

fn verify_and_consume_recovery_code(
    enc: &Encryptor,
    recovery_encrypted: Option<&str>,
    code: &str,
) -> Result<(bool, i32, Option<String>), AppError> {
    let encrypted = match recovery_encrypted {
        Some(e) => e,
        None => return Ok((false, 0, None)),
    };

    let decrypted = enc.decrypt(encrypted).map_err(|_| AppError::Internal)?;
    let mut hashed_codes: Vec<String> =
        serde_json::from_str(&decrypted).map_err(|_| AppError::Internal)?;

    let normalized = code.replace('-', "");

    let mut found_index: Option<usize> = None;
    for (i, hash) in hashed_codes.iter().enumerate() {
        if hash.is_empty() {
            continue;
        }
        if verify_password(&normalized, hash) {
            found_index = Some(i);
            break;
        }
    }

    match found_index {
        Some(idx) => {
            hashed_codes[idx] = String::new(); // Mark as used
            let remaining = hashed_codes.iter().filter(|h| !h.is_empty()).count() as i32;
            let new_json = serde_json::to_string(&hashed_codes).map_err(|_| AppError::Internal)?;
            let new_encrypted = enc.encrypt(&new_json);
            Ok((true, remaining, Some(new_encrypted)))
        }
        None => Ok((false, 0, None)),
    }
}
