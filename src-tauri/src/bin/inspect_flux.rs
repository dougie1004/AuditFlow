use rusqlite::{Connection, Result};
use std::path::PathBuf;

fn main() -> Result<()> {
    let db_path = PathBuf::from(r"C:\Users\user\AppData\Roaming\com.auditflow.app\audit_data_v4.db");
    
    println!("Opening DB at: {:?}", db_path);
    if !db_path.exists() {
        println!("ERROR: DB NOT FOUND");
        return Ok(());
    }

    let conn = Connection::open(&db_path)?;

    println!("\n[SIGNALS]");
    let mut stmt = conn.prepare("SELECT signal_type, description, score FROM risk_signal")?;
    let rows = stmt.query_map([], |row| {
        Ok(format!("Type: {} | Score: {:.2} | Desc: {}", 
            row.get::<_, String>(0)?, 
            row.get::<_, f64>(2)?, 
            row.get::<_, String>(1)?))
    })?;
    for r in rows { println!("{}", r?); }

    println!("\n[HISTORY SAMPLE]");
    let mut stmt = conn.prepare("
        SELECT account_code, fiscal_year, avg_cr1, structural_score 
        FROM account_year_profile 
        WHERE account_code IN (SELECT DISTINCT account_code FROM account_year_profile WHERE structural_score > 0.6 LIMIT 3)
        ORDER BY account_code, fiscal_year ASC
    ")?;
    let rows = stmt.query_map([], |row| {
        Ok(format!("Acc: {} | Year: {} | CR1: {:.4} | Score: {:.4}",
            row.get::<_, String>(0)?,
            row.get::<_, i32>(1)?,
            row.get::<_, f64>(2)?,
            row.get::<_, f64>(3)?))
    })?;
    for r in rows { println!("{}", r?); }

    Ok(())
}
