// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpRequest, HttpResponse};
use chrono::Utc;
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use std::sync::Arc;

use brickos_email::EmailProvider;

use crate::{
    config::Config,
    error::AppError,
    middleware::auth::AuthenticatedUser,
    models::user::{LoginRequest, RefreshRequest, SignupRequest, User, UserResponse},
    services::auth::{
        create_jwt, generate_refresh_token, generate_verification_token, hash_password,
        hash_refresh_token, validate_email, validate_password, verify_password,
    },
    services::rate_limit::AuthRateLimiters,
};

// ---------------------------------------------------------------------------
// Helper: extract client IP from request
// ---------------------------------------------------------------------------

fn client_ip(req: &HttpRequest) -> String {
    // Cloudflare sets CF-Connecting-IP with the real client IP
    let raw = if let Some(cf_ip) = req.headers().get("CF-Connecting-IP") {
        cf_ip
            .to_str()
            .map(|s| s.trim().to_string())
            .unwrap_or_else(|_| {
                req.connection_info()
                    .realip_remote_addr()
                    .unwrap_or("unknown")
                    .to_string()
            })
    } else {
        // Fallback: X-Forwarded-For, X-Real-IP, then peer address
        req.connection_info()
            .realip_remote_addr()
            .unwrap_or("unknown")
            .to_string()
    };
    // Normalize: strip IPv6-mapped IPv4 prefix
    crate::handlers::admin_settings::normalize_ip(&raw)
}

// ---------------------------------------------------------------------------
// GET /auth/registration-status (Task 11)
// ---------------------------------------------------------------------------

pub async fn registration_status(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
) -> HttpResponse {
    let enabled = crate::handlers::admin_settings::get_setting_bool(
        pool.get_ref(),
        "registration_enabled",
        config.registration_enabled,
    )
    .await;

    // If globally enabled, allow
    if enabled {
        return HttpResponse::Ok().json(json!({
            "data": { "enabled": true },
            "error": null
        }));
    }

    // Check IP whitelist (feature-specific + unified admin whitelist)
    let ip = client_ip(&req);

    // Log all relevant headers for debugging IP detection
    let cf_ip_header = req
        .headers()
        .get("CF-Connecting-IP")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("(not set)");
    let xff_header = req
        .headers()
        .get("X-Forwarded-For")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("(not set)");
    tracing::info!(
        resolved_ip = %ip,
        cf_connecting_ip = %cf_ip_header,
        x_forwarded_for = %xff_header,
        "Registration status: IP detection"
    );

    // Check unified admin whitelist first
    if crate::handlers::admin_settings::is_ip_admin_whitelisted(pool.get_ref(), &ip).await {
        tracing::info!(ip = %ip, "Registration allowed via admin whitelist");
        return HttpResponse::Ok().json(json!({
            "data": { "enabled": true },
            "error": null
        }));
    }

    // Check feature-specific whitelist
    let whitelisted = crate::handlers::admin_settings::is_ip_in_feature_whitelist(
        pool.get_ref(),
        &ip,
        "registration_whitelist_ips",
    )
    .await;

    if !whitelisted {
        let admin_wl = crate::handlers::admin_settings::get_setting(
            pool.get_ref(),
            "admin_whitelist_ips",
            json!([]),
        )
        .await;
        let feature_wl = crate::handlers::admin_settings::get_setting(
            pool.get_ref(),
            "registration_whitelist_ips",
            json!([]),
        )
        .await;
        tracing::warn!(
            ip = %ip,
            admin_whitelist = %admin_wl,
            registration_whitelist = %feature_wl,
            "Registration DENIED - IP not in any whitelist"
        );
    }

    HttpResponse::Ok().json(json!({
        "data": { "enabled": whitelisted },
        "error": null
    }))
}

// ---------------------------------------------------------------------------
// POST /auth/signup (Task 1)
// ---------------------------------------------------------------------------

