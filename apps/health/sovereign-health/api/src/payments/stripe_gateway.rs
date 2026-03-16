// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use async_trait::async_trait;

use super::gateway::{GatewayId, PaymentCurrency, PaymentGateway};
use crate::services::stripe::StripeService;

/// Stripe gateway wrapper implementing the PaymentGateway trait.
/// The actual Stripe service methods are still accessible via `service()`.
pub struct StripeGateway {
    service: StripeService,
}

impl StripeGateway {
    pub fn new(service: StripeService) -> Self {
        Self { service }
    }

    pub fn service(&self) -> &StripeService {
        &self.service
    }
}

#[async_trait]
impl PaymentGateway for StripeGateway {
    fn id(&self) -> GatewayId {
        GatewayId::Stripe
    }

    fn supports(&self, currency: &PaymentCurrency) -> bool {
        matches!(currency, PaymentCurrency::Fiat)
    }

    async fn test_connection(&self) -> anyhow::Result<u64> {
        let start = std::time::Instant::now();
        // Quick test: list 1 customer
        self.service.raw_get("customers?limit=1").await?;
        Ok(start.elapsed().as_millis() as u64)
    }

    fn config_valid(&self) -> bool {
        !self.service.config.secret_key.is_empty() && !self.service.config.webhook_secret.is_empty()
    }
}
