// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use sqlx::PgPool;
use uuid::Uuid;

pub fn calculate_cost(model: &str, input_tokens: i32, output_tokens: i32) -> f64 {
    let (input_rate, output_rate) = if model.contains("haiku") {
        (0.80 / 1_000_000.0, 4.00 / 1_000_000.0)
    } else if model.contains("sonnet") {
        (3.00 / 1_000_000.0, 15.00 / 1_000_000.0)
    } else if model.contains("opus") {
        (15.00 / 1_000_000.0, 75.00 / 1_000_000.0)
    } else {
        (3.00 / 1_000_000.0, 15.00 / 1_000_000.0)
    };
    (input_tokens as f64 * input_rate) + (output_tokens as f64 * output_rate)
}

pub async fn log_usage(
    pool: &PgPool,
    user_id: Option<Uuid>,
    session_type: &str,
    model: &str,
    input_tokens: i32,
    output_tokens: i32,
) -> Result<(), sqlx::Error> {
    let cost = calculate_cost(model, input_tokens, output_tokens);
    sqlx::query(
        "INSERT INTO ai_usage_log (user_id, session_type, model, input_tokens, output_tokens, cost_eur) VALUES ($1, $2, $3, $4, $5, $6)"
    )
    .bind(user_id)
    .bind(session_type)
    .bind(model)
    .bind(input_tokens)
    .bind(output_tokens)
    .bind(cost)
    .execute(pool)
    .await?;
    Ok(())
}
