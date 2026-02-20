use tauri::AppHandle;
use tauri::Manager;
use rusqlite::{params, Connection};
use serde_json::{json, Value};

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
        let mut config_path = std::env::current_dir().map_err(|e| e.to_string())?.join("audit_universe_seed.json");
        if !config_path.exists() {
            config_path = std::env::current_dir().map_err(|e| e.to_string())?.join("src-tauri").join("audit_universe_seed.json");
        }

        if !config_path.exists() {
            return Err("audit_universe_seed.json not found".to_string());
        }

        let content = std::fs::read_to_string(config_path).map_err(|e| e.to_string())?;
        let entities: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        let entities_list = entities.as_array().ok_or("Invalid JSON format in audit_universe_seed.json")?;

        let tx = conn.transaction().map_err(|e| e.to_string())?;
        for entity in entities_list {
            let name = entity["unit_name"].as_str().unwrap_or("Unknown");
            tx.execute(
                "INSERT INTO audit_universe (unit_name, category, impact_score, likelihood_score, last_audit_year, revenue, budget_size, operating_profit, headcount, last_audit_rating, key_systems, ai_analysis_data) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                rusqlite::params![
                    name,
                    entity["category"].as_str().unwrap_or("Other"),
                    entity["impact_score"].as_i64().unwrap_or(0),
                    entity["likelihood_score"].as_i64().unwrap_or(0),
                    entity["last_audit_year"].as_i64().unwrap_or(2024),
                    entity["revenue"].as_str().unwrap_or("N/A"),
                    entity["budget_size"].as_str().unwrap_or("N/A"),
                    entity["operating_profit"].as_str().unwrap_or("N/A"),
                    entity["headcount"].as_i64().unwrap_or(0),
                    entity["last_audit_rating"].as_str().unwrap_or("Not Rated"),
                    entity["key_systems"].as_str().unwrap_or("None"),
                    entity["ai_analysis_data"].as_str().or_else(|| entity["ai_analysis_data"].as_object().map(|_obj| "{}")).unwrap_or("{}")
                ]
            ).map_err(|e| format!("Failed to insert entity [{}]: {}", name, e))?;
        }
        tx.commit().map_err(|e| format!("Seeding transaction commit failed: {}", e))?;
        println!(">>> [SUCCESS] Seeded/Synced {} entities into audit_universe from JSON.", entities_list.len());
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
