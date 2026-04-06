// BrickOS — JWT token creation and verification
//
// JWT Secret Rotation Procedure:
// 1. Generate new secret: openssl rand -hex 32
// 2. Set JWT_SECRET_PREVIOUS = current JWT_SECRET value
// 3. Set JWT_SECRET = new secret
// 4. Deploy (restart backend)
// 5. Wait for token expiry period (access tokens: 2h default, refresh tokens: 60d)
// 6. Remove JWT_SECRET_PREVIOUS
// 7. Deploy again

use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

/// JWT claims structure. Generic enough for any BrickOS app.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub role: String,
    pub tier: String,
    pub exp: i64,
    pub iat: i64,
}

pub fn create_jwt(
    user_id: &str,
    role: &str,
    tier: &str,
    secret: &str,
    expiry_secs: i64,
) -> anyhow::Result<String> {
    let now = chrono::Utc::now().timestamp();
    let claims = Claims {
        sub: user_id.to_string(),
        role: role.to_string(),
        tier: tier.to_string(),
        iat: now,
        exp: now + expiry_secs,
    };
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| anyhow::anyhow!("JWT encoding failed: {}", e))?;
    Ok(token)
}

pub fn verify_jwt(token: &str, secret: &str) -> anyhow::Result<Claims> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|e| anyhow::anyhow!("JWT verification failed: {}", e))?;
    Ok(token_data.claims)
}

/// Verify a JWT against the current secret, falling back to the previous secret
/// if provided. This supports graceful secret rotation -- old tokens signed with
/// the previous secret remain valid until they expire naturally.
pub fn verify_jwt_with_fallback(
    token: &str,
    current_secret: &str,
    previous_secret: Option<&str>,
) -> anyhow::Result<Claims> {
    match verify_jwt(token, current_secret) {
        Ok(claims) => Ok(claims),
        Err(current_err) => {
            if let Some(prev) = previous_secret {
                verify_jwt(token, prev).map_err(|_| {
                    // Return the original error from the current secret attempt
                    current_err
                })
            } else {
                Err(current_err)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_SECRET: &str = "test_jwt_secret_for_unit_tests";

    #[test]
    fn create_and_verify_jwt_roundtrip() {
        let token = create_jwt("user_123", "admin", "pro", TEST_SECRET, 3600).unwrap();
        let claims = verify_jwt(&token, TEST_SECRET).unwrap();
        assert_eq!(claims.sub, "user_123");
        assert_eq!(claims.role, "admin");
        assert_eq!(claims.tier, "pro");
    }

    #[test]
    fn expired_jwt_is_rejected() {
        // Create a token that expired well beyond the default leeway (60s)
        let token = create_jwt("user_123", "user", "free", TEST_SECRET, -120).unwrap();
        let result = verify_jwt(&token, TEST_SECRET);
        assert!(result.is_err());
    }

    #[test]
    fn wrong_secret_is_rejected() {
        let token = create_jwt("user_123", "user", "free", TEST_SECRET, 3600).unwrap();
        let result = verify_jwt(&token, "wrong_secret");
        assert!(result.is_err());
    }

    #[test]
    fn claims_contain_correct_fields() {
        let token = create_jwt("uid_456", "moderator", "enterprise", TEST_SECRET, 3600).unwrap();
        let claims = verify_jwt(&token, TEST_SECRET).unwrap();
        assert_eq!(claims.sub, "uid_456");
        assert_eq!(claims.role, "moderator");
        assert_eq!(claims.tier, "enterprise");
        assert!(claims.exp > claims.iat);
    }
}
