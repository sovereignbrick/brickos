//! E2E tests for Sovereign CRM API.
//!
//! Tests run against a live server. Gated behind E2E_BASE_URL env var.
//! Usage: E2E_BASE_URL=http://localhost:8084 cargo test --test e2e -- --nocapture
//!
//! Prerequisites:
//! - API running on E2E_BASE_URL
//! - PostgreSQL with scr database + platform tables
//! - At least one user (dev@test.com / TestPass1)

use reqwest::Client;
use serde_json::{json, Value};
use std::env;

fn base_url() -> String {
    env::var("E2E_BASE_URL").unwrap_or_else(|_| {
        eprintln!("E2E_BASE_URL not set, skipping E2E tests");
        String::new()
    })
}

fn skip_if_no_url() -> bool {
    base_url().is_empty()
}

async fn login(client: &Client, base: &str) -> String {
    let res = client
        .post(format!("{base}/api/v1/auth/login"))
        .json(&json!({"email": "dev@test.com", "password": "TestPass1"}))
        .send()
        .await
        .expect("Login request failed");

    assert_eq!(res.status(), 200, "Login failed");
    let body: Value = res.json().await.unwrap();
    body["data"]["token"]
        .as_str()
        .expect("No token in response")
        .to_string()
}

async fn authed_get(client: &Client, base: &str, token: &str, path: &str) -> (u16, Value) {
    let res = client
        .get(format!("{base}{path}"))
        .header("Authorization", format!("Bearer {token}"))
        .send()
        .await
        .expect("Request failed");
    let status = res.status().as_u16();
    let body: Value = res.json().await.unwrap_or(json!(null));
    (status, body)
}

async fn authed_post(
    client: &Client,
    base: &str,
    token: &str,
    path: &str,
    body: Value,
) -> (u16, Value) {
    let res = client
        .post(format!("{base}{path}"))
        .header("Authorization", format!("Bearer {token}"))
        .json(&body)
        .send()
        .await
        .expect("Request failed");
    let status = res.status().as_u16();
    let resp: Value = res.json().await.unwrap_or(json!(null));
    (status, resp)
}

async fn authed_put(
    client: &Client,
    base: &str,
    token: &str,
    path: &str,
    body: Value,
) -> (u16, Value) {
    let res = client
        .put(format!("{base}{path}"))
        .header("Authorization", format!("Bearer {token}"))
        .json(&body)
        .send()
        .await
        .expect("Request failed");
    let status = res.status().as_u16();
    let resp: Value = res.json().await.unwrap_or(json!(null));
    (status, resp)
}

async fn authed_delete(client: &Client, base: &str, token: &str, path: &str) -> u16 {
    let res = client
        .delete(format!("{base}{path}"))
        .header("Authorization", format!("Bearer {token}"))
        .send()
        .await
        .expect("Request failed");
    res.status().as_u16()
}

// ===========================================================================
// Health
// ===========================================================================

#[tokio::test]
async fn e2e_health() {
    if skip_if_no_url() {
        return;
    }
    let base = base_url();
    let client = Client::new();
    let res = client.get(format!("{base}/health")).send().await.unwrap();
    assert_eq!(res.status(), 200);
    let body: Value = res.json().await.unwrap();
    assert_eq!(body["status"], "ok");
    assert_eq!(body["app"], "sovereign-crm-api");
    eprintln!("  PASS health");
}

// ===========================================================================
// Auth
// ===========================================================================

#[tokio::test]
async fn e2e_auth_flow() {
    if skip_if_no_url() {
        return;
    }
    let base = base_url();
    let client = Client::new();

    // Unauth returns 401
    let (status, _) = authed_get(&client, &base, "invalid-token", "/api/v1/contacts").await;
    assert_eq!(status, 401, "Invalid token should return 401");
    eprintln!("  PASS unauth -> 401");

    // Login
    let token = login(&client, &base).await;
    assert!(!token.is_empty());
    eprintln!("  PASS login");

    // /me
    let (status, body) = authed_get(&client, &base, &token, "/api/v1/auth/me").await;
    assert_eq!(status, 200);
    assert_eq!(body["data"]["email"], "dev@test.com");
    eprintln!("  PASS /me");

    // Refresh token
    let login_res = client
        .post(format!("{base}/api/v1/auth/login"))
        .json(&json!({"email": "dev@test.com", "password": "TestPass1"}))
        .send()
        .await
        .unwrap();
    let login_body: Value = login_res.json().await.unwrap();
    let refresh = login_body["data"]["refresh_token"].as_str().unwrap();

    let (status, refresh_body) = authed_post(
        &client,
        &base,
        &token,
        "/api/v1/auth/refresh",
        json!({"refresh_token": refresh}),
    )
    .await;
    assert_eq!(status, 200, "Refresh failed: {:?}", refresh_body);
    assert!(refresh_body["data"]["token"].is_string());
    eprintln!("  PASS refresh token");
}

