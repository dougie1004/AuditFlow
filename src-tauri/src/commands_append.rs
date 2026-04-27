use tauri::AppHandle;
use rusqlite::{params, Connection};
use serde_json::{json, Value};
use tauri::Manager;

#[tauri::command]
pub fn promote_risk_to_review(app_handle: AppHandle, session_id: String, signal_id: String) -> Result<String, String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // 1. Fetch risk details from suspicion_inbox (the AI insight)
    let (observation, related_tx_ids, metadata) = conn.query_row(
        "SELECT observation, related_tx_ids, metadata FROM suspicion_inbox WHERE signal_id = ?1",
        params![signal_id],
        |row| Ok((
            row.get::<_, String>(0)?,
            row.get::<_, Option<String>>(1)?,
            row.get::<_, Option<String>>(2)?
        ))
    ).map_err(|e| e.to_string())?;

    // 2. Determine Linked Object ID
    // If related_tx_ids is JSON array, pick first. Else use full string. Fallback to signal_id.
    let related_tx_str = related_tx_ids.unwrap_or_default();
    let object_id = if related_tx_str.starts_with('[') {
         // Simple heuristic parse: find first quoted string inside
         related_tx_str.split('"').nth(1).unwrap_or(&signal_id).to_string()
    } else if !related_tx_str.is_empty() {
         related_tx_str.clone()
    } else {
        signal_id.clone()
    };

    // 3. Insert into review_item (The "Queue")
    let new_review_id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO review_item (
            id, session_id, object_id, relation_candidate_id, reason, status, snapshot_data, created_at, reviewer_note
        ) VALUES (?1, ?2, ?3, ?4, ?5, 'PENDING', ?6, CURRENT_TIMESTAMP, '')",
        params![
            new_review_id,
            session_id,
            object_id,
            signal_id,
            observation,
            metadata.unwrap_or_default()
        ]
    ).map_err(|e| e.to_string())?;

    // 4. Mark suspicion as Processed so it doesn't clutter the inbox
    conn.execute(
        "UPDATE suspicion_inbox SET status = 'In Review' WHERE signal_id = ?1",
        params![signal_id]
    ).map_err(|e| e.to_string())?;

    Ok(new_review_id)
}


#[tauri::command]
pub fn create_clarification_request(
    app_handle: AppHandle, 
    issue_id: i64, 
    question: String, 
    auditee_dept: String
) -> Result<String, String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO clarification_request (id, issue_id, auditor_id, auditee_dept, question) VALUES (?1, ?2, 'AUDITOR_01', ?3, ?4)",
        params![id, issue_id, auditee_dept, question]
    ).map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
pub fn get_clarifications_by_issue(app_handle: AppHandle, issue_id: i64) -> Result<Vec<Value>, String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT id, question, answer, status, created_at, answered_at, auditee_dept FROM clarification_request WHERE issue_id = ?1 ORDER BY created_at ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![issue_id], |row| {
        Ok(json!({
            "id": row.get::<_, String>(0)?,
            "question": row.get::<_, String>(1)?,
            "answer": row.get::<_, Option<String>>(2)?,
            "status": row.get::<_, String>(3)?,
            "created_at": row.get::<_, String>(4)?,
            "answered_at": row.get::<_, Option<String>>(5)?,
            "auditee_dept": row.get::<_, String>(6)?
        }))
    }).map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row.map_err(|e| e.to_string())?);
    }
    Ok(results)
}

#[tauri::command]
pub fn submit_clarification_answer(app_handle: AppHandle, request_id: String, answer: String) -> Result<(), String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE clarification_request SET answer = ?1, status = 'ANSWERED', answered_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![answer, request_id]
    ).map_err(|e| e.to_string())?;

    Ok(())
}
