use rusqlite::Connection;
use std::env;
use std::path::PathBuf;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let app_data_dir = env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
    let db_path = PathBuf::from(&app_data_dir).join("com.auditflow.app").join("audit_data_v4.db");
    
    let conn = Connection::open(&db_path)?;

    println!(">>> [PEEK] account_year_profile content (first 5):");
    let mut stmt = conn.prepare("SELECT account_code, fiscal_year, avg_structural_score, avg_cv, avg_cr1, avg_hhi FROM account_year_profile LIMIT 5")?;
    let rows = stmt.query_map([], |r| Ok((
        r.get::<_, String>(0)?,
        r.get::<_, i32>(1)?,
        r.get::<_, f64>(2)?,
        r.get::<_, f64>(3)?,
        r.get::<_, f64>(4)?,
        r.get::<_, f64>(5)?
    )))?;

    for r in rows {
        let (code, year, score, cv, cr1, hhi) = r?;
        println!("   Acc: {}, Year: {}, Score: {:.2}, CV: {:.2}, CR1: {:.2}, HHI: {:.3}", code, year, score, cv, cr1, hhi);
    }

    Ok(())
}
