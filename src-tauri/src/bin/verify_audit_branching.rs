use rusqlite::Connection;
use std::path::Path;

// Mocking some types to use the logic from flow_analysis
// Since I can't easily import from crate::assurance in a bin without proper setup, 
// I'll check if I can just run a diagnostic query that simulates the logic.

fn main() {
    let db_path = "C:\\Users\\user\\AppData\\Roaming\\com.auditflow.app\\audit_data_v4.db";
    let conn = Connection::open(db_path).expect("Failed to open DB");

    println!("=== Audit Engine Branching Verification (Phase 4.7b) ===");

    // 1. Check "Rental Deposit" (Structural)
    // We expect its score to be low even if concentrated.
    let target_accounts = vec!["임차보증금", "장기예금", "접대비", "복리후생비", "가수금"];
    
    for acc in target_accounts {
        println!("\n[Test Account: {}]", acc);
        
        // Find events and simulate flow_analysis logic
        let mut stmt = conn.prepare("
            SELECT event_date, amount, source_object_id 
            FROM entity_event 
            WHERE json_extract(metadata, '$.account') LIKE ?1
        ").unwrap();
        
        let rows = stmt.query_map([format!("%{}%", acc)], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, f64>(1)?))
        }).unwrap();
        
        let mut total = 0.0;
        let mut count = 0;
        let mut dec_total = 0.0;
        let mut other_total = 0.0;
        
        for r in rows {
            let (date, amt) = r.unwrap();
            total += amt.abs();
            count += 1;
            if date.contains("-12-") {
                dec_total += amt.abs();
            } else {
                other_total += amt.abs();
            }
        }
        
        println!("  - Total Volume: {}", total);
        println!("  - Event Count: {}", count);
        println!("  - Dec Volume: {}", dec_total);
        
        // Simulating the new logic
        if acc.contains("보증금") || acc.contains("예금") {
            println!("  - LOGIC: Structural Branch (HHI Skipped)");
            println!("  - EXPECTED: Low Risk (< 0.3)");
        } else if acc.contains("접대") || acc.contains("복리") {
            println!("  - LOGIC: Distribution Branch (HHI Strict)");
            println!("  - EXPECTED: High Risk if concentrated");
        } else if acc.contains("가수금") {
            println!("  - LOGIC: Adjustment Branch (Spike Check)");
            let avg_others = other_total / 11.0; 
            if dec_total > avg_others * 3.0 && dec_total > 500.0 {
                println!("  - ALERT: Window Dressing Spike Detected! (Score 0.85)");
            }
        }
    }
}
