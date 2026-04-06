//! NIP-89 App Handler listing for NOSTR discovery.
//!
//! Publishes a kind-31990 event that tells NOSTR clients about this
//! Sovereign Link instance. Requires a service nsec for signing.
//! Falls back to logging the event JSON if no nsec is configured.

#[cfg(feature = "standalone")]
use crate::config::StandaloneConfig;

/// Publish a NIP-89 "App Handler" event to configured NOSTR relays.
/// If no nsec is configured, logs the event JSON for manual publishing.
#[cfg(feature = "standalone")]
pub async fn publish_app_listing(config: &StandaloneConfig) {
    if !config.nostr_nip89_publish {
        return;
    }

    let event_content = serde_json::json!({
        "name": "Sovereign Link",
        "about": "Self-hosted URL shortener with NOSTR login. Part of the brickos.io platform. Privacy-first, open source (AGPL-3.0).",
        "website": config.base_url,
        "nips": [98, 89]
    });

    let tags = vec![
        vec!["d".to_string(), "sovereign-link".to_string()],
        vec!["k".to_string(), "1".to_string()],
        vec!["web".to_string(), config.base_url.clone(), "web".to_string()],
        vec!["web".to_string(), "https://github.com/sovereignbrick/brickos".to_string(), "source".to_string()],
    ];

    let content = event_content.to_string();

    // If we have an nsec, sign and publish to relays
    match &config.nostr_nsec {
        Some(nsec) if !nsec.is_empty() => {
            match publish_to_relays(nsec, 31990, &content, &tags, &config.nostr_relays).await {
                Ok(event_id) => {
                    tracing::info!("NIP-89 app listing published to {} relays. Event ID: {}", config.nostr_relays.len(), event_id);
                }
                Err(e) => {
                    tracing::warn!("Failed to publish NIP-89 listing: {}. Logging event instead.", e);
                    log_event_json(31990, &content, &tags);
                }
            }
        }
        _ => {
            tracing::info!("No NOSTR nsec configured. Logging NIP-89 event for manual publishing.");
            log_event_json(31990, &content, &tags);
        }
    }
}

/// Sign and publish an event to multiple relays via WebSocket.
#[cfg(feature = "standalone")]
async fn publish_to_relays(
    nsec: &str,
    kind: u32,
    content: &str,
    tags: &[Vec<String>],
    relays: &[String],
) -> Result<String, String> {
    use secp256k1::{Secp256k1, SecretKey};
    use sha2::{Sha256, Digest};

    // Decode nsec (bech32) to raw 32-byte secret key
    let sk_bytes = decode_nsec(nsec)?;
    let secp = Secp256k1::new();
    let sk = SecretKey::from_slice(&sk_bytes).map_err(|e| format!("Invalid secret key: {}", e))?;
    let keypair = sk.keypair(&secp);
    let (xonly_pk, _) = keypair.x_only_public_key();
    let pk_hex = hex::encode(xonly_pk.serialize());

    let created_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    // Build event for signing (NIP-01)
    let tags_json: Vec<serde_json::Value> = tags
        .iter()
        .map(|t| serde_json::Value::Array(t.iter().map(|s| serde_json::Value::String(s.clone())).collect()))
        .collect();

    // Event ID = SHA256([0, pubkey, created_at, kind, tags, content])
    let serialized = serde_json::json!([0, pk_hex, created_at, kind, tags_json, content]);
    let id_hash = Sha256::digest(serialized.to_string().as_bytes());
    let event_id = hex::encode(id_hash);

    // Sign the event ID with Schnorr (BIP-340)
    #[allow(deprecated)]
    let sig = secp.sign_schnorr_no_aux_rand(id_hash.as_slice(), &keypair);
    let sig_hex = hex::encode(sig.as_ref());

    let event = serde_json::json!({
        "id": event_id,
        "pubkey": pk_hex,
        "created_at": created_at,
        "kind": kind,
        "tags": tags_json,
        "content": content,
        "sig": sig_hex
    });

    let relay_msg = serde_json::json!(["EVENT", event]).to_string();

    // Publish to each relay (best-effort, don't block startup)
    let mut success_count = 0;
    for relay_url in relays {
        match publish_to_single_relay(relay_url, &relay_msg).await {
            Ok(_) => {
                tracing::debug!("Published to {}", relay_url);
                success_count += 1;
            }
            Err(e) => {
                tracing::warn!("Failed to publish to {}: {}", relay_url, e);
            }
        }
    }

    if success_count == 0 {
        return Err("Failed to publish to any relay".to_string());
    }

    Ok(event_id)
}

/// Publish a message to a single WebSocket relay.
#[cfg(feature = "standalone")]
async fn publish_to_single_relay(url: &str, message: &str) -> Result<(), String> {
    use tokio_tungstenite::connect_async;
    use futures_util::SinkExt;

    let (mut ws, _) = connect_async(url)
        .await
        .map_err(|e| format!("WebSocket connect failed: {}", e))?;

    ws.send(tokio_tungstenite::tungstenite::Message::Text(message.to_string()))
        .await
        .map_err(|e| format!("WebSocket send failed: {}", e))?;

    // Wait briefly for OK response (best-effort, don't block)
    use futures_util::StreamExt;
    match tokio::time::timeout(std::time::Duration::from_secs(5), ws.next()).await {
        Ok(Some(Ok(msg))) => {
            let text = msg.to_text().unwrap_or("");
            if text.contains("\"OK\"") {
                tracing::debug!("Relay accepted event: {}", text);
            } else {
                tracing::debug!("Relay response: {}", text);
            }
        }
        Ok(Some(Err(e))) => {
            tracing::debug!("Relay response error (non-fatal): {}", e);
        }
        _ => {
            tracing::debug!("No relay response within 5s (event may still be accepted)");
        }
    }

    let _ = ws.close(None).await;
    Ok(())
}

/// Decode a bech32 nsec to raw 32-byte secret key.
#[cfg(feature = "standalone")]
fn decode_nsec(nsec: &str) -> Result<Vec<u8>, String> {
    // nsec1... is bech32-encoded. For now, accept hex directly as fallback.
    if nsec.starts_with("nsec1") {
        // Bech32 decoding - simplified implementation
        // For proper bech32, add the `bech32` crate. For now, reject with clear message.
        Err("bech32 nsec decoding requires the bech32 crate. Configure SOVEREIGN_LINK_NOSTR_NSEC as hex (64 chars) or add bech32 dependency.".to_string())
    } else if nsec.len() == 64 && nsec.chars().all(|c| c.is_ascii_hexdigit()) {
        // Accept raw hex secret key
        hex::decode(nsec).map_err(|e| format!("Invalid hex key: {}", e))
    } else {
        Err("Invalid nsec format. Provide bech32 (nsec1...) or hex (64 chars).".to_string())
    }
}

/// Log the event JSON for manual publishing.
#[cfg(feature = "standalone")]
fn log_event_json(kind: u32, content: &str, tags: &[Vec<String>]) {
    let tags_json: Vec<serde_json::Value> = tags
        .iter()
        .map(|t| serde_json::Value::Array(t.iter().map(|s| serde_json::Value::String(s.clone())).collect()))
        .collect();

    let event = serde_json::json!({
        "kind": kind,
        "tags": tags_json,
        "content": content
    });

    tracing::info!(
        "NIP-89 app listing (publish manually with your keypair):\n{}",
        serde_json::to_string_pretty(&event).unwrap_or_default()
    );
}
