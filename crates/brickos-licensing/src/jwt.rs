// ============================================================================
//  brickos-licensing -- RS256 JWT signing and validation
//
//  License certificates are signed with the platform RS256 private key
//  (held by Sovereign Brick, never deployed) and validated with the public
//  key (embedded in every BrickOS binary).
//
//  Production keypair generation (one-time, manual):
//
//      openssl genpkey -algorithm RSA -out license_signing_key.pem \
//          -pkeyopt rsa_keygen_bits:2048
//      openssl pkey -in license_signing_key.pem -pubout \
//          -out license_public_key.pem
//
//  Store license_signing_key.pem in 1Password Business. Distribute
//  license_public_key.pem with every release artifact (commit to
//  crates/brickos-licensing/keys/license_public_key.pem).
//
//  See design 022 §5.6, §6.
// ============================================================================

use crate::claims::{LicenseClaims, LicenseInput};
use crate::error::{LicensingError, Result};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use uuid::Uuid;

/// Generate a signed RS256 license JWT for an organization.
///
/// The private_key_pem must be a PKCS#8 or PKCS#1 RSA private key in PEM
/// format. Use `EncodingKey::from_rsa_pem` rules.
pub fn generate_license(input: &LicenseInput, private_key_pem: &[u8]) -> Result<(String, String)> {
    let now = Utc::now().timestamp();
    let jti = Uuid::new_v4().to_string();

    let claims = LicenseClaims {
        iss: "brickos-platform".to_string(),
        sub: input.org_id.to_string(),
        aud: input.aud.clone(),
        iat: now,
        exp: now + Duration::days(input.expires_days).num_seconds(),
        nbf: now,
        jti: jti.clone(),
        org_name: input.org_name.to_string(),
        tier: input.tier.to_string(),
        features: input.features.clone(),
        max_owners: input.max_owners,
        max_practitioners: input.max_practitioners,
        max_members: input.max_members,
        billing_model: input.billing_model.to_string(),
    };

    let key = EncodingKey::from_rsa_pem(private_key_pem)
        .map_err(|e| LicensingError::KeyLoad(format!("private key: {e}")))?;

    let mut header = Header::new(Algorithm::RS256);
    header.kid = Some("license-2026-04-01".to_string()); // matches design 022 §6.1 example

    let token = encode(&header, &claims, &key)?;
    Ok((token, jti))
}

/// Validate an RS256 license JWT against the public key.
///
/// Performs the full validation chain from design 022 §6.2:
///   1. Signature verification (RS256, public key)
///   2. exp / nbf time bounds with 60s clock skew tolerance
///   3. Audience check (must contain at least one of expected_audience)
///
/// Revocation list lookup is the caller's responsibility (it requires DB
/// access and is cheap to cache in memory; this fn is keyless and stateless).
pub fn validate_license(
    token: &str,
    public_key_pem: &[u8],
    expected_audience: &[&str],
) -> Result<LicenseClaims> {
    let key = DecodingKey::from_rsa_pem(public_key_pem)
        .map_err(|e| LicensingError::KeyLoad(format!("public key: {e}")))?;

    let mut validation = Validation::new(Algorithm::RS256);
    validation.leeway = 60; // 60 second clock skew tolerance
                            // Audience check is enforced manually below so we can return a structured
                            // error instead of a generic JWT error
    validation.validate_aud = false;

    let token_data =
        decode::<LicenseClaims>(token, &key, &validation).map_err(LicensingError::JwtEncode)?;

    let claims = token_data.claims;

    // Audience check
    if !expected_audience.is_empty() {
        let matched = expected_audience
            .iter()
            .any(|exp| claims.aud.iter().any(|got| got == exp));
        if !matched {
            return Err(LicensingError::AudienceMismatch {
                expected: expected_audience.join(","),
                actual: claims.aud.join(","),
            });
        }
    }

    Ok(claims)
}

