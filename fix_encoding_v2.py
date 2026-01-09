import sys

def fix_file(file_path):
    with open(file_path, 'rb') as f:
        content = f.read()
    
    # First, let's normalize all line endings to \n to avoid "bare CR" in strings
    content = content.replace(b'\r\n', b'\n')
    
    # Try to decode
    text = content.decode('utf-8', errors='ignore')

    # Fix initialize_database
    start_db = text.find("fn initialize_database")
    end_db = text.find("fn seed_master_scenarios")
    
    if start_db != -1 and end_db != -1:
        new_db = """fn initialize_database(app_handle: &AppHandle) -> Result<(), String> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    if !app_dir.exists() { std::fs::create_dir_all(&app_dir).ok(); }
    
    let db_path = app_dir.join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // 파일 메타데이터 테이블
    conn.execute(
        "CREATE TABLE IF NOT EXISTS audit_data (id INTEGER PRIMARY KEY, project_type TEXT NOT NULL, file_name TEXT NOT NULL, file_type TEXT NOT NULL, file_path TEXT NOT NULL, upload_date TEXT DEFAULT CURRENT_TIMESTAMP)", 
        params![]
    ).map_err(|e| e.to_string())?;

    // 발견된 이슈 테이블 (audit_id 컬럼 추가)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS audit_issues (
            id INTEGER PRIMARY KEY, 
            project_type TEXT NOT NULL, 
            issue_title TEXT NOT NULL, 
            description TEXT NOT NULL, 
            severity TEXT NOT NULL, 
            raw_row_data TEXT, 
            row_index INTEGER, 
            recommendations TEXT,
            evidence_quote TEXT,
            audit_id TEXT,
            evidence_image TEXT,
            status TEXT DEFAULT 'Open',
            assignee TEXT,
            due_date TEXT,
            remediation_plan TEXT,
            manager_comment TEXT,
            detected_at TEXT DEFAULT CURRENT_TIMESTAMP
        )", 
        params![]
    ).map_err(|e| e.to_string())?;

    let _ = conn.execute("ALTER TABLE audit_issues ADD COLUMN recommendations TEXT", params![]);
    let _ = conn.execute("ALTER TABLE audit_issues ADD COLUMN evidence_quote TEXT", params![]);
    let _ = conn.execute("ALTER TABLE audit_issues ADD COLUMN audit_id TEXT", params![]);
    let _ = conn.execute("ALTER TABLE audit_issues ADD COLUMN evidence_image TEXT", params![]);
    let _ = conn.execute("ALTER TABLE audit_issues ADD COLUMN status TEXT DEFAULT 'Open'", params![]);
    let _ = conn.execute("ALTER TABLE audit_issues ADD COLUMN assignee TEXT", params![]);
    let _ = conn.execute("ALTER TABLE audit_issues ADD COLUMN due_date TEXT", params![]);
    let _ = conn.execute("ALTER TABLE audit_issues ADD COLUMN remediation_plan TEXT", params![]);
    let _ = conn.execute("ALTER TABLE audit_issues ADD COLUMN manager_comment TEXT", params![]);

    // 감사 업무(Project) 테이블
    conn.execute(
        "CREATE TABLE IF NOT EXISTS audit_projects (
            id TEXT PRIMARY KEY,
            audit_type TEXT NOT NULL,
            target_period TEXT,
            execution_period TEXT,
            scope TEXT,
            main_issue TEXT,
            follow_up TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    // 사용자 추가 시나리오 테이블 (is_ai_generated 컬럼 추가)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS custom_scenarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            category TEXT NOT NULL, 
            name TEXT NOT NULL, 
            risk_level TEXT NOT NULL, 
            description TEXT NOT NULL, 
            origin_audit_type TEXT, 
            origin_department TEXT, 
            is_ai_generated INTEGER DEFAULT 0,
            detected_date TEXT DEFAULT CURRENT_TIMESTAMP
        )", 
        params![]
    ).map_err(|e| e.to_string())?;
    
    let _ = conn.execute("ALTER TABLE custom_scenarios ADD COLUMN is_ai_generated INTEGER DEFAULT 0", params![]);

    // 연간 감사 계획 테이블
    conn.execute(
        "CREATE TABLE IF NOT EXISTS audit_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year INTEGER NOT NULL,
            audit_domain TEXT NOT NULL,
            risk_score INTEGER DEFAULT 3,
            strategic_importance TEXT DEFAULT 'Medium',
            resource_days INTEGER DEFAULT 0,
            status TEXT DEFAULT 'Draft',
            description TEXT
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    // Audit Universe 테이블
    conn.execute(
        "CREATE TABLE IF NOT EXISTS audit_universe (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_name TEXT NOT NULL,
            category TEXT NOT NULL,
            last_audit_date TEXT,
            inherent_risk_score INTEGER DEFAULT 0,
            control_risk_score INTEGER DEFAULT 0,
            total_risk_score INTEGER DEFAULT 0,
            risk_zone TEXT DEFAULT 'Low'
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    seed_master_scenarios(&conn).ok();

    Ok(())
}

"""
        text = text[:start_db] + new_db + text[end_db:]

    # Final check: remove any leftover "StdResult" or weird symbols in comments
    text = text.replace("StdResult", "Result")
    
    with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print("Full Fix Success")

if __name__ == "__main__":
    fix_file(sys.argv[1])