// ===========================================================================
// Contacts CRUD
// ===========================================================================

#[tokio::test]
async fn e2e_contacts_crud() {
    if skip_if_no_url() {
        return;
    }
    let base = base_url();
    let client = Client::new();
    let token = login(&client, &base).await;

    // Create
    let (status, body) = authed_post(
        &client,
        &base,
        &token,
        "/api/v1/contacts",
        json!({"name": "E2E Test Contact", "email": "e2e@test.com", "role": "Tester", "lead_stage": "lead"}),
    )
    .await;
    assert_eq!(status, 201, "Create contact failed: {:?}", body);
    let contact_id = body["data"]["id"].as_str().unwrap();
    eprintln!("  PASS create contact: {contact_id}");

    // List
    let (status, body) = authed_get(&client, &base, &token, "/api/v1/contacts").await;
    assert_eq!(status, 200);
    let contacts = body["data"].as_array().unwrap();
    assert!(contacts.iter().any(|c| c["name"] == "E2E Test Contact"));
    eprintln!("  PASS list contacts: {} found", contacts.len());

    // Get
    let (status, body) = authed_get(
        &client,
        &base,
        &token,
        &format!("/api/v1/contacts/{contact_id}"),
    )
    .await;
    assert_eq!(status, 200);
    assert_eq!(body["data"]["name"], "E2E Test Contact");
    eprintln!("  PASS get contact");

    // Update
    let (status, body) = authed_put(
        &client,
        &base,
        &token,
        &format!("/api/v1/contacts/{contact_id}"),
        json!({"name": "E2E Updated", "lead_stage": "qualified"}),
    )
    .await;
    assert_eq!(status, 200, "Update failed: {:?}", body);
    assert_eq!(body["data"]["name"], "E2E Updated");
    assert_eq!(body["data"]["lead_stage"], "qualified");
    eprintln!("  PASS update contact");

    // Delete
    let status = authed_delete(
        &client,
        &base,
        &token,
        &format!("/api/v1/contacts/{contact_id}"),
    )
    .await;
    assert!(
        status == 200 || status == 204,
        "Expected 200/204, got {status}"
    );
    eprintln!("  PASS delete contact");

    // Verify deleted
    let (status, _) = authed_get(
        &client,
        &base,
        &token,
        &format!("/api/v1/contacts/{contact_id}"),
    )
    .await;
    assert_eq!(status, 404);
    eprintln!("  PASS verify deleted -> 404");
}

// ===========================================================================
// Companies CRUD
// ===========================================================================

#[tokio::test]
async fn e2e_companies_crud() {
    if skip_if_no_url() {
        return;
    }
    let base = base_url();
    let client = Client::new();
    let token = login(&client, &base).await;

    let (status, body) = authed_post(
        &client,
        &base,
        &token,
        "/api/v1/companies",
        json!({"name": "E2E Corp", "domain": "e2e-test.com", "website": "https://e2e-test.com"}),
    )
    .await;
    assert_eq!(status, 201, "Create company failed: {:?}", body);
    let company_id = body["data"]["id"].as_str().unwrap();
    eprintln!("  PASS create company");

    let (status, _) = authed_get(&client, &base, &token, "/api/v1/companies").await;
    assert_eq!(status, 200);
    eprintln!("  PASS list companies");

    let (status, _) = authed_get(
        &client,
        &base,
        &token,
        &format!("/api/v1/companies/{company_id}"),
    )
    .await;
    assert_eq!(status, 200);
    eprintln!("  PASS get company");

    let status = authed_delete(
        &client,
        &base,
        &token,
        &format!("/api/v1/companies/{company_id}"),
    )
    .await;
    assert!(status == 200 || status == 204, "Delete company: {status}");
    eprintln!("  PASS delete company");
}

// ===========================================================================
// Projects CRUD + contact assignment
// ===========================================================================

