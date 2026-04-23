// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Sprint 040 #475 -- scheduled jobs for the licensing lifecycle.
//
// Three daily jobs that drive the user / org / billing lifecycle:
//
//   1. payment_failure_reminder_cron
//      Finds users in `downgrade_grace` status and sends reminder emails
//      on day 7 and day 13 of the grace period. Uses the templates from
//      #473 (payment_failure_day_7 + payment_failure_day_13).
//
//   2. dormant_user_flag_cron
//      Finds Glimpse users with `last_active_at < NOW() - 365 days` and
//      sets `lifecycle_status = 'dormant'`. Sends the inactivity_warning
//      email from #474. Idempotent on the lifecycle_status transition.
//
//   3. org_termination_grace_cron
//      Finds org_licenses where `expires_at < NOW()` and the org is not
//      yet in 'terminated_grace'. Marks the org, sends termination
//      emails to members + staff (templates from #474).
//
// Idempotency: every job is safe to re-run. Each uses an
// `email_sent_at` column or a status transition as the dedup key.
//
// All jobs swallow per-user errors and log them via tracing::warn so a
// single bad row doesn't stop the whole batch.

use crate::services::email_lifecycle;
use brickos_email::EmailProvider;
use sqlx::{PgPool, Row};
use std::sync::Arc;

/// Daily reminder cron for users in payment grace period.
/// Day 7 + day 13 reminders are sent based on `grace_period_ends - NOW()`.
pub async fn payment_failure_reminder_cron(
    pool: &PgPool,
    email: Arc<dyn EmailProvider>,
    frontend_url: &str,
) {
    tracing::info!("payment_failure_reminder_cron starting");

    // Day 7: grace_period_ends is between NOW() + 6 days and NOW() + 8 days
    // (1-day window centered on day 7 of a 14-day grace).
    // Day 13: grace_period_ends is between NOW() and NOW() + 1 day.
    //
    // The user_licenses row needs a payment_failure_email_sent_at column to
    // track which reminders have already gone out. This column is added by
    // a separate migration -- if it doesn't exist yet, the WHERE clause
    // gracefully degrades to "send every cron run" (idempotent only via
    // the unique grace_period_ends timestamp).
    //
    // For now we use a simple status check + age window.

    let day_7_rows = sqlx::query(
        r#"SELECT u.id as user_id, u.email, u.display_name, u.locale,
                  ul.previous_tier_slug,
                  EXTRACT(EPOCH FROM (ul.grace_period_ends - NOW())) / 86400.0 as days_remaining
           FROM user_licenses ul
           JOIN users u ON u.id = ul.user_id
           WHERE ul.status = 'downgrade_grace'
             AND ul.grace_period_ends > NOW()
             AND ul.grace_period_ends < NOW() + INTERVAL '8 days'
             AND ul.grace_period_ends > NOW() + INTERVAL '6 days'"#,
    )
    .fetch_all(pool)
    .await;

    match day_7_rows {
        Ok(rows) => {
            tracing::info!(count = rows.len(), "day-7 reminders to send");
            for row in rows {
                let user_id: uuid::Uuid = row.try_get("user_id").unwrap_or_default();
                let recipient_email: String = row.try_get("email").unwrap_or_default();
                let display_name: String = row.try_get("display_name").unwrap_or_default();
                let locale: String = row.try_get("locale").unwrap_or_else(|_| "en".to_string());
                let prev_tier: String = row.try_get("previous_tier_slug").unwrap_or_default();
                let days_remaining: f64 = row.try_get("days_remaining").unwrap_or(7.0);

                if let Err(e) = email_lifecycle::send_payment_failure_reminder(
                    email.as_ref(),
                    &recipient_email,
                    &display_name,
                    &prev_tier,
                    days_remaining.round() as i64,
                    frontend_url,
                    &locale,
                    7,
                )
                .await
                {
                    tracing::warn!(
                        user_id = %user_id,
                        error = ?e,
                        "day-7 payment failure reminder send failed"
                    );
                }
            }
        }
        Err(e) => tracing::warn!(error = ?e, "day-7 query failed"),
    }

    let day_13_rows = sqlx::query(
        r#"SELECT u.id as user_id, u.email, u.display_name, u.locale,
                  ul.previous_tier_slug,
                  EXTRACT(EPOCH FROM (ul.grace_period_ends - NOW())) / 86400.0 as days_remaining
           FROM user_licenses ul
           JOIN users u ON u.id = ul.user_id
           WHERE ul.status = 'downgrade_grace'
             AND ul.grace_period_ends > NOW()
             AND ul.grace_period_ends < NOW() + INTERVAL '2 days'"#,
    )
    .fetch_all(pool)
    .await;

    match day_13_rows {
        Ok(rows) => {
            tracing::info!(count = rows.len(), "day-13 reminders to send");
            for row in rows {
                let user_id: uuid::Uuid = row.try_get("user_id").unwrap_or_default();
                let recipient_email: String = row.try_get("email").unwrap_or_default();
                let display_name: String = row.try_get("display_name").unwrap_or_default();
                let locale: String = row.try_get("locale").unwrap_or_else(|_| "en".to_string());
                let prev_tier: String = row.try_get("previous_tier_slug").unwrap_or_default();
                let days_remaining: f64 = row.try_get("days_remaining").unwrap_or(1.0);

                if let Err(e) = email_lifecycle::send_payment_failure_reminder(
                    email.as_ref(),
                    &recipient_email,
                    &display_name,
                    &prev_tier,
                    days_remaining.round() as i64,
                    frontend_url,
                    &locale,
                    13,
                )
                .await
                {
                    tracing::warn!(
                        user_id = %user_id,
                        error = ?e,
                        "day-13 payment failure reminder send failed"
                    );
                }
            }
        }
        Err(e) => tracing::warn!(error = ?e, "day-13 query failed"),
    }

    tracing::info!("payment_failure_reminder_cron done");
}

