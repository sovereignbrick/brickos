use actix_web::{web, HttpRequest, HttpResponse};
use askama::Template;
use serde::Deserialize;
use std::sync::Arc;
use uuid::Uuid;

use crate::auth::jwt;
use crate::config::StandaloneConfig;
use crate::db::{LinkStore, UserStore};
use crate::models::{
    CreateLinkRequest, ShortLink, ShortLinkClick, UpdateLinkRequest, UpdateUser, User,
};

// ---------------------------------------------------------------------------
// Auth guard helper
// ---------------------------------------------------------------------------

/// Extract the authenticated user from the `auth_token` cookie.
/// Returns None if the cookie is missing, invalid, or the user doesn't exist.
async fn get_authenticated_user(
    req: &HttpRequest,
    config: &StandaloneConfig,
    user_store: &Arc<dyn UserStore>,
) -> Option<User> {
    let cookie_header = req.headers().get("Cookie")?.to_str().ok()?;
    let token = cookie_header
        .split(';')
        .map(|s| s.trim())
        .find(|s| s.starts_with("auth_token="))?
        .strip_prefix("auth_token=")?;

    if token.is_empty() {
        return None;
    }

    let claims = jwt::verify_token(token, &config.jwt_secret).ok()?;
    user_store.get_by_id(&claims.sub).await.ok().flatten()
}