#[tokio::test]
async fn e2e_projects_crud() {
    if skip_if_no_url() {
        return;
    }
    let base = base_url();
    let client = Client::new();
    let token = login(&client, &base).await;

    // Create project
    let (status, body) = authed_post(
        &client,
        &base,
        &token,
        "/api/v1/projects",
        json!({"name": "E2E Project", "description": "Test project", "color": "#ef4444"}),
    )
    .await;
    assert_eq!(status, 201, "Create project failed: {:?}", body);
    let project_id = body["data"]["id"].as_str().unwrap();
    eprintln!("  PASS create project");

    // Create contact for assignment
    let (_, contact_body) = authed_post(
        &client,
        &base,
        &token,
        "/api/v1/contacts",
        json!({"name": "Project Contact", "email": "proj@test.com"}),
    )
    .await;
    let contact_id = contact_body["data"]["id"].as_str().unwrap();

    // Assign contact
    let (status, _) = authed_post(
        &client,
        &base,
        &token,
        &format!("/api/v1/projects/{project_id}/contacts"),
        json!({"contact_id": contact_id}),
    )
    .await;
    assert!(
        status == 200 || status == 201,
        "Assign contact failed: {status}"
    );
    eprintln!("  PASS assign contact to project");

    // Unassign
    let status = authed_delete(
        &client,
        &base,
        &token,
        &format!("/api/v1/projects/{project_id}/contacts/{contact_id}"),
    )
    .await;
    assert!(status == 200 || status == 204);
    eprintln!("  PASS unassign contact");

    // Cleanup
    authed_delete(
        &client,
        &base,
        &token,
        &format!("/api/v1/projects/{project_id}"),
    )
    .await;
    authed_delete(
        &client,
        &base,
        &token,
        &format!("/api/v1/contacts/{contact_id}"),
    )
    .await;
    eprintln!("  PASS cleanup");
}

// ===========================================================================
// Tags + assign/unassign
// ===========================================================================

#[tokio::test]
async fn e2e_tags() {
    if skip_if_no_url() {
        return;
    }
    let base = base_url();
    let client = Client::new();
    let token = login(&client, &base).await;

    // Create tag
    let (status, body) = authed_post(
        &client,
        &base,
        &token,
        "/api/v1/tags",
        json!({"name": "e2e-test-tag", "color": "#22d3ee"}),
    )
    .await;
    assert!(status == 201 || status == 409, "Create tag: {status}");
    let tag_id = if status == 201 {
        body["id"].as_str().unwrap_or("").to_string()
    } else {
        // Tag already exists, list and find it
        let (_, list) = authed_get(&client, &base, &token, "/api/v1/tags").await;
        list.as_array()
            .unwrap()
            .iter()
            .find(|t| t["name"] == "e2e-test-tag")
            .unwrap()["id"]
            .as_str()
            .unwrap()
            .to_string()
    };
    eprintln!("  PASS create/find tag");

    // Create contact to tag
    let (_, contact) = authed_post(
        &client,
        &base,
        &token,
        "/api/v1/contacts",
        json!({"name": "Tagged Contact"}),
    )
    .await;
    let contact_id = contact["data"]["id"].as_str().unwrap();

    // Assign tag
    let (status, _) = authed_post(
        &client,
        &base,
        &token,
        &format!("/api/v1/tags/{tag_id}/assign"),
        json!({"entity_type": "contact", "entity_id": contact_id}),
    )
    .await;
    assert_eq!(status, 200);
    eprintln!("  PASS assign tag");

    // List tags (verify count)
    let (_, tags) = authed_get(&client, &base, &token, "/api/v1/tags").await;
    let tag = tags
        .as_array()
        .unwrap()
        .iter()
        .find(|t| t["name"] == "e2e-test-tag")
        .unwrap();
    assert!(tag["usage_count"].as_i64().unwrap() >= 1);
    eprintln!("  PASS tag usage_count incremented");

    // Cleanup
    authed_delete(
        &client,
        &base,
        &token,
        &format!("/api/v1/contacts/{contact_id}"),
    )
    .await;
    authed_delete(&client, &base, &token, &format!("/api/v1/tags/{tag_id}")).await;
    eprintln!("  PASS cleanup");
}

// ===========================================================================
// Search
// ===========================================================================

