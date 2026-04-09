use actix_web::{web, HttpRequest, HttpResponse};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use std::collections::HashMap;
use uuid::Uuid;

use crate::middleware::auth::{extract_auth, fetch_user_org};
use crate::models::ApiResponse;
use crate::{AppError, PlatformPool};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct GraphResponse {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

#[derive(Debug, Serialize)]
pub struct GraphNode {
    pub id: String,
    pub label: String,
    pub node_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    pub size: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cluster_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct GraphEdge {
    pub source: String,
    pub target: String,
    pub edge_type: String,
    pub weight: f32,
}

#[derive(Debug, Serialize)]
pub struct GraphStats {
    pub contacts: i64,
    pub companies: i64,
    pub projects: i64,
    pub interactions: i64,
    pub edges: i64,
}

#[derive(Debug, Serialize)]
pub struct ComputeResult {
    pub clusters: usize,
    pub computed_at: String,
}

#[derive(Debug, Deserialize)]
pub struct GraphQuery {
    pub level: Option<u8>,
    pub cluster_id: Option<Uuid>,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async fn resolve_org_id(
    req: &HttpRequest,
    platform_pool: &PlatformPool,
) -> Result<(Uuid, Uuid), AppError> {
    let auth = extract_auth(req)?;
    let org_id = match auth.org_id {
        Some(id) => id,
        None => fetch_user_org(platform_pool, auth.user_id)
            .await
            .map_err(AppError::Database)?
            .ok_or(AppError::Forbidden)?,
    };
    Ok((auth.user_id, org_id))
}

/// Simple union-find for connected-component clustering.
struct UnionFind {
    parent: HashMap<Uuid, Uuid>,
}

impl UnionFind {
    fn new() -> Self {
        Self {
            parent: HashMap::new(),
        }
    }

    fn find(&mut self, x: Uuid) -> Uuid {
        if let std::collections::hash_map::Entry::Vacant(e) = self.parent.entry(x) {
            e.insert(x);
            return x;
        }
        let mut root = x;
        while self.parent[&root] != root {
            root = self.parent[&root];
        }
        // Path compression
        let mut cur = x;
        while cur != root {
            let next = self.parent[&cur];
            self.parent.insert(cur, root);
            cur = next;
        }
        root
    }

    fn union(&mut self, a: Uuid, b: Uuid) {
        let ra = self.find(a);
        let rb = self.find(b);
        if ra != rb {
            self.parent.insert(ra, rb);
        }
    }

    /// Return a map from element to cluster root.
    fn clusters(&mut self) -> HashMap<Uuid, Uuid> {
        let keys: Vec<Uuid> = self.parent.keys().copied().collect();
        let mut result = HashMap::new();
        for k in keys {
            let root = self.find(k);
            result.insert(k, root);
        }
        result
    }
}

// ---------------------------------------------------------------------------
// GET /api/v1/graph
// ---------------------------------------------------------------------------

pub async fn get_graph(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    query: web::Query<GraphQuery>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    let level = query.level.unwrap_or(3).clamp(1, 3);

    let mut nodes: Vec<GraphNode> = Vec::new();
    let mut edges: Vec<GraphEdge> = Vec::new();

    // -- Fetch contact-company links (needed for clustering at all levels) --
    let cc_links = sqlx::query(
        "SELECT cc.contact_id, cc.company_id \
         FROM crm_contact_company cc \
         JOIN crm_contacts c ON c.id = cc.contact_id AND c.org_id = $1 \
         JOIN crm_companies co ON co.id = cc.company_id AND co.org_id = $1",
    )
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await?;

    // Build clusters via union-find on contacts sharing a company
    let mut uf = UnionFind::new();
    // Group contacts by company for clustering
    let mut company_contacts: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
    for row in &cc_links {
        let contact_id: Uuid = row.get("contact_id");
        let company_id: Uuid = row.get("company_id");
        company_contacts
            .entry(company_id)
            .or_default()
            .push(contact_id);
    }
    // Union contacts that share a company
    for contacts in company_contacts.values() {
        if contacts.len() > 1 {
            for i in 1..contacts.len() {
                uf.union(contacts[0], contacts[i]);
            }
        }
        // Also ensure single-member contacts are in the union-find
        if let Some(&c) = contacts.first() {
            uf.find(c);
        }
    }
    let cluster_map = uf.clusters();

    // Level 1: clusters only
    if level == 1 {
        // Deduplicate cluster roots
        let mut cluster_roots: HashMap<Uuid, usize> = HashMap::new();
        for root in cluster_map.values() {
            *cluster_roots.entry(*root).or_insert(0) += 1;
        }
        for (root, member_count) in &cluster_roots {
            nodes.push(GraphNode {
                id: format!("cluster-{root}"),
                label: format!("Cluster ({member_count} contacts)"),
                node_type: "cluster".to_string(),
                color: Some("#8b5cf6".to_string()),
                size: (*member_count as f32).sqrt() * 20.0,
                cluster_id: None,
            });
        }
        return Ok(HttpResponse::Ok().json(ApiResponse::ok(GraphResponse { nodes, edges })));
    }

    // -- Companies (level >= 2) --
    let companies =
        sqlx::query("SELECT id, name FROM crm_companies WHERE org_id = $1 ORDER BY name LIMIT 200")
            .bind(org_id)
            .fetch_all(pool.get_ref())
            .await?;

    // Count members per company
    let mut company_member_count: HashMap<Uuid, usize> = HashMap::new();
    for row in &cc_links {
        let company_id: Uuid = row.get("company_id");
        *company_member_count.entry(company_id).or_insert(0) += 1;
    }

    for row in &companies {
        let id: Uuid = row.get("id");
        let name: String = row.get("name");
        let members = *company_member_count.get(&id).unwrap_or(&0);
        nodes.push(GraphNode {
            id: format!("company-{id}"),
            label: name,
            node_type: "company".to_string(),
            color: Some("#3b82f6".to_string()),
            size: (members as f32 + 1.0).sqrt() * 15.0,
            cluster_id: None,
        });
    }

    // Level 2: companies only (no contacts)
    if level == 2 {
        return Ok(HttpResponse::Ok().json(ApiResponse::ok(GraphResponse { nodes, edges })));
    }

    // -- Level 3: contacts + projects + all edges --

    // Contacts (limit 300)
    let contacts = sqlx::query(
        "SELECT id, name, interaction_count \
         FROM crm_contacts WHERE org_id = $1 \
         ORDER BY interaction_count DESC LIMIT 300",
    )
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await?;

    for row in &contacts {
        let id: Uuid = row.get("id");
        let name: String = row.get("name");
        let interaction_count: i32 = row.get("interaction_count");
        let cluster = cluster_map.get(&id).map(|c| c.to_string());
        nodes.push(GraphNode {
            id: format!("contact-{id}"),
            label: name,
            node_type: "contact".to_string(),
            color: Some("#10b981".to_string()),
            size: (interaction_count as f32 + 1.0).sqrt() * 10.0,
            cluster_id: cluster,
        });
    }

    // Projects
    let projects = sqlx::query(
        "SELECT id, name, color FROM crm_projects WHERE org_id = $1 ORDER BY name LIMIT 100",
    )
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await?;

    for row in &projects {
        let id: Uuid = row.get("id");
        let name: String = row.get("name");
        let color: String = row.get("color");
        nodes.push(GraphNode {
            id: format!("project-{id}"),
            label: name,
            node_type: "project".to_string(),
            color: Some(color),
            size: 12.0,
            cluster_id: None,
        });
    }

    // Enforce 500 node max
    nodes.truncate(500);

    // -- Edges: contact-company --
    for row in &cc_links {
        let contact_id: Uuid = row.get("contact_id");
        let company_id: Uuid = row.get("company_id");
        edges.push(GraphEdge {
            source: format!("contact-{contact_id}"),
            target: format!("company-{company_id}"),
            edge_type: "member_of".to_string(),
            weight: 1.0,
        });
    }

    // -- Edges: contact-project --
    let cp_links = sqlx::query(
        "SELECT cp.contact_id, cp.project_id \
         FROM crm_contact_project cp \
         JOIN crm_contacts c ON c.id = cp.contact_id AND c.org_id = $1 \
         JOIN crm_projects p ON p.id = cp.project_id AND p.org_id = $1",
    )
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await?;

    for row in &cp_links {
        let contact_id: Uuid = row.get("contact_id");
        let project_id: Uuid = row.get("project_id");
        edges.push(GraphEdge {
            source: format!("contact-{contact_id}"),
            target: format!("project-{project_id}"),
            edge_type: "assigned_to".to_string(),
            weight: 1.0,
        });
    }

    // -- Edges: interactions (grouped by contact_id, weight = count) --
    let interaction_edges = sqlx::query(
        "SELECT contact_id, COUNT(*) as cnt \
         FROM crm_interactions \
         WHERE org_id = $1 AND contact_id IS NOT NULL \
         GROUP BY contact_id",
    )
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await?;

    for row in &interaction_edges {
        let contact_id: Uuid = row.get("contact_id");
        let cnt: i64 = row.get("cnt");
        edges.push(GraphEdge {
            source: format!("contact-{contact_id}"),
            target: format!("contact-{contact_id}"),
            edge_type: "interacted".to_string(),
            weight: cnt as f32,
        });
    }

    // Optional cluster_id filter
    if let Some(filter_cluster) = query.cluster_id {
        let filter_str = filter_cluster.to_string();
        // Keep only nodes belonging to the requested cluster (or non-contact nodes)
        nodes.retain(|n| {
            n.node_type != "contact" || n.cluster_id.as_deref() == Some(filter_str.as_str())
        });
        // Keep edges whose source or target nodes still exist
        let node_ids: std::collections::HashSet<&str> =
            nodes.iter().map(|n| n.id.as_str()).collect();
        edges.retain(|e| {
            node_ids.contains(e.source.as_str()) || node_ids.contains(e.target.as_str())
        });
    }

    Ok(HttpResponse::Ok().json(ApiResponse::ok(GraphResponse { nodes, edges })))
}

// ---------------------------------------------------------------------------
// GET /api/v1/graph/stats
// ---------------------------------------------------------------------------

pub async fn get_stats(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    let contacts: i64 = sqlx::query("SELECT COUNT(*) AS cnt FROM crm_contacts WHERE org_id = $1")
        .bind(org_id)
        .fetch_one(pool.get_ref())
        .await
        .map(|r| r.get("cnt"))
        .unwrap_or(0);

    let companies: i64 = sqlx::query("SELECT COUNT(*) AS cnt FROM crm_companies WHERE org_id = $1")
        .bind(org_id)
        .fetch_one(pool.get_ref())
        .await
        .map(|r| r.get("cnt"))
        .unwrap_or(0);

    let projects: i64 = sqlx::query("SELECT COUNT(*) AS cnt FROM crm_projects WHERE org_id = $1")
        .bind(org_id)
        .fetch_one(pool.get_ref())
        .await
        .map(|r| r.get("cnt"))
        .unwrap_or(0);

    let interactions: i64 =
        sqlx::query("SELECT COUNT(*) AS cnt FROM crm_interactions WHERE org_id = $1")
            .bind(org_id)
            .fetch_one(pool.get_ref())
            .await
            .map(|r| r.get("cnt"))
            .unwrap_or(0);

    let cc_edges: i64 = sqlx::query(
        "SELECT COUNT(*) AS cnt FROM crm_contact_company cc \
         JOIN crm_contacts c ON c.id = cc.contact_id AND c.org_id = $1",
    )
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await
    .map(|r| r.get("cnt"))
    .unwrap_or(0);

    let cp_edges: i64 = sqlx::query(
        "SELECT COUNT(*) AS cnt FROM crm_contact_project cp \
         JOIN crm_contacts c ON c.id = cp.contact_id AND c.org_id = $1",
    )
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await
    .map(|r| r.get("cnt"))
    .unwrap_or(0);

    let stats = GraphStats {
        contacts,
        companies,
        projects,
        interactions,
        edges: cc_edges + cp_edges,
    };

    Ok(HttpResponse::Ok().json(ApiResponse::ok(stats)))
}

// ---------------------------------------------------------------------------
// POST /api/v1/graph/compute
// ---------------------------------------------------------------------------

pub async fn compute_clusters(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    // Fetch all contact-company links for this org
    let cc_links = sqlx::query(
        "SELECT cc.contact_id, cc.company_id \
         FROM crm_contact_company cc \
         JOIN crm_contacts c ON c.id = cc.contact_id AND c.org_id = $1",
    )
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await?;

    // Build union-find clusters
    let mut uf = UnionFind::new();
    let mut company_contacts: HashMap<Uuid, Vec<Uuid>> = HashMap::new();

    for row in &cc_links {
        let contact_id: Uuid = row.get("contact_id");
        let company_id: Uuid = row.get("company_id");
        company_contacts
            .entry(company_id)
            .or_default()
            .push(contact_id);
    }

    for contacts in company_contacts.values() {
        if let Some(&first) = contacts.first() {
            uf.find(first);
            for &c in &contacts[1..] {
                uf.union(first, c);
            }
        }
    }

    // Also include contacts with no company link as singleton clusters
    let all_contact_rows = sqlx::query("SELECT id FROM crm_contacts WHERE org_id = $1")
        .bind(org_id)
        .fetch_all(pool.get_ref())
        .await?;

    for row in &all_contact_rows {
        let cid: Uuid = row.get("id");
        uf.find(cid);
    }

    let cluster_map = uf.clusters();
    let mut unique_roots: std::collections::HashSet<Uuid> = std::collections::HashSet::new();
    for root in cluster_map.values() {
        unique_roots.insert(*root);
    }
    let cluster_count = unique_roots.len();

    let now = Utc::now();

    // Try to cache in crm_graph_cache if the table exists
    let layout = serde_json::json!({
        "clusters": cluster_count,
        "cluster_map": cluster_map.iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect::<HashMap<String, String>>(),
    });

    // Use a best-effort insert -- table may not exist yet
    let _ = sqlx::query(
        "INSERT INTO crm_graph_cache (org_id, level, layout, computed_at) \
         VALUES ($1, 3, $2, $3) \
         ON CONFLICT (org_id, level) DO UPDATE SET layout = $2, computed_at = $3",
    )
    .bind(org_id)
    .bind(&layout)
    .bind(now)
    .execute(pool.get_ref())
    .await;

    Ok(HttpResponse::Ok().json(ApiResponse::ok(ComputeResult {
        clusters: cluster_count,
        computed_at: now.to_rfc3339(),
    })))
}
