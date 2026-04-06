//! Start9 service auto-discovery.
//!
//! Scans for sibling services running on the same Start9 node
//! and offers to create short links for their .onion addresses.
//!
//! Only active in standalone mode (Start9 deployment).

#[cfg(feature = "standalone")]
use actix_web::{web, HttpResponse};
#[cfg(feature = "standalone")]
use serde::{Deserialize, Serialize};
#[cfg(feature = "standalone")]
use std::sync::Arc;

#[cfg(feature = "standalone")]
use crate::db::LinkStore;

/// A discovered service on the Start9 node.
#[cfg(feature = "standalone")]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiscoveredService {
    pub id: String,
    pub title: String,
    pub onion_address: Option<String>,
    pub status: String,
    pub suggested_code: String,
}

/// Response from the discovery endpoint.
#[cfg(feature = "standalone")]
#[derive(Debug, Serialize)]
pub struct DiscoveryResponse {
    pub services: Vec<DiscoveredService>,
    pub total: usize,
    pub already_linked: usize,
}

/// GET /discover - Scan for sibling Start9 services.
///
/// Attempts to read the Start9 service manifest via the local API.
/// Falls back to checking common .onion file locations.
#[cfg(feature = "standalone")]
pub async fn discover_services(
    store: web::Data<Arc<dyn LinkStore>>,
) -> HttpResponse {
    let mut services = Vec::new();

    // Method 1: Try Start9 manager API (if running inside Start9)
    // The Start9 manager exposes service info at a known internal endpoint.
    if let Ok(start9_services) = scan_start9_api().await {
        services.extend(start9_services);
    }

    // Method 2: Check common Tor hidden service directories
    if services.is_empty() {
        if let Ok(tor_services) = scan_tor_directories().await {
            services.extend(tor_services);
        }
    }

    // Check which services already have short links
    let mut already_linked = 0;
    for svc in &mut services {
        if let Some(ref onion) = svc.onion_address {
            // Check if a link already exists for this onion address
            if let Ok(Some(_)) = store.get_by_code(&svc.suggested_code).await {
                already_linked += 1;
            }
        }
    }

    let total = services.len();
    HttpResponse::Ok().json(DiscoveryResponse {
        services,
        total,
        already_linked,
    })
}

/// POST /discover/create-all - Create short links for all discovered services.
#[cfg(feature = "standalone")]
pub async fn create_discovered_links(
    store: web::Data<Arc<dyn LinkStore>>,
    body: web::Json<Vec<DiscoveredService>>,
) -> HttpResponse {
    let mut created = 0;
    let mut errors = Vec::new();

    for svc in body.iter() {
        let onion = match &svc.onion_address {
            Some(addr) => addr.clone(),
            None => continue,
        };

        let target = if onion.starts_with("http") {
            onion
        } else {
            format!("http://{}", onion)
        };

        let req = crate::models::CreateLinkRequest {
            target_url: target,
            code: Some(svc.suggested_code.clone()),
            title: Some(svc.title.clone()),
            link_type: Some("generic".to_string()),
            domain: None,
            app_key: None,
            expires_at: None,
        };

        match store.create_link(req, None).await {
            Ok(_) => created += 1,
            Err(e) => errors.push(format!("{}: {}", svc.id, e)),
        }
    }

    HttpResponse::Ok().json(serde_json::json!({
        "created": created,
        "errors": errors,
    }))
}

/// Scan the Start9 manager API for installed services.
#[cfg(feature = "standalone")]
async fn scan_start9_api() -> Result<Vec<DiscoveredService>, String> {
    // Start9 exposes service info via its internal manager API.
    // The exact endpoint depends on Start9 OS version.
    // Try the known endpoints in order.

    let endpoints = [
        "http://localhost:5959/api/v0/packages",  // Start9 OS 0.3.x
        "http://embassy/api/v0/packages",          // Start9 OS internal hostname
    ];

    for endpoint in &endpoints {
        match reqwest::get(*endpoint).await {
            Ok(resp) if resp.status().is_success() => {
                if let Ok(body) = resp.text().await {
                    return parse_start9_response(&body);
                }
            }
            _ => continue,
        }
    }

    Err("Start9 API not reachable (not running inside Start9?)".to_string())
}

/// Parse Start9 package list into discovered services.
#[cfg(feature = "standalone")]
fn parse_start9_response(body: &str) -> Result<Vec<DiscoveredService>, String> {
    // Start9 returns a JSON object with package IDs as keys
    let packages: serde_json::Value = serde_json::from_str(body)
        .map_err(|e| format!("Failed to parse Start9 response: {}", e))?;

    let mut services = Vec::new();

    if let Some(obj) = packages.as_object() {
        for (id, pkg) in obj {
            // Skip ourselves
            if id == "sovereign-link" {
                continue;
            }

            let title = pkg.get("manifest")
                .and_then(|m| m.get("title"))
                .and_then(|t| t.as_str())
                .unwrap_or(id)
                .to_string();

            let onion = pkg.get("interface_addresses")
                .and_then(|i| i.get("main"))
                .and_then(|m| m.get("tor_address"))
                .and_then(|t| t.as_str())
                .map(|s| s.to_string());

            let status = pkg.get("status")
                .and_then(|s| s.get("main"))
                .and_then(|m| m.as_str())
                .unwrap_or("unknown")
                .to_string();

            // Generate a short suggested code from the package ID
            let suggested = id.chars()
                .filter(|c| c.is_ascii_alphanumeric())
                .take(8)
                .collect::<String>()
                .to_lowercase();

            services.push(DiscoveredService {
                id: id.clone(),
                title,
                onion_address: onion,
                status,
                suggested_code: if suggested.is_empty() { id.clone() } else { suggested },
            });
        }
    }

    Ok(services)
}

/// Scan common Tor hidden service directories for .onion addresses.
#[cfg(feature = "standalone")]
async fn scan_tor_directories() -> Result<Vec<DiscoveredService>, String> {
    use std::path::Path;

    let tor_dirs = [
        "/var/lib/tor",
        "/var/lib/tor/hidden_service",
        "/home/tor",
    ];

    let mut services = Vec::new();

    for dir in &tor_dirs {
        let path = Path::new(dir);
        if !path.exists() {
            continue;
        }

        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                let hostname_path = entry.path().join("hostname");
                if hostname_path.exists() {
                    if let Ok(hostname) = std::fs::read_to_string(&hostname_path) {
                        let onion = hostname.trim().to_string();
                        let name = entry.file_name().to_string_lossy().to_string();
                        let code = name.chars()
                            .filter(|c| c.is_ascii_alphanumeric())
                            .take(8)
                            .collect::<String>()
                            .to_lowercase();

                        services.push(DiscoveredService {
                            id: name.clone(),
                            title: name,
                            onion_address: Some(onion),
                            status: "running".to_string(),
                            suggested_code: code,
                        });
                    }
                }
            }
        }
    }

    Ok(services)
}
