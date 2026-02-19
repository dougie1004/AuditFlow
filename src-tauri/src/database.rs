use tauri::AppHandle;
use tauri::Manager;
use rusqlite::{params, Connection};
use serde_json::json;

pub fn initialize_database(app_handle: &AppHandle) -> Result<(), String> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    if !app_dir.exists() { std::fs::create_dir_all(&app_dir).ok(); }
    
    let db_path = app_dir.join("audit_data_v4.db");
    let mut conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    println!(">>> [INIT] Initializing Audit Data V4...");

    // 파일 메타데이터 테이블
    conn.execute(
        "CREATE TABLE IF NOT EXISTS audit_data (id INTEGER PRIMARY KEY, project_type TEXT NOT NULL, file_name TEXT NOT NULL, file_type TEXT NOT NULL, file_path TEXT NOT NULL, upload_date TEXT DEFAULT CURRENT_TIMESTAMP)", 
        params![]
    ).map_err(|e| e.to_string())?;

    // 발견된 이슈 테이블
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
            entity_id INTEGER,
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
    let _ = conn.execute("ALTER TABLE audit_issues ADD COLUMN verdict_mode TEXT DEFAULT 'MANUAL_REVIEW'", params![]);
    let _ = conn.execute("ALTER TABLE audit_issues ADD COLUMN logic_chain TEXT", params![]);
    let _ = conn.execute("ALTER TABLE audit_issues ADD COLUMN grade TEXT DEFAULT 'B'", params![]);
    let _ = conn.execute("ALTER TABLE audit_issues ADD COLUMN entity_id INTEGER", params![]);

    // 1. Audit Projects (Renovated for Command Center)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS audit_projects (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            status TEXT NOT NULL,
            progress_pct INTEGER DEFAULT 0,
            start_date TEXT,
            end_date TEXT,
            lead_auditor TEXT,
            risk_score INTEGER DEFAULT 0,
            findings_count INTEGER DEFAULT 0,
            planning_start TEXT,
            planning_end TEXT,
            fieldwork_start TEXT,
            fieldwork_end TEXT,
            reporting_start TEXT,
            reporting_end TEXT,
            audit_scope TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            valuation_tier TEXT DEFAULT 'startup',
            ruleset_status TEXT DEFAULT 'Draft',
            ruleset_version TEXT DEFAULT 'v1.0.0-unlocked',
            entity_id INTEGER
        )",
        params![]
    ).map_err(|e| e.to_string())?;
    
    // Migration: Add extended fields to audit_projects if missing
    let _ = conn.execute("ALTER TABLE audit_projects ADD COLUMN risk_score INTEGER DEFAULT 0", params![]);
    let _ = conn.execute("ALTER TABLE audit_projects ADD COLUMN findings_count INTEGER DEFAULT 0", params![]);
    let _ = conn.execute("ALTER TABLE audit_projects ADD COLUMN planning_start TEXT", params![]);
    let _ = conn.execute("ALTER TABLE audit_projects ADD COLUMN planning_end TEXT", params![]);
    let _ = conn.execute("ALTER TABLE audit_projects ADD COLUMN fieldwork_start TEXT", params![]);
    let _ = conn.execute("ALTER TABLE audit_projects ADD COLUMN fieldwork_end TEXT", params![]);
    let _ = conn.execute("ALTER TABLE audit_projects ADD COLUMN reporting_start TEXT", params![]);
    let _ = conn.execute("ALTER TABLE audit_projects ADD COLUMN reporting_end TEXT", params![]);
    let _ = conn.execute("ALTER TABLE audit_projects ADD COLUMN audit_scope TEXT", params![]);
    let _ = conn.execute("ALTER TABLE audit_projects ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP", params![]);
    let _ = conn.execute("ALTER TABLE audit_projects ADD COLUMN valuation_tier TEXT DEFAULT 'startup'", params![]);
    let _ = conn.execute("ALTER TABLE audit_projects ADD COLUMN ruleset_status TEXT DEFAULT 'Draft'", params![]);
    let _ = conn.execute("ALTER TABLE audit_projects ADD COLUMN ruleset_version TEXT DEFAULT 'v1.0.0-unlocked'", params![]);
    let _ = conn.execute("ALTER TABLE audit_projects ADD COLUMN entity_id INTEGER", params![]);
    let _ = conn.execute("ALTER TABLE audit_projects ADD COLUMN dataset_hash TEXT", params![]);

    // 2. Audit Findings (Structured Issue Tracking)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS audit_findings (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            entity_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            severity TEXT NOT NULL,
            status TEXT DEFAULT 'Open',
            detected_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(project_id) REFERENCES audit_projects(id),
            FOREIGN KEY(entity_id) REFERENCES audit_universe(id)
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    // 3. System Events (AI Feed Intelligence)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS system_events (
            id TEXT PRIMARY KEY,
            timestamp TEXT DEFAULT (datetime('now','localtime')),
            event_type TEXT NOT NULL,
            description TEXT NOT NULL,
            related_entity_id INTEGER,
            audit_id TEXT
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    let _ = conn.execute("ALTER TABLE system_events ADD COLUMN audit_id TEXT", params![]);

    conn.execute(
        "CREATE TABLE IF NOT EXISTS suspicion_inbox (
            signal_id TEXT PRIMARY KEY,
            detected_at TEXT DEFAULT CURRENT_TIMESTAMP,
            observation TEXT NOT NULL,       -- Factual description: '4 txs in 15 mins'
            anomaly_score REAL NOT NULL,     -- 0.0 ~ 1.0 (Stat deviation)
            source TEXT NOT NULL,            -- 'AI_DETECTOR' | 'STAT_ENGINE' | 'RULE_ENGINE'
            scope TEXT NOT NULL,             -- 'Transaction' | 'Vendor' | 'Pattern'
            related_tx_ids TEXT,             -- JSON Array of Row IDs
            metadata TEXT,                   -- [PHASE 3-3.5] Machine-readable facts
            status TEXT DEFAULT 'Pending'    -- Pending | Processing | Concluded
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    // Migration: Add missing columns to suspicion_inbox if they were added in later versions
    let _ = conn.execute("ALTER TABLE suspicion_inbox ADD COLUMN source TEXT DEFAULT 'RULE_ENGINE'", params![]);
    let _ = conn.execute("ALTER TABLE suspicion_inbox ADD COLUMN scope TEXT DEFAULT 'Transaction'", params![]);
    let _ = conn.execute("ALTER TABLE suspicion_inbox ADD COLUMN related_tx_ids TEXT", params![]);
    let _ = conn.execute("ALTER TABLE suspicion_inbox ADD COLUMN metadata TEXT", params![]);
    let _ = conn.execute("ALTER TABLE suspicion_inbox ADD COLUMN status TEXT DEFAULT 'Pending'", params![]);

    // [PHASE 3] Scenario Detective Catalog
    conn.execute(
        "CREATE TABLE IF NOT EXISTS scenario_catalog (
            scenario_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,          -- DETERMINISTIC | HEURISTIC | LEGACY
            expected_strength REAL NOT NULL, -- 0.0 ~ 1.0 (Initial Anomaly Score)
            description TEXT,
            enabled INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    // [AuditFlow V2] Adjudication Log (The Judge's Reasoning)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS adjudication_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            signal_id TEXT NOT NULL,
            rule_id TEXT NOT NULL,           -- 'SPLIT_PAYMENT' | 'HR_MISUSE' | etc.
            criterion TEXT NOT NULL,         -- 'Sum > 100k within 1 hour'
            result TEXT NOT NULL,            -- 'Match' | 'No Match' | 'Inconclusive'
            reasoning TEXT,                  -- 'Factual evidence meets the internal threshold'
            evaluated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(signal_id) REFERENCES suspicion_inbox(signal_id)
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    // [AuditFlow V2] Engine Health Metrics (The Vital Signs)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS engine_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            metric_key TEXT NOT NULL,        -- 'CONVERSION_RATE' | 'FP_RATE'
            metric_value REAL NOT NULL
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    // Seed Initial Anchor Projects - DISABLED for ZERO-BASE
    /* 
    let _ = conn.execute("INSERT OR IGNORE INTO audit_projects (id, title, status, progress_pct, start_date, end_date, lead_auditor) VALUES 
        ('proj-01', 'FY2025 Global Revenue Recognition Review', 'Fieldwork', 35, '2025-01-05', '2025-04-30', 'Audit Lead'),
        ('proj-02', 'Strategic Vendor Risk Assessment', 'Planning', 10, '2025-02-01', '2025-06-15', 'Unassigned'),
        ('proj-03', 'Compliance Monitoring: Vietnam Operations', 'Reporting', 95, '2024-11-01', '2025-01-20', 'Compliance Officer')", 
    params![]);

    let _ = conn.execute("INSERT OR IGNORE INTO system_events (id, event_type, description) VALUES 
        ('evt-anchor-1', 'SYSTEM_INFO', '📡 AuditFlow Intelligence Engine Online. Monitoring real-time anomalies.')",
    params![]);
    */

    // 4. Audit Scenarios (Structured)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS custom_scenarios (
            id TEXT PRIMARY KEY, 
            category TEXT NOT NULL, 
            name TEXT NOT NULL, 
            risk_level TEXT NOT NULL, 
            description TEXT NOT NULL, 
            rules TEXT,
            ai_prompt_template TEXT,
            required_fields TEXT,
            version TEXT DEFAULT '1.0.0',
            enabled INTEGER DEFAULT 1,
            origin_audit_type TEXT, 
            origin_department TEXT, 
            is_ai_generated INTEGER DEFAULT 0,
            detected_date TEXT DEFAULT CURRENT_TIMESTAMP
        )", 
        params![]
    ).map_err(|e| e.to_string())?;

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
            unit_name TEXT NOT NULL,
            category TEXT NOT NULL,
            impact_score INTEGER DEFAULT 0,
            likelihood_score INTEGER DEFAULT 0,
            last_audit_year INTEGER DEFAULT 2024,
            budget_size TEXT DEFAULT 'N/A',
            operating_profit TEXT DEFAULT 'N/A',
            headcount INTEGER DEFAULT 0,
            last_audit_rating TEXT DEFAULT 'Not Rated',
            key_systems TEXT DEFAULT 'None',
            ai_analysis_data TEXT
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    let _ = conn.execute("ALTER TABLE audit_universe ADD COLUMN revenue TEXT DEFAULT 'N/A'", params![]);
    let _ = conn.execute("ALTER TABLE audit_universe ADD COLUMN risk_score REAL DEFAULT 0.0", params![]);

    // [AUTO-SEED] Seed data if empty
    let universe_count: i64 = conn.query_row("SELECT COUNT(*) FROM audit_universe", [], |r| r.get(0)).unwrap_or(0);
    if universe_count == 0 {
        AuditUniverseSeeder::seed(&mut conn).ok();
    }
    crate::scenarios_seeder::seed_master_scenarios(&mut conn).ok();
    export_scenario_manifest(&conn, app_handle).ok();

    // [PHASE 1] Audit Memory Layer (Audit Objects)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS audit_object (
            id TEXT PRIMARY KEY,
            object_type TEXT NOT NULL,
            source TEXT NOT NULL,
            extracted_fields TEXT,
            ingested_at TEXT DEFAULT CURRENT_TIMESTAMP,
            version INTEGER DEFAULT 1,
            status TEXT DEFAULT 'ACTIVE',
            project_id TEXT,
            FOREIGN KEY(project_id) REFERENCES audit_projects(id)
        )", 
        params![]
    ).map_err(|e| e.to_string())?;

    // [PHASE 3] Relation Candidate Engine
    conn.execute(
        "CREATE TABLE IF NOT EXISTS relation_candidate (
            from_object_id TEXT,
            to_object_id TEXT,
            reason_codes TEXT,
            confidence TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY(from_object_id, to_object_id),
            FOREIGN KEY(from_object_id) REFERENCES audit_object(id),
            FOREIGN KEY(to_object_id) REFERENCES audit_object(id)
        )", 
        params![]
    ).map_err(|e| e.to_string())?;

    // [PHASE 4] Re-evaluation Trigger
    conn.execute(
        "CREATE TABLE IF NOT EXISTS re_evaluation_event (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trigger_object_id TEXT,
            affected_object_id TEXT,
            reason TEXT,
            logged_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(trigger_object_id) REFERENCES audit_object(id),
            FOREIGN KEY(affected_object_id) REFERENCES audit_object(id)
        )", 
        params![]
    ).map_err(|e| e.to_string())?;

    println!(">>> [INIT] Audit Memory Layer Initialized.");

    // [PHASE 5] Audit Session & Review Loop
    // conn.execute("DROP TABLE IF EXISTS review_item", params![]).ok();
    // conn.execute("DROP TABLE IF EXISTS audit_session", params![]).ok();

    conn.execute(
        "CREATE TABLE IF NOT EXISTS audit_session (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            name TEXT NOT NULL,
            period_start TEXT,
            period_end TEXT,
            included_object_types TEXT,
            status TEXT DEFAULT 'OPEN',
            final_report TEXT,
            reviewer_name TEXT,
            reviewer_ack TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(project_id) REFERENCES audit_projects(id)
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS review_tasks (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            object_id TEXT,
            relation_candidate_id TEXT,
            reason TEXT,
            status TEXT DEFAULT 'PENDING',
            snapshot_data TEXT,
            reviewer_note TEXT,
            reviewer_final_note TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(session_id) REFERENCES audit_session(id)
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    // [PHASE 6] Case Elevation & Structural Clusters
    conn.execute(
        "CREATE TABLE IF NOT EXISTS audit_cases (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            title TEXT NOT NULL,
            reasoning TEXT,
            severity TEXT DEFAULT 'MEDIUM',
            status TEXT DEFAULT 'DRAFT',
            entity_id INTEGER,
            related_ids TEXT,               -- JSON array of suspicion_ids or issue_ids
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(project_id) REFERENCES audit_projects(id)
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    // [AuditFlow V2] Application Settings
    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    // [ARCH-V3] Entity Master Table (The canonical registry of WHO)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS entity_master (
            id TEXT PRIMARY KEY,
            entity_type TEXT NOT NULL,       -- VENDOR, EMPLOYEE, CUSTOMER, DEPT
            canonical_name TEXT NOT NULL,
            normalized_key TEXT NOT NULL UNIQUE, 
            risk_score REAL DEFAULT 0.0,
            tags TEXT                        -- JSON Array
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    // [ARCH-V3] Entity Alias Table (For Entity Resolution)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS entity_alias (
            alias TEXT PRIMARY KEY,
            entity_id TEXT NOT NULL,
            FOREIGN KEY(entity_id) REFERENCES entity_master(id)
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    // [ARCH-V3] Entity Event Table (The timeline of WHAT)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS entity_event (
            id TEXT PRIMARY KEY,
            entity_id TEXT NOT NULL,
            event_type TEXT NOT NULL,       -- TRANSACTION, APPROVAL, COMMUNICATION
            amount REAL,
            event_date TEXT,
            description TEXT,
            source_object_id TEXT,           -- Link back to raw audit_object
            is_flagged INTEGER DEFAULT 0,    -- 0 or 1
            risk_delta REAL DEFAULT 0.0,     -- Impact on total risk score
            rule_flags TEXT,                 -- JSON Array of rule IDs
            stat_flags TEXT,                 -- JSON Array of statistical anomaly keys
            FOREIGN KEY(entity_id) REFERENCES entity_master(id)
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    let _ = conn.execute("ALTER TABLE entity_event ADD COLUMN is_flagged INTEGER DEFAULT 0", params![]);
    let _ = conn.execute("ALTER TABLE entity_event ADD COLUMN risk_delta REAL DEFAULT 0.0", params![]);
    let _ = conn.execute("ALTER TABLE entity_event ADD COLUMN rule_flags TEXT", params![]);
    let _ = conn.execute("ALTER TABLE entity_event ADD COLUMN stat_flags TEXT", params![]);
    let _ = conn.execute("ALTER TABLE entity_event ADD COLUMN source_type TEXT", params![]);
    let _ = conn.execute("ALTER TABLE entity_event ADD COLUMN metadata TEXT", params![]);
    let _ = conn.execute("ALTER TABLE entity_event ADD COLUMN account_code TEXT", params![]);
    let _ = conn.execute("ALTER TABLE entity_event ADD COLUMN account_name TEXT", params![]);
    let _ = conn.execute("ALTER TABLE entity_event ADD COLUMN debit REAL DEFAULT 0.0", params![]);
    let _ = conn.execute("ALTER TABLE entity_event ADD COLUMN credit REAL DEFAULT 0.0", params![]);
    let _ = conn.execute("ALTER TABLE entity_event ADD COLUMN net_amount REAL DEFAULT 0.0", params![]);

    // [PHASE 1 Performance] Indexing for High Volume Events
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_entity_event_entity_id ON entity_event(entity_id)", params![]);
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_entity_event_event_date ON entity_event(event_date)", params![]);
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_entity_event_source_type ON entity_event(source_type)", params![]);

    // [PHASE 2] Structural Risk Signals
    conn.execute(
        "CREATE TABLE IF NOT EXISTS risk_signal (
            id TEXT PRIMARY KEY,
            object_id TEXT NOT NULL,
            project_id TEXT NOT NULL,
            signal_type TEXT NOT NULL,
            description TEXT NOT NULL,
            score REAL DEFAULT 0.0,
            related_ids TEXT,               -- JSON array of event/tx IDs
            metadata TEXT,                  -- JSON facts
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    // [PHASE 3] Monthly Aggregation Cache
    conn.execute(
        "CREATE TABLE IF NOT EXISTS account_month_profile (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            object_id TEXT NOT NULL,
            account_code TEXT NOT NULL,
            year_month TEXT NOT NULL,        -- YYYY-MM
            total_debit REAL DEFAULT 0.0,
            total_credit REAL DEFAULT 0.0,
            net_change REAL DEFAULT 0.0,
            transaction_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_account_month_profile_lookup ON account_month_profile (object_id, account_code, year_month)", params![]);

    // [PHASE 4] Multi-Year Trend Analysis
    conn.execute(
        "CREATE TABLE IF NOT EXISTS account_year_profile (
            account_code TEXT NOT NULL,
            fiscal_year INTEGER NOT NULL,
            structural_score REAL DEFAULT 0.0,
            avg_anomaly_score REAL DEFAULT 0.0,
            avg_cv REAL DEFAULT 0.0,
            avg_cr1 REAL DEFAULT 0.0,
            avg_hhi REAL DEFAULT 0.0,
            transaction_count INTEGER DEFAULT 0,
            PRIMARY KEY (account_code, fiscal_year)
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    // Migration: ensure columns exist
    let _ = conn.execute("ALTER TABLE account_year_profile ADD COLUMN avg_anomaly_score REAL DEFAULT 0.0", params![]);
    let _ = conn.execute("ALTER TABLE account_year_profile ADD COLUMN structural_score REAL DEFAULT 0.0", params![]);

    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_account_year_lookup ON account_year_profile (account_code, fiscal_year)", params![]);

    conn.execute(
        "CREATE TABLE IF NOT EXISTS event_relations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_event_id TEXT NOT NULL,
            target_event_id TEXT NOT NULL,
            relation_type TEXT NOT NULL,     -- 'SAME_AMOUNT', 'SPLIT_PAYMENT', 'KEYWORD_LINK'
            strength REAL DEFAULT 0.0,       -- 0.0 ~ 1.0
            metadata TEXT,                   -- JSON details
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(source_event_id) REFERENCES entity_event(id),
            FOREIGN KEY(target_event_id) REFERENCES entity_event(id)
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_event_relations_source ON event_relations(source_event_id)", params![]);
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_event_relations_target ON event_relations(target_event_id)", params![]);

    // [PHASE 5] Contextual Risk Signals (Non-Financial)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS context_signal (
            id TEXT PRIMARY KEY,
            object_id TEXT NOT NULL,
            project_id TEXT NOT NULL,
            signal_type TEXT NOT NULL,      -- POLICY_VIOLATION, SUSPICIOUS_COMM, etc.
            description TEXT NOT NULL,
            severity TEXT DEFAULT 'MEDIUM',
            metadata TEXT,                  -- JSON facts
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_context_signal_project ON context_signal(project_id)", params![]);

    // [PHASE 6] Risk Correlation (Hybrid Intelligence)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS correlation_signal (
            id TEXT PRIMARY KEY,
            object_id TEXT NOT NULL,
            account_code TEXT NOT NULL,
            structural_score REAL DEFAULT 0.0,
            contextual_flag INTEGER DEFAULT 0, -- 1 if related communication found
            final_priority REAL DEFAULT 0.0,
            evidence_summary TEXT,           -- Summary of the cross-model link
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_correlation_signal_object ON correlation_signal(object_id)", params![]);

    Ok(())
}


pub fn export_scenario_manifest(conn: &Connection, app_handle: &AppHandle) -> Result<(), String> {
    let mut stmt = conn.prepare("SELECT id, name, category, risk_level, description, version, enabled, rules, ai_prompt_template FROM custom_scenarios").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |r| {
        let val: serde_json::Value = json!({
            "id": r.get::<_, String>(0)?,
            "name": r.get::<_, String>(1)?,
            "domain": r.get::<_, String>(2)?,
            "risk_level": r.get::<_, String>(3)?,
            "description": r.get::<_, String>(4)?,
            "version": r.get::<_, String>(5)?,
            "enabled": r.get::<_, i32>(6)? == 1,
            "rules": r.get::<_, Option<String>>(7)?,
            "ai_prompt_template": r.get::<_, Option<String>>(8)?
        });
        Ok(val)
    }).map_err(|e| e.to_string())?;

    let mut manifest = Vec::new();
    for row in rows {
        manifest.push(row.map_err(|e| e.to_string())?);
    }

    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let manifest_path = app_dir.join("scenario_manifest.json");
    let content = serde_json::to_string_pretty(&manifest).map_err(|e| e.to_string())?;
    std::fs::write(manifest_path, content).map_err(|e| e.to_string())?;
    
    Ok(())
}

pub struct AuditUniverseSeeder;

impl AuditUniverseSeeder {
    pub fn seed(conn: &mut Connection) -> Result<(), String> {
        let entities = vec![
            (
                "구매팀", "지원부문", 9, 8, 2023, "₩0", "₩585억", "₩58억", 12, "미흡 (Unsatisfactory)", "Oracle ERP, Ariba",
                r#"{"reason": "IT 아웃소싱 계약 내 입찰 담합 의심. 특정 업체에 대한 과도한 의존도(지출의 80%).", "impact_score": 9, "likelihood_score": 8, "impact_breakdown": {"financial_loss": 9, "strategic_impact": 7, "reputation_risk": 9}, "likelihood_breakdown": {"historical_frequency": 6, "control_weakness": 9, "process_complexity": 5}, "audit_approach": "입찰 로그에 대한 포렌식 데이터 분석 및 상위 10개 업체에 대한 이해상충 점검 수행.", "reference_standard": "ISO 37001 (부패방지), COSO 원칙 8 (부정 위험)"}"#
            ),
            (
                "IT보안본부", "지원부문", 9, 7, 2023, "₩0", "₩234억", "₩15억", 45, "개선필요 (Needs Improvement)", "AWS, Azure, Splunk",
                r#"{"reason": "R&D 부서 내 Shadow IT 사용 발견. 주요 서버 패치 지연(90일 초과). 랜섬웨어 취약성 높음.", "impact_score": 9, "likelihood_score": 7, "impact_breakdown": {"financial_loss": 9, "strategic_impact": 9, "reputation_risk": 9}, "likelihood_breakdown": {"historical_frequency": 4, "control_weakness": 8, "process_complexity": 8}, "audit_approach": "관리되지 않는 자산 스캔(Nmap/Tenable) 및 Splunk 내 패치 관리 로그 검토.", "reference_standard": "NIST CSF (탐지/보호), ISO 27001 A.12.6"}"#
            ),
            (
                "인사팀 (급여/보상)", "지원부문", 6, 5, 2024, "₩0", "₩1950억", "₩0", 1200, "양호 (Satisfactory)", "Workday, SAP HCM",
                r#"{"reason": "현장 근로자 초과 근무 수당 불일치. 원격 지점 내 유령 직원(Ghost Employee) 리스크 존재.", "impact_score": 6, "likelihood_score": 5, "impact_breakdown": {"financial_loss": 6, "strategic_impact": 4, "reputation_risk": 7}, "likelihood_breakdown": {"historical_frequency": 5, "control_weakness": 4, "process_complexity": 6}, "audit_approach": "실제 근무 인원 명단과 급여 지급 내역 및 물리적 출입 로그 대조.", "reference_standard": "COSO 통제 활동 (급여 사이클), 근로기준법"}"#
            ),
            (
                "자금팀", "지원부문", 9, 6, 2024, "₩0", "₩6500억", "₩650억", 8, "개선필요 (Needs Improvement)", "Kyriba, Bloomberg",
                r#"{"reason": "최근 변동성 장세 중 외환 헤지 전략이 정책에서 이탈함. 이체 승인 한도 초과 승인 빈번.", "impact_score": 9, "likelihood_score": 6, "impact_breakdown": {"financial_loss": 9, "strategic_impact": 7, "reputation_risk": 4}, "likelihood_breakdown": {"historical_frequency": 3, "control_weakness": 6, "process_complexity": 9}, "audit_approach": "일일 자금 정책 한도 대비 모든 외환 거래 티켓 검토 및 승인 타임스탬프 확인.", "reference_standard": "IIA GTAG (자금 관리), COSO 원칙 10 (통제 활동)"}"#
            ),
            (
                "물류센터 (부산)", "운영부문", 7, 6, 2023, "₩0", "₩104억", "₩6.5억", 45, "미흡 (Unsatisfactory)", "WMS (Legacy)",
                r#"{"reason": "재고 감모율 2.5% 증가. 하역장 물리적 보안 통제 취약점 발견.", "impact_score": 7, "likelihood_score": 6, "impact_breakdown": {"financial_loss": 7, "strategic_impact": 5, "reputation_risk": 5}, "likelihood_breakdown": {"historical_frequency": 6, "control_weakness": 8, "process_complexity": 5}, "audit_approach": "부산 허브 불시 재고 실사 및 하역 구역 CCTV 커버리지 검토.", "reference_standard": "COSO 원칙 11 (기술 일반 통제), 재고 관리 베스트 프랙티스"}"#
            ),
            (
                "국내영업본부", "사업부문", 8, 7, 2022, "₩2860억", "₩440억", "₩572억", 150, "양호 (Satisfactory)", "Salesforce",
                r#"{"reason": "분기말 밀어내기 매출(Channel Stuffing) 징후. 적절한 승인 없이 공격적인 리베이트 제도 적용.", "impact_score": 8, "likelihood_score": 7, "impact_breakdown": {"financial_loss": 8, "strategic_impact": 7, "reputation_risk": 6}, "likelihood_breakdown": {"historical_frequency": 4, "control_weakness": 5, "process_complexity": 6}, "audit_approach": "분기말 이후 매출 반품률 분석 및 고객 수령 확인일 검증.", "reference_standard": "IFRS 15 (수익 인식), COSO 원칙 8 (부정 위험)"}"#
            ),
            (
                "R&D센터 (성남)", "사업부문", 8, 4, 2024, "₩0", "₩845억", "₩0", 200, "개선필요 (Needs Improvement)", "Jira, Git",
                r#"{"reason": "IP 유출 리스크. 퍼블릭 리포지토리에 소스 코드 커밋 발생. 엔드포인트 내 DLP(데이터 유출 방지) 부재.", "impact_score": 8, "likelihood_score": 4, "impact_breakdown": {"financial_loss": 9, "strategic_impact": 9, "reputation_risk": 5}, "likelihood_breakdown": {"historical_frequency": 2, "control_weakness": 6, "process_complexity": 7}, "audit_approach": "퍼블릭 GitHub 리포지토리 비밀 정보 스캔 및 DLP 에이전트 설치 현황 감사.", "reference_standard": "ISO 27001 (자산 관리), NIST SP 800-53 (시스템 및 정보 무결성)"}"#
            ),
            (
                "글로벌 컴플라이언스팀", "지원부문", 4, 2, 2023, "₩0", "₩26억", "₩0", 5, "양호 (Satisfactory)", "ServiceNow GRC",
                r#"{"reason": "GDPR 준수 감사 대기 중. 내부 고발자 핫라인 익명성 프로토콜 내 사소한 격차 존재.", "impact_score": 4, "likelihood_score": 2, "impact_breakdown": {"financial_loss": 5, "strategic_impact": 3, "reputation_risk": 7}, "likelihood_breakdown": {"historical_frequency": 1, "control_weakness": 3, "process_complexity": 4}, "audit_approach": "가상 제보를 통한 내부 고발자 핫라인 익명성 테스트 및 접속 로그 추적.", "reference_standard": "GDPR 조항, ISO 37002 (내부 고발 관리 시스템)"}"#
            ),
            (
                "미국 법인 (영업)", "종속회사", 7, 5, 2022, "₩1040억", "₩200억", "₩156억", 30, "개선필요 (Needs Improvement)", "NetSuite",
                r#"{"reason": "새로운 3개 주 내 세금 준수 이슈. 현지 영업 사원의 높은 여비 교통비 지출.", "impact_score": 7, "likelihood_score": 5, "impact_breakdown": {"financial_loss": 6, "strategic_impact": 5, "reputation_risk": 6}, "likelihood_breakdown": {"historical_frequency": 3, "control_weakness": 5, "process_complexity": 8}, "audit_approach": "CA/NY/TX 세금 임계값 검토 및 $200 초과 영수증 감사.", "reference_standard": "US GAAP (세무), IRS 가이드라인"}"#
            ),
            (
                "유럽 지사 (프랑크푸르트)", "종속회사", 6, 4, 2023, "₩585억", "₩100억", "₩78억", 15, "양호 (Satisfactory)", "SAP Business One",
                r#"{"reason": "국가 간 거래 시 VAT 삼각 무역 오류. BEPS 준수를 위한 이전 가격 문서 업데이트 필요.", "impact_score": 6, "likelihood_score": 4, "impact_breakdown": {"financial_loss": 5, "strategic_impact": 4, "reputation_risk": 5}, "likelihood_breakdown": {"historical_frequency": 4, "control_weakness": 3, "process_complexity": 9}, "audit_approach": "정확한 VAT 코드 적용 여부 확인을 위한 국가 간 송장 20개 샘플링 및 TP 마스터 파일 검토.", "reference_standard": "EU VAT 지침, OECD 이전 가격 가이드라인"}"#
            ),
            (
                "총무팀", "지원부문", 3, 3, 2024, "₩0", "₩65억", "₩0", 10, "양호 (Satisfactory)", "Groupware",
                r#"{"reason": "법인 차량 운행 일지 불일치. 시설 유지 보수 계약이 경쟁 입찰 없이 자동 갱신됨.", "impact_score": 3, "likelihood_score": 3, "impact_breakdown": {"financial_loss": 2, "strategic_impact": 1, "reputation_risk": 3}, "likelihood_breakdown": {"historical_frequency": 3, "control_weakness": 4, "process_complexity": 2}, "audit_approach": "차량 마일리지 로그와 연료 카드 사용 데이터 비교 및 계약 갱신 승인 검토.", "reference_standard": "내부 구매 정책, 기업 자산 관리 가이드"}"#
            ),
            (
                "법무팀", "지원부문", 5, 2, 2023, "₩0", "₩52억", "₩0", 8, "양호 (Satisfactory)", "Legal Tech",
                r#"{"reason": "계약 관리 수동 수행(Excel)으로 인한 갱신 알림 누락. 소송 충당부채 적정성 검토 필요.", "impact_score": 5, "likelihood_score": 2, "impact_breakdown": {"financial_loss": 4, "strategic_impact": 6, "reputation_risk": 3}, "likelihood_breakdown": {"historical_frequency": 1, "control_weakness": 3, "process_complexity": 4}, "audit_approach": "실제 서명된 계약서와 Excel 추적 시트 대조 및 충당부채 계산 내역 점검.", "reference_standard": "IAS 37 (충당부채), COSO 원칙 10 (통제 활동)"}"#
            ),
            (
                "마케팅팀", "사업부문", 5, 5, 2024, "₩455억", "₩1085억", "₩108억", 25, "양호 (Satisfactory)", "HubSpot, Google Ads",
                r#"{"reason": "광고비 집행 효율성 및 대행사 리베이트 리스크. 디지털 대행사에 대한 과도한 수동 지급 발생.", "impact_score": 5, "likelihood_score": 5, "impact_breakdown": {"financial_loss": 5, "strategic_impact": 4, "reputation_risk": 6}, "likelihood_breakdown": {"historical_frequency": 3, "control_weakness": 4, "process_complexity": 7}, "audit_approach": "업체 지급 상관관계 분석 및 매체 집행 로그 검토.", "reference_standard": "부정방지 정책, 마케팅 집행 가이드라인"}"#
            )
        ];

        let tx = conn.transaction().map_err(|e| e.to_string())?;
        for (name, cat, impact, likelihood, year, revenue, budget, profit, head, rating, sys, ai_json) in &entities {
            tx.execute(
                "INSERT INTO audit_universe (unit_name, category, impact_score, likelihood_score, last_audit_year, revenue, budget_size, operating_profit, headcount, last_audit_rating, key_systems, ai_analysis_data) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                params![name, cat, impact, likelihood, year, revenue, budget, profit, head, rating, sys, ai_json]
            ).map_err(|e| format!("Failed to insert entity [{}]: {}", name, e))?;
        }
        tx.commit().map_err(|e| format!("Seeding transaction commit failed: {}", e))?;
        println!(">>> [SUCCESS] Seeded/Synced {} entities into audit_universe with AI scenarios.", entities.len());
        Ok(())
    }
}

// pub fn seed_audit_universe(...) // Removed unused legacy wrapper

pub fn get_active_universe_column(conn: &Connection) -> Result<String, String> {
    conn.query_row(
        "SELECT name FROM pragma_table_info('audit_universe') WHERE name IN ('entity_name', 'unit_name') LIMIT 1",
        [],
        |row| row.get::<_, String>(0)
    ).map_err(|_| "Neither 'entity_name' nor 'unit_name' column found in audit_universe.".to_string())
}
