// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Thin re-export from brickos-crypto shared crate.
// All encryption logic now lives in crates/brickos-crypto/.
// This file exists for backward compatibility — all existing imports
// `use crate::services::encryption::Encryptor` continue to work.

pub use brickos_crypto::Encryptor;
