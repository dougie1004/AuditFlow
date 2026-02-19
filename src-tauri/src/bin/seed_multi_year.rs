use rusqlite::{params, Connection};
use uuid::Uuid;
use serde_json::json;

fn main() {
    let db_path = "C:\\Users\\user\\AppData\\Roaming\\com.auditflow.app\\audit_data_v4.db";
    let mut conn = match Connection::open(db_path) {
        Ok(c) => c,
        Err(e) => {
            println!("CRITICAL ERROR OPENING DB: {}", e);
            return;
        }
    };

    println!("--- [Seeding Multi-Year Data for Testing] ---");
    
    // Ensure TEST_ENT exists
    let _ = conn.execute(
        "INSERT OR IGNORE INTO entity_master (id, entity_type, canonical_name, normalized_key) VALUES (?1, ?2, ?3, ?4)",
        params!["TEST_ENT", "LEDGER", "Test Entity", "TESTENTITY"]
    );

    // Clear old data
    if let Err(e) = conn.execute("DELETE FROM entity_event", []) {
        println!("Error clearing table: {}", e);
    }

    let mut events = Vec::new();

    // 1. Normal Stable Account
    let normal_data = vec![(2021, 1000.0), (2022, 1200.0), (2023, 1500.0), (2024, 1800.0), (2025, 2200.0)];
    for (y, amt) in normal_data {
        events.push(("Normal_Account", format!("{}-01-01", y), amt));
    }

    // 2. High Growth Account (Top 1)
    let growth_data = vec![(2021, 1000.0), (2022, 3000.0), (2023, 9000.0), (2024, 27000.0)];
    for (y, amt) in growth_data {
        events.push(("Growth_Hero", format!("{}-01-01", y), amt));
    }

    // 3. Edge Case: 1 year only
    events.push(("Year_1_Only", "2024-01-01".to_string(), 5000.0));

    // 4. Edge Case: 2 years 0 -> Increase
    events.push(("Zero_to_Hero", "2021-01-01".to_string(), 0.0));
    events.push(("Zero_to_Hero", "2022-01-01".to_string(), 0.0));
    events.push(("Zero_to_Hero", "2023-01-01".to_string(), 5000.0));

    // 5. Edge Case: Small to Large (>1000%)
    events.push(("Small_to_Large", "2023-01-01".to_string(), 1.0));
    events.push(("Small_to_Large", "2024-01-01".to_string(), 1011.0)); 

    // 6. Edge Case: Year gaps (2021, 2023, 2025)
    let gap_data = vec![(2021, 1000.0), (2023, 1500.0), (2025, 2000.0)];
    for (y, amt) in gap_data {
        events.push(("Gap_Account", format!("{}-01-01", y), amt));
    }

    let tx = match conn.transaction() {
        Ok(t) => t,
        Err(e) => {
            println!("Error starting transaction: {}", e);
            return;
        }
    };

    for (acc, date, amt) in events {
        let meta = json!({"account": acc, "date": date, "amount": amt}).to_string();
        if let Err(e) = tx.execute(
            "INSERT INTO entity_event (id, entity_id, event_type, amount, event_date, description, source_type, metadata) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![Uuid::new_v4().to_string(), "TEST_ENT", "TX", amt, date, acc, "LEDGER", meta]
        ) {
            println!("Error inserting {}: {}", acc, e);
        }
    }
    
    if let Err(e) = tx.commit() {
        println!("Error committing: {}", e);
    } else {
        println!(">>> Seeded multi-year test data successfully.");
    }
}
