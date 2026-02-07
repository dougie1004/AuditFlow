use tauri::AppHandle;
use rusqlite::{params, Connection};

#[tauri::command]
pub fn reclassify_severity(app_handle: AppHandle) -> Result<String, String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let critical_keywords = vec![
        "부정", "횡령", "배임", "비리", "선물", "리베이트", "금품수수",
        "구매부정", "담합", "유착", "비자금", "착복", "유용"
    ];

    let mut updated = 0;

    // Get all Low severity issues
    let mut stmt = conn.prepare(
        "SELECT id, issue_title, description FROM audit_issues WHERE severity = 'Low'"
    ).map_err(|e| e.to_string())?;

    let issues: Vec<(i64, String, String)> = stmt.query_map([], |row| {
        Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    for (id, title, desc) in issues {
        let combined = format!("{} {}", title, desc);
        
        for keyword in &critical_keywords {
            if combined.contains(keyword) {
                conn.execute(
                    "UPDATE audit_issues SET severity = 'High' WHERE id = ?1",
                    params![id]
                ).ok();
                updated += 1;
                println!(">>> [Reclassify] Updated issue #{} to High (found: {})", id, keyword);
                break;
            }
        }
    }

    Ok(format!("{}건의 이슈를 High로 재분류했습니다.", updated))
}
