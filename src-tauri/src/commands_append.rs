
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
pub fn update_review_status(app_handle: AppHandle, review_id: String, status: String, note: Option<String>) -> Result<(), String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let note_val = note.unwrap_or_default();
    
    // Allow updating status and note
    if !note_val.is_empty() {
        conn.execute(
            "UPDATE review_item SET status = ?1, reviewer_note = ?2 WHERE id = ?3",
            params![status, note_val, review_id]
        ).map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE review_item SET status = ?1 WHERE id = ?2",
            params![status, review_id]
        ).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}