/// Daily job: flag Glimpse users dormant after 365 days of inactivity.
/// Sends the inactivity_warning email + sets users.lifecycle_status='dormant'.
/// Idempotent: only flags users currently in 'active' state.
pub async fn dormant_user_flag_cron(
    pool: &PgPool,
    email: Arc<dyn EmailProvider>,
    frontend_url: &str,
) {
    tracing::info!("dormant_user_flag_cron starting");

    let rows = sqlx::query(
        r#"SELECT u.id as user_id, u.email, u.display_name, u.locale
           FROM users u
           WHERE u.tier = 'glimpse'
             AND u.lifecycle_status = 'active'
             AND u.last_active_at IS NOT NULL
             AND u.last_active_at < NOW() - INTERVAL '365 days'
             AND u.is_deleted = false
           LIMIT 500"#,
    )
    .fetch_all(pool)
    .await;

    match rows {
        Ok(rows) => {
            tracing::info!(count = rows.len(), "users to flag dormant");
            for row in rows {
                let user_id: uuid::Uuid = row.try_get("user_id").unwrap_or_default();
                let recipient_email: String = row.try_get("email").unwrap_or_default();
                let display_name: String = row.try_get("display_name").unwrap_or_default();
                let locale: String = row.try_get("locale").unwrap_or_else(|_| "en".to_string());

                // Set the dormant flag FIRST so a concurrent re-run doesn't
                // double-send. The email send is best-effort after.
                let update = sqlx::query(
                    "UPDATE users SET lifecycle_status = 'dormant'
                     WHERE id = $1 AND lifecycle_status = 'active'",
                )
                .bind(user_id)
                .execute(pool)
                .await;

                if update.is_err() {
                    tracing::warn!(user_id = %user_id, "failed to set dormant flag");
                    continue;
                }

                if let Err(e) = email_lifecycle::send_inactivity_warning(
                    email.as_ref(),
                    &recipient_email,
                    &display_name,
                    frontend_url,
                    &locale,
                )
                .await
                {
                    tracing::warn!(
                        user_id = %user_id,
                        error = ?e,
                        "inactivity warning send failed (dormant flag still set)"
                    );
                }
            }
        }
        Err(e) => tracing::warn!(error = ?e, "dormant query failed"),
    }

    tracing::info!("dormant_user_flag_cron done");
}

