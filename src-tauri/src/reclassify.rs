use tauri::AppHandle;
use rusqlite::{params, Connection};

#[tauri::command]
pub fn reclassify_severity(app_handle: AppHandle) -> Result<String, String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let critical_keywords = vec![
        "遺??, "?〓졊", "諛곗엫", "鍮꾨━", "?뚮Ъ", "由щ쿋?댄듃", "湲덊뭹?섏닔",
        "援щℓ遺??, "?댄빀", "?좎갑", "鍮꾩옄湲?, "李⑸났", "?좎슜"
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

    Ok(format!("{}嫄댁쓽 ?댁뒋瑜?High濡??щ텇瑜섑뻽?듬땲??", updated))
}
