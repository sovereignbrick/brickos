// ============================================================================
//  BrickOS — Shared Encryption Library
//
//  AES-256-GCM encryption for data at rest.
//  Used by all BrickOS applications for health data, chat messages,
//  MFA secrets, and other sensitive fields.
//
//  https://brickos.io/
//  AGPL-3.0 — https://github.com/sovereignbrick/brickos
// ============================================================================

// generic-array 0.14.9 deprecated from_slice; fix requires aes-gcm upgrade to generic-array 1.x
#![allow(deprecated)]

use aes_gcm::aead::rand_core::RngCore;
use aes_gcm::aead::{Aead, KeyInit, OsRng};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};

/// AES-256-GCM encryptor for sensitive data at rest.
///
/// If no encryption key is provided, operates in passthrough mode
/// (plaintext stored as-is). This supports self-hosted users
/// who opt out of encryption.
pub struct Encryptor {
    cipher: Option<Aes256Gcm>,
}

impl Encryptor {
    /// Create from optional hex-encoded 256-bit key (64 hex chars).
    pub fn new(hex_key: Option<&str>) -> Self {
        let cipher = hex_key.map(|key| {
            let key_bytes = hex::decode(key).expect("Invalid ENCRYPTION_KEY hex");
            assert_eq!(
                key_bytes.len(),
                32,
                "ENCRYPTION_KEY must be 32 bytes (64 hex chars)"
            );
            let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
            Aes256Gcm::new(key)
        });
        Self { cipher }
    }

    /// Encrypt a plaintext string. Returns "v1:{base64_iv}:{base64_ciphertext+tag}".
    /// If no key configured, returns plaintext unchanged.
    pub fn encrypt(&self, plaintext: &str) -> String {
        match &self.cipher {
            Some(cipher) => {
                let mut nonce_bytes = [0u8; 12];
                OsRng.fill_bytes(&mut nonce_bytes);
                let nonce = Nonce::from_slice(&nonce_bytes);
                let ciphertext = cipher
                    .encrypt(nonce, plaintext.as_bytes())
                    .expect("AES-GCM encryption failed");
                format!(
                    "v1:{}:{}",
                    BASE64.encode(nonce_bytes),
                    BASE64.encode(ciphertext)
                )
            }
            None => plaintext.to_string(),
        }
    }

