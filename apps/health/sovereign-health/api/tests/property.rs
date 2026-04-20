use proptest::prelude::*;
/// Property-based tests - verify serialization invariants for all response types.
/// Uses proptest to generate random valid inputs and assert structural guarantees.
use sovereign_health_backend::{HealthResponse, HelloResponse};

proptest! {
    #[test]
    fn prop_health_response_always_serializes(
        status in "[a-z]{2,10}",
        service in "[a-z][a-z-]{1,18}[a-z]",
        version in r"[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}",
    ) {
        let resp = HealthResponse {
            status,
            service,
            version,
            build: "dev".to_string(),
            timestamp: "2024-01-01T00:00:00+00:00".to_string(),
            mode: None,
            checks: None,
            ai_system: None,
        };
        let json = serde_json::to_string(&resp).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        prop_assert!(parsed.get("status").is_some());
        prop_assert!(parsed.get("service").is_some());
        prop_assert!(parsed.get("version").is_some());
        prop_assert!(parsed.get("timestamp").is_some());
    }

    #[test]
    fn prop_hello_response_always_serializes(
        message in ".{1,100}",
        version in r"[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}",
    ) {
        let resp = HelloResponse { message, version };
        let json = serde_json::to_string(&resp).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        prop_assert!(parsed.get("message").is_some());
        prop_assert!(parsed.get("version").is_some());
    }

    #[test]
    fn prop_health_response_roundtrips_json(
        status in "[a-z]{2,10}",
        service in "[a-z][a-z-]{1,18}[a-z]",
        version in r"[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}",
    ) {
        let original = HealthResponse {
            status: status.clone(),
            service: service.clone(),
            version: version.clone(),
            build: "dev".to_string(),
            timestamp: "2024-01-01T00:00:00+00:00".to_string(),
            mode: None,
            checks: None,
            ai_system: None,
        };
        let json = serde_json::to_string(&original).unwrap();
        let roundtripped: HealthResponse = serde_json::from_str(&json).unwrap();
        prop_assert_eq!(roundtripped.status, status);
        prop_assert_eq!(roundtripped.service, service);
        prop_assert_eq!(roundtripped.version, version);
    }
}
