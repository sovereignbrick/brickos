// BrickOS — TOTP MFA (Two-Factor Authentication)

use rand::RngCore;
use totp_rs::{Algorithm, Secret, TOTP};

/// Generate a 20-byte crypto-random secret, returned as base32.
pub fn generate_totp_secret() -> String {
    let mut bytes = [0u8; 20];
    rand::rng().fill_bytes(&mut bytes);
    Secret::Raw(bytes.to_vec()).to_encoded().to_string()
}

/// Build a TOTP instance from a base32-encoded secret.
pub fn build_totp(secret_base32: &str, email: &str) -> anyhow::Result<TOTP> {
    let secret = Secret::Encoded(secret_base32.to_string())
        .to_bytes()
        .map_err(|e| anyhow::anyhow!("Invalid base32 secret: {e}"))?;
    let issuer = std::env::var("PRODUCT_NAME")
        .unwrap_or_else(|_| "BrickOS - Sovereign Health Intelligence".to_string());
    let totp = TOTP::new(
        Algorithm::SHA1,
        6,
        1, // 1 period skew for clock drift
        30,
        secret,
        Some(issuer),
        email.to_string(),
    )
    .map_err(|e| anyhow::anyhow!("Failed to create TOTP: {e}"))?;
    Ok(totp)
}

/// Verify a TOTP code (allows 1 period skew for clock drift).
pub fn verify_totp(secret_base32: &str, email: &str, code: &str) -> anyhow::Result<bool> {
    let totp = build_totp(secret_base32, email)?;
    Ok(totp.check_current(code).unwrap_or(false))
}

/// Generate a QR code SVG from a TOTP URI.
pub fn generate_qr_svg(uri: &str) -> anyhow::Result<String> {
    use qrcode::QrCode;
    let code = QrCode::new(uri.as_bytes())
        .map_err(|e| anyhow::anyhow!("QR code generation failed: {e}"))?;
    let svg = code
        .render::<qrcode::render::svg::Color>()
        .min_dimensions(200, 200)
        .build();
    Ok(svg)
}

/// Generate 8 recovery codes (8 chars each, formatted as xxxx-xxxx).
pub fn generate_recovery_codes() -> Vec<String> {
    let charset: &[u8] = b"abcdefghijklmnopqrstuvwxyz0123456789";
    let mut codes = Vec::with_capacity(8);
    for _ in 0..8 {
        let mut bytes = [0u8; 8];
        rand::rng().fill_bytes(&mut bytes);
        let code: String = bytes
            .iter()
            .map(|b| charset[(*b as usize) % charset.len()] as char)
            .collect();
        codes.push(format!("{}-{}", &code[..4], &code[4..]));
    }
    codes
}

/// Format base32 secret for human readability (groups of 4).
pub fn format_secret_for_display(secret: &str) -> String {
    secret
        .chars()
        .collect::<Vec<_>>()
        .chunks(4)
        .map(|c| c.iter().collect::<String>())
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generated_secret_is_valid_base32() {
        let secret = generate_totp_secret();
        // base32 characters: A-Z and 2-7, plus optional padding with =
        assert!(secret
            .chars()
            .all(|c| c.is_ascii_uppercase() || ('2'..='7').contains(&c) || c == '='));
        assert!(!secret.is_empty());
    }

    #[test]
    fn recovery_codes_count_and_format() {
        let codes = generate_recovery_codes();
        assert_eq!(codes.len(), 8);
        for code in &codes {
            // Format is xxxx-xxxx, so 9 chars total (8 alphanumeric + 1 hyphen)
            assert_eq!(code.len(), 9);
            assert_eq!(code.chars().nth(4), Some('-'));
            // Each half should be 4 lowercase alphanumeric chars
            let parts: Vec<&str> = code.split('-').collect();
            assert_eq!(parts.len(), 2);
            assert!(parts[0].chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit()));
            assert!(parts[1].chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit()));
        }
    }
}
