// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use crate::config::Config;

/// Simple in-memory rate limiter keyed by string (IP or email).
pub struct RateLimiter {
    entries: Mutex<HashMap<String, Vec<Instant>>>,
    max_requests: usize,
    window: Duration,
}

impl RateLimiter {
    pub fn new(max_requests: usize, window_secs: u64) -> Self {
        Self {
            entries: Mutex::new(HashMap::new()),
            max_requests,
            window: Duration::from_secs(window_secs),
        }
    }

    /// Check if a request is allowed. Returns Ok(()) if allowed, Err(seconds_until_retry).
    pub fn check(&self, key: &str) -> Result<(), u64> {
        let mut map = self.entries.lock().unwrap_or_else(|e| e.into_inner());
        let now = Instant::now();

        let timestamps = map.entry(key.to_string()).or_default();

        // Remove expired entries
        timestamps.retain(|t| now.duration_since(*t) < self.window);

        if timestamps.len() >= self.max_requests {
            // Calculate retry-after from oldest entry in window
            let oldest = timestamps.first().copied().unwrap_or(now);
            let retry_after = self
                .window
                .as_secs()
                .saturating_sub(now.duration_since(oldest).as_secs());
            return Err(retry_after.max(1));
        }

        timestamps.push(now);
        Ok(())
    }
}

/// Collection of rate limiters for auth endpoints.
pub struct AuthRateLimiters {
    pub register: RateLimiter,
    pub login: RateLimiter,
    pub forgot_password: RateLimiter,
    pub resend_verification: RateLimiter,
    pub reset_password: RateLimiter,
}

impl AuthRateLimiters {
    pub fn new() -> Self {
        Self {
            register: RateLimiter::new(5, 3600),
            login: RateLimiter::new(10, 3600),
            forgot_password: RateLimiter::new(3, 3600),
            resend_verification: RateLimiter::new(3, 3600),
            reset_password: RateLimiter::new(5, 3600),
        }
    }

    pub fn from_config(config: &Config) -> Self {
        let w = config.rate_limit_window_secs;
        Self {
            register: RateLimiter::new(config.rate_limit_register, w),
            login: RateLimiter::new(config.rate_limit_login, w),
            forgot_password: RateLimiter::new(config.rate_limit_forgot_password, w),
            resend_verification: RateLimiter::new(config.rate_limit_resend_verification, w),
            reset_password: RateLimiter::new(config.rate_limit_reset_password, w),
        }
    }
}

impl Default for AuthRateLimiters {
    fn default() -> Self {
        Self::new()
    }
}
