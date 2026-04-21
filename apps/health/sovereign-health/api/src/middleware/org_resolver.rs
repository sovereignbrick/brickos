// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Sprint 044 #545: Domain-to-org resolution.
// Reads the Host header (or X-Org-Domain from nginx), resolves the org
// by subdomain slug or custom domain. Results cached with 5-minute TTL.
//
// Handlers call `resolve_org_for_request()` directly. This matches the
// existing extractor pattern (AuthenticatedUser) rather than using a
// Transform middleware, which has ownership issues with async resolution.

use actix_web::HttpRequest;
use serde::Serialize;
use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use uuid::Uuid;

/// Org context resolved from the request domain.
#[derive(Debug, Clone, Serialize)]
pub struct OrgContext {
    pub org_id: Uuid,
    pub org_slug: String,
    pub org_name: String,
    pub branding: serde_json::Value,
}

// ── Cache ────────────────────────────────────────────────────────────────────

pub struct OrgCache {
    entries: Mutex<HashMap<String, CacheEntry>>,
}

struct CacheEntry {
    context: Option<OrgContext>,
    expires_at: Instant,
}

const CACHE_TTL: Duration = Duration::from_secs(300);

impl Default for OrgCache {
    fn default() -> Self {
        Self::new()
    }
}

impl OrgCache {
    pub fn new() -> Self {
        Self {
            entries: Mutex::new(HashMap::new()),
        }
    }

    fn get(&self, domain: &str) -> Option<Option<OrgContext>> {
        let entries = self.entries.lock().ok()?;
        let entry = entries.get(domain)?;
        if Instant::now() < entry.expires_at {
            Some(entry.context.clone())
        } else {
            None
        }
    }

    fn set(&self, domain: String, context: Option<OrgContext>) {
        if let Ok(mut entries) = self.entries.lock() {
            if entries.len() > 100 {
                let now = Instant::now();
                entries.retain(|_, v| now < v.expires_at);
            }
            entries.insert(
                domain,
                CacheEntry {
                    context,
                    expires_at: Instant::now() + CACHE_TTL,
                },
            );
        }
    }
}

// ── Domain Resolution ────────────────────────────────────────────────────────

/// Strip a known parent suffix to extract the potential org slug.
///
/// Staging suffixes are checked before production ones because
/// ".demo.brickos.io" also ends with ".brickos.io" and we want to strip
/// the longest match first. Returns `None` for unknown parents.
fn extract_slug_from_domain(domain: &str) -> Option<&str> {
    domain
        .strip_suffix(".demo.sovereignhealth.io")
        .or_else(|| domain.strip_suffix(".demo.brickos.io"))
        .or_else(|| domain.strip_suffix(".sovereignhealth.io"))
        .or_else(|| domain.strip_suffix(".brickos.io"))
}

/// Known platform domains -- no org context.
/// Covers both planes (brickos.io admin plane + sovereignhealth.io end-user plane).
/// Specific hostnames listed here never resolve to an org even if a matching
/// slug exists -- the wildcards below strip the parent suffix first.
const PLATFORM_DOMAINS: &[&str] = &[
    // brickos.io (admin plane)
    "app.brickos.io",
    "demo.brickos.io",
    "api.brickos.io",
    "api-demo.brickos.io",
    "status.brickos.io",
    "brickos.io",
    "www.brickos.io",
    // sovereignhealth.io (end-user plane)
    "app.sovereignhealth.io",
    "api.sovereignhealth.io",
    "demo.sovereignhealth.io",
    "api-demo.sovereignhealth.io",
    "www-demo.sovereignhealth.io",
    "dev.sovereignhealth.io",
    "www.sovereignhealth.io",
    "sovereignhealth.io",
    // local
    "localhost",
];

/// Extract domain from request (prefer X-Org-Domain from nginx).
pub fn extract_domain(req: &HttpRequest) -> Option<String> {
    if let Some(val) = req.headers().get("X-Org-Domain") {
        if let Ok(s) = val.to_str() {
            return Some(s.split(':').next().unwrap_or(s).to_lowercase());
        }
    }
    req.headers()
        .get("Host")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.split(':').next().unwrap_or(s).to_lowercase())
}

