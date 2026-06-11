use rusqlite::{params, Connection};
use std::path::PathBuf;

#[path = "../database.rs"]
mod database;

#[path = "../models.rs"]
mod models;

#[path = "../parser.rs"]
mod parser;

#[path = "../domain_map.rs"]
mod domain_map;

#[path = "../file_loader.rs"]
mod file_loader;

#[path = "../file_utils.rs"]
mod file_utils;

#[path = "../scenarios_seeder.rs"]
mod scenarios_seeder;

#[path = "../flux_engine.rs"]
mod flux_engine;

#[path = "../ledger_engine.rs"]
mod ledger_engine;

#[path = "../compliance_dd_flow.rs"]
mod compliance_dd_flow;

#[path = "../compliance_judge.rs"]
mod compliance_judge;

#[path = "../entity_resolver.rs"]
mod entity_resolver;

#[path = "../config.rs"]
mod config;

#[path = "../rule_weights.rs"]
mod rule_weights;

#[path = "../risk_score.rs"]
mod risk_score;

#[path = "../ai.rs"]
mod ai;

#[path = "../dedup.rs"]
mod dedup;

#[path = "../mapper.rs"]
mod mapper;

#[path = "../risk_interpret.rs"]
mod risk_interpret;

#[path = "../constitution.rs"]
mod constitution;

#[path = "../error.rs"]
mod error;

#[path = "../ingestion/mod.rs"]
mod ingestion;

use ingestion::EventBuilder;

const AUDITFLOW_VERSION: &str = "v5.0.0";
const DATASET_VERSION: &str = "2.0.0";
const BASELINE_VERSION: &str = "2.0.0";

fn compute_stable_hash(
    date: &str,
    account_code: Option<&str>,
    amount: f64,
    counterparty: &str,
    description: &str
) -> String {
    let norm_date = date.trim().to_string();
    let norm_acc = account_code
        .unwrap_or("")
        .trim()
        .replace(" ", "")
        .to_uppercase();
    let norm_amount = format!("{:.2}", amount);
    let norm_cp = counterparty
        .trim()
        .replace(" ", "")
        .to_uppercase();
    let norm_cp = if norm_cp.is_empty() { "UNKNOWN".to_string() } else { norm_cp };
    let norm_desc = description
        .trim()
        .replace(" ", "")
        .to_uppercase();
        
    let input = format!(
        "{}|{}|{}|{}|{}",
        norm_date, norm_acc, norm_amount, norm_cp, norm_desc
    );
    let digest = md5::compute(input.as_bytes());
    format!("{:x}", digest)
}

fn get_uuid_to_stable_hash_map(conn: &Connection) -> std::collections::HashMap<String, String> {
    let mut map = std::collections::HashMap::new();
    let mut stmt = conn.prepare("SELECT id, event_date, account_code, amount, entity_id, description FROM entity_event").unwrap();
    let event_rows = stmt.query_map([], |r| {
        Ok((
            r.get::<_, String>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, Option<String>>(2)?,
            r.get::<_, Option<f64>>(3)?,
            r.get::<_, Option<String>>(4)?,
            r.get::<_, Option<String>>(5)?
        ))
    }).unwrap();

    for r in event_rows {
        let (id, date, acc_code, amount, cp, desc) = r.unwrap();
        let hash = compute_stable_hash(
            &date,
            acc_code.as_deref(),
            amount.unwrap_or(0.0),
            &cp.unwrap_or_default(),
            &desc.unwrap_or_default()
        );
        map.insert(id, hash);
    }
    map
}

