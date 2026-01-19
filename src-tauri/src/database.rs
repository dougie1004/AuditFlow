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
            valuation_tier TEXT DEFAULT 'startup'
        )",
        params![]
    ).map_err(|e| e.to_string())?;
    
    // Migration: Add created_at to audit_projects if missing
    let _ = conn.execute("ALTER TABLE audit_projects ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP", params![]);
    let _ = conn.execute("ALTER TABLE audit_projects ADD COLUMN valuation_tier TEXT DEFAULT 'startup'", params![]);

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
    conn.execute("DROP TABLE IF EXISTS audit_universe", params![]).map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS audit_universe (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            unit_name TEXT NOT NULL,
            category TEXT NOT NULL,
            impact_score INTEGER DEFAULT 0,
            likelihood_score INTEGER DEFAULT 0,
            last_audit_year INTEGER DEFAULT 2024,
            budget_size TEXT DEFAULT 'N/A',
            headcount INTEGER DEFAULT 0,
            last_audit_rating TEXT DEFAULT 'Not Rated',
            key_systems TEXT DEFAULT 'None',
            ai_analysis_data TEXT
        )",
        params![]
    ).map_err(|e| e.to_string())?;


    crate::scenarios_seeder::seed_master_scenarios(&mut conn).ok();
    
    // [Scenario Manager Load Guard]
    let loaded_count: i64 = conn.query_row("SELECT COUNT(*) FROM custom_scenarios", [], |r| r.get(0)).unwrap_or(0);
    if loaded_count < 100 {
        return Err(format!("Scenario Load Guard Failed: Only {} scenarios loaded. Expected minimum 100.", loaded_count));
    }

    println!(">>> [INIT] AuditFlow Backend Ready. {} Scenarios validated.", loaded_count);

    // [Scenario Manifest Export]
    export_scenario_manifest(&conn, app_handle).ok();
    
    // Run modular adaptive seeder with dynamic column mapping
    AuditUniverseSeeder::seed(&mut conn).ok();

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
                "Procurement Team", "Support", 9, 8, 2023, "$45M", 12, "Unsatisfactory", "Oracle ERP, Ariba",
                r#"{"reason": "Suspected bid-rigging in IT outsourcing contracts. High dependency on a single vendor (80% spend).", "impact_score": 9, "likelihood_score": 8, "impact_breakdown": {"financial_loss": 9, "strategic_impact": 7, "reputation_risk": 9}, "likelihood_breakdown": {"historical_frequency": 6, "control_weakness": 9, "process_complexity": 5}, "audit_approach": "Conduct forensic data analysis on bid logs and perform conflict of interest checks on top 10 vendors.", "reference_standard": "ISO 37001 (Anti-Bribery), COSO Principle 8 (Fraud Risk)"}"#
            ),
            (
                "IT Division (Security)", "Support", 9, 7, 2023, "$18M", 45, "Needs Improvement", "AWS, Azure, Splunk",
                r#"{"reason": "Shadow IT usage found in R&D. Delayed patching of critical servers (>90 days). Ransomware vulnerability high.", "impact_score": 9, "likelihood_score": 7, "impact_breakdown": {"financial_loss": 9, "strategic_impact": 9, "reputation_risk": 9}, "likelihood_breakdown": {"historical_frequency": 4, "control_weakness": 8, "process_complexity": 8}, "audit_approach": "Scan network for unmanaged assets (Nmap/Tenable) and review patch management logs in Splunk.", "reference_standard": "NIST CSF (Detect/Protect), ISO 27001 A.12.6"}"#
            ),
            (
                "HR Division (Payroll)", "Support", 6, 5, 2024, "$150M (Payroll)", 1200, "Satisfactory", "Workday, SAP HCM",
                r#"{"reason": "Discrepancies in overtime payments for factory workers. Ghost employee risk in remote branches.", "impact_score": 6, "likelihood_score": 5, "impact_breakdown": {"financial_loss": 6, "strategic_impact": 4, "reputation_risk": 7}, "likelihood_breakdown": {"historical_frequency": 5, "control_weakness": 4, "process_complexity": 6}, "audit_approach": "Reconcile active employee list with payroll disbursements and physical badge access logs.", "reference_standard": "COSO Control Activities (Payroll Cycle), Labor Standards Act"}"#
            ),
            (
                "Treasury Dept", "Support", 9, 6, 2024, "$500M (AUM)", 8, "Needs Improvement", "Kyriba, Bloomberg",
                r#"{"reason": "FX hedging strategy deviated from policy during recent volatility. Authorization limits for transfers override frequently.", "impact_score": 9, "likelihood_score": 6, "impact_breakdown": {"financial_loss": 9, "strategic_impact": 7, "reputation_risk": 4}, "likelihood_breakdown": {"historical_frequency": 3, "control_weakness": 6, "process_complexity": 9}, "audit_approach": "Review all FX trade tickets against daily treasury policy limits and check approval timestamps.", "reference_standard": "IIA GTAG (Treasury Management), COSO Principle 10 (Control Activities)"}"#
            ),
            (
                "Logistics Center (Busan)", "Operations", 7, 6, 2023, "$8M (Opex)", 45, "Unsatisfactory", "WMS (Legacy)",
                r#"{"reason": "Inventory shrinkage rate increased by 2.5%. Physical security controls at loading docks found deficient.", "impact_score": 7, "likelihood_score": 6, "impact_breakdown": {"financial_loss": 7, "strategic_impact": 5, "reputation_risk": 5}, "likelihood_breakdown": {"historical_frequency": 6, "control_weakness": 8, "process_complexity": 5}, "audit_approach": "Conduct surprise inventory count at Busan hub and review CCTV coverage of loading zones.", "reference_standard": "COSO Principle 11 (General Controls over Technology), Inventory Management Best Practices"}"#
            ),
            (
                "Sales HQ (Domestic)", "Business Unit", 8, 7, 2022, "$220M (Rev)", 150, "Satisfactory", "Salesforce",
                r#"{"reason": "Channel stuffing indications near quarter-end. Aggressive rebate schemes applied without proper approval workflow.", "impact_score": 8, "likelihood_score": 7, "impact_breakdown": {"financial_loss": 8, "strategic_impact": 7, "reputation_risk": 6}, "likelihood_breakdown": {"historical_frequency": 4, "control_weakness": 5, "process_complexity": 6}, "audit_approach": "Analyze sales return rates post-quarter-end and verify customer acceptance dates.", "reference_standard": "IFRS 15 (Revenue Recognition), COSO Principle 8 (Fraud Risk)"}"#
            ),
            (
                "R&D Center (Seongnam)", "Business Unit", 8, 4, 2024, "$65M", 200, "Needs Improvement", "Jira, Git",
                r#"{"reason": "IP leakage risks. Proprietary code committed to public repositories. Lack of DLP (Data Loss Prevention) on endpoints.", "impact_score": 8, "likelihood_score": 4, "impact_breakdown": {"financial_loss": 9, "strategic_impact": 9, "reputation_risk": 5}, "likelihood_breakdown": {"historical_frequency": 2, "control_weakness": 6, "process_complexity": 7}, "audit_approach": "Scan public GitHub Repos for company secrets and audit DLP agent coverage.", "reference_standard": "ISO 27001 (Asset Management), NIST SP 800-53 (System and Information Integrity)"}"#
            ),
            (
                "Global Compliance Team", "Support", 4, 2, 2023, "$2M", 5, "Satisfactory", "ServiceNow GRC",
                r#"{"reason": "GDPR compliance audit pending. Minor gaps in whistleblower hotline anonymity protocols.", "impact_score": 4, "likelihood_score": 2, "impact_breakdown": {"financial_loss": 5, "strategic_impact": 3, "reputation_risk": 7}, "likelihood_breakdown": {"historical_frequency": 1, "control_weakness": 3, "process_complexity": 4}, "audit_approach": "Test whistleblower hotline anonymity by simulating a report and tracing access logs.", "reference_standard": "GDPR Articles, ISO 37002 (Whistleblowing Management Systems)"}"#
            ),
            (
                "US Subsidiary (Sales)", "Subsidiary", 7, 5, 2022, "$80M (Rev)", 30, "Needs Improvement", "NetSuite",
                r#"{"reason": "Nexus tax compliance issues in 3 new states. High travel & entertainment expenses for local sales reps.", "impact_score": 7, "likelihood_score": 5, "impact_breakdown": {"financial_loss": 6, "strategic_impact": 5, "reputation_risk": 6}, "likelihood_breakdown": {"historical_frequency": 3, "control_weakness": 5, "process_complexity": 8}, "audit_approach": "Review nexus thresholds for CA/NY/TX and audit T&E receipts > $200.", "reference_standard": "US GAAP (Tax), IRS Guidelines"}"#
            ),
            (
                "EU Branch (Frankfurt)", "Subsidiary", 6, 4, 2023, "$45M (Rev)", 15, "Satisfactory", "SAP Business One",
                r#"{"reason": "VAT triangulation errors in cross-border trade. Transfer pricing documentation needs update for BEPS compliance.", "impact_score": 6, "likelihood_score": 4, "impact_breakdown": {"financial_loss": 5, "strategic_impact": 4, "reputation_risk": 5}, "likelihood_breakdown": {"historical_frequency": 4, "control_weakness": 3, "process_complexity": 9}, "audit_approach": "Sample 20 cross-border invoices for correct VAT codes and review TP master file.", "reference_standard": "EU VAT Directive, OECD Transfer Pricing Guidelines"}"#
            ),
            (
                "General Affairs", "Support", 3, 3, 2024, "$5M", 10, "Satisfactory", "Groupware",
                r#"{"reason": "Corporate vehicle usage log discrepancies. Facility maintenance contracts auto-renewed without competitive bidding.", "impact_score": 3, "likelihood_score": 3, "impact_breakdown": {"financial_loss": 2, "strategic_impact": 1, "reputation_risk": 3}, "likelihood_breakdown": {"historical_frequency": 3, "control_weakness": 4, "process_complexity": 2}, "audit_approach": "Compare vehicle mileage logs with fuel card usage data and review contract renewal approvals.", "reference_standard": "Internal Procurement Policy, Corporate Asset Management Guide"}"#
            ),
            (
                "Legal Team", "Support", 5, 2, 2023, "$4M", 8, "Satisfactory", "Legal Tech",
                r#"{"reason": "Contract lifecycle management is manual using Excel, leading to missed renewal notices. Litigation reserves adequacy review needed.", "impact_score": 5, "likelihood_score": 2, "impact_breakdown": {"financial_loss": 4, "strategic_impact": 6, "reputation_risk": 3}, "likelihood_breakdown": {"historical_frequency": 1, "control_weakness": 3, "process_complexity": 4}, "audit_approach": "Audit Excel tracking sheet against actual signed contracts and check reserve calculations.", "reference_standard": "IAS 37 (Provisions), COSO Principle 10 (Control Activities)"}"#
            ),
            (
                "Marketing Team", "Business Unit", 5, 5, 2024, "$35M", 25, "Satisfactory", "HubSpot, Google Ads",
                r#"{"reason": "Ad spend efficiency and vendor kickback risks. High volume of manual payments to digital agencies.", "impact_score": 5, "likelihood_score": 5, "impact_breakdown": {"financial_loss": 5, "strategic_impact": 4, "reputation_risk": 6}, "likelihood_breakdown": {"historical_frequency": 3, "control_weakness": 4, "process_complexity": 7}, "audit_approach": "Analyze vendor payment correlations and media placement logs.", "reference_standard": "Anti-Bribery Policy, Marketing Spend Guidelines"}"#
            )
        ];

        let tx = conn.transaction().map_err(|e| e.to_string())?;
        for (name, cat, impact, likelihood, year, budget, head, rating, sys, ai_json) in &entities {
            tx.execute(
                "INSERT INTO audit_universe (unit_name, category, impact_score, likelihood_score, last_audit_year, budget_size, headcount, last_audit_rating, key_systems, ai_analysis_data) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![name, cat, impact, likelihood, year, budget, head, rating, sys, ai_json]
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
