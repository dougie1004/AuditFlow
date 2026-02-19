use rusqlite::{params, Connection};
use std::env;
use std::path::PathBuf;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let app_data_dir = env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
    let db_path = PathBuf::from(&app_data_dir).join("com.auditflow.app").join("audit_data_v4.db");
    
    if !db_path.exists() {
        println!("Database not found.");
        return Ok(());
    }

    let conn = Connection::open(&db_path)?;

    println!(">>> [ANALYSIS REPAIR] Starting Native Statistical Backfill...");

    // 1. Fetch all profiles to repair
    let mut stmt = conn.prepare("SELECT account_code, fiscal_year FROM account_year_profile")?;
    let profiles: Vec<(String, i32)> = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?.filter_map(|r| r.ok()).collect();

    for (acc, year) in &profiles {
        let year_str = year.to_string();
        
        // A. Monthly Data for CV
        let mut stmt_m = conn.prepare("SELECT SUM(ABS(net_amount)) FROM entity_event WHERE account_code = ?1 AND substr(event_date, 1, 4) = ?2 GROUP BY substr(event_date, 1, 7)")?;
        let monthly_data: Vec<f64> = stmt_m.query_map(params![acc, year_str], |r| r.get::<_, f64>(0))?.filter_map(|r| r.ok()).collect();

        let cv = if monthly_data.len() > 1 {
            let n = monthly_data.len() as f64;
            let sum: f64 = monthly_data.iter().sum();
            let mean = sum / n;
            let variance = monthly_data.iter().map(|&v| (v - mean).powi(2)).sum::<f64>() / n;
            let std_dev = variance.sqrt();
            if mean > 0.0 { std_dev / mean } else { 0.0 }
        } else { 0.0 };

        // B. CP Data for CR1/HHI
        let mut stmt_cp = conn.prepare("SELECT SUM(ABS(net_amount)) as s FROM entity_event WHERE account_code = ?1 AND substr(event_date, 1, 4) = ?2 GROUP BY entity_id ORDER BY s DESC")?;
        let cp_data: Vec<f64> = stmt_cp.query_map(params![acc, year_str], |r| r.get::<_, f64>(0))?.filter_map(|r| r.ok()).collect();

        let (cr1, hhi) = if !cp_data.is_empty() {
            let total: f64 = cp_data.iter().sum();
            let cr1_val = if total > 0.0 { cp_data[0] / total } else { 0.0 };
            let hhi_val = if total > 0.0 { cp_data.iter().map(|&v| (v / total).powi(2)).sum::<f64>() } else { 0.0 };
            (cr1_val, hhi_val)
        } else { (0.0, 0.0) };

        // C. Structural Score (Piecewise Acceleration Logic Inlined)
        let base_linear = (cv / 2.0).min(1.0);
        let cv_weight = if cv <= 1.5 {
            base_linear
        } else if cv <= 2.5 {
            (base_linear * 1.2).min(1.0)
        } else {
            (base_linear * 1.5).min(1.0)
        };
        let structural_score = (cv_weight * 0.4 + cr1 * 0.3 + hhi * 0.3).min(1.0);

        // D. Anomaly Score (from existing signals)
        let avg_anomaly: f64 = conn.query_row(
            "SELECT COALESCE(AVG(score), 0.0) FROM risk_signal WHERE (metadata LIKE ?1 OR description LIKE ?1)",
            params![format!("%{}%", acc)],
            |r| r.get(0)
        ).unwrap_or(0.0);

        // Update
        conn.execute(
            "UPDATE account_year_profile SET structural_score = ?1, avg_anomaly_score = ?2, avg_cv = ?3, avg_cr1 = ?4, avg_hhi = ?5, transaction_count = ?6 WHERE account_code = ?7 AND fiscal_year = ?8",
            params![structural_score, avg_anomaly, cv, cr1, hhi, cp_data.len() as i64, acc, year]
        ).ok();
    }

    println!(">>> [ANALYSIS REPAIR] Successfully backfilled {} account profiles.", profiles.len());

    Ok(())
}
