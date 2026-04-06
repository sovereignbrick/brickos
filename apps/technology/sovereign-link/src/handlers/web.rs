use actix_web::{HttpRequest, HttpResponse};
use askama::Template;

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
struct DashboardTemplate;

/// GET /login
pub async fn login_page(req: HttpRequest) -> HttpResponse {
    let error = req.uri().query().and_then(|q| {
        if q.contains("error=") {
            Some("Invalid email or password.".to_string())
        } else {
            None
        }
    });
    let tmpl = LoginTemplate { error };
    match tmpl.render() {
        Ok(body) => HttpResponse::Ok().content_type("text/html").body(body),
        Err(e) => {
            tracing::error!("Template render error: {}", e);
            HttpResponse::InternalServerError().body("Internal error")
        }
    }
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
    let tmpl = RegisterTemplate { error };
    match tmpl.render() {
        Ok(body) => HttpResponse::Ok().content_type("text/html").body(body),
        Err(e) => {
            tracing::error!("Template render error: {}", e);
            HttpResponse::InternalServerError().body("Internal error")
        }
    }
}

/// GET /dashboard
pub async fn dashboard_page() -> HttpResponse {
    let tmpl = DashboardTemplate;
    match tmpl.render() {
        Ok(body) => HttpResponse::Ok().content_type("text/html").body(body),
        Err(e) => {
            tracing::error!("Template render error: {}", e);
            HttpResponse::InternalServerError().body("Internal error")
        }
    }
}

/// GET / -- Redirect to dashboard or login
pub async fn home_page(req: HttpRequest) -> HttpResponse {
    // Check for auth cookie
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
