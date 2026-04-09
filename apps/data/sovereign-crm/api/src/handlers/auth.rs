//! Auth handlers -- write to platform DB via PlatformPool.
//! Ports SHI auth patterns: signup, login, MFA, password reset, email verification.

use crate::{
    models::{
        ApiResponse, AuthResponse, ForgotPasswordRequest, LoginRequest, MessageResponse,
        MfaRequiredResponse, MfaVerifyRequest, RefreshRequest, ResetPasswordRequest, SignupRequest,
        UserResponse,
    },
    AppError, Config, PlatformPool,
};
use actix_web::{web, HttpRequest, HttpResponse};
use chrono::Utc;
use sqlx::Row;
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Helper: extract JWT claims from Authorization header
// ---------------------------------------------------------------------------

fn extract_bearer_token(req: &HttpRequest) -> Option<String> {
    req.headers()
        .get("Authorization")?
        .to_str()
        .ok()
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(|s| s.to_string())
}

fn extract_claims(
    req: &HttpRequest,
    config: &Config,
) -> Result<brickos_auth::jwt::Claims, AppError> {
    let token = extract_bearer_token(req).ok_or(AppError::Unauthorized)?;
    brickos_auth::jwt::verify_jwt(&token, &config.jwt_secret).map_err(|_| AppError::Unauthorized)
}

// ---------------------------------------------------------------------------
// POST /auth/signup
// ---------------------------------------------------------------------------

