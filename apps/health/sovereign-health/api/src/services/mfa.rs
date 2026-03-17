// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Thin re-export from brickos-auth shared crate.

pub use brickos_auth::mfa::{
    build_totp, format_secret_for_display, generate_qr_svg, generate_recovery_codes,
    generate_totp_secret, verify_totp,
};
