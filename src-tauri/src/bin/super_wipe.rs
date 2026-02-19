use rusqlite::{Connection, Result};
use std::fs;

fn main() -> Result<()> {
    let db_path = "C:\\Users\\user\\AppData\\Roaming\\com.auditflow.app\\audit_data_v4.db";
    
    println!("--- [SUPER WIPE: TOTAL RESET] ---");

    // 1. Try to open and wipe tables first (soft reset)
    if let Ok(mut conn) = Connection::open(db_path) {
        let tables = vec![
            "entity_event", "risk_signal", "account_year_profile", 
            "account_month_profile", "suspicion_inbox", "correlation_signal",
            "audit_object", "audit_data", "relation_candidate", "risk_case"
        ];
        
        let tx = conn.transaction()?;
        for table in tables {
            let _ = tx.execute(&format!("DELETE FROM {}", table), []);
        }
        tx.commit()?;
        println!("All tables truncated.");
    }

    // 2. Attempt hard delete of the DB file to clear any schema corruption or hidden bloat
    println!("Attempting hard file delete...");
    match fs::remove_file(db_path) {
        Ok(_) => println!("DB File deleted successfully. A fresh one will be created on start."),
        Err(e) => println!("Warning: Could not delete DB file (might be in use): {}", e),
    }

    println!("--- [RESET COMPLETE] ---");
    Ok(())
}