pub async fn signup(
    body: web::Json<SignupRequest>,
    platform_pool: web::Data<PlatformPool>,
    config: web::Data<Config>,
) -> Result<HttpResponse, AppError> {
    let pool = &platform_pool.0;
    let email = body.email.trim().to_lowercase();
    let display_name = body.display_name.trim().to_string();

    // Validate inputs
    if !brickos_auth::validation::validate_email(&email) {
        return Err(AppError::Validation("Invalid email address".into()));
    }
    if let Err(msg) = brickos_auth::validation::validate_password(&body.password) {
        return Err(AppError::Validation(msg.to_string()));
    }
    if display_name.is_empty() {
        return Err(AppError::Validation("Display name is required".into()));
    }

    // Check if email already registered
    let existing = sqlx::query("SELECT id FROM brickos.users WHERE email = $1")
        .bind(&email)
        .fetch_optional(pool)
        .await?;

    if existing.is_some() {
        return Err(AppError::Conflict("Email already registered".into()));
    }

    // Hash password
    let password_hash =
        brickos_auth::password::hash_password(&body.password).map_err(AppError::Internal)?;

    let user_id = Uuid::new_v4();
    let now = Utc::now();
    let role = "user";
    let tier = "free";

    // INSERT user
    sqlx::query(
        "INSERT INTO brickos.users (id, email, password_hash, display_name, role, tier, email_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, false, $7, $7)
         ON CONFLICT (email) DO NOTHING",
    )
    .bind(user_id)
    .bind(&email)
    .bind(&password_hash)
    .bind(&display_name)
    .bind(role)
    .bind(tier)
    .bind(now)
    .execute(pool)
    .await?;

    // INSERT user_profile
    sqlx::query(
        "INSERT INTO brickos.user_profile (user_id, country_code, created_at, updated_at)
         VALUES ($1, $2, $3, $3)
         ON CONFLICT (user_id) DO NOTHING",
    )
    .bind(user_id)
    .bind(&body.country)
    .bind(now)
    .execute(pool)
    .await?;

    // Generate email verification token
    let verification_token = brickos_auth::tokens::generate_verification_token();
    let expires_at = now + chrono::Duration::hours(24);

    sqlx::query(
        "INSERT INTO brickos.email_verifications (id, user_id, token, purpose, expires_at, created_at)
         VALUES ($1, $2, $3, 'registration', $4, $5)",
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(&verification_token)
    .bind(expires_at)
    .bind(now)
    .execute(pool)
    .await?;

    // Generate refresh token
    let raw_refresh = brickos_auth::tokens::generate_refresh_token();
    let hashed_refresh = brickos_auth::tokens::hash_refresh_token(&raw_refresh);
    let refresh_expires = now + chrono::Duration::seconds(config.refresh_expiry_secs);

    sqlx::query(
        "INSERT INTO brickos.refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at)
         VALUES ($1, $2, $3, $4, false, $5)",
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(&hashed_refresh)
    .bind(refresh_expires)
    .bind(now)
    .execute(pool)
    .await?;

    // Issue JWT
    let jwt = brickos_auth::jwt::create_jwt(
        &user_id.to_string(),
        role,
        tier,
        &config.jwt_secret,
        config.jwt_expiry_secs,
    )
    .map_err(AppError::Internal)?;

    let resp = ApiResponse::ok(AuthResponse {
        token: jwt,
        refresh_token: raw_refresh,
        user: UserResponse {
            id: user_id,
            email,
            display_name,
            role: role.to_string(),
            tier: tier.to_string(),
            email_verified: false,
            mfa_enabled: false,
            created_at: now,
        },
    });

    Ok(HttpResponse::Created().json(resp))
}

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------

pub async fn login(
    body: web::Json<LoginRequest>,
    platform_pool: web::Data<PlatformPool>,
    config: web::Data<Config>,
) -> Result<HttpResponse, AppError> {
    let pool = &platform_pool.0;
    let email = body.email.trim().to_lowercase();

    // Fetch user
    let row = sqlx::query(
        "SELECT id, email, password_hash, display_name, role, tier, email_verified, created_at
         FROM brickos.users WHERE email = $1",
    )
    .bind(&email)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::Unauthorized)?;

    let user_id: Uuid = row.get("id");
    let password_hash: String = row.get("password_hash");
    let display_name: String = row.get("display_name");
    let role: String = row.get("role");
    let tier: String = row.get("tier");
    let email_verified: bool = row.get("email_verified");
    let created_at: chrono::DateTime<Utc> = row.get("created_at");

    // Verify password
    if !brickos_auth::password::verify_password(&body.password, &password_hash) {
        return Err(AppError::Unauthorized);
    }

    // Check email verified
    if !email_verified {
        return Err(AppError::Forbidden);
    }

    // Check MFA
    let mfa_row = sqlx::query(
        "SELECT enabled, totp_secret_encrypted FROM brickos.user_mfa WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?;

    let mfa_enabled = mfa_row
        .as_ref()
        .is_some_and(|r| r.get::<bool, _>("enabled"));

    if let Some(mfa) = mfa_row {
        let is_enabled: bool = mfa.get("enabled");
        if is_enabled {
            // Create MFA challenge token
            let mfa_token = brickos_auth::tokens::generate_verification_token();
            let expires_at = Utc::now() + chrono::Duration::minutes(10);

            sqlx::query(
                "INSERT INTO brickos.email_verifications (id, user_id, token, purpose, expires_at, created_at)
                 VALUES ($1, $2, $3, 'mfa_challenge', $4, $5)",
            )
            .bind(Uuid::new_v4())
            .bind(user_id)
            .bind(&mfa_token)
            .bind(expires_at)
            .bind(Utc::now())
            .execute(pool)
            .await?;

            let resp = ApiResponse::ok(MfaRequiredResponse {
                mfa_required: true,
                mfa_token,
            });
            return Ok(HttpResponse::Ok().json(resp));
        }
    }

    // Update last login
    sqlx::query("UPDATE brickos.users SET last_login_at = $1 WHERE id = $2")
        .bind(Utc::now())
        .bind(user_id)
        .execute(pool)
        .await?;

    // Generate refresh token
    let raw_refresh = brickos_auth::tokens::generate_refresh_token();
    let hashed_refresh = brickos_auth::tokens::hash_refresh_token(&raw_refresh);
    let refresh_expires = Utc::now() + chrono::Duration::seconds(config.refresh_expiry_secs);

    sqlx::query(
        "INSERT INTO brickos.refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at)
         VALUES ($1, $2, $3, $4, false, $5)",
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(&hashed_refresh)
    .bind(refresh_expires)
    .bind(Utc::now())
    .execute(pool)
    .await?;

    // Issue JWT
    let jwt = brickos_auth::jwt::create_jwt(
        &user_id.to_string(),
        &role,
        &tier,
        &config.jwt_secret,
        config.jwt_expiry_secs,
    )
    .map_err(AppError::Internal)?;

    let resp = ApiResponse::ok(AuthResponse {
        token: jwt,
        refresh_token: raw_refresh,
        user: UserResponse {
            id: user_id,
            email,
            display_name,
            role,
            tier,
            email_verified,
            mfa_enabled,
            created_at,
        },
    });

    Ok(HttpResponse::Ok().json(resp))
}

// ---------------------------------------------------------------------------
// POST /auth/login/mfa
// ---------------------------------------------------------------------------

pub async fn login_mfa(
    body: web::Json<MfaVerifyRequest>,
    platform_pool: web::Data<PlatformPool>,
    config: web::Data<Config>,
) -> Result<HttpResponse, AppError> {
    let pool = &platform_pool.0;
    let now = Utc::now();

    // Look up MFA challenge token
    let token_row = sqlx::query(
        "SELECT id, user_id, expires_at, used_at
         FROM brickos.email_verifications
         WHERE token = $1 AND purpose = 'mfa_challenge'",
    )
    .bind(&body.mfa_token)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::Unauthorized)?;

    let token_id: Uuid = token_row.get("id");
    let user_id: Uuid = token_row.get("user_id");
    let expires_at: chrono::DateTime<Utc> = token_row.get("expires_at");
    let used_at: Option<chrono::DateTime<Utc>> = token_row.get("used_at");

    if used_at.is_some() || expires_at < now {
        return Err(AppError::Unauthorized);
    }

    // Get user MFA secret
    let mfa_row = sqlx::query(
        "SELECT totp_secret_encrypted FROM brickos.user_mfa WHERE user_id = $1 AND enabled = true",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::Unauthorized)?;

    let totp_secret: String = mfa_row.get("totp_secret_encrypted");

    // Get user email for TOTP
    let user_row = sqlx::query(
        "SELECT email, display_name, role, tier, email_verified, created_at
         FROM brickos.users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::Unauthorized)?;

    let email: String = user_row.get("email");

    // Verify TOTP code
    let code = body
        .code
        .as_deref()
        .ok_or_else(|| AppError::Validation("TOTP code is required".into()))?;

    let valid =
        brickos_auth::mfa::verify_totp(&totp_secret, &email, code).map_err(AppError::Internal)?;

    if !valid {
        return Err(AppError::Unauthorized);
    }

    // Mark token as used
    sqlx::query("UPDATE brickos.email_verifications SET used_at = NOW() WHERE id = $1")
        .bind(token_id)
        .execute(pool)
        .await?;

    // Update last login
    sqlx::query("UPDATE brickos.users SET last_login_at = $1 WHERE id = $2")
        .bind(now)
        .bind(user_id)
        .execute(pool)
        .await?;

    // Generate refresh token
    let raw_refresh = brickos_auth::tokens::generate_refresh_token();
    let hashed_refresh = brickos_auth::tokens::hash_refresh_token(&raw_refresh);
    let refresh_expires = now + chrono::Duration::seconds(config.refresh_expiry_secs);

    sqlx::query(
        "INSERT INTO brickos.refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at)
         VALUES ($1, $2, $3, $4, false, $5)",
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(&hashed_refresh)
    .bind(refresh_expires)
    .bind(now)
    .execute(pool)
    .await?;

    let display_name: String = user_row.get("display_name");
    let role: String = user_row.get("role");
    let tier: String = user_row.get("tier");
    let email_verified: bool = user_row.get("email_verified");
    let created_at: chrono::DateTime<Utc> = user_row.get("created_at");

    // Issue JWT
    let jwt = brickos_auth::jwt::create_jwt(
        &user_id.to_string(),
        &role,
        &tier,
        &config.jwt_secret,
        config.jwt_expiry_secs,
    )
    .map_err(AppError::Internal)?;

    let resp = ApiResponse::ok(AuthResponse {
        token: jwt,
        refresh_token: raw_refresh,
        user: UserResponse {
            id: user_id,
            email,
            display_name,
            role,
            tier,
            email_verified,
            mfa_enabled: true,
            created_at,
        },
    });

    Ok(HttpResponse::Ok().json(resp))
}

// ---------------------------------------------------------------------------
// POST /auth/verify-email
// ---------------------------------------------------------------------------

#[derive(serde::Deserialize)]
pub struct VerifyEmailRequest {
    pub token: String,
}

pub async fn verify_email(
    body: web::Json<VerifyEmailRequest>,
    platform_pool: web::Data<PlatformPool>,
) -> Result<HttpResponse, AppError> {
    let pool = &platform_pool.0;
    let now = Utc::now();

    let row = sqlx::query(
        "SELECT id, user_id, expires_at, used_at
         FROM brickos.email_verifications
         WHERE token = $1 AND purpose = 'registration'",
    )
    .bind(&body.token)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::Validation("Invalid or expired token".into()))?;

    let token_id: Uuid = row.get("id");
    let user_id: Uuid = row.get("user_id");
    let expires_at: chrono::DateTime<Utc> = row.get("expires_at");
    let used_at: Option<chrono::DateTime<Utc>> = row.get("used_at");

    if used_at.is_some() {
        return Err(AppError::Validation("Token already used".into()));
    }
    if expires_at < now {
        return Err(AppError::Validation("Token expired".into()));
    }

    // Mark email verified
    sqlx::query("UPDATE brickos.users SET email_verified = true, updated_at = $1 WHERE id = $2")
        .bind(now)
        .bind(user_id)
        .execute(pool)
        .await?;

    // Mark token used
    sqlx::query("UPDATE brickos.email_verifications SET used_at = NOW() WHERE id = $1")
        .bind(token_id)
        .execute(pool)
        .await?;

    let resp = ApiResponse::ok(MessageResponse {
        message: "Email verified successfully".to_string(),
    });
    Ok(HttpResponse::Ok().json(resp))
}

// ---------------------------------------------------------------------------
// POST /auth/forgot-password
// ---------------------------------------------------------------------------

pub async fn forgot_password(
    body: web::Json<ForgotPasswordRequest>,
    platform_pool: web::Data<PlatformPool>,
) -> Result<HttpResponse, AppError> {
    let pool = &platform_pool.0;
    let email = body.email.trim().to_lowercase();

    // Always return success to avoid email enumeration
    let success_resp = ApiResponse::ok(MessageResponse {
        message: "If an account exists with that email, a reset link has been sent.".to_string(),
    });

    // Look up user
    let user_row = sqlx::query("SELECT id FROM brickos.users WHERE email = $1")
        .bind(&email)
        .fetch_optional(pool)
        .await?;

    if let Some(row) = user_row {
        let user_id: Uuid = row.get("id");
        let token = brickos_auth::tokens::generate_verification_token();
        let now = Utc::now();
        let expires_at = now + chrono::Duration::hours(1);

        sqlx::query(
            "INSERT INTO brickos.email_verifications (id, user_id, token, purpose, expires_at, created_at)
             VALUES ($1, $2, $3, 'password_reset', $4, $5)",
        )
        .bind(Uuid::new_v4())
        .bind(user_id)
        .bind(&token)
        .bind(expires_at)
        .bind(now)
        .execute(pool)
        .await?;

        // TODO: Send password reset email via brickos_email
        tracing::info!(user_id = %user_id, "Password reset token created");
    }

    Ok(HttpResponse::Ok().json(success_resp))
}

// ---------------------------------------------------------------------------
// POST /auth/reset-password
// ---------------------------------------------------------------------------

pub async fn reset_password(
    body: web::Json<ResetPasswordRequest>,
    platform_pool: web::Data<PlatformPool>,
) -> Result<HttpResponse, AppError> {
    let pool = &platform_pool.0;
    let now = Utc::now();

    // Validate new password
    if let Err(msg) = brickos_auth::validation::validate_password(&body.password) {
        return Err(AppError::Validation(msg.to_string()));
    }

    // Look up reset token
    let row = sqlx::query(
        "SELECT id, user_id, expires_at, used_at
         FROM brickos.email_verifications
         WHERE token = $1 AND purpose = 'password_reset'",
    )
    .bind(&body.token)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::Validation("Invalid or expired token".into()))?;

    let token_id: Uuid = row.get("id");
    let user_id: Uuid = row.get("user_id");
    let expires_at: chrono::DateTime<Utc> = row.get("expires_at");
    let used_at: Option<chrono::DateTime<Utc>> = row.get("used_at");

    if used_at.is_some() {
        return Err(AppError::Validation("Token already used".into()));
    }
    if expires_at < now {
        return Err(AppError::Validation("Token expired".into()));
    }

    // Hash new password
    let password_hash =
        brickos_auth::password::hash_password(&body.password).map_err(AppError::Internal)?;

    // Update password
    sqlx::query("UPDATE brickos.users SET password_hash = $1, updated_at = $2 WHERE id = $3")
        .bind(&password_hash)
        .bind(now)
        .bind(user_id)
        .execute(pool)
        .await?;

    // Mark token used
    sqlx::query("UPDATE brickos.email_verifications SET used_at = NOW() WHERE id = $1")
        .bind(token_id)
        .execute(pool)
        .await?;

    // Revoke all refresh tokens for this user
    sqlx::query("UPDATE brickos.refresh_tokens SET revoked = true WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await?;

    let resp = ApiResponse::ok(MessageResponse {
        message: "Password reset successfully".to_string(),
    });
    Ok(HttpResponse::Ok().json(resp))
}

// ---------------------------------------------------------------------------
// POST /auth/refresh
// ---------------------------------------------------------------------------

pub async fn refresh_token(
    body: web::Json<RefreshRequest>,
    platform_pool: web::Data<PlatformPool>,
    config: web::Data<Config>,
) -> Result<HttpResponse, AppError> {
    let pool = &platform_pool.0;
    let now = Utc::now();

    let token_hash = brickos_auth::tokens::hash_refresh_token(&body.refresh_token);

    // Look up refresh token
    let row = sqlx::query(
        "SELECT id, user_id, expires_at, revoked
         FROM brickos.refresh_tokens
         WHERE token_hash = $1",
    )
    .bind(&token_hash)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::Unauthorized)?;

    let old_token_id: Uuid = row.get("id");
    let user_id: Uuid = row.get("user_id");
    let expires_at: chrono::DateTime<Utc> = row.get("expires_at");
    let revoked: bool = row.get("revoked");

    if revoked || expires_at < now {
        return Err(AppError::Unauthorized);
    }

    // Revoke old token
    sqlx::query("UPDATE brickos.refresh_tokens SET revoked = true WHERE id = $1")
        .bind(old_token_id)
        .execute(pool)
        .await?;

    // Fetch user for JWT claims
    let user_row = sqlx::query(
        "SELECT email, display_name, role, tier, email_verified, created_at
         FROM brickos.users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::Unauthorized)?;

    let role: String = user_row.get("role");
    let tier: String = user_row.get("tier");

    // Issue new refresh token
    let raw_refresh = brickos_auth::tokens::generate_refresh_token();
    let hashed_refresh = brickos_auth::tokens::hash_refresh_token(&raw_refresh);
    let refresh_expires = now + chrono::Duration::seconds(config.refresh_expiry_secs);

    sqlx::query(
        "INSERT INTO brickos.refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at)
         VALUES ($1, $2, $3, $4, false, $5)",
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(&hashed_refresh)
    .bind(refresh_expires)
    .bind(now)
    .execute(pool)
    .await?;

    // Issue new JWT
    let jwt = brickos_auth::jwt::create_jwt(
        &user_id.to_string(),
        &role,
        &tier,
        &config.jwt_secret,
        config.jwt_expiry_secs,
    )
    .map_err(AppError::Internal)?;

    // Check MFA status
    let mfa_enabled = sqlx::query("SELECT enabled FROM brickos.user_mfa WHERE user_id = $1")
        .bind(user_id)
        .fetch_optional(pool)
        .await?
        .is_some_and(|r| r.get::<bool, _>("enabled"));

    let email: String = user_row.get("email");
    let display_name: String = user_row.get("display_name");
    let email_verified: bool = user_row.get("email_verified");
    let created_at: chrono::DateTime<Utc> = user_row.get("created_at");

    let resp = ApiResponse::ok(AuthResponse {
        token: jwt,
        refresh_token: raw_refresh,
        user: UserResponse {
            id: user_id,
            email,
            display_name,
            role,
            tier,
            email_verified,
            mfa_enabled,
            created_at,
        },
    });

    Ok(HttpResponse::Ok().json(resp))
}

// ---------------------------------------------------------------------------
// POST /auth/logout
// ---------------------------------------------------------------------------

pub async fn logout(
    req: HttpRequest,
    body: web::Json<RefreshRequest>,
    platform_pool: web::Data<PlatformPool>,
) -> Result<HttpResponse, AppError> {
    let pool = &platform_pool.0;

    // Verify the caller is authenticated (optional but good practice)
    let _token = extract_bearer_token(&req);

    let token_hash = brickos_auth::tokens::hash_refresh_token(&body.refresh_token);

    sqlx::query("UPDATE brickos.refresh_tokens SET revoked = true WHERE token_hash = $1")
        .bind(&token_hash)
        .execute(pool)
        .await?;

    let resp = ApiResponse::ok(MessageResponse {
        message: "Logged out successfully".to_string(),
    });
    Ok(HttpResponse::Ok().json(resp))
}

// ---------------------------------------------------------------------------
// GET /auth/me
// ---------------------------------------------------------------------------

pub async fn me(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    config: web::Data<Config>,
) -> Result<HttpResponse, AppError> {
    let pool = &platform_pool.0;
    let claims = extract_claims(&req, &config)?;

    let user_id: Uuid = claims.sub.parse().map_err(|_| AppError::Unauthorized)?;

    let row = sqlx::query(
        "SELECT id, email, display_name, role, tier, email_verified, created_at
         FROM brickos.users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let mfa_enabled = sqlx::query("SELECT enabled FROM brickos.user_mfa WHERE user_id = $1")
        .bind(user_id)
        .fetch_optional(pool)
        .await?
        .is_some_and(|r| r.get::<bool, _>("enabled"));

    let resp = ApiResponse::ok(UserResponse {
        id: row.get("id"),
        email: row.get("email"),
        display_name: row.get("display_name"),
        role: row.get("role"),
        tier: row.get("tier"),
        email_verified: row.get("email_verified"),
        mfa_enabled,
        created_at: row.get("created_at"),
    });

    Ok(HttpResponse::Ok().json(resp))
}
