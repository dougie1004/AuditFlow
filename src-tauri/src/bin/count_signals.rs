use rusqlite::{Connection, Result};

fn main() -> Result<()> {
    let db_path = "C:\\Users\\user\\AppData\\Roaming\\com.auditflow.app\\audit_data_v4.db";
    let conn = Connection::open(db_path)?;
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM risk_signal", [], |r| r.get(0))?;
    println!("Total Risk Signals: {}", count);
    Ok(())
}
