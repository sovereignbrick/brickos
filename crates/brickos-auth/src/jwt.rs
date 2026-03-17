// BrickOS — JWT token creation and verification

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