/// Redirect to /login response.
fn redirect_to_login() -> HttpResponse {
    HttpResponse::SeeOther()
        .insert_header(("Location", "/login"))
        .finish()
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

#[derive(Template)]
#[template(path = "login.html")]
struct LoginTemplate {
    error: Option<String>,
}

#[derive(Template)]
#[template(path = "register.html")]
struct RegisterTemplate {
    error: Option<String>,
}

#[derive(Template)]
#[template(path = "dashboard.html")]
struct DashboardTemplate {
    user: User,
    links: Vec<ShortLink>,
    total_clicks: i64,
    base_url: String,
}

#[derive(Template)]
#[template(path = "new_link.html")]
struct NewLinkTemplate {
    user: User,
    error: Option<String>,
    base_url: String,
}

#[derive(Template)]
#[template(path = "link_detail.html")]
struct LinkDetailTemplate {
    user: User,
    link: ShortLink,
    recent_clicks: Vec<ShortLinkClick>,
    base_url: String,
    error: Option<String>,
    success: Option<String>,
}

#[derive(Template)]
#[template(path = "settings.html")]
struct SettingsTemplate {
    user: User,
    error: Option<String>,
    success: Option<String>,
}

fn render_template<T: Template>(tmpl: &T) -> HttpResponse {
    match tmpl.render() {
        Ok(body) => HttpResponse::Ok().content_type("text/html").body(body),
        Err(e) => {
            tracing::error!("Template render error: {}", e);
            HttpResponse::InternalServerError().body("Internal error")
        }
    }
}

// ---------------------------------------------------------------------------
// Public pages (no auth required)
// ---------------------------------------------------------------------------

/// GET /login
pub async fn login_page(req: HttpRequest) -> HttpResponse {
    let error = req.uri().query().and_then(|q| {
        if q.contains("error=") {
            Some("Invalid email or password.".to_string())
        } else {
            None
        }
    });
    render_template(&LoginTemplate { error })
}

/// GET /register
pub async fn register_page(req: HttpRequest) -> HttpResponse {
    let error = req.uri().query().and_then(|q| {
        if q.contains("error=exists") {
            Some("Email already registered.".to_string())
        } else if q.contains("error=disabled") {
            Some("Registration is currently disabled.".to_string())
        } else if q.contains("error=invalid_email") {
            Some("Invalid email address.".to_string())
        } else if q.contains("error=short_password") {
            Some("Password must be at least 8 characters.".to_string())
        } else if q.contains("error=") {
            Some("Registration failed.".to_string())
        } else {
            None
        }
    });
    render_template(&RegisterTemplate { error })
}

/// GET / -- Redirect to dashboard or login
pub async fn home_page(req: HttpRequest) -> HttpResponse {
    let has_token = req
        .headers()
        .get("Cookie")
        .and_then(|v| v.to_str().ok())
        .map(|c| c.contains("auth_token="))
        .unwrap_or(false);

    if has_token {
        HttpResponse::Found()
            .insert_header(("Location", "/dashboard"))
            .finish()
    } else {
        HttpResponse::Found()
            .insert_header(("Location", "/login"))
            .finish()
    }
}

// ---------------------------------------------------------------------------
// Authenticated pages
// ---------------------------------------------------------------------------

/// GET /dashboard
pub async fn dashboard_page(
    req: HttpRequest,
    config: web::Data<StandaloneConfig>,
    user_store: web::Data<Arc<dyn UserStore>>,
    link_store: web::Data<Arc<dyn LinkStore>>,
) -> HttpResponse {
    let user = match get_authenticated_user(&req, &config, user_store.get_ref()).await {
        Some(u) => u,
        None => return redirect_to_login(),
    };

    let user_id = match Uuid::parse_str(&user.id) {
        Ok(id) => id,
        Err(_) => return redirect_to_login(),
    };

    let links = link_store.list_by_owner(user_id).await.unwrap_or_default();

    let mut total_clicks: i64 = 0;
    for link in &links {
        if let Ok(stats) = link_store.get_stats(link.id).await {
            total_clicks += stats.total_clicks;
        }
    }

    render_template(&DashboardTemplate {
        user,
        links,
        total_clicks,
        base_url: config.base_url.clone(),
    })
}

/// GET /new -- show create link form
pub async fn new_link_page(
    req: HttpRequest,
    config: web::Data<StandaloneConfig>,
    user_store: web::Data<Arc<dyn UserStore>>,
) -> HttpResponse {
    let user = match get_authenticated_user(&req, &config, user_store.get_ref()).await {
        Some(u) => u,
        None => return redirect_to_login(),
    };

    let error = req.uri().query().and_then(|q| {
        if q.contains("error=invalid_url") {
            Some("Please enter a valid URL (must start with http:// or https://).".to_string())
        } else if q.contains("error=duplicate") {
            Some("That custom code is already taken. Try another.".to_string())
        } else if q.contains("error=invalid_code") {
            Some(
                "Invalid custom code. Use lowercase letters, numbers, and hyphens only."
                    .to_string(),
            )
        } else if q.contains("error=") {
            Some("Failed to create link.".to_string())
        } else {
            None
        }
    });

    render_template(&NewLinkTemplate {
        user,
        error,
        base_url: config.base_url.clone(),
    })
}

#[derive(Debug, Deserialize)]
pub struct CreateLinkForm {
    pub target_url: String,
    pub code: Option<String>,
    pub title: Option<String>,
}

/// POST /new -- create link, redirect to detail
pub async fn create_link_form(
    req: HttpRequest,
    form: web::Form<CreateLinkForm>,
    config: web::Data<StandaloneConfig>,
    user_store: web::Data<Arc<dyn UserStore>>,
    link_store: web::Data<Arc<dyn LinkStore>>,
) -> HttpResponse {
    let user = match get_authenticated_user(&req, &config, user_store.get_ref()).await {
        Some(u) => u,
        None => return redirect_to_login(),
    };

    let user_id = match Uuid::parse_str(&user.id) {
        Ok(id) => id,
        Err(_) => return redirect_to_login(),
    };

    // Validate URL
    if !form.target_url.starts_with("http://") && !form.target_url.starts_with("https://") {
        return HttpResponse::SeeOther()
            .insert_header(("Location", "/new?error=invalid_url"))
            .finish();
    }

    // Validate custom code if provided
    let code = form
        .code
        .as_ref()
        .map(|c| c.trim().to_string())
        .filter(|c| !c.is_empty());

    if let Some(ref c) = code {
        if super::api::validate_vanity_code(c).is_err() {
            return HttpResponse::SeeOther()
                .insert_header(("Location", "/new?error=invalid_code"))
                .finish();
        }
    }

    let create_req = CreateLinkRequest {
        code,
        target_url: form.target_url.trim().to_string(),
        link_type: None,
        domain: None,
        app_key: None,
        title: form
            .title
            .as_ref()
            .map(|t| t.trim().to_string())
            .filter(|t| !t.is_empty()),
        expires_at: None,
    };

    match link_store.create_link(create_req, Some(user_id)).await {
        Ok(link) => HttpResponse::SeeOther()
            .insert_header(("Location", format!("/links/{}", link.id)))
            .finish(),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("duplicate") || msg.contains("unique") || msg.contains("UNIQUE") {
                HttpResponse::SeeOther()
                    .insert_header(("Location", "/new?error=duplicate"))
                    .finish()
            } else {
                tracing::error!("Failed to create link: {}", e);
                HttpResponse::SeeOther()
                    .insert_header(("Location", "/new?error=create"))
                    .finish()
            }
        }
    }
}

