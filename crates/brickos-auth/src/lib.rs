// ============================================================================
//  BrickOS — Shared Authentication Library
//
//  JWT tokens, Argon2 password hashing, TOTP MFA, token utilities.
//  Used by all BrickOS applications for user authentication.
//
//  https://brickos.io/
//  AGPL-3.0 — https://github.com/sovereignbrick/brickos
// ============================================================================

pub mod api_key;
pub mod jwt;
pub mod mfa;
pub mod password;
pub mod tokens;
pub mod validation;
