// BrickOS Platform -- JWT License Key Generation & Validation
//
// On-prem (T5/Enterprise) deployments validate this key offline.
// Claims: org_id, org_name, features, max_admins, max_editors, max_consumers, tier, expires_at
// Signed with RS256 (platform private key). Validated with public key (no phone-home).

use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseClaims {
    pub sub: String, // org_id
    pub org_name: String,
    pub tier: String,          // "enterprise", "premium", etc.
    pub features: Vec<String>, // ["shi", "sovereign-link", "sovereign-voice"]
    pub max_admins: i32,
    pub max_editors: i32,
    pub max_consumers: String, // "unlimited" or number
    pub iss: String,           // "brickos-platform"
    pub iat: i64,
    pub exp: i64,
}

/// Input for license generation
#[derive(Debug)]
pub struct LicenseInput<'a> {
    pub org_id: &'a str,
    pub org_name: &'a str,
    pub tier: &'a str,
    pub features: Vec<String>,
    pub max_admins: i32,
    pub max_editors: i32,
    pub max_consumers: &'a str,
    pub expires_days: i64,
}

/// Generate a JWT license key for an organization.
/// Uses HS256 with a platform secret (simpler than RS256 for MVP).
pub fn generate_license(input: &LicenseInput, secret: &str) -> anyhow::Result<String> {
    let now = Utc::now().timestamp();
    let claims = LicenseClaims {
        sub: input.org_id.to_string(),
        org_name: input.org_name.to_string(),
        tier: input.tier.to_string(),
        features: input.features.clone(),
        max_admins: input.max_admins,
        max_editors: input.max_editors,
        max_consumers: input.max_consumers.to_string(),
        iss: "brickos-platform".to_string(),
        iat: now,
        exp: now + Duration::days(input.expires_days).num_seconds(),
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| anyhow::anyhow!("License generation failed: {}", e))?;

    Ok(token)
}

/// Validate a license key. Returns claims if valid.
/// For self-hosted instances: validate offline with the public key.
pub fn validate_license(token: &str, secret: &str) -> anyhow::Result<LicenseClaims> {
    let token_data = decode::<LicenseClaims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|e| anyhow::anyhow!("License validation failed: {}", e))?;

    Ok(token_data.claims)
}

/// Check if a license has a specific feature enabled.
pub fn has_feature(claims: &LicenseClaims, feature: &str) -> bool {
    claims.features.iter().any(|f| f == feature)
}

/// Check if a license is within seat limits.
pub fn check_seat_limit(claims: &LicenseClaims, role: &str, current_count: i32) -> bool {
    match role {
        "admin" | "owner" | "tech_admin" | "commercial_admin" => current_count < claims.max_admins,
        "editor" => current_count < claims.max_editors,
        "consumer" => {
            claims.max_consumers == "unlimited" || {
                claims
                    .max_consumers
                    .parse::<i32>()
                    .map_or(true, |max| current_count < max)
            }
        }
        _ => true,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_SECRET: &str = "test-license-secret-for-unit-tests-only";

    #[test]
    fn generate_and_validate_roundtrip() {
        let token = generate_license(
            &LicenseInput {
                org_id: "org-123",
                org_name: "Test Clinic",
                tier: "enterprise",
                features: vec!["shi".into(), "sovereign-link".into()],
                max_admins: 3,
                max_editors: 10,
                max_consumers: "unlimited",
                expires_days: 365,
            },
            TEST_SECRET,
        )
        .unwrap();

        let claims = validate_license(&token, TEST_SECRET).unwrap();
        assert_eq!(claims.sub, "org-123");
        assert_eq!(claims.org_name, "Test Clinic");
        assert_eq!(claims.tier, "enterprise");
        assert_eq!(claims.features.len(), 2);
        assert_eq!(claims.max_admins, 3);
        assert_eq!(claims.max_consumers, "unlimited");
    }

    #[test]
    fn expired_license_rejected() {
        let token = generate_license(
            &LicenseInput {
                org_id: "org-456",
                org_name: "Expired",
                tier: "enterprise",
                features: vec![],
                max_admins: 1,
                max_editors: 1,
                max_consumers: "10",
                expires_days: -1,
            },
            TEST_SECRET,
        )
        .unwrap();

        let result = validate_license(&token, TEST_SECRET);
        assert!(result.is_err());
    }

    #[test]
    fn seat_limits() {
        let claims = LicenseClaims {
            sub: "org".into(),
            org_name: "Test".into(),
            tier: "enterprise".into(),
            features: vec![],
            max_admins: 3,
            max_editors: 10,
            max_consumers: "unlimited".into(),
            iss: "brickos-platform".into(),
            iat: 0,
            exp: i64::MAX,
        };

        assert!(check_seat_limit(&claims, "admin", 2));
        assert!(!check_seat_limit(&claims, "admin", 3));
        assert!(check_seat_limit(&claims, "editor", 9));
        assert!(!check_seat_limit(&claims, "editor", 10));
        assert!(check_seat_limit(&claims, "consumer", 99999));
    }

    #[test]
    fn feature_check() {
        let claims = LicenseClaims {
            sub: "org".into(),
            org_name: "Test".into(),
            tier: "enterprise".into(),
            features: vec!["shi".into(), "sovereign-link".into()],
            max_admins: 1,
            max_editors: 1,
            max_consumers: "10".into(),
            iss: "brickos-platform".into(),
            iat: 0,
            exp: i64::MAX,
        };

        assert!(has_feature(&claims, "shi"));
        assert!(has_feature(&claims, "sovereign-link"));
        assert!(!has_feature(&claims, "sovereign-voice"));
    }
}
