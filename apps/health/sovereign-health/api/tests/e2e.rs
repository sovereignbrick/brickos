//! E2E tests - run against a real live server.
//!
//! Set `E2E_BASE_URL=http://localhost:8080` to enable (otherwise tests are skipped).
//!
//! Example:
//!   cargo run &
//!   E2E_BASE_URL=http://localhost:8080 cargo test --test e2e

fn base_url() -> Option<String> {
    std::env::var("E2E_BASE_URL").ok()
}

#[tokio::test]
async fn e2e_health() {
    let Some(base) = base_url() else {
        println!("Skipping e2e_health: E2E_BASE_URL not set");
        return;
    };
    let resp = reqwest::get(format!("{base}/health"))
        .await
        .expect("request failed");
    assert_eq!(resp.status(), 200);
    let body: serde_json::Value = resp.json().await.expect("invalid json");
    assert_eq!(body["status"], "ok");
    assert_eq!(body["service"], "sovereign-health-backend");
    assert!(!body["timestamp"].as_str().unwrap_or("").is_empty());
}

#[tokio::test]
async fn e2e_hello() {
    let Some(base) = base_url() else {
        println!("Skipping e2e_hello: E2E_BASE_URL not set");
        return;
    };
    let resp = reqwest::get(format!("{base}/api/v1/hello"))
        .await
        .expect("request failed");
    assert_eq!(resp.status(), 200);
    let body: serde_json::Value = resp.json().await.expect("invalid json");
    assert_eq!(body["message"], "Hello from sovereign-health-backend!");
}

#[tokio::test]
async fn e2e_unknown_route_is_404() {
    let Some(base) = base_url() else {
        println!("Skipping e2e_unknown_route_is_404: E2E_BASE_URL not set");
        return;
    };
    let resp = reqwest::get(format!("{base}/does-not-exist"))
        .await
        .expect("request failed");
    assert_eq!(resp.status(), 404);
}
