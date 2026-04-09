pub mod auth;
pub mod captures;
pub mod companies;
pub mod contacts;
pub mod enrichment;
pub mod export;
pub mod graph;
pub mod health;
pub mod interactions;
pub mod meetings;
pub mod pipeline;
pub mod platform;
pub mod projects;
pub mod queue;
pub mod search;
pub mod smart_lists;
pub mod tags;

use actix_web::web;

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg
        // Health check (public)
        .route("/health", web::get().to(health::health_check))
        // Auth routes (public)
        .service(
            web::scope("/api/v1/auth")
                .route("/signup", web::post().to(auth::signup))
                .route("/login", web::post().to(auth::login))
                .route("/login/mfa", web::post().to(auth::login_mfa))
                .route("/verify-email", web::post().to(auth::verify_email))
                .route("/forgot-password", web::post().to(auth::forgot_password))
                .route("/reset-password", web::post().to(auth::reset_password))
                .route("/refresh", web::post().to(auth::refresh_token))
                .route("/logout", web::post().to(auth::logout))
                .route("/me", web::get().to(auth::me)),
        )
        // Platform stats
        .route("/api/v1/platform/stats", web::get().to(platform::get_stats))
        // vCard export/import (before contacts scope to avoid /{id} conflict)
        .route(
            "/api/v1/contacts/export",
            web::get().to(export::export_contacts),
        )
        .route(
            "/api/v1/contacts/import",
            web::post().to(export::import_contacts),
        )
        // NOSTR NIP-02 export (before contacts scope to avoid /{id} conflict)
        .route(
            "/api/v1/contacts/export/nostr",
            web::get().to(platform::export_nostr_nip02),
        )
        // Contacts CRUD
        .service(
            web::scope("/api/v1/contacts")
                .route("", web::get().to(contacts::list_contacts))
                .route("", web::post().to(contacts::create_contact))
                .route("/{id}", web::get().to(contacts::get_contact))
                .route("/{id}", web::put().to(contacts::update_contact))
                .route("/{id}", web::delete().to(contacts::delete_contact)),
        )
        // Companies CRUD
        .service(
            web::scope("/api/v1/companies")
                .route("", web::get().to(companies::list_companies))
                .route("", web::post().to(companies::create_company))
                .route("/{id}", web::get().to(companies::get_company))
                .route("/{id}", web::put().to(companies::update_company))
                .route("/{id}", web::delete().to(companies::delete_company)),
        )
        // Projects CRUD + contact assignment
        .service(
            web::scope("/api/v1/projects")
                .route("", web::get().to(projects::list_projects))
                .route("", web::post().to(projects::create_project))
                .route("/{id}", web::get().to(projects::get_project))
                .route("/{id}", web::put().to(projects::update_project))
                .route("/{id}", web::delete().to(projects::delete_project))
                .route("/{id}/contacts", web::post().to(projects::assign_contact))
                .route(
                    "/{project_id}/contacts/{contact_id}",
                    web::delete().to(projects::unassign_contact),
                ),
        )
        // Tags CRUD + assign/unassign
        .service(
            web::scope("/api/v1/tags")
                .route("", web::get().to(tags::list_tags))
                .route("", web::post().to(tags::create_tag))
                .route("/{id}", web::delete().to(tags::delete_tag))
                .route("/{id}/assign", web::post().to(tags::assign_tag))
                .route("/{id}/unassign", web::delete().to(tags::unassign_tag)),
        )
        // Captures CRUD + AI processing
        .service(
            web::scope("/api/v1/captures")
                .route("", web::post().to(captures::create_capture))
                .route("", web::get().to(captures::list_captures))
                .route("/{id}", web::get().to(captures::get_capture))
                .route("/{id}/process", web::post().to(captures::process_capture)),
        )
        // Pipeline (Kanban board)
        .service(
            web::scope("/api/v1/pipeline")
                .route("", web::get().to(pipeline::get_pipeline))
                .route("/move", web::put().to(pipeline::move_contact))
                .route("/stats", web::get().to(pipeline::get_stats)),
        )
        // Queue (capture processing)
        .service(
            web::scope("/api/v1/queue")
                .route("", web::get().to(queue::list_queue))
                .route("/process-all", web::post().to(queue::process_all))
                .route("/retry-failed", web::post().to(queue::retry_failed))
                .route("/clear-completed", web::delete().to(queue::clear_completed)),
        )
        // Interactions
        .service(
            web::scope("/api/v1/interactions")
                .route("", web::get().to(interactions::list_interactions))
                .route("/{id}", web::get().to(interactions::get_interaction)),
        )
        // Full-text search
        .service(
            web::scope("/api/v1/search")
                .route("", web::get().to(search::search))
                .route("/suggest", web::get().to(search::suggest))
                .route("/reindex", web::post().to(search::reindex)),
        )
        // Contact timeline (separate from contacts scope to avoid path conflict)
        .route(
            "/api/v1/contacts/{contact_id}/timeline",
            web::get().to(interactions::contact_timeline),
        )
        // Single contact vCard export
        .route(
            "/api/v1/contacts/{id}/export",
            web::get().to(export::export_single_contact),
        )
        // Enrichment
        .route(
            "/api/v1/contacts/{id}/enrich",
            web::post().to(enrichment::enrich_contact),
        )
        .route(
            "/api/v1/contacts/{id}/enrichment",
            web::get().to(enrichment::get_enrichment),
        )
        // Lightning address
        .route(
            "/api/v1/contacts/{id}/lightning",
            web::get().to(platform::get_lightning),
        )
        .route(
            "/api/v1/contacts/{id}/lightning",
            web::post().to(platform::set_lightning),
        )
        // Sovereign Link short URL (stub)
        .route(
            "/api/v1/contacts/{id}/short-link",
            web::post().to(platform::create_short_link),
        )
        // Smart lists
        .service(
            web::scope("/api/v1/smart-lists")
                .route("", web::get().to(smart_lists::list_smart_lists))
                .route("", web::post().to(smart_lists::create_smart_list))
                .route("/{id}", web::get().to(smart_lists::get_smart_list))
                .route("/{id}", web::delete().to(smart_lists::delete_smart_list))
                .route(
                    "/{id}/contacts",
                    web::get().to(smart_lists::execute_smart_list),
                ),
        )
        // Meetings CRUD + AI transcription/summarization
        .service(
            web::scope("/api/v1/meetings")
                .route("", web::post().to(meetings::create_meeting))
                .route("", web::get().to(meetings::list_meetings))
                .route("/{id}", web::get().to(meetings::get_meeting))
                .route("/{id}", web::put().to(meetings::update_meeting))
                .route("/{id}", web::delete().to(meetings::delete_meeting))
                .route("/{id}/transcribe", web::post().to(meetings::transcribe))
                .route("/{id}/summarize", web::post().to(meetings::summarize))
                .route("/{id}/actions", web::get().to(meetings::list_actions))
                .route("/{id}/actions", web::post().to(meetings::create_action)),
        )
        // Action item completion (outside meetings scope)
        .route(
            "/api/v1/actions/{id}/complete",
            web::put().to(meetings::complete_action),
        )
        // Relationship graph
        .service(
            web::scope("/api/v1/graph")
                .route("", web::get().to(graph::get_graph))
                .route("/stats", web::get().to(graph::get_stats))
                .route("/compute", web::post().to(graph::compute_clusters)),
        );
}
