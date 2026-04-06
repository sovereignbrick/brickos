// BrickOS — Token generation and verification utilities

use rand::RngCore;
use sha2::{Digest, Sha256};

/// Generate a crypto-random refresh token (32 bytes, hex encoded).
pub fn generate_refresh_token() -> String {
    let mut bytes = [0u8; 32];
    rand::rng().fill_bytes(&mut bytes);
    hex::encode(bytes)
}

/// SHA-256 hash a refresh token for storage.
pub fn hash_refresh_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    hex::encode(hasher.finalize())
}

/// Generate a crypto-random verification token (32 bytes, hex encoded = 64 chars).
pub fn generate_verification_token() -> String {
    let mut bytes = [0u8; 32];
    rand::rng().fill_bytes(&mut bytes);
    hex::encode(bytes)
}

/// Constant-time token comparison to prevent timing attacks.
pub fn verify_token_constant_time(provided: &str, stored: &str) -> bool {
    if provided.len() != stored.len() {
        return false;
    }
    provided
        .as_bytes()
        .iter()
        .zip(stored.as_bytes().iter())
        .fold(0u8, |acc, (a, b)| acc | (a ^ b))
        == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn refresh_token_is_64_hex_chars() {
        let token = generate_refresh_token();
        assert_eq!(token.len(), 64);
        assert!(token.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn token_hash_is_deterministic() {
        let token = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
        let hash1 = hash_refresh_token(token);
        let hash2 = hash_refresh_token(token);
        assert_eq!(hash1, hash2);
    }

    #[test]
    fn verification_token_is_64_hex_chars() {
        let token = generate_verification_token();
        assert_eq!(token.len(), 64);
        assert!(token.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn constant_time_compare_same_strings() {
        let a = "hello_world_token";
        assert!(verify_token_constant_time(a, a));
    }

    #[test]
    fn constant_time_compare_different_strings() {
        assert!(!verify_token_constant_time("token_a", "token_b"));
    }
}
