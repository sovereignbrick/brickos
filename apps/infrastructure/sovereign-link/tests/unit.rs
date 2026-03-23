use sovereign_link::handlers::api::validate_vanity_code;
use sovereign_link::handlers::redirect::url_domain;
use sovereign_link::models::*;

// ─── Vanity code validation ─────────────────────────────────────────────────

#[test]
fn vanity_valid_codes() {
    assert!(validate_vanity_code("drclinic").is_ok());
    assert!(validate_vanity_code("my-health").is_ok());
    assert!(validate_vanity_code("abc").is_ok());
    assert!(validate_vanity_code("a1b2c3").is_ok());
    assert!(validate_vanity_code("btc-prague-2026").is_ok());
}

#[test]
fn vanity_too_short() {
    assert!(validate_vanity_code("ab").is_err());
    assert!(validate_vanity_code("a").is_err());
    assert!(validate_vanity_code("").is_err());
}

#[test]
fn vanity_too_long() {
    let long = "a".repeat(31);
    assert!(validate_vanity_code(&long).is_err());
}

#[test]
fn vanity_invalid_chars() {
    assert!(validate_vanity_code("DrClinic").is_err()); // uppercase
    assert!(validate_vanity_code("my clinic").is_err()); // space
    assert!(validate_vanity_code("my_clinic").is_err()); // underscore
    assert!(validate_vanity_code("my.clinic").is_err()); // dot
}

#[test]
fn vanity_leading_trailing_hyphens() {
    assert!(validate_vanity_code("-clinic").is_err());
    assert!(validate_vanity_code("clinic-").is_err());
    assert!(validate_vanity_code("-clinic-").is_err());
}

#[test]
fn vanity_reserved_words() {
    assert!(validate_vanity_code("api").is_err());
    assert!(validate_vanity_code("admin").is_err());
    assert!(validate_vanity_code("health").is_err());
    assert!(validate_vanity_code("status").is_err());
    assert!(validate_vanity_code("new").is_err());
}

#[test]
fn vanity_collision_with_auto_codes() {
    // 10-char codes where first 2 are lowercase + remaining 8 are hex look like auto codes
    assert!(validate_vanity_code("sha3f2c1b9").is_err());
    assert!(validate_vanity_code("bt12345678").is_err());
    // But 10-char codes with non-hex tail are fine
    assert!(validate_vanity_code("shnotahexz").is_ok());
    // And different lengths are fine
    assert!(validate_vanity_code("sha3f2c1b").is_ok()); // 9 chars
    assert!(validate_vanity_code("sha3f2c1b90").is_ok()); // 11 chars
}

// ─── URL domain extraction ──────────────────────────────────────────────────

#[test]
fn url_domain_https() {
    assert_eq!(url_domain("https://example.com/path"), Some("example.com".into()));
    assert_eq!(url_domain("https://sub.example.com/"), Some("sub.example.com".into()));
}

#[test]
fn url_domain_http() {
    assert_eq!(url_domain("http://example.com"), Some("example.com".into()));
}

#[test]
fn url_domain_with_port() {
    assert_eq!(url_domain("https://example.com:8080/path"), Some("example.com".into()));
}

#[test]
fn url_domain_no_protocol() {
    assert_eq!(url_domain("example.com"), None);
}

#[test]
fn url_domain_empty() {
    assert_eq!(url_domain(""), None);
    assert_eq!(url_domain("https://"), None);
}

// ─── Model constants ────────────────────────────────────────────────────────

#[test]
fn prefix_constants() {
    assert_eq!(PREFIX_LEN, 2);
    assert_eq!(AUTO_CODE_LEN, 10);
}

#[test]
fn auto_code_detection() {
    // Valid auto code: 2-char prefix + 8-char hash = 10 chars
    let code = "sha3f2c1b9";
    assert_eq!(code.len(), AUTO_CODE_LEN);
    let prefix = &code[..PREFIX_LEN];
    assert_eq!(prefix, "sh");
    let affiliate = &code[PREFIX_LEN..];
    assert_eq!(affiliate, "a3f2c1b9");
}