// ============================================================================
//  Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use rsa::pkcs8::{EncodePrivateKey, EncodePublicKey, LineEnding};
    use rsa::{RsaPrivateKey, RsaPublicKey};

    /// Generates a fresh RSA-2048 keypair on the fly for unit tests.
    /// Production keys are NEVER generated this way -- use openssl offline
    /// and store the private key in 1Password Business per the README.
    fn test_keypair() -> (Vec<u8>, Vec<u8>) {
        let mut rng = rand::thread_rng();
        let private = RsaPrivateKey::new(&mut rng, 2048).expect("keygen");
        let public = RsaPublicKey::from(&private);

        let priv_pem = private
            .to_pkcs8_pem(LineEnding::LF)
            .expect("pkcs8")
            .as_bytes()
            .to_vec();
        let pub_pem = public
            .to_public_key_pem(LineEnding::LF)
            .expect("public pem")
            .as_bytes()
            .to_vec();

        (priv_pem, pub_pem)
    }

    fn sample_input() -> LicenseInput<'static> {
        LicenseInput {
            org_id: "11111111-1111-1111-1111-111111111111",
            org_name: "Test Clinic",
            tier: "horizon",
            aud: vec!["sovereign-health".to_string()],
            features: vec![
                "shi.csv_export".to_string(),
                "shi.pdf_reports".to_string(),
                "branding.custom_logo".to_string(),
            ],
            max_owners: 1,
            max_practitioners: 5,
            max_members: 50,
            expires_days: 365,
            billing_model: "manual_invoice",
        }
    }

    #[test]
    fn generate_and_validate_roundtrip() {
        let (priv_pem, pub_pem) = test_keypair();
        let (token, jti) = generate_license(&sample_input(), &priv_pem).unwrap();
        assert!(!jti.is_empty());

        let claims = validate_license(&token, &pub_pem, &["sovereign-health"]).unwrap();
        assert_eq!(claims.iss, "brickos-platform");
        assert_eq!(claims.sub, "11111111-1111-1111-1111-111111111111");
        assert_eq!(claims.org_name, "Test Clinic");
        assert_eq!(claims.tier, "horizon");
        assert_eq!(claims.max_owners, 1);
        assert_eq!(claims.max_practitioners, 5);
        assert_eq!(claims.max_members, 50);
        assert_eq!(claims.features.len(), 3);
        assert!(claims.features.contains(&"shi.csv_export".to_string()));
        assert_eq!(claims.jti, jti);
    }

    #[test]
    fn audience_mismatch_rejected() {
        let (priv_pem, pub_pem) = test_keypair();
        let (token, _) = generate_license(&sample_input(), &priv_pem).unwrap();

        let result = validate_license(&token, &pub_pem, &["sovereign-crm"]);
        assert!(matches!(
            result,
            Err(LicensingError::AudienceMismatch { .. })
        ));
    }

    #[test]
    fn audience_match_one_of_many() {
        let (priv_pem, pub_pem) = test_keypair();
        let (token, _) = generate_license(&sample_input(), &priv_pem).unwrap();

        // Multi-aud expected list, our token has only "sovereign-health" -- should match
        let claims =
            validate_license(&token, &pub_pem, &["sovereign-crm", "sovereign-health"]).unwrap();
        assert_eq!(claims.tier, "horizon");
    }

    #[test]
    fn empty_expected_audience_skips_check() {
        let (priv_pem, pub_pem) = test_keypair();
        let (token, _) = generate_license(&sample_input(), &priv_pem).unwrap();

        // Empty expected audience -- skip audience check entirely
        let claims = validate_license(&token, &pub_pem, &[]).unwrap();
        assert_eq!(claims.tier, "horizon");
    }

    #[test]
    fn expired_license_rejected() {
        let (priv_pem, pub_pem) = test_keypair();
        let mut input = sample_input();
        input.expires_days = -1; // already expired
        let (token, _) = generate_license(&input, &priv_pem).unwrap();

        let result = validate_license(&token, &pub_pem, &["sovereign-health"]);
        assert!(result.is_err(), "expired license must be rejected");
    }

    #[test]
    fn wrong_public_key_rejected() {
        let (priv_pem, _pub_pem_a) = test_keypair();
        let (_priv_pem_b, pub_pem_b) = test_keypair();

        let (token, _) = generate_license(&sample_input(), &priv_pem).unwrap();

        let result = validate_license(&token, &pub_pem_b, &["sovereign-health"]);
        assert!(
            result.is_err(),
            "token signed by key A must be rejected by key B"
        );
    }

    #[test]
    fn jti_unique_across_calls() {
        let (priv_pem, _) = test_keypair();
        let (_, jti_a) = generate_license(&sample_input(), &priv_pem).unwrap();
        let (_, jti_b) = generate_license(&sample_input(), &priv_pem).unwrap();
        assert_ne!(jti_a, jti_b, "each license must have a unique jti");
    }
}
