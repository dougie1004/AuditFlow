use rusqlite::Connection;

fn main() {
    let db_path = "C:\\Users\\user\\AppData\\Roaming\\com.auditflow.app\\audit_data_v4.db";
    let conn = Connection::open(db_path).expect("Failed to open DB");

    // Total Events
    let total_events: i64 = conn.query_row("SELECT COUNT(*) FROM entity_event", [], |r| r.get(0)).unwrap_or(0);
    println!("TOTAL_EVENTS: {}", total_events);

    // High Risk
    let mut stmt = conn.prepare("SELECT account_code, MAX(structural_score) FROM account_year_profile GROUP BY account_code ORDER BY MAX(structural_score) DESC LIMIT 3").unwrap();
    let rows = stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, f64>(1)?))).unwrap();
    for r in rows {
        let (code, score) = r.unwrap();
        println!("RISK: {} -> {}", code, score);
    }

    // NULL check
    let null_counts: i64 = conn.query_row("SELECT COUNT(*) FROM entity_event WHERE json_extract(metadata, '$.account') IS NULL", [], |r| r.get(0)).unwrap_or(0);
    println!("NULL_ACCOUNTS: {}", null_counts);
    
    // Top volumes
    let mut stmt = conn.prepare("SELECT json_extract(metadata, '$.account'), strftime('%Y', event_date), SUM(amount) FROM entity_event WHERE json_extract(metadata, '$.account') IS NOT NULL GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 3").unwrap();
    let rows = stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, f64>(2)?))).unwrap();
    for r in rows {
        let (acc, yr, amt) = r.unwrap();
        println!("VOL: {} ({}) = {}", acc, yr, amt);
    }
}
