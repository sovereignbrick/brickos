// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use std::collections::HashMap;
use std::sync::Arc;

use anyhow::anyhow;
use serde_json::json;
use sqlx::PgPool;

use super::gateway::{GatewayId, GatewayStatus, PaymentCurrency, PaymentGateway};

/// PaymentRouter dispatches to the active gateway based on admin settings.
pub struct PaymentRouter {
    gateways: HashMap<GatewayId, Arc<dyn PaymentGateway>>,
}

impl Default for PaymentRouter {
    fn default() -> Self {
        Self::new()
    }
}

impl PaymentRouter {
    pub fn new() -> Self {
        Self {
            gateways: HashMap::new(),
        }
    }

    pub fn register(&mut self, gateway: Arc<dyn PaymentGateway>) {
        self.gateways.insert(gateway.id(), gateway);
    }

    pub fn get(&self, id: &GatewayId) -> Option<&Arc<dyn PaymentGateway>> {
        self.gateways.get(id)
    }

    pub fn all_ids(&self) -> Vec<GatewayId> {
        self.gateways.keys().copied().collect()
    }

    /// Get the active gateway for a payment currency, based on app_settings.
    pub async fn active_gateway(
        &self,
        currency: &PaymentCurrency,
        pool: &PgPool,
    ) -> anyhow::Result<Arc<dyn PaymentGateway>> {
        let setting_key = match currency {
            PaymentCurrency::Fiat => "payment_fiat_gateway",
            PaymentCurrency::BtcOnchain | PaymentCurrency::Lightning => "payment_btc_gateway",
        };

        let value: String = crate::handlers::admin_settings::get_setting(
            pool,
            setting_key,
            json!(match currency {
                PaymentCurrency::Fiat => "stripe",
                _ => "strike",
            }),
        )
        .await
        .as_str()
        .unwrap_or(match currency {
            PaymentCurrency::Fiat => "stripe",
            _ => "strike",
        })
        .to_string();

        let gateway_id =
            GatewayId::from_str(&value).ok_or_else(|| anyhow!("Unknown gateway: {}", value))?;

        // Check if enabled
        let enabled_key = format!("gateway_{}_enabled", value);
        let enabled =
            crate::handlers::admin_settings::get_setting_bool(pool, &enabled_key, true).await;

        if !enabled {
            return Err(anyhow!("Gateway {} is disabled", value));
        }

        self.gateways
            .get(&gateway_id)
            .cloned()
            .ok_or_else(|| anyhow!("Gateway {} not configured", value))
    }

    /// Get status of all gateways from the DB.
    pub async fn gateway_statuses(&self, pool: &PgPool) -> Vec<GatewayStatus> {
        let rows = sqlx::query_as::<
            _,
            (
                String,
                bool,
                bool,
                bool,
                Option<chrono::DateTime<chrono::Utc>>,
                Option<chrono::DateTime<chrono::Utc>>,
                i32,
                bool,
            ),
        >(
            r#"SELECT gateway_id, enabled, is_active_fiat, is_active_btc,
                      last_success_at, last_failure_at, failure_count, config_valid
               FROM payment_gateway_status
               ORDER BY gateway_id"#,
        )
        .fetch_all(pool)
        .await
        .unwrap_or_default();

        rows.into_iter()
            .map(
                |(gid, enabled, fiat, btc, last_ok, last_fail, fails, valid)| GatewayStatus {
                    gateway_id: gid,
                    enabled,
                    is_active_fiat: fiat,
                    is_active_btc: btc,
                    last_success_at: last_ok,
                    last_failure_at: last_fail,
                    failure_count: fails,
                    config_valid: valid,
                },
            )
            .collect()
    }

    /// Record a successful gateway operation.
    pub async fn record_success(&self, pool: &PgPool, gateway_id: &GatewayId) {
        let _ = sqlx::query(
            "UPDATE payment_gateway_status SET last_success_at = NOW(), failure_count = 0, updated_at = NOW() \
             WHERE gateway_id = $1",
        )
        .bind(gateway_id.as_str())
        .execute(pool)
        .await;
    }

    /// Record a failed gateway operation.
    pub async fn record_failure(&self, pool: &PgPool, gateway_id: &GatewayId) {
        let _ = sqlx::query(
            "UPDATE payment_gateway_status SET last_failure_at = NOW(), failure_count = failure_count + 1, updated_at = NOW() \
             WHERE gateway_id = $1",
        )
        .bind(gateway_id.as_str())
        .execute(pool)
        .await;
    }
}
