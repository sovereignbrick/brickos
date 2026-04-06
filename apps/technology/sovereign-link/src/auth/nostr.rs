use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Debug, Deserialize)]
pub struct Nip98AuthRequest {
    pub event: Nip98Event,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Nip98Event {
    pub id: String,
    pub pubkey: String,
    pub created_at: i64,
    pub kind: u32,
    pub tags: Vec<Vec<String>>,
    pub content: String,
    pub sig: String,
}

/// Verify a NIP-98 HTTP Auth event.
///
/// Checks:
/// 1. Kind == 27235
/// 2. Timestamp within 60s of now
/// 3. URL tag matches expected endpoint
/// 4. Event ID == SHA-256 of canonical serialization
/// 5. Schnorr signature valid against pubkey
pub fn verify_nip98_event(event: &Nip98Event, expected_url: &str) -> Result<(), String> {
    // 1. Kind must be 27235
    if event.kind != 27235 {
        return Err("Invalid event kind, expected 27235".into());
    }

    // 2. Check created_at is within 60 seconds of now
    let now = chrono::Utc::now().timestamp();
    if (now - event.created_at).unsigned_abs() > 60 {
        return Err("Event timestamp too old or too far in future".into());
    }

    // 3. Check URL tag matches our endpoint
    let url_tag = event.tags.iter().find(|t| t.len() >= 2 && t[0] == "u");
    match url_tag {
        Some(tag) if tag[1] == expected_url => {}
        _ => return Err("URL tag missing or does not match".into()),
    }

    // 4. Verify event ID = SHA-256 of [0, pubkey, created_at, kind, tags, content]
    let canonical = serde_json::json!([
        0,
        event.pubkey,
        event.created_at,
        event.kind,
        event.tags,
        event.content,
    ]);
    let canonical_bytes = canonical.to_string();
    let mut hasher = Sha256::new();
    hasher.update(canonical_bytes.as_bytes());
    let computed_id = hex::encode(hasher.finalize());

    if computed_id != event.id {
        return Err(format!(
            "Event ID mismatch: expected {}, got {}",
            computed_id, event.id
        ));
    }

    // 5. Verify schnorr signature against pubkey using secp256k1
    verify_schnorr_signature(&event.id, &event.pubkey, &event.sig)?;

    Ok(())
}

/// Verify a BIP-340 schnorr signature.
/// - `msg_hex`: the 32-byte message (event ID) as hex
/// - `pubkey_hex`: the 32-byte x-only public key as hex
/// - `sig_hex`: the 64-byte schnorr signature as hex
fn verify_schnorr_signature(msg_hex: &str, pubkey_hex: &str, sig_hex: &str) -> Result<(), String> {
    use secp256k1::XOnlyPublicKey;

    let msg_bytes = hex::decode(msg_hex).map_err(|e| format!("Invalid event ID hex: {}", e))?;
    let pubkey_bytes = hex::decode(pubkey_hex).map_err(|e| format!("Invalid pubkey hex: {}", e))?;
    let sig_bytes = hex::decode(sig_hex).map_err(|e| format!("Invalid signature hex: {}", e))?;

    if msg_bytes.len() != 32 {
        return Err("Event ID must be 32 bytes".into());
    }
    if pubkey_bytes.len() != 32 {
        return Err("Public key must be 32 bytes".into());
    }
    if sig_bytes.len() != 64 {
        return Err("Signature must be 64 bytes".into());
    }

    let pubkey = XOnlyPublicKey::from_slice(&pubkey_bytes)
        .map_err(|e| format!("Invalid public key: {}", e))?;
    let sig = secp256k1::schnorr::Signature::from_slice(&sig_bytes)
        .map_err(|e| format!("Invalid signature: {}", e))?;

    let secp = secp256k1::Secp256k1::verification_only();
    secp.verify_schnorr(&sig, &msg_bytes, &pubkey)
        .map_err(|_| "Signature verification failed".to_string())?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rejects_wrong_kind() {
        let event = Nip98Event {
            id: "abc".into(),
            pubkey: "def".into(),
            created_at: chrono::Utc::now().timestamp(),
            kind: 1,
            tags: vec![vec!["u".into(), "http://localhost/auth/nostr".into()]],
            content: String::new(),
            sig: "ghi".into(),
        };
        let result = verify_nip98_event(&event, "http://localhost/auth/nostr");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("27235"));
    }

    #[test]
    fn test_rejects_old_timestamp() {
        let event = Nip98Event {
            id: "abc".into(),
            pubkey: "def".into(),
            created_at: chrono::Utc::now().timestamp() - 120,
            kind: 27235,
            tags: vec![vec!["u".into(), "http://localhost/auth/nostr".into()]],
            content: String::new(),
            sig: "ghi".into(),
        };
        let result = verify_nip98_event(&event, "http://localhost/auth/nostr");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("timestamp"));
    }

    #[test]
    fn test_rejects_wrong_url() {
        let event = Nip98Event {
            id: "abc".into(),
            pubkey: "def".into(),
            created_at: chrono::Utc::now().timestamp(),
            kind: 27235,
            tags: vec![vec!["u".into(), "http://other.com/auth/nostr".into()]],
            content: String::new(),
            sig: "ghi".into(),
        };
        let result = verify_nip98_event(&event, "http://localhost/auth/nostr");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("URL"));
    }
}