/// Resolve a domain to an OrgContext via DB lookup.
///
/// Sprint 045 (Design 025): tenants are reachable on TWO parent domains,
/// one per plane:
/// - `{slug}.sovereignhealth.io` / `{slug}.demo.sovereignhealth.io` (end-user plane)
/// - `{slug}.brickos.io`        / `{slug}.demo.brickos.io`        (admin plane)
///
/// Both resolve to the same OrgContext; the frontend decides which UI
/// surface to render based on the hostname (see src/lib/plane.ts).
async fn resolve_domain(pool: &PgPool, domain: &str) -> Option<OrgContext> {
    if PLATFORM_DOMAINS.contains(&domain) {
        return None;
    }

    let slug_candidate = extract_slug_from_domain(domain);

    // {slug}.<parent> -> organizations.slug lookup
    if let Some(slug) = slug_candidate {
        if !slug.is_empty() && !slug.contains('.') {
            let row = sqlx::query_as::<_, (Uuid, String, String, serde_json::Value)>(
                r#"SELECT id, slug, name, COALESCE(branding, '{}'::jsonb)
                   FROM organizations
                   WHERE slug = $1 AND is_active = true AND is_deleted = false"#,
            )
            .bind(slug)
            .fetch_optional(pool)
            .await
            .ok()
            .flatten();

            return row.map(|(id, slug, name, branding)| OrgContext {
                org_id: id,
                org_slug: slug,
                org_name: name,
                branding,
            });
        }
    }

    // Custom domain -> domain_mappings
    sqlx::query_as::<_, (Uuid, String, String, serde_json::Value)>(
        r#"SELECT o.id, o.slug, o.name, COALESCE(o.branding, '{}'::jsonb)
           FROM domain_mappings dm
           JOIN organizations o ON o.id = dm.org_id
           WHERE dm.domain = $1 AND o.is_active = true AND o.is_deleted = false"#,
    )
    .bind(domain)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten()
    .map(|(id, slug, name, branding)| OrgContext {
        org_id: id,
        org_slug: slug,
        org_name: name,
        branding,
    })
}

// ── Public API ───────────────────────────────────────────────────────────────

/// Resolve OrgContext for the current request. Cached for 5 minutes.
/// Returns None for platform domains and legacy domains.
pub async fn resolve_org_for_request(
    req: &HttpRequest,
    pool: &PgPool,
    cache: &OrgCache,
) -> Option<OrgContext> {
    let domain = extract_domain(req)?;

    if let Some(cached) = cache.get(&domain) {
        return cached;
    }

    let resolved = resolve_domain(pool, &domain).await;
    cache.set(domain, resolved.clone());
    resolved
}

/// Resolve OrgContext by domain string directly (for login handler).
pub async fn resolve_org_by_domain(
    domain: &str,
    pool: &PgPool,
    cache: &OrgCache,
) -> Option<OrgContext> {
    let domain = domain.split(':').next().unwrap_or(domain).to_lowercase();

    if let Some(cached) = cache.get(&domain) {
        return cached;
    }

    let resolved = resolve_domain(pool, &domain).await;
    cache.set(domain, resolved.clone());
    resolved
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn platform_domains_never_resolve() {
        // Both planes' platform hosts must be listed so we never try to
        // interpret them as `{slug}.<parent>`.
        for host in [
            "app.brickos.io",
            "demo.brickos.io",
            "api.brickos.io",
            "app.sovereignhealth.io",
            "api.sovereignhealth.io",
            "demo.sovereignhealth.io",
            "sovereignhealth.io",
            "www.sovereignhealth.io",
            "localhost",
        ] {
            assert!(
                PLATFORM_DOMAINS.contains(&host),
                "{host} must be in PLATFORM_DOMAINS"
            );
        }
    }

    #[test]
    fn slug_extraction_prefers_longest_suffix() {
        // Staging (".demo.brickos.io") must be stripped before prod
        // (".brickos.io") -- the slug is what remains.
        assert_eq!(
            extract_slug_from_domain("test-clinic.demo.brickos.io"),
            Some("test-clinic")
        );
        assert_eq!(
            extract_slug_from_domain("test-clinic.demo.sovereignhealth.io"),
            Some("test-clinic")
        );
        assert_eq!(
            extract_slug_from_domain("test-clinic.brickos.io"),
            Some("test-clinic")
        );
        assert_eq!(
            extract_slug_from_domain("test-clinic.sovereignhealth.io"),
            Some("test-clinic")
        );
    }

    #[test]
    fn slug_extraction_returns_none_for_unknown_parents() {
        assert_eq!(extract_slug_from_domain("clinic.example.com"), None);
        assert_eq!(extract_slug_from_domain("localhost"), None);
        assert_eq!(extract_slug_from_domain("127.0.0.1"), None);
    }

    #[test]
    fn slug_extraction_handles_platform_hosts() {
        // A platform host would extract an empty or "app"/"api"-like slug.
        // resolve_domain() short-circuits on PLATFORM_DOMAINS before this
        // function is called, so these cases never reach slug resolution in
        // practice -- the test documents what would happen if they did.
        assert_eq!(extract_slug_from_domain("app.brickos.io"), Some("app"));
        assert_eq!(
            extract_slug_from_domain("app.sovereignhealth.io"),
            Some("app")
        );
    }

    #[test]
    fn slug_extraction_rejects_nested_subdomains() {
        // After stripping the suffix, the remainder must not contain dots.
        // "a.b.brickos.io" would leave "a.b", which is NOT a valid slug;
        // resolve_domain() guards against this with `!slug.contains('.')`.
        // We verify the extraction itself returns the raw remainder here.
        assert_eq!(
            extract_slug_from_domain("a.b.brickos.io"),
            Some("a.b") // caller rejects because of the dot
        );
    }
}