    /// Decrypt an encrypted string. If value does not start with "v1:",
    /// treats it as legacy plaintext and returns as-is.
    pub fn decrypt(&self, encrypted: &str) -> Result<String, anyhow::Error> {
        if !encrypted.starts_with("v1:") {
            return Ok(encrypted.to_string());
        }
        let cipher = self
            .cipher
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("Cannot decrypt without ENCRYPTION_KEY"))?;
        let parts: Vec<&str> = encrypted.splitn(3, ':').collect();
        if parts.len() != 3 {
            anyhow::bail!("Invalid encrypted format");
        }
        let nonce_bytes = BASE64.decode(parts[1])?;
        let ciphertext = BASE64.decode(parts[2])?;
        let nonce = Nonce::from_slice(&nonce_bytes);
        let plaintext = cipher
            .decrypt(nonce, ciphertext.as_ref())
            .map_err(|_| anyhow::anyhow!("Decryption failed (wrong key or tampered data)"))?;
        Ok(String::from_utf8(plaintext)?)
    }

    /// Encrypt an f64 value for storage.
    pub fn encrypt_f64(&self, value: f64) -> String {
        self.encrypt(&value.to_string())
    }

    /// Decrypt a stored string back to f64.
    pub fn decrypt_f64(&self, encrypted: &str) -> f64 {
        self.decrypt(encrypted)
            .unwrap_or_else(|_| encrypted.to_string())
            .parse::<f64>()
            .unwrap_or(0.0)
    }

    /// Encrypt an optional string.
    pub fn encrypt_opt(&self, value: Option<&str>) -> Option<String> {
        value.map(|v| self.encrypt(v))
    }

    /// Decrypt an optional string.
    pub fn decrypt_opt(&self, encrypted: Option<String>) -> Option<String> {
        encrypted.and_then(|v| self.decrypt(&v).ok())
    }

    /// Returns true if encryption is enabled.
    pub fn is_enabled(&self) -> bool {
        self.cipher.is_some()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_key() -> String {
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef".to_string()
    }

    #[test]
    fn encrypt_decrypt_roundtrip() {
        let enc = Encryptor::new(Some(&test_key()));
        let original = "Hello, World! 123.456";
        let encrypted = enc.encrypt(original);
        assert!(encrypted.starts_with("v1:"));
        let decrypted = enc.decrypt(&encrypted).unwrap();
        assert_eq!(decrypted, original);
    }

    #[test]
    fn different_ivs_produce_different_ciphertexts() {
        let enc = Encryptor::new(Some(&test_key()));
        let a = enc.encrypt("same value");
        let b = enc.encrypt("same value");
        assert_ne!(a, b);
    }

    #[test]
    fn tampered_ciphertext_fails() {
        let enc = Encryptor::new(Some(&test_key()));
        let mut encrypted = enc.encrypt("secret");
        encrypted.push('X');
        assert!(enc.decrypt(&encrypted).is_err());
    }

    #[test]
    fn legacy_plaintext_passes_through() {
        let enc = Encryptor::new(Some(&test_key()));
        let result = enc.decrypt("5.2000").unwrap();
        assert_eq!(result, "5.2000");
    }

    #[test]
    fn no_key_passthrough_mode() {
        let enc = Encryptor::new(None);
        let encrypted = enc.encrypt("hello");
        assert_eq!(encrypted, "hello");
        assert!(!enc.is_enabled());
    }

    #[test]
    fn f64_roundtrip() {
        let enc = Encryptor::new(Some(&test_key()));
        let val = 5.2345;
        let encrypted = enc.encrypt_f64(val);
        let decrypted = enc.decrypt_f64(&encrypted);
        assert!((decrypted - val).abs() < 0.0001);
    }

    #[test]
    fn opt_roundtrip() {
        let enc = Encryptor::new(Some(&test_key()));
        let encrypted = enc.encrypt_opt(Some("note text"));
        let decrypted = enc.decrypt_opt(encrypted);
        assert_eq!(decrypted.as_deref(), Some("note text"));

        let none_encrypted = enc.encrypt_opt(None);
        let none_decrypted = enc.decrypt_opt(none_encrypted);
        assert_eq!(none_decrypted, None);
    }

    #[test]
    fn decrypt_with_wrong_key_fails() {
        let enc1 = Encryptor::new(Some(&test_key()));
        let encrypted = enc1.encrypt("secret data");

        let wrong_key = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
        let enc2 = Encryptor::new(Some(wrong_key));
        assert!(enc2.decrypt(&encrypted).is_err());
    }

    #[test]
    fn encrypted_output_differs_from_plaintext() {
        let enc = Encryptor::new(Some(&test_key()));
        let plaintext = "sensitive information";
        let encrypted = enc.encrypt(plaintext);
        assert_ne!(encrypted, plaintext);
    }

    #[test]
    fn empty_string_encrypts_and_decrypts() {
        let enc = Encryptor::new(Some(&test_key()));
        let encrypted = enc.encrypt("");
        assert!(encrypted.starts_with("v1:"));
        let decrypted = enc.decrypt(&encrypted).unwrap();
        assert_eq!(decrypted, "");
    }

    #[test]
    fn large_payload_encrypts_and_decrypts() {
        let enc = Encryptor::new(Some(&test_key()));
        let large_data = "A".repeat(1_000_000); // 1 MB
        let encrypted = enc.encrypt(&large_data);
        let decrypted = enc.decrypt(&encrypted).unwrap();
        assert_eq!(decrypted, large_data);
    }

    #[test]
    fn is_enabled_returns_true_with_key() {
        let enc = Encryptor::new(Some(&test_key()));
        assert!(enc.is_enabled());
    }
}
