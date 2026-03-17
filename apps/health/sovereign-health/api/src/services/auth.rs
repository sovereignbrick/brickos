// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Thin re-export from brickos-auth shared crate.
// All auth logic now lives in crates/brickos-auth/.

pub use brickos_auth::jwt::{create_jwt, verify_jwt};
pub use brickos_auth::password::{hash_password, verify_password};
pub use brickos_auth::tokens::{
    generate_refresh_token, generate_verification_token, hash_refresh_token,
    verify_token_constant_time,
};
pub use brickos_auth::validation::{validate_email, validate_password};
