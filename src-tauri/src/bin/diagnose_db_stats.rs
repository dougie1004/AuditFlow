use rusqlite::{Connection, Result};

fn main() -> Result<()> {
    let db_path = "C:\\Users\\user\\AppData\\Roaming\\com.auditflow.app\\audit_data_v4.db";
    let conn = Connection::open(db_path)?;

    println!("--- [DB Integrity Check] ---");
    let tables = vec!["audit_data", "audit_object", "entity_event", "risk_signal", "account_year_profile", "correlation_signal"];
    
    for table in tables {
        let count: i64 = conn.query_row(&format!("SELECT count(*) FROM {}", table), [], |r| r.get(0)).unwrap_or(-1);
        println!("Table: {:20} | Rows: {}", table, count);
    }

    println!("\n--- [Stale Data Sample] risk_signal ---");
    let mut stmt = conn.prepare("SELECT signal_type, description, created_at FROM risk_signal LIMIT 5")?;
    let rows = stmt.query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?)))?;
    for r in rows {
        let (t, d, c) = r?;
        println!("Type: {} | Desc: {}... | At: {}", t, &d[..20.min(d.len())], c);
    }

    Ok(())
}
