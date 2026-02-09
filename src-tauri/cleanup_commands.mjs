
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'src', 'commands.rs');
console.log(`Reading ${filePath}...`);

try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Strip BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }

    const promoteFn = 'pub fn promote_risk_to_review';
    const updateFn = 'pub fn update_review_status';

    // Simple count check
    const promoteCount = (content.match(new RegExp(promoteFn, 'g')) || []).length;
    console.log(`Found promote_risk_to_review count: ${promoteCount}`);

    const anchor = 'pub fn preview_vectorization';
    const lastAnchorIndex = content.lastIndexOf(anchor);

    if (lastAnchorIndex === -1) {
        console.log('Error: Could not find anchor function!');
        process.exit(1);
    }

    // Find closing brace of anchor function
    const anchorEndPattern = 'Ok(serde_json::to_value(payload).map_err(|e| e.to_string())?)\n}';

    // Note: we can't trust exact whitespace char by char due to CRLF/LF issues.
    // Instead, find the core statement and scan for '}'
    const coreStatement = 'Ok(serde_json::to_value(payload).map_err(|e| e.to_string())?)';
    const patternIndex = content.indexOf(coreStatement, lastAnchorIndex);

    if (patternIndex === -1) {
        console.log('Error: Could not find anchor end pattern!');
        process.exit(1);
    }

    const closingBraceIndex = content.indexOf('}', patternIndex);

    if (closingBraceIndex !== -1) {
        console.log(`Truncating file at index ${closingBraceIndex + 1}...`);
        const cleanContent = content.substring(0, closingBraceIndex + 1);

        const newCode = `

#[tauri::command]
pub fn promote_risk_to_review(app_handle: tauri::AppHandle, session_id: String, signal_id: String) -> Result<String, String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    let (observation, related_tx_ids, metadata) = conn.query_row(
        "SELECT observation, related_tx_ids, metadata FROM suspicion_inbox WHERE signal_id = ?1",
        rusqlite::params![signal_id],
        |row| Ok((
            row.get::<_, String>(0)?,
            row.get::<_, Option<String>>(1)?,
            row.get::<_, Option<String>>(2)?
        ))
    ).map_err(|e| e.to_string())?;

    let related_tx_str = related_tx_ids.unwrap_or_default();
    let object_id = if related_tx_str.starts_with('[') {
         related_tx_str.split('"').nth(1).unwrap_or(&signal_id).to_string()
    } else if !related_tx_str.is_empty() {
         related_tx_str.clone()
    } else {
        signal_id.clone()
    };

    let new_review_id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO review_item (
            id, session_id, object_id, relation_candidate_id, reason, status, snapshot_data, created_at, reviewer_note
        ) VALUES (?1, ?2, ?3, ?4, ?5, 'PENDING', ?6, CURRENT_TIMESTAMP, '')",
        rusqlite::params![
            new_review_id,
            session_id,
            object_id,
            signal_id,
            observation,
            metadata.unwrap_or_default()
        ]
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE suspicion_inbox SET status = 'In Review' WHERE signal_id = ?1",
        rusqlite::params![signal_id]
    ).map_err(|e| e.to_string())?;

    Ok(new_review_id)
}

#[tauri::command]
pub fn update_review_status(app_handle: tauri::AppHandle, item_id: String, status: String, note: Option<String>) -> Result<(), String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;
    
    let note_val = note.unwrap_or_default();
    if !note_val.is_empty() {
        conn.execute(
            "UPDATE review_item SET status = ?1, reviewer_note = ?2 WHERE id = ?3",
            rusqlite::params![status, note_val, item_id]
        ).map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE review_item SET status = ?1 WHERE id = ?2",
            rusqlite::params![status, item_id]
        ).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}
`;
        fs.writeFileSync(filePath, cleanContent + newCode, 'utf8');
        console.log('Success: Re-wrote commands.rs with clean functions.');
    }

} catch (err) {
    console.error('Script failed:', err);
}
