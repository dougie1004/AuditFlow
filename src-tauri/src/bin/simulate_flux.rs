use rusqlite::{params, Connection, Result};
use uuid::Uuid;

struct Event {
    date: String,
    code: String,
    name: String,
    amount: f64,
    entity: String,
}

fn main() -> Result<()> {
    let db_path = "C:\\Users\\user\\AppData\\Roaming\\com.auditflow.app\\audit_data_v4.db";
    let mut conn = Connection::open(db_path)?;

    println!("--- [Flux Analysis Simulation: 2007-2011] ---");
    
    conn.execute("PRAGMA foreign_keys = OFF", [])?;
    let tables = vec!["entity_event", "risk_signal", "account_year_profile", "audit_object"];
    for t in tables { conn.execute(&format!("DELETE FROM {}", t), [])?; }

    let obj_id = Uuid::new_v4().to_string();
    conn.execute("INSERT INTO audit_object (id, object_type, source) VALUES (?1, 'LEDGER', 'SIMULATION')", params![obj_id])?;

    let mut events = Vec::new();
    for y in 2007..=2011 {
        events.push(Event { date: format!("{}-01-01", y), code: "8110".to_string(), name: "광고선전비".to_string(), amount: 1000.0, entity: "Partner_A".to_string() });
    }
    for y in 2007..=2009 {
        events.push(Event { date: format!("{}-01-01", y), code: "141".to_string(), name: "가지급금".to_string(), amount: 1000.0, entity: format!("Vendor_{}", y) });
        events.push(Event { date: format!("{}-01-02", y), code: "141".to_string(), name: "가지급금".to_string(), amount: 1000.0, entity: format!("Vendor_Other_{}", y) });
    }
    for y in 2010..=2011 {
        events.push(Event { date: format!("{}-01-01", y), code: "141".to_string(), name: "가지급금".to_string(), amount: 9000.0, entity: "Dominant_X".to_string() });
        events.push(Event { date: format!("{}-01-02", y), code: "141".to_string(), name: "가지급금".to_string(), amount: 1000.0, entity: "Other".to_string() });
    }
    for y in 2007..=2011 {
        events.push(Event { date: format!("{}-01-01", y), code: "103".to_string(), name: "보통예금".to_string(), amount: 100000.0, entity: "Bank".to_string() });
    }

    let tx = conn.transaction()?;
    for e in events {
        tx.execute("INSERT INTO entity_event (id, entity_id, event_type, amount, event_date, description, source_object_id, account_code, account_name) VALUES (?1, ?2, 'TX', ?3, ?4, ?5, ?6, ?7, ?8)", 
        params![Uuid::new_v4().to_string(), e.entity, e.amount, e.date, e.name, obj_id, e.code, e.name])?;
    }
    tx.commit()?;

    println!(">>> Injected. Running Simulation Analysis...");

    let accounts = vec![("103", "보통예금"), ("8110", "광고선전비"), ("141", "가지급금")];
    for (acc, name) in accounts {
        if !is_analytically_significant(acc) {
            println!("[FILTER] Skipping Account: {} ({}) - (데이터 기반: 소음 제거됨)", acc, name);
            continue;
        }

        println!("--- Analyzing Account: {} ({}) ---", acc, name);
        for y in 2007..=2011 {
            let cr1: f64 = {
                let total: f64 = conn.query_row("SELECT COALESCE(SUM(amount), 1.0) FROM entity_event WHERE account_code = ?1 AND substr(event_date, 1, 4) = ?2", params![acc, y.to_string()], |r| r.get(0))?;
                let max: f64 = conn.query_row("SELECT COALESCE(MAX(amt), 0.0) FROM (SELECT SUM(amount) as amt FROM entity_event WHERE account_code = ?1 AND substr(event_date, 1, 4) = ?2 GROUP BY entity_id)", params![acc, y.to_string()], |r| r.get(0))?;
                max / total
            };

            conn.execute("INSERT INTO account_year_profile (account_code, fiscal_year, avg_cr1, structural_score) VALUES (?1, ?2, ?3, 0.5) ON CONFLICT(account_code, fiscal_year) DO UPDATE SET avg_cr1=?3", params![acc, y, cr1])?;
            
            let mut stmt = conn.prepare("SELECT avg_cr1 FROM account_year_profile WHERE account_code = ?1 AND fiscal_year <= ?2 ORDER BY fiscal_year ASC")?;
            let history_rows = stmt.query_map(params![acc, y], |r| r.get(0))?;
            let history: Vec<f64> = history_rows.filter_map(|r| r.ok()).collect();

            if history.len() >= 2 {
                let last_delta = history[history.len()-1] - history[history.len()-2];
                let signature = if last_delta > 0.3 { "Emerging Dominance (Structural Break)" } else if last_delta.abs() < 0.05 { "Stable" } else { "Shifting" };
                println!("  Year: {} | CR1: {:.2} | Delta: {:+.2} | Signature: {}", y, cr1, last_delta, signature);
            } else {
                println!("  Year: {} | CR1: {:.2} | (Initial Year)", y, cr1);
            }
        }
    }

    Ok(())
}

fn is_analytically_significant(code: &str) -> bool {
    if code.starts_with('4') || code.starts_with('5') || code.starts_with('8') { return true; }
    if ["141", "258"].iter().any(|&w| code.starts_with(w)) { return true; }
    false
}
