use rusqlite::{params, Connection};
use std::env;
use std::path::PathBuf;
use serde_json::json;
use anyhow::{Result, Context};

// Simplified models for this rescanner
struct Event {
    id: String,
    entity_id: String,
    net_amount: f64,
    event_date: String,
    account_code: Option<String>,
}

fn get_entity_risk_multiplier(conn: &Connection, entity_name: &str) -> f64 {
    // Basic implementation for scanning tool
    // In production this looks at suspicion_inbox
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM suspicion_inbox WHERE metadata LIKE ?",
        [format!("%{}%", entity_name)],
        |row| row.get(0)
    ).unwrap_or(0);
    
    if count >= 10 { 2.5 }
    else if count >= 5 { 1.5 }
    else if count >= 3 { 1.2 }
    else { 1.0 }
}

fn main() -> Result<()> {
    let app_data_dir = env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
    let db_path = PathBuf::from(&app_data_dir).join("com.auditflow.app").join("audit_data_v4.db");
    
    if !db_path.exists() {
        println!("Database not found.");
        return Ok(());
    }

    let mut conn = Connection::open(&db_path).context("Failed to open audit database")?;

    // 1. BACKUP (Snapshot)
    println!(">>> [BACKUP] Creating snapshot of risk_signal table...");
    conn.execute("CREATE TABLE IF NOT EXISTS risk_signal_backup_split_v1 AS SELECT * FROM risk_signal", [])
        .context("Failed to create backup table")?;
    
    // 2. Count existing 'SPLIT_PAYMENT' signals
    let old_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM risk_signal WHERE signal_type LIKE 'SPLIT_PAYMENT%'", 
        [], 
        |r| r.get(0)
    ).unwrap_or(0);
    println!(">>> [BASELINE] Found {} existing SPLIT_PAYMENT signals.", old_count);

    // 3. FETCH EVENTS
    // We need to fetch all ledger events to re-run the logic.
    // Use ONLY entity_event to guarantee we catch all data, even if audit_object link is broken.
    let mut obj_stmt = conn.prepare("
        SELECT DISTINCT source_object_id, project_id 
        FROM entity_event 
        WHERE source_type = 'LEDGER'
    ").context("Failed to prepare object fetch query")?;
    let objects: Vec<(String, String)> = obj_stmt.query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?.filter_map(|r| r.ok()).collect();

    println!(">>> [RE-SCAN] Analyzing {} Audit Objects for new Split Payment rules...", objects.len());

    let mut new_signals = Vec::new();

    for (obj_id, project_id) in objects {
        let mut stmt = conn.prepare(
            "SELECT id, entity_id, net_amount, event_date, account_code FROM entity_event WHERE source_object_id = ?1 AND source_type = 'LEDGER'"
        )?;
        
        // Grouping Logic
        let mut grouped: std::collections::HashMap<(String, String), Vec<Event>> = std::collections::HashMap::new();

        let rows = stmt.query_map(params![obj_id], |row| {
            Ok(Event {
                id: row.get(0)?,
                entity_id: row.get(1)?,
                net_amount: row.get::<_, f64>(2)?.abs(),
                event_date: row.get(3)?,
                account_code: row.get(4)?,
            })
        })?;

        for r in rows {
            if let Ok(e) = r {
                if !e.entity_id.is_empty() {
                    grouped.entry((e.entity_id.clone(), e.event_date.clone())).or_default().push(e);
                }
            }
        }

        // Apply NEW Logic
        for ((entity, date), group) in grouped {
            if group.len() < 2 { continue; }

            let amounts: Vec<f64> = group.iter().map(|e| e.net_amount).collect();
            let total: f64 = amounts.iter().sum();
            let count = group.len();

            let mean = total / count as f64;
            let variance = amounts.iter().map(|a| (a - mean).powi(2)).sum::<f64>() / count as f64;
            let std_dev = variance.sqrt();
            let cv = if mean > 0.0 { std_dev / mean } else { 0.0 };

            // 1. Batch Exclusion
            if count > 4 && cv > 0.1 { continue; }

            // 2. Similarity Check (CV < 0.05)
            let is_similar = cv < 0.05;

            // 3. Limit Targeting
            let limits = vec![50_000.0, 500_000.0, 1_000_000.0, 3_000_000.0, 5_000_000.0, 10_000_000.0];
            let target_limit = limits.iter().find(|&&l| (total - l).abs() <= l * 0.1);

            // 4. Account Sensitivity
            let account_sensitivity = if let Some(first) = group.first() {
                if let Some(code) = &first.account_code {
                    match code.as_str() {
                        "81300" | "81100" => 1.3,
                        "50300" | "80200" | "80100" | "90100" | "93000" => 0.5,
                        _ => 1.0,
                    }
                } else { 1.0 }
            } else { 1.0 };

            if let Some(limit) = target_limit {
                let base_weight = if account_sensitivity > 1.0 { 1.0 } else { 0.7 }; // Critical / High
                let score = f64::min(base_weight * account_sensitivity, 1.0);
                
                new_signals.push((
                    "SPLIT_PAYMENT:LIMIT_EVASION",
                    format!("[규정회피 의심] '{}' {}건 (합계: {}). 한도({}) 근접.", entity, count, total, limit),
                    score,
                    obj_id.clone(),
                    project_id.clone(),
                    json!({ "vendor": entity, "date": date, "total": total, "target_limit": limit }).to_string()
                ));
            } else if is_similar && total > 100_000.0 {
                let base_weight = if count >= 3 { 0.7 } else { 0.4 }; // High / Medium
                let score = f64::min(base_weight * account_sensitivity, 1.0);

                new_signals.push((
                    "SPLIT_PAYMENT:STRUCTURED",
                    format!("[분할결제 의심] '{}' {}건 유사 금액({}) (합계: {}).", entity, count, mean, total),
                    score,
                    obj_id.clone(),
                    project_id.clone(),
                    json!({ "vendor": entity, "date": date, "total": total, "cv": cv }).to_string()
                ));
            }
        }
    }

    // 4. DRY RUN REPORT
    println!("\n>>> [DRY RUN REPORT]");
    println!("Existing Signals: {}", old_count);
    println!("New Signals Detected: {}", new_signals.len());
    
    // Stats
    let mut score_sum = 0.0;
    for s in &new_signals { score_sum += s.2; }
    let avg_new_score = if !new_signals.is_empty() { score_sum / new_signals.len() as f64 } else { 0.0 };
    println!("Average New Score: {:.4}", avg_new_score);

    println!("\nTop 20 New Signals Examples:");
    for (i, s) in new_signals.iter().take(20).enumerate() {
        println!("{}. [{}] (Score: {:.2}) - {}", i+1, s.0, s.2, s.1);
    }

    // User prompt to proceed (simulated here by checking env var or arg, but for now we just print info)
    // For this task, we will just proceed if SAFE_MODE is not set.
    println!("\n>>> To Apply Changes: Set EXECUTE=1 environment variable.");
    
    if env::var("EXECUTE").unwrap_or_default() == "1" {
        println!(">>> [EXECUTING] Deleting old Split Payment signals...");
        conn.execute("DELETE FROM risk_signal WHERE signal_type LIKE 'SPLIT_PAYMENT%'", [])
            .context("Failed to clean up old signals")?;
        
        println!(">>> [EXECUTING] Inserting {} new signals...", new_signals.len());
        drop(obj_stmt); // Release the borrow on conn
        let mut inserted = 0;
        let tx = conn.transaction().context("Failed to start transaction")?;
        {
            let mut stmt = tx.prepare("INSERT INTO risk_signal (id, object_id, project_id, signal_type, description, score, related_ids, metadata) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)")
                .context("Failed to prepare insertion statement")?;
            for s in new_signals {
                stmt.execute(params![
                    uuid::Uuid::new_v4().to_string(),
                    s.3, // obj_id
                    s.4, // project_id
                    s.0, // type
                    s.1, // desc
                    s.2, // score
                    "[]", // related_ids (simplified)
                    s.5 // metadata
                ]).context("Failed to insert signal")?;
                inserted += 1;
            }
        }
        tx.commit().context("Failed to commit transaction")?;
        println!(">>> [SUCCESS] Inserted {} signals.", inserted);
    } else {
        println!(">>> [SKIPPED] Changes NOT applied. Run with EXECUTE=1 to apply.");
    }

    Ok(())
}
