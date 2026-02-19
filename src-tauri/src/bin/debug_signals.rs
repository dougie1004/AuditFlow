use rusqlite::{params, Connection, Result};

fn main() -> Result<()> {
    let db_path = "C:\\Users\\user\\AppData\\Roaming\\com.auditflow.app\\audit_data_v4.db";
    let conn = Connection::open(db_path)?;
    
    println!("--- [DEBUG: risk_signal table] ---");
    let mut stmt = conn.prepare("SELECT id, signal_type, description, score, metadata FROM risk_signal WHERE signal_type LIKE 'FLUX%' LIMIT 10")?;
    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, f64>(3)?,
            row.get::<_, String>(4)?
        ))
    })?;

    for r in rows {
        let (id, stype, desc, score, meta) = r?;
        println!("ID: {}", id);
        println!("Type: {}", stype);
        println!("Desc: {}", desc);
        println!("Score: {}", score);
        println!("Meta: {}", meta);
        println!("--------------------------------");
    }
    
    Ok(())
}
