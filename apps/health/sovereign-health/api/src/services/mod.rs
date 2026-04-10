// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

pub mod access_log;
pub mod ai_chat_ceiling;
pub mod ai_provider;
pub mod ai_usage;
pub mod audit;
pub mod audit_log;
pub mod auth;
pub mod calculated;
pub mod content;
pub mod doctor_chat;
pub mod encryption;
pub mod extraction_prompts;
// licensing module removed in Sprint 040 #467 -- replaced by brickos-licensing
// crate. The dead in-tree HS256 generator and its tests are gone.
pub mod licensing_facade;
pub mod link_client;
pub mod marker_matcher;
pub mod measurement;
pub mod mfa;
pub mod notify;
pub mod pdf_report;
pub mod purge;
pub mod rate_limit;
pub mod reference;
pub mod segments;
pub mod tier;