pub async fn signup(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
    email_provider: web::Data<Arc<dyn EmailProvider>>,
    rate_limiters: web::Data<AuthRateLimiters>,
    body: web::Json<SignupRequest>,
) -> Result<HttpResponse, AppError> {
    // Rate limit by IP (need IP before registration gate for whitelist check)
    let ip = client_ip(&req);

    // Check registration gate - DB settings override env config
    let reg_setting = crate::handlers::admin_settings::get_setting(
        pool.get_ref(),
        "registration_enabled",
        serde_json::json!(config.registration_enabled),
    )
    .await;
    let reg_enabled = reg_setting.as_bool().unwrap_or(config.registration_enabled);
    tracing::info!(
        ip = %ip,
        reg_setting = %reg_setting,
        reg_enabled = reg_enabled,
        config_reg = config.registration_enabled,
        "Registration gate check"
    );

    if !reg_enabled {
        // Check unified admin whitelist first, then feature-specific whitelist
        let admin_whitelisted =
            crate::handlers::admin_settings::is_ip_admin_whitelisted(pool.get_ref(), &ip).await;

        let whitelisted = if admin_whitelisted {
            true
        } else {
            crate::handlers::admin_settings::is_ip_in_feature_whitelist(
                pool.get_ref(),
                &ip,
                "registration_whitelist_ips",
            )
            .await
        };

        if !whitelisted {
            return Ok(HttpResponse::Forbidden().json(json!({
                "data": null,
                "error": { "code": "REGISTRATION_CLOSED", "message": "Registration is currently closed." }
            })));
        }
        tracing::info!(ip = %ip, admin_whitelist = admin_whitelisted, "Registration allowed via IP whitelist");
    }
    if let Err(retry_after) = rate_limiters.register.check(&ip) {
        return Ok(HttpResponse::TooManyRequests()
            .insert_header(("Retry-After", retry_after.to_string()))
            .json(json!({
                "data": null,
                "error": { "code": "RATE_LIMITED", "message": "Too many registration attempts. Please try again later." }
            })));
    }

    // Normalize email
    let email = body.email.trim().to_lowercase();

    // Validate
    if !validate_email(&email) {
        return Err(AppError::Validation("Invalid email address".to_string()));
    }
    validate_password(&body.password).map_err(|e| AppError::Validation(e.to_string()))?;

    // Validate name length
    if let Some(ref name) = body.display_name {
        let name = name.trim();
        if name.len() > 100 {
            return Err(AppError::Validation(
                "Display name must be at most 100 characters".to_string(),
            ));
        }
    }

    // Require TOS acceptance
    if !body.tos_accepted.unwrap_or(false) {
        return Err(AppError::Validation(
            "You must accept the Terms of Service to register".to_string(),
        ));
    }

    // Hash password
    let password_hash = hash_password(&body.password)?;

    let display_name = body.display_name.as_ref().map(|n| n.trim().to_string());

    // Determine if OSS mode (skip email verification)
    let is_oss = config.is_oss();

    // Determine user locale
    let user_locale = body
        .locale
        .as_deref()
        .filter(|l| ["en", "de"].contains(l))
        .unwrap_or("en")
        .to_string();

    // INSERT user with email_verified based on mode
    let insert_result = sqlx::query(
        "INSERT INTO users (email, password_hash, display_name, email_verified, email_verified_at, locale) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
    )
    .bind(&email)
    .bind(&password_hash)
    .bind(&display_name)
    .bind(is_oss) // OSS: verified immediately; SaaS: false
    .bind(if is_oss { Some(Utc::now()) } else { None })
    .bind(&user_locale)
    .fetch_one(pool.get_ref())
    .await;

    let user_id: Uuid = match insert_result {
        Ok(row) => {
            use sqlx::Row;
            row.try_get("id").map_err(|_| AppError::Internal)?
        }
        Err(sqlx::Error::Database(ref db_err)) if db_err.is_unique_violation() => {
            return Err(AppError::EmailConflict);
        }
        Err(e) => {
            tracing::error!("Failed to insert user: {:?}", e);
            return Err(AppError::Internal);
        }
    };

    // Generate affiliate code for new user
    match crate::handlers::affiliate::generate_affiliate_code(pool.get_ref()).await {
        Ok(code) => {
            let _ = sqlx::query("UPDATE users SET affiliate_code = $1 WHERE id = $2")
                .bind(&code)
                .bind(user_id)
                .execute(pool.get_ref())
                .await;
        }
        Err(e) => {
            tracing::warn!(
                "Failed to generate affiliate code for user {}: {:?}",
                user_id,
                e
            );
        }
    }

    // Handle referred_by: validate and store
    if let Some(ref referral_code) = body.referred_by {
        let referral_code = referral_code.trim().to_lowercase();
        if !referral_code.is_empty() {
            // Validate code exists and is not the user's own code
            let referrer_exists: bool = sqlx::query_scalar(
                "SELECT EXISTS(SELECT 1 FROM users WHERE affiliate_code = $1 AND id != $2 AND is_deleted = false)",
            )
            .bind(&referral_code)
            .bind(user_id)
            .fetch_one(pool.get_ref())
            .await
            .unwrap_or(false);

            if referrer_exists {
                let _ = sqlx::query("UPDATE users SET referred_by = $1 WHERE id = $2")
                    .bind(&referral_code)
                    .bind(user_id)
                    .execute(pool.get_ref())
                    .await;
            }
        }
    }

    // Record TOS acceptance
    let _ = sqlx::query("UPDATE users SET tos_accepted_at = now() WHERE id = $1")
        .bind(user_id)
        .execute(pool.get_ref())
        .await;

    // Insert user_preferences and user_profile
    let _ = sqlx::query("INSERT INTO user_preferences (user_id) VALUES ($1)")
        .bind(user_id)
        .execute(pool.get_ref())
        .await;

    let _ = sqlx::query(
        "INSERT INTO user_profile (user_id, consent_newsletter, consent_product_updates) \
         VALUES ($1, $2, $3)")
        .bind(user_id)
        .bind(body.consent_newsletter.unwrap_or(false))
        .bind(body.consent_product_updates.unwrap_or(true))
        .execute(pool.get_ref())
        .await;

    // Assign tier: Glimpse for SaaS, Core for OSS
    let tier_slug = if is_oss { "core" } else { "glimpse" };
    let _ = sqlx::query(
        r#"INSERT INTO user_licenses (user_id, tier_id, status)
           SELECT $1, id, 'active' FROM license_tiers WHERE slug = $2
           ON CONFLICT (user_id) DO NOTHING"#,
    )
    .bind(user_id)
    .bind(tier_slug)
    .execute(pool.get_ref())
    .await;

    let _ = sqlx::query(
        "INSERT INTO license_events (user_id, event_type, to_tier_slug) VALUES ($1, 'tier_assigned', $2)",
    )
    .bind(user_id)
    .bind(tier_slug)
    .execute(pool.get_ref())
    .await;

    if is_oss {
        // OSS: user is verified, issue JWT immediately
        let user = sqlx::query_as::<_, User>(
            "SELECT id, email, password_hash, display_name, role, tier, created_at FROM users WHERE id = $1",
        )
        .bind(user_id)
        .fetch_one(pool.get_ref())
        .await?;

        let token = create_jwt(
            &user.id.to_string(),
            &user.role,
            &user.tier,
            &config.jwt_secret,
            config.jwt_expiry_secs,
        )?;
        let refresh_token = generate_refresh_token();
        let token_hash = hash_refresh_token(&refresh_token);
        let expires_at = Utc::now() + chrono::Duration::seconds(config.refresh_expiry_secs);

        sqlx::query(
            "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
        )
        .bind(user.id)
        .bind(&token_hash)
        .bind(expires_at)
        .execute(pool.get_ref())
        .await?;

        // Send welcome email (non-blocking)
        send_welcome_email_async(
            email_provider.get_ref().clone(),
            email.clone(),
            user_id,
            config.jwt_secret.clone(),
            config.frontend_url.clone(),
            config.api_base_url.clone(),
            config.product_name.clone(),
            user_locale.clone(),
        );

        // Init segments (non-blocking)
        {
            let pool_ref = pool.get_ref().clone();
            let uid = user_id;
            tokio::spawn(async move {
                let _ = crate::services::segments::update_user_segments(&pool_ref, uid).await;
            });
        }

        let user_response = UserResponse::from(user);

        return Ok(HttpResponse::Created().json(json!({
            "data": {
                "user": user_response,
                "token": token,
                "refresh_token": refresh_token
            },
            "error": null
        })));
    }

    // SaaS: generate verification token and send email
    let verification_token = generate_verification_token();
    let expires_at = Utc::now() + chrono::Duration::hours(config.email_verification_expiry_hours);

    sqlx::query(
        "INSERT INTO email_verifications (user_id, token, purpose, expires_at) VALUES ($1, $2, 'registration', $3)",
    )
    .bind(user_id)
    .bind(&verification_token)
    .bind(expires_at)
    .execute(pool.get_ref())
    .await
    .map_err(|e| {
        tracing::error!("Failed to insert verification token: {:?}", e);
        AppError::Internal
    })?;

    // Send verification email (non-blocking)
    {
        let provider = email_provider.get_ref().clone();
        let email_addr = email.clone();
        let token = verification_token;
        let frontend_url = config.frontend_url.clone();
        let api_base = config.api_base_url.clone();
        let product_name = config.product_name.clone();
        let unsub_secret = config.jwt_secret.clone();
        let locale = user_locale.clone();
        tokio::spawn(async move {
            let tmpl = crate::templates::emails::get_template("verification", &locale);
            let mut vars = std::collections::HashMap::new();
            let verify_url = format!("{}/verify-email?token={}", frontend_url, token);
            vars.insert("verification_url", verify_url);
            vars.insert(
                "subject",
                tmpl.subject.replace("{{subject}}", &product_name),
            );
            vars.insert(
                "unsubscribe_url",
                unsubscribe_url(user_id, &unsub_secret, &api_base),
            );
            vars.insert("frontend_url", frontend_url);
            let (subject, html, text) =
                crate::templates::emails::render_template_localized(&tmpl, &vars, &locale);
            if let Err(e) = provider.send(&email_addr, &subject, &html, &text).await {
                tracing::warn!("Verification email send failed: {e}");
            }
        });
    }

    Ok(HttpResponse::Created().json(json!({
        "data": { "message": "Check your email to verify your account." },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// GET /auth/verify?token={token} (Task 3)
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct VerifyQuery {
    pub token: String,
}

pub async fn verify_email(
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
    email_provider: web::Data<Arc<dyn EmailProvider>>,
    query: web::Query<VerifyQuery>,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    let token = query.token.trim();

    // Look up token
    let row = sqlx::query(
        "SELECT id, user_id, expires_at, used_at FROM email_verifications WHERE token = $1 AND purpose = 'registration'",
    )
    .bind(token)
    .fetch_optional(pool.get_ref())
    .await?;

    let row = match row {
        Some(r) => r,
        None => {
            return Ok(HttpResponse::NotFound().json(json!({
                "data": null,
                "error": { "code": "INVALID_TOKEN", "message": "Invalid verification link." }
            })));
        }
    };

    let verification_id: Uuid = row.try_get("id").map_err(|_| AppError::Internal)?;
    let user_id: Uuid = row.try_get("user_id").map_err(|_| AppError::Internal)?;
    let expires_at: chrono::DateTime<Utc> =
        row.try_get("expires_at").map_err(|_| AppError::Internal)?;
    let used_at: Option<chrono::DateTime<Utc>> = row.try_get("used_at").ok();

    // Check if already used
    if used_at.is_some() {
        return Ok(HttpResponse::Ok().json(json!({
            "data": { "already_verified": true, "redirect": "/login?verified=true" },
            "error": null
        })));
    }

    // Check expiry
    if Utc::now() > expires_at {
        return Ok(HttpResponse::Gone().json(json!({
            "data": null,
            "error": { "code": "TOKEN_EXPIRED", "message": "Verification link has expired. Please request a new one." }
        })));
    }

    // Mark token as used
    sqlx::query("UPDATE email_verifications SET used_at = NOW() WHERE id = $1")
        .bind(verification_id)
        .execute(pool.get_ref())
        .await?;

    // Mark user as verified
    sqlx::query("UPDATE users SET email_verified = true, email_verified_at = NOW() WHERE id = $1")
        .bind(user_id)
        .execute(pool.get_ref())
        .await?;

    // Get user email + locale for Mailgun sync and welcome email
    let user_row =
        sqlx::query("SELECT email, COALESCE(locale, 'en') as locale FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_optional(pool.get_ref())
            .await?;

    // Non-blocking: Mailgun sync + welcome email + segments
    if let Some(row) = user_row {
        use sqlx::Row;
        let email_addr: String = row.try_get("email").unwrap_or_default();
        let user_locale: String = row.try_get("locale").unwrap_or_else(|_| "en".to_string());
        let provider = email_provider.get_ref().clone();
        let pool_ref = pool.get_ref().clone();
        let uid = user_id;
        let addr = email_addr.clone();
        tokio::spawn(async move {
            let tags = vec![
                "source:app".to_string(),
                "tier:glimpse".to_string(),
                "consent:product_updates".to_string(),
            ];
            if let Err(e) = provider.add_to_list(&addr, "", &tags).await {
                tracing::warn!(user_id = %uid, "Mailgun list sync failed: {e}");
            }
            let _ = sqlx::query("UPDATE user_profile SET mailgun_synced = true WHERE user_id = $1")
                .bind(uid)
                .execute(&pool_ref)
                .await;
            let _ = crate::services::segments::update_user_segments(&pool_ref, uid).await;
        });

        // Welcome email
        send_welcome_email_async(
            email_provider.get_ref().clone(),
            email_addr,
            user_id,
            config.jwt_secret.clone(),
            config.frontend_url.clone(),
            config.api_base_url.clone(),
            config.product_name.clone(),
            user_locale,
        );
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": { "verified": true, "redirect": "/login?verified=true" },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// POST /auth/resend-verification (Task 4)
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct ResendVerificationRequest {
    pub email: String,
}

pub async fn resend_verification(
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
    email_provider: web::Data<Arc<dyn EmailProvider>>,
    rate_limiters: web::Data<AuthRateLimiters>,
    body: web::Json<ResendVerificationRequest>,
) -> Result<HttpResponse, AppError> {
    let email = body.email.trim().to_lowercase();

    // Rate limit by email
    if let Err(retry_after) = rate_limiters.resend_verification.check(&email) {
        return Ok(HttpResponse::TooManyRequests()
            .insert_header(("Retry-After", retry_after.to_string()))
            .json(json!({
                "data": null,
                "error": { "code": "RATE_LIMITED", "message": "Too many requests. Please try again later." }
            })));
    }

    // Always return 200 to prevent enumeration
    let success_response = HttpResponse::Ok().json(json!({
        "data": { "message": "If that email is registered and not yet verified, we sent a verification link." },
        "error": null
    }));

    // Find user
    let user_row =
        sqlx::query("SELECT id, email_verified, COALESCE(locale, 'en') as locale FROM users WHERE email = $1 AND is_deleted = false")
            .bind(&email)
            .fetch_optional(pool.get_ref())
            .await?;

    let user_row = match user_row {
        Some(r) => r,
        None => return Ok(success_response),
    };

    use sqlx::Row;
    let user_id: Uuid = user_row.try_get("id").map_err(|_| AppError::Internal)?;
    let email_verified: bool = user_row.try_get("email_verified").unwrap_or(false);
    let user_locale: String = user_row
        .try_get("locale")
        .unwrap_or_else(|_| "en".to_string());

    if email_verified {
        return Ok(success_response);
    }

    // Invalidate existing unused tokens
    sqlx::query(
        "UPDATE email_verifications SET used_at = NOW() WHERE user_id = $1 AND purpose = 'registration' AND used_at IS NULL",
    )
    .bind(user_id)
    .execute(pool.get_ref())
    .await?;

    // Generate new token
    let token = generate_verification_token();
    let expires_at = Utc::now() + chrono::Duration::hours(config.email_verification_expiry_hours);

    sqlx::query(
        "INSERT INTO email_verifications (user_id, token, purpose, expires_at) VALUES ($1, $2, 'registration', $3)",
    )
    .bind(user_id)
    .bind(&token)
    .bind(expires_at)
    .execute(pool.get_ref())
    .await?;

    // Send email (non-blocking)
    {
        let provider = email_provider.get_ref().clone();
        let email_addr = email;
        let frontend_url = config.frontend_url.clone();
        let api_base = config.api_base_url.clone();
        let _product_name = config.product_name.clone();
        let unsub_secret = config.jwt_secret.clone();
        let locale = user_locale;
        tokio::spawn(async move {
            let tmpl = crate::templates::emails::get_template("verification", &locale);
            let mut vars = std::collections::HashMap::new();
            let verify_url = format!("{}/verify-email?token={}", frontend_url, token);
            vars.insert("verification_url", verify_url);
            vars.insert("subject", tmpl.subject.to_string());
            vars.insert(
                "unsubscribe_url",
                unsubscribe_url(user_id, &unsub_secret, &api_base),
            );
            vars.insert("frontend_url", frontend_url);
            let (subject, html, text) =
                crate::templates::emails::render_template_localized(&tmpl, &vars, &locale);
            if let Err(e) = provider.send(&email_addr, &subject, &html, &text).await {
                tracing::warn!("Resend verification email failed: {e}");
            }
        });
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": { "message": "If that email is registered and not yet verified, we sent a verification link." },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// POST /auth/forgot-password (Task 5)
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct ForgotPasswordRequest {
    pub email: String,
}

pub async fn forgot_password(
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
    email_provider: web::Data<Arc<dyn EmailProvider>>,
    rate_limiters: web::Data<AuthRateLimiters>,
    body: web::Json<ForgotPasswordRequest>,
) -> Result<HttpResponse, AppError> {
    let email = body.email.trim().to_lowercase();

    // Rate limit by email
    if let Err(retry_after) = rate_limiters.forgot_password.check(&email) {
        return Ok(HttpResponse::TooManyRequests()
            .insert_header(("Retry-After", retry_after.to_string()))
            .json(json!({
                "data": null,
                "error": { "code": "RATE_LIMITED", "message": "Too many requests. Please try again later." }
            })));
    }

    let generic_response = HttpResponse::Ok().json(json!({
        "data": { "message": "If that email is registered, we sent a reset link." },
        "error": null
    }));

    // Find user (no enumeration)
    let user_row =
        sqlx::query("SELECT id, COALESCE(locale, 'en') as locale FROM users WHERE email = $1 AND is_deleted = false")
            .bind(&email)
            .fetch_optional(pool.get_ref())
            .await?;

    let user_row = match user_row {
        Some(r) => r,
        None => return Ok(generic_response),
    };

    let user_id: Uuid = {
        use sqlx::Row;
        user_row.try_get("id").map_err(|_| AppError::Internal)?
    };
    let user_locale: String = {
        use sqlx::Row;
        user_row
            .try_get("locale")
            .unwrap_or_else(|_| "en".to_string())
    };

    // Generate token
    let token = generate_verification_token();
    let expires_at = Utc::now() + chrono::Duration::hours(config.password_reset_expiry_hours);

    sqlx::query(
        "INSERT INTO email_verifications (user_id, token, purpose, expires_at) VALUES ($1, $2, 'password_reset', $3)",
    )
    .bind(user_id)
    .bind(&token)
    .bind(expires_at)
    .execute(pool.get_ref())
    .await?;

    // Send email (non-blocking)
    {
        let provider = email_provider.get_ref().clone();
        let email_addr = email;
        let frontend_url = config.frontend_url.clone();
        let api_base = config.api_base_url.clone();
        let _product_name = config.product_name.clone();
        let unsub_secret = config.jwt_secret.clone();
        let locale = user_locale;
        tokio::spawn(async move {
            let tmpl = crate::templates::emails::get_template("password_reset", &locale);
            let mut vars = std::collections::HashMap::new();
            let reset_url = format!("{}/reset-password?token={}", frontend_url, token);
            vars.insert("reset_url", reset_url);
            vars.insert("subject", tmpl.subject.to_string());
            vars.insert(
                "unsubscribe_url",
                unsubscribe_url(user_id, &unsub_secret, &api_base),
            );
            vars.insert("frontend_url", frontend_url);
            let (subject, html, text) =
                crate::templates::emails::render_template_localized(&tmpl, &vars, &locale);
            if let Err(e) = provider.send(&email_addr, &subject, &html, &text).await {
                tracing::warn!("Password reset email failed: {e}");
            }
        });
    }

    Ok(generic_response)
}

// ---------------------------------------------------------------------------
// POST /auth/reset-password (Task 5)
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct ResetPasswordRequest {
    pub token: String,
    pub password: String,
}

pub async fn reset_password(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    rate_limiters: web::Data<AuthRateLimiters>,
    body: web::Json<ResetPasswordRequest>,
) -> Result<HttpResponse, AppError> {
    // Rate limit by IP
    let ip = client_ip(&req);
    if let Err(retry_after) = rate_limiters.reset_password.check(&ip) {
        return Ok(HttpResponse::TooManyRequests()
            .insert_header(("Retry-After", retry_after.to_string()))
            .json(json!({
                "data": null,
                "error": { "code": "RATE_LIMITED", "message": "Too many attempts. Please try again later." }
            })));
    }

    // Validate new password
    validate_password(&body.password).map_err(|e| AppError::Validation(e.to_string()))?;

    // Find token
    use sqlx::Row;
    let row = sqlx::query(
        "SELECT id, user_id, expires_at, used_at FROM email_verifications WHERE token = $1 AND purpose = 'password_reset'",
    )
    .bind(body.token.trim())
    .fetch_optional(pool.get_ref())
    .await?;

    let row = match row {
        Some(r) => r,
        None => {
            return Ok(HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "INVALID_TOKEN", "message": "Invalid or expired reset link." }
            })));
        }
    };

    let verification_id: Uuid = row.try_get("id").map_err(|_| AppError::Internal)?;
    let user_id: Uuid = row.try_get("user_id").map_err(|_| AppError::Internal)?;
    let expires_at: chrono::DateTime<Utc> =
        row.try_get("expires_at").map_err(|_| AppError::Internal)?;
    let used_at: Option<chrono::DateTime<Utc>> = row.try_get("used_at").ok();

    if used_at.is_some() || Utc::now() > expires_at {
        return Ok(HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": { "code": "TOKEN_EXPIRED", "message": "This reset link has expired. Please request a new one." }
        })));
    }

    // Mark token as used
    sqlx::query("UPDATE email_verifications SET used_at = NOW() WHERE id = $1")
        .bind(verification_id)
        .execute(pool.get_ref())
        .await?;

    // Hash new password
    let password_hash = hash_password(&body.password)?;

    // Update password
    sqlx::query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2")
        .bind(&password_hash)
        .bind(user_id)
        .execute(pool.get_ref())
        .await?;

    // Revoke all refresh tokens for this user
    sqlx::query("UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND revoked = false")
        .bind(user_id)
        .execute(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "message": "Password updated. Please log in." },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// POST /auth/login (Task 6)
// ---------------------------------------------------------------------------

pub async fn login(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
    rate_limiters: web::Data<AuthRateLimiters>,
    body: web::Json<LoginRequest>,
) -> Result<HttpResponse, AppError> {
    // Rate limit by IP
    let ip = client_ip(&req);
    if let Err(retry_after) = rate_limiters.login.check(&ip) {
        return Ok(HttpResponse::TooManyRequests()
            .insert_header(("Retry-After", retry_after.to_string()))
            .json(json!({
                "data": null,
                "error": { "code": "RATE_LIMITED", "message": "Too many login attempts. Please try again later." }
            })));
    }

    let email = body.email.trim().to_lowercase();

    // Fetch user by email
    let user = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, display_name, role, tier, created_at FROM users WHERE email = $1 AND is_deleted = false",
    )
    .bind(&email)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::InvalidCredentials)?;

    // Verify password
    if !verify_password(&body.password, &user.password_hash) {
        return Err(AppError::InvalidCredentials);
    }

    // Check email verification (skip for OSS mode)
    if !config.is_oss() {
        let verified: bool = sqlx::query_scalar("SELECT email_verified FROM users WHERE id = $1")
            .bind(user.id)
            .fetch_one(pool.get_ref())
            .await
            .unwrap_or(false);

        if !verified {
            return Ok(HttpResponse::Forbidden().json(json!({
                "data": null,
                "error": { "code": "EMAIL_NOT_VERIFIED", "message": "Please verify your email first." }
            })));
        }
    }

    // Check if MFA is enabled
    let mfa_enabled: bool = sqlx::query_scalar(
        "SELECT COALESCE((SELECT enabled FROM user_mfa WHERE user_id = $1), false)",
    )
    .bind(user.id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(false);

    if mfa_enabled {
        // Issue a short-lived MFA token instead of JWT
        let mfa_token = generate_verification_token();
        let mfa_expires = Utc::now() + chrono::Duration::minutes(config.mfa_login_expiry_minutes);

        sqlx::query(
            "INSERT INTO email_verifications (user_id, token, purpose, expires_at) VALUES ($1, $2, 'mfa_login', $3)",
        )
        .bind(user.id)
        .bind(format!("{}::0", mfa_token)) // token::attempts
        .bind(mfa_expires)
        .execute(pool.get_ref())
        .await?;

        return Ok(HttpResponse::Ok().json(json!({
            "data": {
                "mfa_required": true,
                "mfa_token": mfa_token
            },
            "error": null
        })));
    }

    // Generate tokens
    let token = create_jwt(
        &user.id.to_string(),
        &user.role,
        &user.tier,
        &config.jwt_secret,
        config.jwt_expiry_secs,
    )?;
    let refresh_token = generate_refresh_token();
    let token_hash = hash_refresh_token(&refresh_token);
    let expires_at = Utc::now() + chrono::Duration::seconds(config.refresh_expiry_secs);

    sqlx::query("INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)")
        .bind(user.id)
        .bind(&token_hash)
        .bind(expires_at)
        .execute(pool.get_ref())
        .await?;

    // Update engagement segment (non-blocking)
    {
        let pool_ref = pool.get_ref().clone();
        let uid = user.id;
        tokio::spawn(async move {
            let _ = crate::services::segments::update_user_segments(&pool_ref, uid).await;
        });
    }

    let user_response = UserResponse::from(user);

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "user": user_response,
            "token": token,
            "refresh_token": refresh_token
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// POST /auth/refresh
// ---------------------------------------------------------------------------

pub async fn refresh(
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
    body: web::Json<RefreshRequest>,
) -> Result<HttpResponse, AppError> {
    let token_hash = hash_refresh_token(&body.refresh_token);

    let record = sqlx::query_as::<_, RefreshTokenRecord>(
        "SELECT id, user_id FROM refresh_tokens WHERE token_hash = $1 AND revoked = false AND expires_at > now()",
    )
    .bind(&token_hash)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::Unauthorized)?;

    let user = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, display_name, role, tier, created_at FROM users WHERE id = $1 AND is_deleted = false",
    )
    .bind(record.user_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::Unauthorized)?;

    sqlx::query("UPDATE refresh_tokens SET revoked = true WHERE id = $1")
        .bind(record.id)
        .execute(pool.get_ref())
        .await?;

    let new_token = create_jwt(
        &user.id.to_string(),
        &user.role,
        &user.tier,
        &config.jwt_secret,
        config.jwt_expiry_secs,
    )?;
    let new_refresh_token = generate_refresh_token();
    let new_token_hash = hash_refresh_token(&new_refresh_token);
    let expires_at = Utc::now() + chrono::Duration::seconds(config.refresh_expiry_secs);

    sqlx::query("INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)")
        .bind(user.id)
        .bind(&new_token_hash)
        .bind(expires_at)
        .execute(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "token": new_token,
            "refresh_token": new_refresh_token
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// GET /auth/me
// ---------------------------------------------------------------------------

pub async fn me(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    enc: web::Data<crate::services::encryption::Encryptor>,
) -> Result<HttpResponse, AppError> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, display_name, role, tier, created_at FROM users WHERE id = $1 AND is_deleted = false",
    )
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    // Fetch profile defaults
    let profile_row = sqlx::query(
        "SELECT height_cm, default_waist_cm, default_weight_kg, country_code \
         FROM user_profile WHERE user_id = $1",
    )
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?;

    let (height_cm, default_waist_cm, default_weight_kg, country_code) = match profile_row {
        Some(row) => {
            use sqlx::Row;
            (
                row.try_get::<Option<String>, _>("height_cm")
                    .ok()
                    .flatten()
                    .map(|v| enc.decrypt_f64(&v)),
                row.try_get::<Option<String>, _>("default_waist_cm")
                    .ok()
                    .flatten()
                    .map(|v| enc.decrypt_f64(&v)),
                row.try_get::<Option<String>, _>("default_weight_kg")
                    .ok()
                    .flatten()
                    .map(|v| enc.decrypt_f64(&v)),
                row.try_get::<Option<String>, _>("country_code")
                    .ok()
                    .flatten(),
            )
        }
        None => (None, None, None, None),
    };

    let mut user_response = UserResponse::from(user);
    user_response.height_cm = height_cm;
    user_response.default_waist_cm = default_waist_cm;
    user_response.default_weight_kg = default_weight_kg;
    user_response.country_code = country_code;

    // Fetch tier info
    let tier_row = sqlx::query(
        r#"SELECT lt.slug, lt.name
        FROM user_licenses ul
        JOIN license_tiers lt ON lt.id = ul.tier_id
        WHERE ul.user_id = $1"#,
    )
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?;

    let (tier_slug, tier_name) = match tier_row {
        Some(row) => {
            use sqlx::Row;
            (
                row.try_get::<String, _>("slug")
                    .unwrap_or_else(|_| user_response.tier.clone()),
                row.try_get::<String, _>("name")
                    .unwrap_or_else(|_| "Glimpse".to_string()),
            )
        }
        None => (user_response.tier.clone(), "Glimpse".to_string()),
    };

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "id": user_response.id,
            "email": user_response.email,
            "display_name": user_response.display_name,
            "role": user_response.role,
            "tier": tier_slug,
            "created_at": user_response.created_at,
            "country_code": user_response.country_code,
            "height_cm": user_response.height_cm,
            "default_waist_cm": user_response.default_waist_cm,
            "default_weight_kg": user_response.default_weight_kg,
            "tier_info": {
                "slug": tier_slug,
                "name": tier_name
            }
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

#[derive(sqlx::FromRow)]
struct RefreshTokenRecord {
    id: Uuid,
    user_id: Uuid,
}

#[allow(clippy::too_many_arguments)]
fn send_welcome_email_async(
    provider: Arc<dyn EmailProvider>,
    email_addr: String,
    uid: Uuid,
    secret: String,
    frontend_url: String,
    api_base: String,
    _product_name: String,
    locale: String,
) {
    tokio::spawn(async move {
        let tmpl = crate::templates::emails::get_template("welcome", &locale);
        let mut vars = std::collections::HashMap::new();
        vars.insert("unsubscribe_url", unsubscribe_url(uid, &secret, &api_base));
        vars.insert("frontend_url", frontend_url);
        vars.insert("subject", tmpl.subject.to_string());
        let (subject, html, text) =
            crate::templates::emails::render_template_localized(&tmpl, &vars, &locale);
        if let Err(e) = provider.send(&email_addr, &subject, &html, &text).await {
            tracing::warn!("Welcome email failed: {e}");
        }
    });
}

// ---------------------------------------------------------------------------
// Unsubscribe (one-click, no auth required)
// ---------------------------------------------------------------------------

/// Generate an HMAC-based unsubscribe token for a user.
pub fn generate_unsubscribe_token(user_id: Uuid, secret: &str) -> String {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;

    type HmacSha256 = Hmac<Sha256>;
    let mut mac =
        HmacSha256::new_from_slice(secret.as_bytes()).expect("HMAC accepts any key length");
    mac.update(user_id.as_bytes());
    mac.update(b"unsubscribe");
    hex::encode(mac.finalize().into_bytes())
}

/// Build an unsubscribe URL for a given user.
pub fn unsubscribe_url(user_id: Uuid, secret: &str, api_base: &str) -> String {
    let token = generate_unsubscribe_token(user_id, secret);
    format!(
        "{}/auth/unsubscribe?uid={}&token={}",
        api_base, user_id, token
    )
}

#[derive(Deserialize)]
pub struct UnsubscribeQuery {
    pub uid: Uuid,
    pub token: String,
}

/// GET /auth/unsubscribe?uid=...&token=...
/// One-click email unsubscribe (no login required).
pub async fn unsubscribe(
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
    query: web::Query<UnsubscribeQuery>,
) -> Result<HttpResponse, AppError> {
    let expected = generate_unsubscribe_token(query.uid, &config.jwt_secret);
    if query.token != expected {
        return Ok(HttpResponse::BadRequest()
            .content_type("text/html; charset=utf-8")
            .body("<html><body style='background:#0a0a0a;color:#e5e5e5;font-family:sans-serif;text-align:center;padding:60px'><h2>Invalid unsubscribe link</h2><p>This link may have expired or is invalid.</p></body></html>"));
    }

    // Ensure preferences row exists, then set email_unsubscribed = true
    sqlx::query(
        "INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
    )
    .bind(query.uid)
    .execute(pool.get_ref())
    .await?;

    sqlx::query(
        "UPDATE user_preferences SET email_unsubscribed = true, updated_at = now() WHERE user_id = $1",
    )
    .bind(query.uid)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body("<html><body style='background:#0a0a0a;color:#e5e5e5;font-family:sans-serif;text-align:center;padding:60px'><h2 style='color:#22c55e'>Unsubscribed</h2><p>You have been unsubscribed from Sovereign Health emails.</p><p>You can re-enable emails anytime from your account settings.</p></body></html>"))
}
