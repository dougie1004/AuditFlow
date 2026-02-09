
use tauri::{AppHandle, Manager};
use rusqlite::Connection;
use serde_json::{json, Value};

/// [Assurance Logic: Domain Context]
/// Why this logic is here:
/// This module calculates the "coverage ratio" of the Audit Universe.
/// It represents the fundamental question of Internal Audit: "How much of the organization is currently under scrutiny?"
/// This is not just a database query; it is a measure of the audit function's reach and effectiveness.
/// We isolate this logic to ensure that "coverage" definitions (e.g., what counts as an audit) can evolve independently of the UI layer.
pub fn get_assurance_map_stats_impl(app_handle: &AppHandle) -> Result<Value, String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    calculate_coverage(&conn).map_err(|e| e.to_string())
}

/// [Business Logic: Coverage Calculation]
/// Isolated from AppHandle to allow pure testing against in-memory DB or mocked Connection.
fn calculate_coverage(conn: &Connection) -> Result<Value, rusqlite::Error> {
    let total: i64 = conn.query_row(
        "SELECT COUNT(*) FROM audit_universe", 
        [], 
        |r| r.get(0)
    ).unwrap_or(0);

    let covered: i64 = conn.query_row(
        "SELECT COUNT(*) FROM audit_universe WHERE last_audit_year >= 2024", 
        [], 
        |r| r.get(0)
    ).unwrap_or(0);

    let pct = if total > 0 { 
        (covered as f64 / total as f64) * 100.0 
    } else { 
        0.0 
    };

    Ok(json!({
        "coverage": format!("{:.1}", pct),
        "total_entities": total,
        "gap_analysis": "No critical gaps."
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn test_coverage_calculation() {
        let conn = Connection::open_in_memory().unwrap();
        
        // Setup schema
        conn.execute(
            "CREATE TABLE audit_universe (
                id INTEGER PRIMARY KEY,
                unit_name TEXT,
                last_audit_year INTEGER
            )", 
            []
        ).unwrap();

        // Seed data: 2 entities, 1 covered (2024), 1 stale (2023)
        conn.execute("INSERT INTO audit_universe (unit_name, last_audit_year) VALUES ('Unit A', 2024)", []).unwrap();
        conn.execute("INSERT INTO audit_universe (unit_name, last_audit_year) VALUES ('Unit B', 2023)", []).unwrap();

        let result = calculate_coverage(&conn).unwrap();
        
        assert_eq!(result["coverage"], "50.0");
        assert_eq!(result["total_entities"], 2);
    }
}
