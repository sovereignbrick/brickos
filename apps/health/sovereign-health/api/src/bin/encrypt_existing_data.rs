// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

//! One-time migration binary: encrypts existing plaintext data in the database.
//!
//! Run after deploying the encryption-enabled code:
//!   docker compose exec backend ./encrypt-existing-data
//!
//! Idempotent: skips values that already start with "v1:" (already encrypted).

use sovereign_health_backend::services::encryption::Encryptor;
use sqlx::postgres::PgPoolOptions;
use sqlx::Row;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let encryption_key =
        std::env::var("ENCRYPTION_KEY").expect("ENCRYPTION_KEY must be set to encrypt data");

    let enc = Encryptor::new(Some(&encryption_key));
    assert!(enc.is_enabled(), "Encryptor must be enabled");

    let pool = PgPoolOptions::new()
        .max_connections(2)
        .connect(&database_url)
        .await?;

    println!("Connected to database. Starting encryption migration...");

    // ── Encrypt measurements ────────────────────────────────────────────────
    let measurement_rows = sqlx::query(
        "SELECT id, value_canonical, lifestyle_note FROM measurements WHERE is_deleted = false",
    )
    .fetch_all(&pool)
    .await?;

    let mut encrypted_count = 0u64;
    for row in &measurement_rows {
        let id: uuid::Uuid = row.try_get("id")?;
        let value: String = row.try_get("value_canonical")?;
        let note: Option<String> = row.try_get("lifestyle_note").ok().flatten();

        let value_needs_encrypt = !value.starts_with("v1:");
        let note_needs_encrypt = note
            .as_ref()
            .map(|n| !n.starts_with("v1:"))
            .unwrap_or(false);

        if !value_needs_encrypt && !note_needs_encrypt {
            continue;
        }

        let encrypted_value = if value_needs_encrypt {
            enc.encrypt(&value)
        } else {
            value
        };

        let encrypted_note = if note_needs_encrypt {
            enc.encrypt_opt(note.as_deref())
        } else {
            note
        };

        sqlx::query(
            "UPDATE measurements SET value_canonical = $2, lifestyle_note = $3 WHERE id = $1",
        )
        .bind(id)
        .bind(&encrypted_value)
        .bind(&encrypted_note)
        .execute(&pool)
        .await?;

        encrypted_count += 1;
    }

    println!(
        "Encrypted {} of {} measurements",
        encrypted_count,
        measurement_rows.len()
    );

    // ── Encrypt user_profile ────────────────────────────────────────────────
    let profile_rows = sqlx::query(
        "SELECT user_id, height_cm, age, default_waist_cm, default_weight_kg FROM user_profile",
    )
    .fetch_all(&pool)
    .await?;

    let mut profile_count = 0u64;
    for row in &profile_rows {
        let user_id: uuid::Uuid = row.try_get("user_id")?;
        let height: Option<String> = row.try_get("height_cm").ok().flatten();
        let age: Option<String> = row.try_get("age").ok().flatten();
        let waist: Option<String> = row.try_get("default_waist_cm").ok().flatten();
        let weight: Option<String> = row.try_get("default_weight_kg").ok().flatten();

        let needs_encrypt = |v: &Option<String>| -> bool {
            v.as_ref().map(|s| !s.starts_with("v1:")).unwrap_or(false)
        };

        if !needs_encrypt(&height)
            && !needs_encrypt(&age)
            && !needs_encrypt(&waist)
            && !needs_encrypt(&weight)
        {
            continue;
        }

        let encrypt_field = |v: Option<String>| -> Option<String> {
            v.map(|s| {
                if s.starts_with("v1:") {
                    s
                } else {
                    enc.encrypt(&s)
                }
            })
        };

        let enc_height = encrypt_field(height);
        let enc_age = encrypt_field(age);
        let enc_waist = encrypt_field(waist);
        let enc_weight = encrypt_field(weight);

        sqlx::query(
            "UPDATE user_profile SET height_cm = $2, age = $3, default_waist_cm = $4, default_weight_kg = $5 WHERE user_id = $1",
        )
        .bind(user_id)
        .bind(&enc_height)
        .bind(&enc_age)
        .bind(&enc_waist)
        .bind(&enc_weight)
        .execute(&pool)
        .await?;

        profile_count += 1;
    }

    println!(
        "Encrypted {} of {} user profiles",
        profile_count,
        profile_rows.len()
    );

    println!("Encryption migration complete.");
    Ok(())
}
