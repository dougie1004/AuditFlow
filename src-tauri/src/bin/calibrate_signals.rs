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

    println!(">>> [CALIBRATION] Starting Bulk Signal Score Adjustment...");

    // Define the calibration map (Signal Type -> New Score)
    // Using the values from RuleWeight enum: High=0.7, Medium=0.4, Low=0.2
    let updates = vec![
        ("SPLIT_PAYMENT", 0.2),      // Low (Common in ledgers)
        ("HOLIDAY_USAGE", 0.2),      // Low
        ("ACCOUNT_ANOMALY", 0.4),    // Medium
        ("VOLUMETRIC_ANOMALY", 0.2), // Low
        // Add others if any
    ];

    let mut total_updated = 0;

    for (sig_type, new_score) in updates {
        let count = conn.execute(
            "UPDATE risk_signal SET score = ?1 WHERE signal_type = ?2",
            params![new_score, sig_type]
        )?;
        println!("   - Updated {} signals of type '{}' to score {:.1}", count, sig_type, new_score);
        total_updated += count;
    }
    
    // Also calibrate TREND:INCREASING_RISK ? 
    // They are currently set to (structural_score * 1.2).min(1.0).
    // Structural score is already calculated correctly by repair_metrics.
    // So we don't need to manually fix them here, repair_metrics might handle them if we wanted, 
    // but risk_signal for trends are just alerts.
    // However, if we want A-Scr to be clean, we should probably leave Trends alone or set them to a specific weight?
    // Trends are usually "Findings", not just "Anomalies". Let's leave them for now unless they dominate A-Scr.
    // A-Scr calculation comes from `risk_signal`. Trends are IN risk_signal. 
    // If Trends are 1.0 and dominate, they will skew A-Scr.
    // But Trends are rare.

    println!(">>> [CALIBRATION] Total signals updated: {}", total_updated);
    println!(">>> [NEXT STEP] Please run 'repair_metrics' to propagate these changes to account profiles.");

    Ok(())
}
