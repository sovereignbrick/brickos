// BrickOS — Argon2 password hashing and verification

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

pub fn hash_password(password: &str) -> anyhow::Result<String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| anyhow::anyhow!("Password hashing failed: {}", e))?;
    Ok(hash.to_string())
}

pub fn verify_password(password: &str, hash: &str) -> bool {
    let parsed_hash = match PasswordHash::new(hash) {
        Ok(h) => h,
        Err(_) => return false,
    };
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hash_and_verify_roundtrip() {
        let password = "SecureP4ss!";
        let hash = hash_password(password).unwrap();
        assert!(verify_password(password, &hash));
    }

    #[test]
    fn wrong_password_fails_verification() {
        let hash = hash_password("CorrectPassword1").unwrap();
        assert!(!verify_password("WrongPassword1", &hash));
    }

    #[test]
    fn empty_password_hashes_successfully() {
        // Argon2 can hash empty strings - the validation layer should reject them,
        // but the hashing function itself does not refuse.
        let result = hash_password("");
        assert!(result.is_ok());
    }

    #[test]
    fn hash_is_not_plaintext() {
        let password = "MyPassword123";
        let hash = hash_password(password).unwrap();
        assert_ne!(hash, password);
        assert!(hash.starts_with("$argon2"));
    }
}
