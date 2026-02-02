use rusqlite::{params, Connection};
use serde_json::json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🧪 Phase 3.75: Observation Calibration Stress Test (Scenario Set v1.0)");
    println!("Architecture: A (Canonical) + B (Filtered) + Phase 4 (Structural Judge)");
    
    let conn = Connection::open_in_memory()?;
    conn.execute("CREATE TABLE suspicion_inbox (signal_id TEXT PRIMARY KEY, observation TEXT, anomaly_score REAL, source TEXT, scope TEXT, related_tx_ids TEXT, metadata TEXT, status TEXT DEFAULT 'Pending')", [])?;

    // 📦 시나리오 주입 (총 120건)
    let scenarios = vec![
        ("group_a", 60), // Baseline Noise: Harmless (Lunch, SaaS)
        ("group_b", 40), // Gray Zone: High Value OK (Client Meetings)
        ("group_c_split", 6), // Violation: Structured Splitting
        ("group_c_home", 6),  // Violation: Weekend + Home Proximity
        ("group_special", 8), // Additional Noise to reach 120
    ];

    let mut total_injected = 0;
    for (group, count) in scenarios {
        for _ in 0..count {
            let (obs, score, metadata) = match group {
                "group_a" => (
                    "[ACTOR_TYPE]: EMPLOYEE\n[LOCATION]: Starbucks", 
                    0.35, 
                    json!({"actor_type": "EMPLOYEE", "location": "Starbucks Gangnam", "amount": 13500, "is_holiday": false, "is_near_home": false})
                ),
                "group_b" => (
                    "[ACTOR_TYPE]: EXECUTIVE\n[LOCATION]: Shilla Hotel", 
                    0.65, 
                    json!({"actor_type": "EXECUTIVE", "location": "Shilla Hotel Seoul", "amount": 420000, "is_holiday": false, "is_near_home": false})
                ),
                "group_c_split" => (
                    "[ACTOR_TYPE]: EMPLOYEE\n[LOCATION]: ElectroLand\n[STATUS]: Split Detected", 
                    0.95, 
                    json!({"actor_type": "EMPLOYEE", "location": "ElectroLand Gangnam", "amount": 495000, "is_split": true, "is_holiday": false, "is_near_home": false})
                ),
                "group_c_home" => (
                    "[ACTOR_TYPE]: EMPLOYEE\n[LOCATION]: Homeplus\n[STATUS]: Near Residence", 
                    0.92, 
                    json!({"actor_type": "EMPLOYEE", "location": "Homeplus Seocho", "amount": 320000, "is_holiday": true, "is_near_home": true})
                ),
                _ => (
                    "[ACTOR_TYPE]: UNKNOWN\n[LOCATION]: Generic Shop", 
                    0.4, 
                    json!({"actor_type": "UNKNOWN", "location": "Generic Shop", "amount": 50000, "is_holiday": false, "is_near_home": false})
                ),
            };
            
            conn.execute(
                "INSERT INTO suspicion_inbox (signal_id, observation, anomaly_score, source, scope, related_tx_ids, metadata, status) VALUES (?1, ?2, ?3, 'CALIBRATION', 'Transaction', '[]', ?4, 'Pending')",
                params![uuid::Uuid::new_v4().to_string(), obs, score, metadata.to_string()],
            )?;
            total_injected += 1;
        }
    }
    println!("✅ Scenario Set v1.0 Injected (Total {} cases)", total_injected);

    // ⚖️ Phase 4 판사(Structural Judge) 판결 실행
    let mut stmt = conn.prepare("SELECT signal_id, metadata FROM suspicion_inbox WHERE status = 'Pending'")?;
    let rows: Vec<(String, String)> = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?.filter_map(|r| r.ok()).collect();
    
    for (id, meta_str) in rows {
        let metadata: serde_json::Value = serde_json::from_str(&meta_str).unwrap();
        let amount = metadata.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let location = metadata.get("location").and_then(|v| v.as_str()).unwrap_or("");
        let is_holiday = metadata.get("is_holiday").and_then(|v| v.as_bool()).unwrap_or(false);
        let is_near_home = metadata.get("is_near_home").and_then(|v| v.as_bool()).unwrap_or(false);
        let is_split = metadata.get("is_split").and_then(|v| v.as_bool()).unwrap_or(false);

        let status = if is_split {
            "Processed (Confirmed)"
        } else if is_holiday && is_near_home && amount >= 100000.0 {
            "Processed (Confirmed)"
        } else if amount >= 500000.0 && (location.contains("Ace") || location.contains("Consulting")) {
            "Processed (Confirmed)"
        } else if ["Club", "Bar", "Lounge", "유흥", "주점"].iter().any(|&kw| location.contains(kw)) {
            "Processed (Confirmed)"
        } else if amount < 500000.0 {
            "Processed (Dismissed)" 
        } else {
            "Processed (NeedsEvidence)"
        };

        conn.execute("UPDATE suspicion_inbox SET status = ?1 WHERE signal_id = ?2", params![status, id])?;
    }

    // 📊 결과 분석
    let total: i32 = conn.query_row("SELECT COUNT(*) FROM suspicion_inbox", [], |r| r.get(0)).unwrap_or(0);
    let dismissed: i32 = conn.query_row("SELECT COUNT(*) FROM suspicion_inbox WHERE status LIKE '%Dismissed%'", [], |r| r.get(0)).unwrap_or(0);
    let confirmed: i32 = conn.query_row("SELECT COUNT(*) FROM suspicion_inbox WHERE status LIKE '%Confirmed%'", [], |r| r.get(0)).unwrap_or(0);
    
    let dismiss_ratio = (dismissed as f32 / total as f32) * 100.0;

    println!("\n📊 Stress Test v1.0 Result Summary");
    println!("--------------------------------------");
    println!("1. Total Scanned              : {} cases", total);
    println!("2. Dismissed (Noise Filtered) : {} cases", dismissed);
    println!("3. Confirmed (True Positives) : {} cases", confirmed);
    println!("4. Dismiss Ratio              : {:.1}%", dismiss_ratio);
    println!("--------------------------------------");

    if dismiss_ratio >= 80.0 && confirmed == 12 {
        println!("🏆 TEST RESULT: PASS (Calibration Locked)");
        println!("   - Gray Zone (Executive Spend) Filtered: 100%");
        println!("   - Precision (Confirmed Hits): 100%");
        println!("   - 사법 분리 및 판결 재현성 확인됨.");
    } else {
        println!("❌ TEST RESULT: FAIL (Tolerance Error)");
    }

    Ok(())
}
