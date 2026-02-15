use rusqlite::{params, Connection};
use tauri::{AppHandle, Manager};
use serde_json::json;
use chrono::Datelike;
use rand::Rng;
use uuid::Uuid;
use std::collections::HashMap;

pub struct SimulationConfig {
    pub year: i32,
}

#[tauri::command]
pub fn generate_annual_audit_data(app_handle: AppHandle) -> Result<String, String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let mut conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    
    run_annual_simulation(&mut conn, SimulationConfig { year: 2025 }).map_err(|e| e.to_string())
}

struct UnitProfile {
    id: i32,
    name: String,
    category: String,
}

struct ScenarioDef {
    id: String,
    category: String, 
    name: String,
    risk_level: String,
}

pub fn run_annual_simulation(conn: &mut Connection, config: SimulationConfig) -> Result<String, String> {
    println!(">>> [SIMULATOR] Starting Annual Audit Data Simulation for Year {}...", config.year);

    // 1. Fetch Audit Universe Units
    let mut stmt = conn.prepare("SELECT id, unit_name, category FROM audit_universe").map_err(|e| e.to_string())?;
    let units: Vec<UnitProfile> = stmt.query_map([], |row| {
        Ok(UnitProfile {
            id: row.get(0)?,
            name: row.get(1)?,
            category: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?.map(|r| r.unwrap()).collect();

    // 2. Fetch Scenarios
    let mut stmt = conn.prepare("SELECT id, category, name, risk_level FROM custom_scenarios").map_err(|e| e.to_string())?;
    let scenarios: Vec<ScenarioDef> = stmt.query_map([], |row| {
        Ok(ScenarioDef {
            id: row.get(0)?,
            category: row.get(1)?,
            name: row.get(2)?,
            risk_level: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?.map(|r| r.unwrap()).collect();

    if units.is_empty() { return Err("No Audit Universe units found. Please initialize database first.".into()); }
    if scenarios.is_empty() { return Err("No scenarios found. Please seed scenarios first.".into()); }

    // [SIMULATOR FIX] Ensure anchor object exists for relations to satisfy foreign key constraints
    conn.execute(
        "INSERT OR IGNORE INTO audit_object (id, object_type, source, extracted_fields, ingested_at, status) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            "POLICY_REF_001",
            "REGULATION",
            "SYSTEM_MANIFEST",
            json!({"name": "Global Compliance Policy v1.0"}).to_string(),
            "2024-01-01 00:00:00",
            "ACTIVE"
        ]
    ).map_err(|e| e.to_string())?;

    let mut rng = rand::thread_rng();
    let mut total_events = 0;

    // Create a lookup map for scenarios by ID
    let scenario_map: HashMap<String, ScenarioDef> = scenarios.iter()
        .map(|s| (s.id.clone(), ScenarioDef { 
            id: s.id.clone(), 
            category: s.category.clone(), 
            name: s.name.clone(), 
            risk_level: s.risk_level.clone() 
        }))
        .collect();

    // 4. Iterate Units -> Months -> Events
    // Track recurrence: Unit ID -> Map<ScenarioID, OccurrenceCount>
    let mut unit_risk_state: HashMap<i32, HashMap<String, i32>> = HashMap::new();

    let mut success_count = 0;
    let mut error_log = Vec::new();

    for unit in &units {
        // [AUTO-RECOVERY] Run unit generation in a closure to catch errors per unit
        let generation_result = (|| -> Result<(), String> {
            // [INDIVIDUAL PROJECT CREATION]
            // Create a unique project for each Entity to test multi-project management
            let project_id = format!("PRJ-{}-{}", config.year, unit.name.replace(" ", "-"));
            
            conn.execute(
                "INSERT OR REPLACE INTO audit_projects (id, title, status, progress_pct, start_date, end_date, lead_auditor, valuation_tier, risk_score) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![
                    &project_id, 
                    format!("{}년 {} 정밀 감사 (FY{})", config.year, &unit.name, config.year), 
                    "Fieldwork", 
                    rng.gen_range(30..80), 
                    format!("{}-01-01", config.year), 
                    format!("{}-12-31", config.year), 
                    "AI_SIMULATOR",
                    format!("Tier: {}", if unit.id % 2 == 0 { "Enterprise" } else { "Standard" }),
                    rng.gen_range(5..85)
                ]
            ).map_err(|e| e.to_string())?;

            // Create Session per Unit (Linked to its specific project)
            let session_id = format!("ses-sim-{}-{}", config.year, unit.id);
            conn.execute(
                "INSERT OR REPLACE INTO audit_session (id, project_id, name, period_start, period_end, status) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    &session_id, 
                    &project_id, 
                    format!("{} 연간 정기 검토", &unit.name),
                    format!("{}-01-01", config.year), 
                    format!("{}-12-31", config.year),
                    "OPEN"
                ]
            ).map_err(|e| e.to_string())?;

            // Determine relevant scenarios based on Unit Name/Category
            let mut relevant_scenarios: Vec<&ScenarioDef> = scenarios.iter().filter(|s| {
                is_scenario_relevant(&unit, s)
            }).collect();

            // [FALLBACK] If no specific scenarios match, assign random ones to ensure coverage
            if relevant_scenarios.is_empty() {
                let mut rng = rand::thread_rng();
                for _ in 0..5 {
                    relevant_scenarios.push(&scenarios[rng.gen_range(0..scenarios.len())]);
                }
            }

            // Initialize state for this unit
            let unit_history = unit_risk_state.entry(unit.id).or_default();

            for month in 1..=12 {
                let limit = match month {
                    12 | 3 | 6 | 9 => rng.gen_range(3..8), // Quarter end
                    _ => rng.gen_range(1..4),
                };

                for _ in 0..limit {
                    let pick_recurrence = !unit_history.is_empty() && rng.gen_bool(0.3);
                    
                    let scenario = if pick_recurrence {
                        let history_keys: Vec<&String> = unit_history.keys().collect();
                        let chosen_id = history_keys[rng.gen_range(0..history_keys.len())];
                        scenario_map.get(chosen_id).unwrap()
                    } else {
                        relevant_scenarios[rng.gen_range(0..relevant_scenarios.len())]
                    };

                    let count = *unit_history.get(&scenario.id).unwrap_or(&0) + 1;
                    unit_history.insert(scenario.id.clone(), count);

                    let (status, risk_tag, note) = if count >= 3 {
                        ("CONFIRMED", "Critical", format!("⚠️ [Recurrence #3] Persistent violation detected in {}. Escalating to Critical.", unit.name))
                    } else if count == 2 {
                        ("PENDING", "High", "⚠️ [Recurrence #2] Repeated pattern observed within fiscal year.".to_string())
                    } else {
                        let roll = rng.gen_range(0..100);
                        if roll < 15 { ("CONFIRMED", "High", "Direct evidence found.".to_string()) }
                        else if roll < 55 { ("PENDING", "Medium", "Potential anomaly requires review.".to_string()) }
                        else { ("PENDING", "Low", "Trace evidence noted in ledger.".to_string()) }
                    };

                    let day = rng.gen_range(1..28);
                    let date_str = format!("{}-{:02}-{:02} 14:30:00", config.year, month, day);
                    let amount: f64 = rng.gen_range(10000.0..5000000.0);
                    let amount = amount.round();

                    // [LINKAGE FIX] Generate a source Audit Object to anchor the task
                    let object_id = format!("OBJ-{}", Uuid::new_v4().to_string().split('-').next().unwrap());
                    conn.execute(
                        "INSERT INTO audit_object (id, object_type, source, extracted_fields, ingested_at, status, project_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                        params![
                            &object_id,
                            match scenario.category.as_str() {
                                "Procurement" | "Expenses" => "LEDGER_ENTRY",
                                "IT" | "Compliance" => "SYSTEM_LOG",
                                _ => "COMMUNICATION"
                            },
                            "SIMULATED_DATA_SOURCE",
                            json!({
                                "description": &scenario.name,
                                "amount": amount,
                                "merchant": "Simulated Entity",
                                "risk_tag": risk_tag
                            }).to_string(),
                            &date_str,
                            "ACTIVE",
                            &project_id
                        ]
                    ).map_err(|e| e.to_string())?;

                    // Generate Review Task
                    let task_id = Uuid::new_v4().to_string();
                    
                    conn.execute(
                        "INSERT INTO review_tasks (id, session_id, object_id, relation_candidate_id, reason, status, snapshot_data, created_at, reviewer_note) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                        params![
                            task_id,
                            &session_id,
                            &object_id, // Link to the created object
                            &scenario.id,
                            format!("[{}] {}", risk_tag, &scenario.name),
                            status,
                            json!({
                                "amount": amount,
                                "vendor": "Simulated Vendor", 
                                "description": &scenario.name,
                                "simulated_risk": risk_tag,
                                "recurrence_count": count
                            }).to_string(),
                            &date_str,
                            if status == "CONFIRMED" { "Auto-confirmed by Simulator rule (Recurrence)." } else { "" }
                        ]
                    ).map_err(|e| e.to_string())?;

                    total_events += 1;

                    if status == "CONFIRMED" || status == "PENDING" {
                        // [FORENSIC UPGRADE] Linkage: Find another transaction in the same project to link to
                        // To keep it simple, we link to the previous transaction if it exists
                        let prev_object_id = format!("OBJ-PREV-{}", unit.id);
                        let _ = conn.execute(
                            "INSERT OR IGNORE INTO audit_object (id, object_type, source, extracted_fields, ingested_at, status, project_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                            params![
                                &prev_object_id,
                                "LEDGER_ENTRY",
                                "SIMULATED_DATA_SOURCE",
                                json!({"description": "Base Transaction for Linkage", "amount": 0.0}).to_string(),
                                &date_str,
                                "ACTIVE",
                                &project_id
                            ]
                        );

                        // [LINKAGE FIX] Create a Relation Candidate to fuel the "Insights" tab
                        let rel_id = format!("REL-{}", Uuid::new_v4().to_string().split('-').next().unwrap());
                        
                        // Relationship Type 1: Policy Violation
                        let _ = conn.execute(
                            "INSERT INTO relation_candidate (from_object_id, to_object_id, reason_codes, confidence, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                            params![
                                &object_id, 
                                "POLICY_REF_001", // Simulated Policy Target
                                json!([&scenario.category, "RULE_VIOLATION"]).to_string(),
                                if count >= 2 { "exact" } else { "high" },
                                &date_str
                            ]
                        );

                        // Relationship Type 2: Entity Resolution (Cluster)
                        let _ = conn.execute(
                            "INSERT OR IGNORE INTO relation_candidate (from_object_id, to_object_id, reason_codes, confidence, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                            params![
                                &object_id, 
                                &prev_object_id,
                                json!(["ENTITY_RESOLUTION", "IDENTICAL_MERCHANT"]).to_string(),
                                "pattern",
                                &date_str
                            ]
                        );

                        let issue_title = if count >= 3 {
                            format!("🚨 [Repeated] {}", &scenario.name)
                        } else {
                            scenario.name.clone()
                        };

                        let _ = conn.execute(
                            "INSERT INTO audit_issues (issue_title, description, severity, project_type, audit_id, status, detected_at, row_index, entity_id, manager_comment) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                            params![
                                &issue_title,
                                format!("{}원 상당의 의심 거래 탐지 (분기 내 {}회 반복됨)", amount, count),
                                risk_tag,
                                &unit.category,
                                &project_id,
                                "Open",
                                &date_str,
                                rng.gen_range(1..1000),
                                unit.id,
                                &note
                            ]
                        );

                        // [PHASE 6] Case Elevation & Forensic Clusters
                        if count >= 3 {
                            let case_id = format!("CASE-{}-{}", unit.id, scenario.id);
                            let _ = conn.execute(
                                "INSERT OR REPLACE INTO audit_cases (id, project_id, title, reasoning, severity, status, entity_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                                params![
                                    &case_id,
                                    &project_id,
                                    format!("⚖️ Investigation: Repeated Risk in {}", unit.name),
                                    format!("자동 승격: 동일 엔티티({})에서 3회 이상 반복되는 시나리오({}) 발견. 고의적 부정 가능성 높음.", unit.name, scenario.name),
                                    "HIGH",
                                    "DRAFT",
                                    unit.id,
                                    &date_str
                                ]
                            );

                            // Emit Forensic Event
                            let _ = conn.execute(
                                "INSERT INTO system_events (id, event_type, description, audit_id) VALUES (?1, ?2, ?3, ?4)",
                                params![
                                    Uuid::new_v4().to_string(),
                                    "AI_SIGNAL",
                                    format!("⚖️ 케이스 승격: '{}' 부서의 [{}] 리스크 반복 노출로 정식 조사 케이스 자동 생성", unit.name, scenario.name),
                                    &project_id
                                ]
                            );
                        }

                        if count == 2 {
                             // Emit Repetition Amplifier Event
                             let _ = conn.execute(
                                "INSERT INTO system_events (id, event_type, description, audit_id) VALUES (?1, ?2, ?3, ?4)",
                                params![
                                    Uuid::new_v4().to_string(),
                                    "RISK_CHANGE",
                                    format!("🚩 반복 탐지: '{}' 부서의 [{}] 리스크 추적 결과 이상 징후 반복 확인", unit.name, scenario.name),
                                    &project_id
                                ]
                            );
                        }

                        // [DASHBOARD SYNC] Update findings_count and risk_score for the project
                        let increment = match risk_tag { "Critical" => 10, "High" => 5, _ => 2 };
                        let _ = conn.execute(
                            "UPDATE audit_projects SET findings_count = findings_count + 1, risk_score = risk_score + ?1 WHERE id = ?2",
                            params![increment, &project_id]
                        );

                        // [UNIVERSE SYNC] Reflect risk back to the Audit Universe
                        let _ = conn.execute(
                            "UPDATE audit_universe SET impact_score = impact_score + ?1, likelihood_score = likelihood_score + 1 WHERE id = ?2",
                            params![increment, unit.id]
                        );
                    }
                }
            }
            Ok(())
        })();

        match generation_result {
            Ok(_) => success_count += 1,
            Err(e) => {
                println!(">>> [SIMULATOR ERROR] Failed to generate for unit '{}': {}", unit.name, e);
                error_log.push(format!("{}: {}", unit.name, e));
                // Continue to next unit - Automatic recovery
            }
        }
    }
    
    // [FINAL SYNC] Ensure dashboard signal counts are updated
    conn.execute(
        "INSERT OR REPLACE INTO system_events (id, event_type, description, audit_id) VALUES (?1, ?2, ?3, ?4)",
        params![
            format!("sim-evt-{}", Uuid::new_v4()),
            "SYSTEM_INFO",
            format!("{}년 연간 감사 시뮬레이션 완료. {}개 부서, {}건의 리스크 시그널 생성됨.", config.year, units.len(), total_events),
            "GLOBAL_SIM"
        ]
    ).map_err(|e| e.to_string())?;

    Ok(format!("Generated {} projects, {} sessions and {} audit incidents across all entities.", units.len(), units.len(), total_events))
}