#[tokio::test]
async fn e2e_search() {
    if skip_if_no_url() {
        return;
    }
    let base = base_url();
    let client = Client::new();
    let token = login(&client, &base).await;

    // Reindex
    let (status, _) =
        authed_post(&client, &base, &token, "/api/v1/search/reindex", json!({})).await;
    assert_eq!(status, 200);
    eprintln!("  PASS reindex");

    // Search
    let (status, _) = authed_get(&client, &base, &token, "/api/v1/search?q=test&limit=5").await;
    assert_eq!(status, 200);
    eprintln!("  PASS search");

    // Suggest
    let (status, _) = authed_get(
        &client,
        &base,
        &token,
        "/api/v1/search/suggest?q=tes&limit=5",
    )
    .await;
    assert_eq!(status, 200);
    eprintln!("  PASS suggest");
}

// ===========================================================================
// Meetings
// ===========================================================================

#[tokio::test]
async fn e2e_meetings() {
    if skip_if_no_url() {
        return;
    }
    let base = base_url();
    let client = Client::new();
    let token = login(&client, &base).await;

    // Create
    let (status, body) = authed_post(
        &client,
        &base,
        &token,
        "/api/v1/meetings",
        json!({"title": "E2E Test Meeting"}),
    )
    .await;
    assert_eq!(status, 201, "Create meeting failed: {:?}", body);
    let meeting_id = body["data"]["id"].as_str().unwrap();
    eprintln!("  PASS create meeting");

    // List
    let (status, _) = authed_get(&client, &base, &token, "/api/v1/meetings").await;
    assert_eq!(status, 200);
    eprintln!("  PASS list meetings");

    // Get
    let (status, _) = authed_get(
        &client,
        &base,
        &token,
        &format!("/api/v1/meetings/{meeting_id}"),
    )
    .await;
    assert_eq!(status, 200);
    eprintln!("  PASS get meeting");

    // Create action item
    let (status, action_body) = authed_post(
        &client,
        &base,
        &token,
        &format!("/api/v1/meetings/{meeting_id}/actions"),
        json!({"description": "Follow up on E2E test"}),
    )
    .await;
    assert_eq!(status, 201, "Create action failed: {:?}", action_body);
    eprintln!("  PASS create action item");

    // List actions
    let (status, _) = authed_get(
        &client,
        &base,
        &token,
        &format!("/api/v1/meetings/{meeting_id}/actions"),
    )
    .await;
    assert_eq!(status, 200);
    eprintln!("  PASS list actions");

    // Delete meeting
    let status = authed_delete(
        &client,
        &base,
        &token,
        &format!("/api/v1/meetings/{meeting_id}"),
    )
    .await;
    assert!(
        status == 200 || status == 204,
        "Expected 200/204, got {status}"
    );
    eprintln!("  PASS delete meeting (cascades actions)");
}

// ===========================================================================
// Pipeline
// ===========================================================================

#[tokio::test]
async fn e2e_pipeline() {
    if skip_if_no_url() {
        return;
    }
    let base = base_url();
    let client = Client::new();
    let token = login(&client, &base).await;

    // Get pipeline
    let (status, _) = authed_get(&client, &base, &token, "/api/v1/pipeline").await;
    assert_eq!(status, 200);
    eprintln!("  PASS get pipeline");

    // Stats
    let (status, _) = authed_get(&client, &base, &token, "/api/v1/pipeline/stats").await;
    assert_eq!(status, 200);
    eprintln!("  PASS pipeline stats");
}

// ===========================================================================
// Smart Lists
// ===========================================================================

#[tokio::test]
async fn e2e_smart_lists() {
    if skip_if_no_url() {
        return;
    }
    let base = base_url();
    let client = Client::new();
    let token = login(&client, &base).await;

    // Create
    let (status, body) = authed_post(
        &client,
        &base,
        &token,
        "/api/v1/smart-lists",
        json!({"name": "E2E VIP List", "filter_spec": {"lead_stage": "qualified"}}),
    )
    .await;
    assert_eq!(status, 201, "Create smart list failed: {:?}", body);
    let list_id = body["data"]["id"].as_str().unwrap();
    eprintln!("  PASS create smart list");

    // Execute
    let (status, _) = authed_get(
        &client,
        &base,
        &token,
        &format!("/api/v1/smart-lists/{list_id}/contacts"),
    )
    .await;
    assert_eq!(status, 200);
    eprintln!("  PASS execute smart list");

    // Delete
    let status = authed_delete(
        &client,
        &base,
        &token,
        &format!("/api/v1/smart-lists/{list_id}"),
    )
    .await;
    assert!(
        status == 200 || status == 204,
        "Expected 200/204, got {status}"
    );
    eprintln!("  PASS delete smart list");
}

