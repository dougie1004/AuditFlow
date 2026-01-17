use tauri::{AppHandle, Manager};
use rusqlite::{params, Connection};

#[tauri::command]
pub fn remove_duplicate_issues(app_handle: AppHandle, project_id: String) -> Result<String, String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // Find duplicates based on row_index and similar evidence
    let mut stmt = conn.prepare(
        "SELECT id, row_index, evidence_quote FROM audit_issues 
         WHERE project_type = ?1 
         ORDER BY row_index, id"
    ).map_err(|e| e.to_string())?;

    let issues: Vec<(i64, i64, String)> = stmt.query_map(params![&project_id], |row| {
        Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    let mut to_delete = Vec::new();
    let mut seen: std::collections::HashSet<(i64, String)> = std::collections::HashSet::new();

    for (id, row_idx, evidence) in issues {
        let evidence_key: String = evidence.chars().take(50).collect();
        let key = (row_idx, evidence_key.clone());
        
        if seen.contains(&key) {
            to_delete.push(id);
        } else {
            seen.insert(key);
        }
    }

    let deleted_count = to_delete.len();
    for id in to_delete {
        conn.execute("DELETE FROM audit_issues WHERE id = ?1", params![id]).ok();
    }

    Ok(format!("{}媛쒖쓽 以묐났 ?댁뒋瑜??쒓굅?덉뒿?덈떎.", deleted_count))
}