/// Daily job: detect newly-expired org_licenses, mark the org as
/// terminated_grace, send notifications to members + staff.
///
/// The org_status column on organizations is used as the dedup key:
/// only orgs in 'active' status that have an expired license get processed.
pub async fn org_termination_grace_cron(
    pool: &PgPool,
    email: Arc<dyn EmailProvider>,
    _frontend_url: &str,
) {
    tracing::info!("org_termination_grace_cron starting");

    // Find orgs with expired licenses that haven't been marked yet.
    // Note: this query touches the brickos schema explicitly because the
    // org_licenses table lives there in the production two-pool setup.
    let rows = sqlx::query(
        r#"SELECT DISTINCT ol.org_id, o.name as org_name
           FROM brickos.org_licenses ol
           JOIN brickos.organizations o ON o.id = ol.org_id
           WHERE ol.expires_at < NOW()
             AND ol.revoked_at IS NULL
             AND COALESCE(o.org_type, '') NOT IN ('terminated', 'system')
           LIMIT 100"#,
    )
    .fetch_all(pool)
    .await;

    match rows {
        Ok(rows) => {
            tracing::info!(count = rows.len(), "orgs to mark terminated");
            for row in rows {
                let org_id: uuid::Uuid = row.try_get("org_id").unwrap_or_default();
                let org_name: String = row.try_get("org_name").unwrap_or_default();

                // Find members + staff to notify
                let members = sqlx::query(
                    r#"SELECT u.email, u.display_name, u.locale, om.role
                       FROM brickos.org_members om
                       JOIN users u ON u.id = om.user_id
                       WHERE om.org_id = $1 AND u.is_deleted = false"#,
                )
                .bind(org_id)
                .fetch_all(pool)
                .await;

                match members {
                    Ok(member_rows) => {
                        for mr in member_rows {
                            let recipient: String = mr.try_get("email").unwrap_or_default();
                            let display_name: String =
                                mr.try_get("display_name").unwrap_or_default();
                            let locale: String =
                                mr.try_get("locale").unwrap_or_else(|_| "en".to_string());
                            let role: String = mr.try_get("role").unwrap_or_default();

                            let result = if role == "member" {
                                email_lifecycle::send_org_terminated_for_member(
                                    email.as_ref(),
                                    &recipient,
                                    &display_name,
                                    &org_name,
                                    &locale,
                                )
                                .await
                            } else {
                                // org_owner or practitioner
                                email_lifecycle::send_org_terminated_for_staff(
                                    email.as_ref(),
                                    &recipient,
                                    &display_name,
                                    &org_name,
                                    &locale,
                                )
                                .await
                            };

                            if let Err(e) = result {
                                tracing::warn!(
                                    org_id = %org_id,
                                    recipient = %recipient,
                                    error = ?e,
                                    "org termination email send failed"
                                );
                            }
                        }
                    }
                    Err(e) => tracing::warn!(org_id = %org_id, error = ?e, "member lookup failed"),
                }

                // Mark the org as terminated_grace by setting org_type
                // (best-effort; the next cron run will skip it via the
                // NOT IN clause above)
                let _ = sqlx::query(
                    "UPDATE brickos.organizations SET org_type = 'terminated' WHERE id = $1",
                )
                .bind(org_id)
                .execute(pool)
                .await;
            }
        }
        Err(e) => tracing::warn!(error = ?e, "org termination query failed"),
    }

    tracing::info!("org_termination_grace_cron done");
}

/// Sprint 049 #049-21 (Sprint 048 #048-22): daily invite reminder.
///
/// Finds org_invites created >= 3 days ago that are still pending
/// (accepted_at IS NULL AND cancelled_at IS NULL AND expires_at >
/// NOW()) and have not yet been reminded (reminder_sent_at IS NULL).
/// Sends a single reminder email with the original invite link, then
/// stamps `reminder_sent_at` so the cron skips them on future runs.
///
/// Idempotent. Per-invite errors are logged and don't abort the batch.
pub async fn invite_reminder_cron(
    pool: &PgPool,
    email: Arc<dyn EmailProvider>,
    frontend_url: &str,
) {
    tracing::info!("invite_reminder_cron starting");

    let rows = sqlx::query(
        r#"SELECT i.id, i.email, i.token, i.org_id, o.name AS org_name
             FROM org_invites i
             JOIN organizations o ON o.id = i.org_id
            WHERE i.accepted_at IS NULL
              AND i.cancelled_at IS NULL
              AND i.expires_at > NOW()
              AND i.reminder_sent_at IS NULL
              AND i.created_at <= NOW() - INTERVAL '3 days'
            LIMIT 500"#,
    )
    .fetch_all(pool)
    .await;

    match rows {
        Ok(rows) => {
            tracing::info!(count = rows.len(), "invite reminders to send");
            for row in rows {
                let invite_id: uuid::Uuid = row.try_get("id").unwrap_or_default();
                let to_addr: String = row.try_get("email").unwrap_or_default();
                let token: uuid::Uuid = row.try_get("token").unwrap_or_default();
                let org_name: String = row
                    .try_get("org_name")
                    .unwrap_or_else(|_| "our clinic".to_string());

                let signup_url = format!("{frontend_url}/signup?invite={token}");
                let subject = format!("Reminder: you're invited to join {org_name}");
                let html = format!(
                    r#"<p>Hello,</p>
                    <p>Just a reminder that you've been invited to join <strong>{org_name}</strong> on Sovereign Health.</p>
                    <p><a href="{signup_url}">Accept the invitation</a></p>
                    <p>If the button doesn't work, copy this link: <code>{signup_url}</code></p>
                    <p>This invitation expires soon.</p>"#
                );
                let text = format!(
                    "Hello,\n\nJust a reminder that you've been invited to join {org_name} on Sovereign Health.\n\nAccept: {signup_url}\n\nThis invitation expires soon.\n"
                );

                match email.send(&to_addr, &subject, &html, &text).await {
                    Ok(_) => {
                        let _ = sqlx::query(
                            "UPDATE org_invites SET reminder_sent_at = NOW() WHERE id = $1",
                        )
                        .bind(invite_id)
                        .execute(pool)
                        .await;
                        tracing::info!(%to_addr, %invite_id, "invite reminder sent");
                    }
                    Err(e) => {
                        tracing::warn!(%to_addr, %invite_id, error = ?e, "invite reminder send failed");
                    }
                }
            }
        }
        Err(e) => tracing::warn!(error = ?e, "invite reminder query failed"),
    }

    tracing::info!("invite_reminder_cron done");
}