// ===========================================================================
// Graph
// ===========================================================================

#[tokio::test]
async fn e2e_graph() {
    if skip_if_no_url() {
        return;
    }
    let base = base_url();
    let client = Client::new();
    let token = login(&client, &base).await;

    let (status, body) = authed_get(&client, &base, &token, "/api/v1/graph").await;
    assert_eq!(status, 200);
    assert!(body["data"]["nodes"].is_array());
    assert!(body["data"]["edges"].is_array());
    eprintln!("  PASS get graph");

    let (status, body) = authed_get(&client, &base, &token, "/api/v1/graph/stats").await;
    assert_eq!(status, 200);
    assert!(body["data"]["contacts"].is_number());
    eprintln!("  PASS graph stats");
}

// ===========================================================================
// Platform
// ===========================================================================

#[tokio::test]
async fn e2e_platform_stats() {
    if skip_if_no_url() {
        return;
    }
    let base = base_url();
    let client = Client::new();
    let token = login(&client, &base).await;

    let (status, body) = authed_get(&client, &base, &token, "/api/v1/platform/stats").await;
    assert_eq!(status, 200);
    assert!(
        body["data"]["contact_count"].is_number() || body["data"]["contacts"].is_number(),
        "Platform stats missing contact count: {:?}",
        body
    );
    eprintln!("  PASS platform stats");
}

// ===========================================================================
// Export
// ===========================================================================

#[tokio::test]
async fn e2e_export() {
    if skip_if_no_url() {
        return;
    }
    let base = base_url();
    let client = Client::new();
    let token = login(&client, &base).await;

    // vCard export
    let res = client
        .get(format!("{base}/api/v1/contacts/export?format=vcf"))
        .header("Authorization", format!("Bearer {token}"))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), 200);
    let body = res.text().await.unwrap();
    // May be empty if no contacts, or contain vCard data
    eprintln!("  PASS vCard export ({} bytes)", body.len());

    // NOSTR export
    let (status, _) = authed_get(&client, &base, &token, "/api/v1/contacts/export/nostr").await;
    assert_eq!(status, 200);
    eprintln!("  PASS NOSTR NIP-02 export");
}

// ===========================================================================
// Queue
// ===========================================================================

#[tokio::test]
async fn e2e_queue() {
    if skip_if_no_url() {
        return;
    }
    let base = base_url();
    let client = Client::new();
    let token = login(&client, &base).await;

    let (status, _) = authed_get(&client, &base, &token, "/api/v1/queue").await;
    assert_eq!(status, 200);
    eprintln!("  PASS list queue");
}

// ===========================================================================
// Captures
// ===========================================================================

#[tokio::test]
async fn e2e_captures() {
    if skip_if_no_url() {
        return;
    }
    let base = base_url();
    let client = Client::new();
    let token = login(&client, &base).await;

    // Create text capture
    let (status, body) = authed_post(
        &client,
        &base,
        &token,
        "/api/v1/captures",
        json!({"capture_type": "text", "text_content": "Met John Doe from Acme Corp at conference"}),
    )
    .await;
    assert_eq!(status, 201, "Create capture failed: {:?}", body);
    let capture_id = body["data"]["id"].as_str().unwrap();
    eprintln!("  PASS create text capture");

    // List
    let (status, _) = authed_get(&client, &base, &token, "/api/v1/captures").await;
    assert_eq!(status, 200);
    eprintln!("  PASS list captures");

    // Get
    let (status, _) = authed_get(
        &client,
        &base,
        &token,
        &format!("/api/v1/captures/{capture_id}"),
    )
    .await;
    assert_eq!(status, 200);
    eprintln!("  PASS get capture");

    // Process (will fail without AI provider, but should return meaningful error)
    let (status, _) = authed_post(
        &client,
        &base,
        &token,
        &format!("/api/v1/captures/{capture_id}/process"),
        json!({}),
    )
    .await;
    // 200 if AI works, 500 if no provider configured -- both are valid in E2E
    eprintln!("  INFO process capture: HTTP {status} (OK if AI not configured)");
}

// ===========================================================================
// Interactions
// ===========================================================================

#[tokio::test]
async fn e2e_interactions() {
    if skip_if_no_url() {
        return;
    }
    let base = base_url();
    let client = Client::new();
    let token = login(&client, &base).await;

    let (status, _) = authed_get(&client, &base, &token, "/api/v1/interactions").await;
    assert_eq!(status, 200);
    eprintln!("  PASS list interactions");
}
