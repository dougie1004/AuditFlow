use rusqlite::Connection;
use std::env;
use std::path::PathBuf;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let app_data_dir = env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
    let db_path = PathBuf::from(&app_data_dir).join("com.auditflow.app").join("audit_data_v4.db");
    
    if !db_path.exists() {
        println!("Database not found at {:?}", db_path);
        return Ok(());
    }

    let conn = Connection::open(&db_path)?;

    println!(">>> [DIAGNOSTIC] Checking Data Integrity...");

    // 1. Audit Objects Count
    let obj_count: i64 = conn.query_row("SELECT COUNT(*) FROM audit_object", [], |r| r.get(0)).unwrap_or(0);
    println!("   - Audit Objects: {}", obj_count);

    // 2. Entity Event Count
    let event_count: i64 = conn.query_row("SELECT COUNT(*) FROM entity_event", [], |r| r.get(0)).unwrap_or(0);
    println!("   - Entity Events: {}", event_count);

    // 3. Distinct Source Object IDs in Entity Event
    let distinct_sources: i64 = conn.query_row("SELECT COUNT(DISTINCT source_object_id) FROM entity_event", [], |r| r.get(0)).unwrap_or(0);
    println!("   - Distinct Source Objects in Events: {}", distinct_sources);

    // 4. Orphan Check (Events without Audit Object)
    let orphan_count: i64 = conn.query_row("
        SELECT COUNT(*) 
        FROM entity_event e 
        LEFT JOIN audit_object o ON e.source_object_id = o.id 
        WHERE o.id IS NULL
    ", [], |r| r.get(0)).unwrap_or(0);
    println!("   - Orphan Events (Missing Parent Object): {}", orphan_count);
    
    // 5. Project ID Check (Audit Objects without Project ID)
    let missing_project: i64 = conn.query_row("SELECT COUNT(*) FROM audit_object WHERE project_id IS NULL OR project_id = ''", [], |r| r.get(0)).unwrap_or(0);
    println!("   - Audit Objects Missing Project ID: {}", missing_project);

    Ok(())
}
