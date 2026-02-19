use rusqlite::{Connection, Result};

fn main() -> Result<()> {
    let db_path = "C:\\Users\\user\\AppData\\Roaming\\com.auditflow.app\\audit_data_v4.db";
    let mut conn = Connection::open(db_path)?;

    let tables = vec![
        "entity_event",
        "risk_signal",
        "account_year_profile",
        "account_month_profile",
        "suspicion_inbox",
        "correlation_signal",
        "audit_object",
        "audit_data",
        "system_events",
        "event_relations",
        "context_signal"
    ];

    println!("--- [WIPING DATABASE FOR CLEAN EXPERIMENT] ---");
    let tx = conn.transaction()?;
    for table in tables {
        match tx.execute(&format!("DELETE FROM {}", table), []) {
            Ok(_) => println!("Cleaned: {}", table),
            Err(e) => println!("Skipped/Error {}: {}", table, e),
        }
    }
    tx.commit()?;
    println!("--- [SUCCESS] All risk signal tables are zeroed out. ---");

    Ok(())
}