#[tokio::main]
async fn main() {
    println!(">>> [REGRESSION] Starting Regression Baseline execution...");
    
    let db_file = "tests/regression_test_temp.db";
    let _ = std::fs::remove_file(db_file);

    let mut conn = Connection::open(db_file).unwrap();
    
    // Create tables
    conn.execute("CREATE TABLE IF NOT EXISTS entity_event (
        id TEXT PRIMARY KEY,
        entity_id TEXT,
        event_type TEXT,
        amount REAL,
        event_date TEXT,
        description TEXT,
        is_flagged INTEGER DEFAULT 0,
        risk_delta REAL DEFAULT 0.0,
        source_type TEXT,
        metadata TEXT,
        account_code TEXT,
        account_name TEXT,
        debit REAL,
        credit REAL,
        net_amount REAL,
        rule_flags TEXT,
        stat_flags TEXT
    )", []).unwrap();

    conn.execute("CREATE TABLE IF NOT EXISTS event_relations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_event_id TEXT NOT NULL,
        target_event_id TEXT NOT NULL,
        relation_type TEXT NOT NULL,
        strength REAL NOT NULL,
        metadata TEXT
    )", []).unwrap();

    conn.execute("CREATE TABLE IF NOT EXISTS suspicion_inbox (
        signal_id TEXT PRIMARY KEY,
        observation TEXT,
        anomaly_score REAL,
        source TEXT DEFAULT 'RULE_ENGINE',
        scope TEXT DEFAULT 'Transaction',
        related_tx_ids TEXT,
        metadata TEXT,
        status TEXT DEFAULT 'Pending',
        detected_at TEXT DEFAULT CURRENT_TIMESTAMP
    )", []).unwrap();

    conn.execute("CREATE TABLE IF NOT EXISTS audit_issues (
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
        detected_at TEXT DEFAULT CURRENT_TIMESTAMP,
        verdict_mode TEXT,
        grade TEXT
    )", []).unwrap();

    conn.execute("CREATE TABLE IF NOT EXISTS custom_scenarios (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        description TEXT NOT NULL,
        rules TEXT,
        ai_prompt_template TEXT,
        origin_audit_type TEXT,
        is_ai_generated INTEGER DEFAULT 0
    )", []).unwrap();

    conn.execute("CREATE TABLE IF NOT EXISTS audit_object (
        id TEXT PRIMARY KEY,
        object_type TEXT,
        source TEXT
    )", []).unwrap();

    conn.execute("CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )", []).unwrap();

    conn.execute("CREATE TABLE IF NOT EXISTS account_year_profile (
        account_code TEXT,
        fiscal_year INTEGER,
        avg_cr1 REAL,
        structural_score REAL,
        avg_anomaly_score REAL DEFAULT 0.0,
        PRIMARY KEY (account_code, fiscal_year)
    )", []).unwrap();

    // Seed scenarios
    scenarios_seeder::seed_master_scenarios(&mut conn).unwrap();

    // 1. Run Procurement (deers_procurement.csv)
    let proc_path = "tests/golden_dataset/deers_procurement.csv";
    let builder = ingestion::ledger_builder::LedgerBuilder { file_path: proc_path.to_string() };
    let events = builder.build_events();
    
    let tx = conn.transaction().unwrap();
    for event in events {
        tx.execute(
            "INSERT INTO entity_event (id, entity_id, event_type, amount, event_date, description, is_flagged, risk_delta, source_type, metadata, account_code, account_name) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 0.0, ?7, ?8, ?9, ?10)",
            params![event.id, event.entity_id, event.event_type, event.amount.unwrap_or(0.0), event.event_date, event.description, event.source_type, event.metadata, event.account_code, event.account_name]
        ).unwrap();
    }
    tx.commit().unwrap();

    // Run correlations (PR-02)
    flux_engine::FluxEngine::run_correlations(&conn).unwrap();

    // 2. Run Expense (golden_expense.csv)
    let exp_path = "tests/golden_dataset/golden_expense.csv";
    let card_builder = ingestion::card_builder::CardBuilder { file_path: exp_path.to_string() };
    let card_events = card_builder.build_events();

    let tx = conn.transaction().unwrap();
    for event in card_events {
        tx.execute(
            "INSERT INTO entity_event (id, entity_id, event_type, amount, event_date, description, is_flagged, risk_delta, source_type, metadata) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 0.0, ?7, ?8)",
            params![event.id, event.entity_id, event.event_type, event.amount.unwrap_or(0.0), event.event_date, event.description, event.source_type, event.metadata]
        ).unwrap();
    }
    tx.commit().unwrap();

    // Run compliance check (EX-01, EX-02)
    let db_path = PathBuf::from(db_file);
    let target_files = vec![(exp_path.to_string(), "golden_expense.csv".to_string())];
    for (path, _) in &target_files {
        let restricted_keywords = vec!["Bar", "Club", "유흥", "주점", "카지노"];
        let rows = file_loader::load_file_rows(path).unwrap();
        for (i, row) in rows.iter().enumerate() {
            let row_text = row.join(" | ");
            if restricted_keywords.iter().any(|&kw| row_text.contains(kw)) {
                conn.execute(
                    "INSERT INTO audit_issues (project_type, issue_title, description, severity, status, verdict_mode, grade, detected_at) 
                     VALUES ('Expense', '제한 업종 직접 감지', ?1, 'Critical', 'Open', 'DETERMINISTIC', 'A', CURRENT_TIMESTAMP)",
                    params![format!("행 {}: 가맹점 내 제한 키워드 포함 (동일 점수 검증)", i)]
                ).unwrap();
            }
        }
    }

    // 3. Run Ledger (deers_ledger.csv)
    let ledg_path = "tests/golden_dataset/deers_ledger.csv";
    ledger_engine::run_ledger_only_scan(
        vec![(ledg_path.to_string(), "deers_ledger.csv".to_string())],
        "Ledger",
        &db_path
    ).await.unwrap();

    // 4. Run Finance (golden_finance.csv)
    let fin_path = "tests/golden_dataset/golden_finance.csv";
    let fin_builder = ingestion::ledger_builder::LedgerBuilder { file_path: fin_path.to_string() };
    let fin_events = fin_builder.build_events();

    let tx = conn.transaction().unwrap();
    for event in fin_events {
        tx.execute(
            "INSERT INTO entity_event (id, entity_id, event_type, amount, event_date, description, is_flagged, risk_delta, source_type, metadata, account_code, account_name) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 0.0, ?7, ?8, ?9, ?10)",
            params![event.id, event.entity_id, event.event_type, event.amount.unwrap_or(0.0), event.event_date, event.description, event.source_type, event.metadata, event.account_code, event.account_name]
        ).unwrap();
    }
    tx.commit().unwrap();

    // Run correlations for money cycling
    flux_engine::FluxEngine::run_correlations(&conn).unwrap();

    // 5. Run Inventory (deers_inventory.csv)
    let inv_path = "tests/golden_dataset/deers_inventory.csv";
    ledger_engine::run_ledger_only_scan(
        vec![(inv_path.to_string(), "deers_inventory.csv".to_string())],
        "Inventory",
        &db_path
    ).await.unwrap();

    // Collect results
    let total_issues: i64 = conn.query_row("SELECT COUNT(*) FROM audit_issues", [], |r| r.get(0)).unwrap_or(0);
    let total_relations: i64 = conn.query_row("SELECT COUNT(*) FROM event_relations", [], |r| r.get(0)).unwrap_or(0);
    
    println!(">>> [REGRESSION] Total Issues Found: {}", total_issues);
    println!(">>> [REGRESSION] Total Relations Found: {}", total_relations);

    // Build UUID to Stable Hash lookup map
    let uuid_to_hash = get_uuid_to_stable_hash_map(&conn);

    // Fetch details of generated issues
    let mut stmt = conn.prepare("SELECT project_type, issue_title, severity, description, entity_id FROM audit_issues").unwrap();
    let issue_rows = stmt.query_map([], |r| {
        Ok((
            r.get::<_, String>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
            r.get::<_, String>(3)?,
            r.get::<_, Option<i64>>(4)?
        ))
    }).unwrap();
    
    // Fetch details of generated relations
    let mut stmt = conn.prepare("SELECT relation_type, strength, source_event_id, target_event_id FROM event_relations").unwrap();
    let rel_rows = stmt.query_map([], |r| {
        Ok((
            r.get::<_, String>(0)?,
            r.get::<_, f64>(1)?,
            r.get::<_, String>(2)?,
            r.get::<_, String>(3)?
        ))
    }).unwrap();

    let mut scenario_results = std::collections::BTreeMap::new();

    // Group issues by scenario ID
    for r in issue_rows {
        let (proj, title, sev, desc, entity_id) = r.unwrap();
        let scenario_id = if title.contains("[LDG-01]") {
            "LDG-01"
        } else if title.contains("[LDG-02]") {
            "LDG-02"
        } else if title.contains("[LDG-05]") {
            "LDG-05"
        } else if title.contains("[LDG-06]") {
            "LDG-06"
        } else if title.contains("[LDG-07]") {
            "LDG-07"
        } else if title == "제한 업종 직접 감지" {
            "EX-04"
        } else {
            "UNKNOWN"
        };

        scenario_results
            .entry(scenario_id.to_string())
            .or_insert_with(|| serde_json::json!({ "findings": [] }))
            .as_object_mut()
            .unwrap()
            .get_mut("findings")
            .unwrap()
            .as_array_mut()
            .unwrap()
            .push(serde_json::json!({
                "type": "ISSUE",
                "project_type": proj,
                "title": title,
                "severity": sev,
                "description": desc,
                "entity_id": entity_id
            }));
    }

    // Group relations by scenario ID
    for r in rel_rows {
        let (rel_type, strength, source_event_id, target_event_id) = r.unwrap();
        let mut source_hash = uuid_to_hash.get(&source_event_id).cloned().unwrap_or(source_event_id.clone());
        let mut target_hash = uuid_to_hash.get(&target_event_id).cloned().unwrap_or(target_event_id.clone());

        // Canonicalize relationship direction based on stable hashes to bypass random UUID ordering
        if source_hash > target_hash {
            std::mem::swap(&mut source_hash, &mut target_hash);
        }

        let scenario_id = if rel_type == "SPLIT_PAYMENT" {
            "PR-02"
        } else {
            "UNKNOWN"
        };

        scenario_results
            .entry(scenario_id.to_string())
            .or_insert_with(|| serde_json::json!({ "findings": [] }))
            .as_object_mut()
            .unwrap()
            .get_mut("findings")
            .unwrap()
            .as_array_mut()
            .unwrap()
            .push(serde_json::json!({
                "type": "RELATION",
                "relation_type": rel_type,
                "strength": strength,
                "source_event_id": source_hash,
                "target_event_id": target_hash
            }));
    }

    // Sort findings under each scenario to ensure order invariance
    for (_scenario_id, val) in scenario_results.iter_mut() {
        if let Some(findings) = val.get_mut("findings").and_then(|f| f.as_array_mut()) {
            findings.sort_by(|a, b| {
                let a_str = serde_json::to_string(a).unwrap_or_default();
                let b_str = serde_json::to_string(b).unwrap_or_default();
                a_str.cmp(&b_str)
            });
        }
    }

    // Generate baseline output JSON structure with 3-tier versioning
    let current_baseline = serde_json::json!({
        "auditflow_version": AUDITFLOW_VERSION,
        "dataset_version": DATASET_VERSION,
        "baseline_version": BASELINE_VERSION,
        "generated_at": chrono::Utc::now().to_rfc3339(),
        "summary": {
            "total_issues": total_issues,
            "total_relations": total_relations
        },
        "scenario_results": scenario_results
    });

    // Write the baseline if it does not exist, or compare if it does
    let baseline_file = "tests/regression_baseline_v2.json";
    if !std::path::Path::new(baseline_file).exists() {
        println!(">>> [REGRESSION] Baseline JSON v2 does not exist. Creating new baseline at {}...", baseline_file);
        let json_str = serde_json::to_string_pretty(&current_baseline).unwrap();
        std::fs::write(baseline_file, json_str).unwrap();
        println!(">>> [REGRESSION] Baseline v2 created successfully!");
    } else {
        println!(">>> [REGRESSION] Baseline JSON v2 found. Comparing results...");
        let expected_str = std::fs::read_to_string(baseline_file).unwrap();
        let expected_json: serde_json::Value = serde_json::from_str(&expected_str).unwrap();
        
        // Verify versions
        assert_eq!(
            current_baseline["auditflow_version"], 
            expected_json["auditflow_version"],
            "AuditFlow version mismatch!"
        );
        assert_eq!(
            current_baseline["dataset_version"], 
            expected_json["dataset_version"],
            "Dataset version mismatch!"
        );
        assert_eq!(
            current_baseline["baseline_version"], 
            expected_json["baseline_version"],
            "Baseline version mismatch!"
        );

        // Compare counts
        assert_eq!(
            current_baseline["summary"]["total_issues"], 
            expected_json["summary"]["total_issues"],
            "Total issues count mismatch!"
        );
        assert_eq!(
            current_baseline["summary"]["total_relations"], 
            expected_json["summary"]["total_relations"],
            "Total relations count mismatch!"
        );
        
        // Compare scenario results
        assert_eq!(
            current_baseline["scenario_results"], 
            expected_json["scenario_results"],
            "Scenario results detail mismatch!"
        );
        println!(">>> [REGRESSION] PASS: 100% Identical to Baseline v2!");
    }

    // Cleanup
    let _ = std::fs::remove_file(db_file);
}
