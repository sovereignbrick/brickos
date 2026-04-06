// BrickOS — API key generation and hashing

use rand::RngCore;
use sha2::{Digest, Sha256};

/// Generate a crypto-random API key (32 bytes, hex encoded = 64 chars).
pub fn generate_api_key() -> String {
    let mut bytes = [0u8; 32];
    rand::rng().fill_bytes(&mut bytes);
    hex::encode(bytes)
}

/// SHA-256 hash an API key for secure storage.
pub fn hash_api_key(key: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(key.as_bytes());
    hex::encode(hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn api_key_is_64_hex_chars() {
        let key = generate_api_key();
        assert_eq!(key.len(), 64);
        assert!(key.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn hash_is_deterministic() {
        let key = "test_api_key_value";
        let hash1 = hash_api_key(key);
        let hash2 = hash_api_key(key);
        assert_eq!(hash1, hash2);
    }

    #[test]
    fn generated_key_is_valid_hex() {
        let key = generate_api_key();
        // Verify it decodes back to 32 bytes
        let decoded = hex::decode(&key).expect("API key should be valid hex");
        assert_eq!(decoded.len(), 32);
    }
}
