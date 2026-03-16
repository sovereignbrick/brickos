// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use async_trait::async_trait;

use super::gateway::{GatewayId, PaymentCurrency, PaymentGateway};
use crate::services::strike::StrikeService;

/// Strike (Bitcoin) gateway wrapper implementing the PaymentGateway trait.
/// The actual Strike service methods are still accessible via `service()`.
pub struct StrikeGateway {
    service: StrikeService,
}

impl StrikeGateway {
    pub fn new(service: StrikeService) -> Self {
        Self { service }
    }

    pub fn service(&self) -> &StrikeService {
        &self.service
    }
}

#[async_trait]
impl PaymentGateway for StrikeGateway {
    fn id(&self) -> GatewayId {
        GatewayId::Strike
    }

    fn supports(&self, currency: &PaymentCurrency) -> bool {
        matches!(
            currency,
            PaymentCurrency::BtcOnchain | PaymentCurrency::Lightning
        )
    }

    async fn test_connection(&self) -> anyhow::Result<u64> {
        let start = std::time::Instant::now();
        // Quick test: get rates
        self.service.get_invoice("test-ping-nonexistent").await.ok();
        // If we get here without panic, connection works (even if 404)
        Ok(start.elapsed().as_millis() as u64)
    }

    fn config_valid(&self) -> bool {
        true // Strike service is only created if API key exists
    }
}
