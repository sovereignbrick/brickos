pub mod api;
pub mod qr;
pub mod redirect;
#[cfg(feature = "standalone")]
pub mod web;
#[cfg(feature = "standalone")]
pub mod discovery;

#[cfg(feature = "platform")]
pub mod service_auth;
#[cfg(feature = "platform")]
pub mod namespace;
#[cfg(feature = "platform")]
pub mod platform_admin;
#[cfg(feature = "platform")]
pub mod service_api;
#[cfg(feature = "platform")]
pub mod branding;