/// GET /links/{id} -- link detail page
pub async fn link_detail_page(
    req: HttpRequest,
    path: web::Path<Uuid>,
    config: web::Data<StandaloneConfig>,
    user_store: web::Data<Arc<dyn UserStore>>,
    link_store: web::Data<Arc<dyn LinkStore>>,
) -> HttpResponse {
    let user = match get_authenticated_user(&req, &config, user_store.get_ref()).await {
        Some(u) => u,
        None => return redirect_to_login(),
    };

    let link_id = path.into_inner();
    let link = match link_store.get_by_id(link_id).await {
        Ok(Some(l)) => l,
        _ => {
            return HttpResponse::NotFound()
                .content_type("text/html")
                .body("<html><body><h1>Link not found</h1><p><a href=\"/dashboard\">Back to dashboard</a></p></body></html>");
        }
    };

    // Verify ownership
    let user_uuid = Uuid::parse_str(&user.id).unwrap_or_default();
    if link.owner_user_id != Some(user_uuid) {
        return HttpResponse::NotFound()
            .content_type("text/html")
            .body("<html><body><h1>Link not found</h1><p><a href=\"/dashboard\">Back to dashboard</a></p></body></html>");
    }

    let recent_clicks = link_store
        .get_recent_clicks(link_id, 20)
        .await
        .unwrap_or_default();

    let error = req.uri().query().and_then(|q| {
        if q.contains("error=") {
            Some("Failed to update link.".to_string())
        } else {
            None
        }
    });

    let success = req.uri().query().and_then(|q| {
        if q.contains("success=updated") {
            Some("Link updated successfully.".to_string())
        } else {
            None
        }
    });

    render_template(&LinkDetailTemplate {
        user,
        link,
        recent_clicks,
        base_url: config.base_url.clone(),
        error,
        success,
    })
}

#[derive(Debug, Deserialize)]
pub struct EditLinkForm {
    pub target_url: String,
    pub title: Option<String>,
}

/// POST /links/{id}/edit -- update link
pub async fn edit_link_form(
    req: HttpRequest,
    path: web::Path<Uuid>,
    form: web::Form<EditLinkForm>,
    config: web::Data<StandaloneConfig>,
    user_store: web::Data<Arc<dyn UserStore>>,
    link_store: web::Data<Arc<dyn LinkStore>>,
) -> HttpResponse {
    let user = match get_authenticated_user(&req, &config, user_store.get_ref()).await {
        Some(u) => u,
        None => return redirect_to_login(),
    };

    let link_id = path.into_inner();
    let user_id = match Uuid::parse_str(&user.id) {
        Ok(id) => id,
        Err(_) => return redirect_to_login(),
    };

    let update = UpdateLinkRequest {
        target_url: Some(form.target_url.trim().to_string()),
        title: Some(
            form.title
                .as_ref()
                .map(|t| t.trim().to_string())
                .unwrap_or_default(),
        ),
        is_active: None,
        expires_at: None,
    };

    match link_store.update_link(link_id, user_id, update).await {
        Ok(Some(_)) => HttpResponse::SeeOther()
            .insert_header(("Location", format!("/links/{}?success=updated", link_id)))
            .finish(),
        Ok(None) => HttpResponse::SeeOther()
            .insert_header(("Location", format!("/links/{}?error=not_found", link_id)))
            .finish(),
        Err(e) => {
            tracing::error!("Failed to update link: {}", e);
            HttpResponse::SeeOther()
                .insert_header(("Location", format!("/links/{}?error=update", link_id)))
                .finish()
        }
    }
}

