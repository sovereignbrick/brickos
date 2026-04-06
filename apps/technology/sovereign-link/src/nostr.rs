//! NIP-89 App Handler listing for NOSTR discovery.
//!
//! Publishes (or logs) a kind-31990 event that tells NOSTR clients
//! about this Sovereign Link instance. For v1.0 the event is logged
//! so operators can publish it manually with their own keypair.

#[cfg(feature = "standalone")]
use crate::config::StandaloneConfig;

/// Publish a NIP-89 "App Handler" event to NOSTR relays.
/// Called on startup if config.nostr_nip89_publish is true.
///
/// For v1.0 this logs the event JSON. Actual relay publishing
/// requires a service keypair, which is planned for v1.1.
#[cfg(feature = "standalone")]
pub async fn publish_app_listing(config: &StandaloneConfig) {
    if !config.nostr_nip89_publish {
        return;
    }

    // Build the NIP-89 event (kind 31990 -- Application Handler)
    let event_content = serde_json::json!({
        "name": "Sovereign Link",
        "about": "Self-hosted URL shortener with NOSTR login. Privacy-first, open source (AGPL-3.0).",
        "website": config.base_url,
        "nips": [98, 89]
    });

    let event = serde_json::json!({
        "kind": 31990,
        "tags": [
            ["d", "sovereign-link"],
            ["k", "1"],
            ["web", &config.base_url, "web"],
            ["web", "https://github.com/sovereignbrick/brickos", "source"]
        ],
        "content": event_content.to_string()
    });

    // Log the event so operators can publish it manually with their own keypair.
    // Actual relay publishing (with a service identity key) is planned for v1.1.
    tracing::info!(
        "NIP-89 app listing (publish manually or configure service keypair):\n{}",
        serde_json::to_string_pretty(&event).unwrap_or_default()
    );
}
