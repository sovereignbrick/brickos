// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Re-exports from the shared brickos-notify crate.
// All handler code continues to use `crate::services::notify::*` unchanged.

pub use brickos_notify::{Channel, Notifier, NotifyConfig, Priority};