/// POST /links/{id}/delete -- delete link, redirect to dashboard
pub async fn delete_link_form(
    req: HttpRequest,
    path: web::Path<Uuid>,
    config: web::Data<StandaloneConfig>,
    user_store: web::Data<Arc<dyn UserStore>>,
    link_store: web::Data<Arc<dyn LinkStore>>,
) -> HttpResponse {
    let user = match get_authenticated_user(&req, &config, user_store.get_ref()).await {
        Some(u) => u,
        None => return redirect_to_login(),
    };

    let link_id = path.into_inner();
    let user_id = match Uuid::parse_str(&user.id) {
        Ok(id) => id,
        Err(_) => return redirect_to_login(),
    };

    match link_store.delete_link(link_id, user_id).await {
        Ok(true) => HttpResponse::SeeOther()
            .insert_header(("Location", "/dashboard"))
            .finish(),
        _ => HttpResponse::SeeOther()
            .insert_header(("Location", "/dashboard"))
            .finish(),
    }
}

/// GET /settings -- settings page
pub async fn settings_page(
    req: HttpRequest,
    config: web::Data<StandaloneConfig>,
    user_store: web::Data<Arc<dyn UserStore>>,
) -> HttpResponse {
    let user = match get_authenticated_user(&req, &config, user_store.get_ref()).await {
        Some(u) => u,
        None => return redirect_to_login(),
    };

    let error = req.uri().query().and_then(|q| {
        if q.contains("error=password_mismatch") {
            Some("Passwords do not match.".to_string())
        } else if q.contains("error=short_password") {
            Some("Password must be at least 8 characters.".to_string())
        } else if q.contains("error=") {
            Some("An error occurred.".to_string())
        } else {
            None
        }
    });

    let success = req.uri().query().and_then(|q| {
        if q.contains("success=profile") {
            Some("Profile updated.".to_string())
        } else if q.contains("success=password") {
            Some("Password changed.".to_string())
        } else {
            None
        }
    });

    render_template(&SettingsTemplate {
        user,
        error,
        success,
    })
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileForm {
    pub display_name: String,
}

/// POST /settings/profile -- update display name
pub async fn update_profile_form(
    req: HttpRequest,
    form: web::Form<UpdateProfileForm>,
    config: web::Data<StandaloneConfig>,
    user_store: web::Data<Arc<dyn UserStore>>,
) -> HttpResponse {
    let user = match get_authenticated_user(&req, &config, user_store.get_ref()).await {
        Some(u) => u,
        None => return redirect_to_login(),
    };

    let update = UpdateUser {
        display_name: Some(form.display_name.trim().to_string()),
        password_hash: None,
        api_key_hash: None,
    };

    match user_store.update(&user.id, update).await {
        Ok(Some(_)) => HttpResponse::SeeOther()
            .insert_header(("Location", "/settings?success=profile"))
            .finish(),
        _ => HttpResponse::SeeOther()
            .insert_header(("Location", "/settings?error=update"))
            .finish(),
    }
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordForm {
    pub new_password: String,
    pub confirm_password: String,
}

/// POST /settings/password -- change password
pub async fn change_password_form(
    req: HttpRequest,
    form: web::Form<ChangePasswordForm>,
    config: web::Data<StandaloneConfig>,
    user_store: web::Data<Arc<dyn UserStore>>,
) -> HttpResponse {
    let user = match get_authenticated_user(&req, &config, user_store.get_ref()).await {
        Some(u) => u,
        None => return redirect_to_login(),
    };

    if form.new_password != form.confirm_password {
        return HttpResponse::SeeOther()
            .insert_header(("Location", "/settings?error=password_mismatch"))
            .finish();
    }

    if form.new_password.len() < 8 {
        return HttpResponse::SeeOther()
            .insert_header(("Location", "/settings?error=short_password"))
            .finish();
    }

    let password_hash = match crate::auth::email::hash_password(&form.new_password) {
        Ok(h) => h,
        Err(_) => {
            return HttpResponse::SeeOther()
                .insert_header(("Location", "/settings?error=internal"))
                .finish();
        }
    };

    let update = UpdateUser {
        display_name: None,
        password_hash: Some(password_hash),
        api_key_hash: None,
    };

    match user_store.update(&user.id, update).await {
        Ok(Some(_)) => HttpResponse::SeeOther()
            .insert_header(("Location", "/settings?success=password"))
            .finish(),
        _ => HttpResponse::SeeOther()
            .insert_header(("Location", "/settings?error=update"))
            .finish(),
    }
}

/// POST /logout -- clear auth cookie and redirect to login
pub async fn logout_page() -> HttpResponse {
    HttpResponse::SeeOther()
        .insert_header(("Location", "/login"))
        .insert_header((
            "Set-Cookie",
            "auth_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
        ))
        .finish()
}