fn is_scenario_relevant(unit: &UnitProfile, scenario: &ScenarioDef) -> bool {
    // Simple Keyword Matching
    let unit_name_lower = unit.name.to_lowercase();
    let cat_lower = scenario.category.to_lowercase();
    let id_prefix = &scenario.id.split('-').next().unwrap_or("").to_lowercase();

    match unit_name_lower.as_str() {
        name if name.contains("구매") || name.contains("procurement") => id_prefix == "pr" || id_prefix == "pc" || id_prefix == "ab",
        name if name.contains("it") || name.contains("보안") || name.contains("security") => id_prefix == "it" || id_prefix == "itx",
        name if name.contains("인사") || name.contains("급여") || name.contains("hr") || name.contains("payroll") => id_prefix == "hr",
        name if name.contains("자금") || name.contains("재무") || name.contains("회계") || name.contains("treasury") || name.contains("finance") || name.contains("accounting") => id_prefix == "fa" || id_prefix == "aml" || id_prefix == "ff" || id_prefix == "rv",
        name if name.contains("물류") || name.contains("재고") || name.contains("logistics") || name.contains("inventory") => id_prefix == "in",
        name if name.contains("영업") || name.contains("sales") => id_prefix == "sa" || id_prefix == "rv",
        name if name.contains("연구") || name.contains("개발") || name.contains("r&d") || name.contains("research") => id_prefix == "itx" || id_prefix == "pq",
        name if name.contains("준수") || name.contains("법무") || name.contains("compliance") || name.contains("legal") => id_prefix == "cl" || id_prefix == "es" || id_prefix == "ab",
        name if name.contains("마케팅") || name.contains("marketing") => id_prefix == "ex" || id_prefix == "cc",
        name if name.contains("총무") || name.contains("general affairs") => id_prefix == "cc" || id_prefix == "ex",
        name if name.contains("생산") || name.contains("품질") || name.contains("production") || name.contains("quality") => id_prefix == "pq",
        name if name.contains("지사") || name.contains("법인") || name.contains("branch") || name.contains("subsidiary") => id_prefix == "sa" || id_prefix == "ex" || id_prefix == "cc" || id_prefix == "ab",
        _ => id_prefix == "ex" || id_prefix == "cc" // Fallback: Everyone has expenses
    }
}
