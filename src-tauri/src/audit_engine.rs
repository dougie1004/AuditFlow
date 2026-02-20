use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use rusqlite::{params, Connection, Result as SqlResult};
use serde_json::json;
use regex::Regex;
use anyhow::Context;
use crate::error::EngineResult;

// --- INTELLIGENCE HELPERS ---

/// [Entity Resolution] Normalizes vendor and entity names for cross-matching
fn normalize_entity_name(name: &str) -> String {
    let n = name.to_lowercase().replace(" ", "").replace("(주)", "").replace("주식회사", "");
    // Semantic normalization map
    if n.contains("스타벅스") || n.contains("starbucks") { return "STARBUCKS_GLOBAL".to_string(); }
    if n.contains("쿠팡") || n.contains("coupang") { return "COUPANG_RETAIL".to_string(); }
    if n.contains("배달의민족") || n.contains("baemin") || n.contains("우아한") { return "BAEMIN_SERVICE".to_string(); }
    if n.contains("대한항공") || n.contains("koreanair") { return "KOREAN_AIR_LY".to_string(); }
    n
}

/// [Semantic Memory] Provides expanded synonyms for audit context
fn get_semantic_synonyms(keyword: &str) -> Vec<&'static str> {
    match keyword.to_lowercase().as_str() {
        "식비" | "meal" | "food" | "welfare" | "복리후생" | "식대" => vec!["식사", "restaurant", "dining", "lunch", "dinner", "회식"],
        "교통" | "travel" | "taxi" | "bus" | "train" | "택시" | "운임" => vec!["여비", "transport", "kakaotaxi", "ktx", "srt", "flight"],
        "상품권" | "gift" | "voucher" => vec!["선물", "coupon", "백화점", "지류", "컬쳐랜드"],
        "it" | "software" | "saas" | "cloud" => vec!["aws", "azure", "구독", "license", "licence", "subscription"],
        _ => vec![]
    }
}

/// [Multi-hop Chain] Checks if a new connection creates a 3-way causation chain
fn discover_multi_hop_chains(conn: &Connection, new_from: &str, new_to: &str) -> Vec<String> {
    let mut chains = Vec::new();
    
    // Pattern: A -> B (new), check if B -> C exists
    let mut stmt = conn.prepare("SELECT to_object_id FROM relation_candidate WHERE from_object_id = ?1").ok();
    if let Some(mut s) = stmt {
        let rows = s.query_map([new_to], |r| r.get::<_, String>(0)).ok();
        if let Some(rows) = rows {
            for r in rows {
                if let Ok(c_id) = r {
                    chains.push(format!("CHAIN: {} -> {} -> {}", new_from, new_to, c_id));
                }
            }
        }
    }

    // Pattern: A -> B (new), check if X -> A exists
    let mut stmt2 = conn.prepare("SELECT from_object_id FROM relation_candidate WHERE to_object_id = ?1").ok();
    if let Some(mut s) = stmt2 {
        let rows = s.query_map([new_from], |r| r.get::<_, String>(0)).ok();
        if let Some(rows) = rows {
            for r in rows {
                if let Ok(x_id) = r {
                    chains.push(format!("CHAIN: {} -> {} -> {}", x_id, new_from, new_to));
                }
            }
        }
    }
    
    chains
}

/// [Entity Risk Memory] Amplifies risk score based on historical findings for this entity
fn get_entity_risk_multiplier(conn: &Connection, entity_name: &str) -> f64 {
    let norm = normalize_entity_name(entity_name);
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM suspicion_inbox WHERE metadata LIKE ?",
        [format!("%{}%", norm)],
        |row| row.get(0)
    ).unwrap_or(0);
    
    if count >= 10 { 2.5 }      // Critical repetition
    else if count >= 5 { 1.5 }  // High repetition
    else if count >= 3 { 1.2 }  // Material repetition
    else { 1.0 }                // Baseline
}

/// [Case Elevation] Clusters related signals into a formal 'Audit Case'
fn elevate_to_case_candidates(conn: &Connection, project_id: &str) -> EngineResult<()> {
    // Logic: Find entities with 3+ pending suspicions in this project
    let mut stmt = conn.prepare(
        "SELECT metadata FROM suspicion_inbox 
         WHERE status = 'Pending' 
         GROUP BY metadata HAVING COUNT(*) >= 3"
    ).context("Failed to prepare case elevation query")?;

    let clusters = stmt.query_map([], |row| row.get::<_, String>(0))?;
    
    for c in clusters {
        if let Ok(metadata_str) = c {
            let metadata: serde_json::Value = serde_json::from_str(&metadata_str).unwrap_or(json!({}));
            let entity = metadata["vendor"].as_str().unwrap_or("Unknown Entity");
            
            let case_id = format!("case-{}", uuid::Uuid::new_v4());
            let reasoning = format!("자동 승격: '{}' 엔터티에서 3건 이상의 독립적 이상 징후가 발견되었습니다. 반복적인 리스크 패턴으로 인해 정식 조사 케이스로 전환합니다.", entity);
            
            // Check if case already exists for this entity in this project to avoid spam
            let exists: i64 = conn.query_row(
                "SELECT COUNT(*) FROM audit_cases WHERE project_id = ?1 AND title LIKE ?2",
                params![project_id, format!("%{}%", entity)],
                |row| row.get(0)
            ).unwrap_or(0);

            if exists == 0 {
                conn.execute(
                    "INSERT INTO audit_cases (id, project_id, title, reasoning, severity, status, related_ids) 
                     VALUES (?1, ?2, ?3, ?4, 'HIGH', 'DRAFT', ?5)",
                    params![
                        case_id, 
                        project_id, 
                        format!("[Case] {} - 반복 리스크 노출", entity),
                        reasoning,
                        "{}" // To be populated with metadata if needed
                    ]
                ).ok();

                // Log to system events
                let _ = conn.execute(
                    "INSERT INTO system_events (id, timestamp, event_type, description, audit_id) 
                     VALUES (?1, datetime('now'), 'CASE_PROMOTION', ?2, ?3)",
                    params![uuid::Uuid::new_v4().to_string(), format!("⚖️ 케이스 승격: '{}' 관련 이상 징후 집적화", entity), project_id]
                );
            }
        }
    }
    Ok(())
}

pub fn analyze_ingested_object(app_handle: AppHandle, new_obj_id: &str, project_id: &str) -> EngineResult<()> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).context("Failed to open audit database")?;

    // 1. Fetch the newly ingested object's basic info
    let (obj_type, fields_str) = {
        let res = conn.query_row(
            "SELECT object_type, extracted_fields FROM audit_object WHERE id = ?1",
            params![new_obj_id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        );
        match res {
            Ok(v) => v,
            Err(_) => {
                println!(">>> [AUDIT ENGINE] Warning: Object not found in DB. Skipping.");
                return Ok(());
            }
        }
    };

    println!(">>> [AUDIT ENGINE] Canonical Analysis Triggered for Object: {}", new_obj_id);

    // 2. Fetch Canonical Events from Layer 2 (DB)
    let mut stmt = conn.prepare(
        "SELECT id, entity_id, event_type, amount, event_date, description, account_name, account_code, debit, credit, net_amount, metadata, source_type 
         FROM entity_event WHERE source_object_id = ?1"
    ).context("Failed to prepare entity event fetch query")?;
    
    let event_rows = stmt.query_map(params![new_obj_id], |row| -> SqlResult<crate::models::EntityEvent> {
        Ok(crate::models::EntityEvent {
            id: row.get(0)?,
            entity_id: row.get(1)?,
            event_type: row.get(2)?,
            amount: Some(row.get(3)?),
            event_date: row.get(4)?,
            description: row.get(5)?,
            source_object_id: Some(new_obj_id.to_string()),
            is_flagged: false,
            risk_delta: 0.0,
            rule_flags: None,
            stat_flags: None,
            source_type: row.get(12)?,
            account_name: Some(row.get(6)?),
            account_code: Some(row.get(7)?),
            debit: Some(row.get(8)?),
            credit: Some(row.get(9)?),
            net_amount: Some(row.get(10)?),
            metadata: row.get(11)?,
        })
    })?;

    let mut all_events = Vec::new();
    for r in event_rows {
        if let Ok(e) = r { all_events.push(e); }
    }

    if all_events.is_empty() {
        println!(">>> [AUDIT ENGINE] Skip: No Canonical Events found for {}. Analysis terminated.", new_obj_id);
        return Ok(());
    }

    // Filter for Structural Engine (Ledger only)
    let ledger_events: Vec<&crate::models::EntityEvent> = all_events.iter()
        .filter(|e| e.source_type.as_ref().map(|s| s == "LEDGER").unwrap_or(false))
        .collect();

    if !ledger_events.is_empty() {
        println!(">>> [AUDIT ENGINE] Running Structural Risk-Engine on {} Ledger Events...", ledger_events.len());
        
        // A. ACCOUNT ANOMALY
        for e in &ledger_events {
             if let Some(code) = &e.account_code {
                 if code == "999" || code == "SUSPENSE" {
                     let final_score = if code == "141" || code == "258" { 0.9 } else { crate::rule_weights::RuleWeight::Medium.as_f64() };
                     let sig_id = uuid::Uuid::new_v4().to_string();
                     let rel_ids = serde_json::json!([e.id]).to_string();
                     let metadata = serde_json::json!({ "account_code": code, "amount": e.net_amount, "risk_factor": "TEMPORARY_ACCOUNT" }).to_string();
                     conn.execute(
                         "INSERT INTO risk_signal (id, object_id, project_id, signal_type, description, score, related_ids, metadata) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                         params![sig_id, new_obj_id, project_id, "ACCOUNT_ANOMALY", format!("[특수계정] 감사 주의 계정 코드({}) 사용 감지", code), final_score, rel_ids, metadata]
                     ).ok();
                 }
             }
        }
        
        // B. Context-Sensitive Transactional Intelligence (Gated by Object Type)
        // If the object is NOT a Ledger (e.g., Cards, Bank Statements), we run granular detectors.
        if obj_type != "LEDGER" {
            // [Restoring Split Payment, Holiday, Volumetric detectors here for multi-modal audit]
            // (Note: Currently optimized for future CARD/BANK uploads while keeping LEDGER clean)
            println!(">>> [AUDIT ENGINE] Transactional Detail detected ({}). Running micro-pattern detectors...", obj_type);
            
            // Re-implementing Split Payment
            let mut grouped_events: std::collections::HashMap<(String, String), Vec<&crate::models::EntityEvent>> = std::collections::HashMap::new();
            for e in &all_events {
                if !e.entity_id.is_empty() {
                    grouped_events.entry((e.entity_id.clone(), e.event_date.clone())).or_default().push(e);
                }
            }
            for ((entity, _date), group) in grouped_events {
                if group.len() >= 2 {
                    let total: f64 = group.iter().map(|e| e.net_amount.unwrap_or(0.0).abs()).sum();
                    if total > 50_000.0 { // Standard analytical threshold for split check
                        let sig_id = uuid::Uuid::new_v4().to_string();
                        let rel_ids = serde_json::to_string(&group.iter().map(|e| e.id.clone()).collect::<Vec<_>>()).unwrap_or_else(|_| "[]".to_string());
                        
                        // [DYNAMIC SCORE] More fragments + larger total = higher risk
                        let freq_bonus = (group.len() as f64 * 0.1).min(0.3);
                        let final_split_score = (0.4 + freq_bonus).min(0.95);

                        let meta = serde_json::json!({
                            "entity": entity,
                            "count": group.len(),
                            "amount": total,
                            "logic": "Fragmented Transaction Detection"
                        }).to_string();

                        conn.execute(
                            "INSERT INTO risk_signal (id, object_id, project_id, signal_type, description, score, related_ids, metadata) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                            params![sig_id, new_obj_id, project_id, "SPLIT_PAYMENT:STRUCTURED", format!("[분할결제 의심] '{}'에서 {}건의 거래 분절 발생 (합계: {}원)", entity, group.len(), total), final_split_score, rel_ids, meta]
                        ).ok();
                    }
                }
            }
        }
    }

// 3. Execution of Cross-Object Semantic Relations (Layer 3 Intelligence)
    let candidates = {
        let mut stmt = conn.prepare("SELECT id, object_type, extracted_fields FROM audit_object WHERE project_id = ?1 AND id != ?2").context("Failed to prepare semantic relation query")?;
        let mut results = Vec::new();
        let rows = stmt.query_map(params![project_id, new_obj_id], |row| -> SqlResult<(String, String, String)> {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })?;
        for r in rows { if let Ok(v) = r { results.push(v); } }
        results
    };

    let context_summary = format!("{} {}", fields_str, all_events.iter().map(|e| e.description.clone()).collect::<Vec<_>>().join(" "));
    let context_lower = context_summary.to_lowercase();

    for (other_id, other_type, other_fields_str) in candidates {
        let mut signals = Vec::new();
        let mut confidence = "low";
        let other_fields_lower = other_fields_str.to_lowercase();

        // Semantic Correlation (Synonym Expansion)
        let audit_keywords = vec!["식비", "교통", "상품권", "IT", "접대", "선물"];
        for kw in audit_keywords {
            if context_lower.contains(&kw.to_lowercase()) {
                let synonyms = get_semantic_synonyms(kw);
                if synonyms.iter().any(|&s| other_fields_lower.contains(s)) {
                    signals.push(format!("SEMANTIC_MATCH:{}", kw.to_uppercase()));
                    confidence = "medium";
                }
            }
        }

        // Entity Resolution Match using Canonical Events
        for e in &all_events {
            let norm = normalize_entity_name(&e.entity_id);
            if !norm.is_empty() && other_fields_lower.contains(&norm.to_lowercase()) {
                signals.push("ENTITY_RESOLUTION_MATCH".to_string());
                confidence = "high";
                break;
            }
        }

        if confidence != "low" && !signals.is_empty() {
            let reasons_json = serde_json::to_string(&signals).unwrap();
            conn.execute(
                "INSERT OR IGNORE INTO relation_candidate (from_object_id, to_object_id, reason_codes, confidence, created_at) VALUES (?1, ?2, ?3, ?4, datetime('now'))",
                params![new_obj_id, other_id, reasons_json, confidence]
            ).ok();
        }
    }

    
    // [PHASE 4] Multi-Year Structural Analysis (Structural Intelligence)
    println!(">>> [PHASE 4] Executing Structural Analysis Layer...");
    
    let accounts_in_obj: Vec<String> = {
        let mut stmt = conn.prepare("SELECT DISTINCT account_code FROM entity_event WHERE source_object_id = ?1").context("Failed to prepare distinct account query")?;
        let rows = stmt.query_map(params![new_obj_id], |r| r.get(0))?;
        rows.filter_map(|r| r.ok()).collect()
    };

    for acc in accounts_in_obj {
        // [Analysis Filter] Skip low-risk/noisy accounts (Cash, Equity, etc.)
        // Targeted: Revenue (4xxx), Costs (5xxx/6xxx), Expenses (8xxx), Watch-List Specifics (Temporary payments, etc.)
        if !is_analytically_significant(&acc) {
            continue;
        }
        // 1. Calculate Anomaly Score (Average of rule-based signals)
        let (avg_anomaly, _anomaly_count): (f64, i64) = conn.query_row(
            "SELECT COALESCE(AVG(score), 0.0), COUNT(*) FROM risk_signal WHERE object_id = ?1 AND (metadata LIKE ?2 OR description LIKE ?2)",
            params![new_obj_id, format!("%{}%", acc)],
            |r| Ok((r.get(0)?, r.get(1)?))
        ).unwrap_or((0.0, 0));

        // 2. Fetch Fiscal Year
        let year: i32 = conn.query_row(
            "SELECT CAST(substr(event_date, 1, 4) AS INTEGER) FROM entity_event WHERE source_object_id = ?1 AND account_code = ?2 LIMIT 1",
            params![new_obj_id, acc],
            |r| r.get(0)
        ).unwrap_or(2025);

        // 3. RUST-NATIVE ANALYTICAL METRICS
        
        // A. CV Calculation (Using Monthly Aggregates)
        let monthly_data: Vec<f64> = {
            let mut stmt = conn.prepare("SELECT SUM(ABS(net_amount)) FROM entity_event WHERE source_object_id = ?1 AND account_code = ?2 GROUP BY substr(event_date, 1, 7)")?;
            let rows = stmt.query_map(params![new_obj_id, acc], |r| r.get::<_, f64>(0))?;
            rows.filter_map(|r| r.ok()).collect()
        };

        let cv = if monthly_data.len() > 1 {
            let n = monthly_data.len() as f64;
            let sum: f64 = monthly_data.iter().sum();
            let mean = sum / n;
            let variance = monthly_data.iter().map(|&v| (v - mean).powi(2)).sum::<f64>() / n;
            let std_dev = variance.sqrt();
            if mean > 0.0 { std_dev / mean } else { 0.0 }
        } else {
            0.0 // Insufficient periodicity
        };

        // B. CR1 and HHI Calculation (Using Counterparty Distribution)
        let cp_data: Vec<f64> = {
            let mut stmt = conn.prepare("SELECT SUM(ABS(net_amount)) as s FROM entity_event WHERE source_object_id = ?1 AND account_code = ?2 GROUP BY entity_id ORDER BY s DESC")?;
            let rows = stmt.query_map(params![new_obj_id, acc], |r| r.get::<_, f64>(0))?;
            rows.filter_map(|r| r.ok()).collect()
        };

        let (cr1, hhi) = if !cp_data.is_empty() {
            let total: f64 = cp_data.iter().sum();
            let max_val = cp_data.first().copied().unwrap_or(0.0);
            let cr1_val = if total > 0.0 { max_val / total } else { 0.0 };
            let hhi_val = if total > 0.0 { cp_data.iter().map(|&v| (v / total).powi(2)).sum::<f64>() } else { 0.0 };
            (cr1_val, hhi_val)
        } else {
            (0.0, 0.0)
        };

        // 4. Calculate Final Structural Score (Statistical Calibration)
        let structural_score = crate::risk_score::calculate_structural_score(cv, cr1, hhi);
        let structural_label = crate::risk_interpret::interpret_structural_score(structural_score);

        /*
        println!(">>> [FLUX] Acc: {}, CV: {:.4}, CR1: {:.4}, HHI: {:.4} -> Structural: {:.4} ({:?})", 
                 acc, cv, cr1, hhi, structural_score, structural_label);
        */

        // 5. Update Yearly Profile Repository (Baseline data)
        conn.execute(
            "INSERT INTO account_year_profile (account_code, fiscal_year, structural_score, avg_anomaly_score, avg_cv, avg_cr1, avg_hhi, transaction_count) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(account_code, fiscal_year) DO UPDATE SET 
             structural_score = ?3,
             avg_anomaly_score = ?4,
             avg_cv = ?5,
             avg_cr1 = ?6,
             avg_hhi = ?7,
             transaction_count = ?8",
            params![acc, year, structural_score, avg_anomaly, cv, cr1, hhi, cp_data.len() as i64]
        ).ok();

        // 6. Flux Signature Analysis (Experimental Phase - Console Only)
        let audit_history: Vec<(i32, f64, f64)> = {
            if let Ok(mut stmt) = conn.prepare("SELECT fiscal_year, avg_cr1, structural_score FROM account_year_profile WHERE account_code = ?1 ORDER BY fiscal_year ASC") {
                stmt.query_map(params![acc], |r| -> SqlResult<(i32, f64, f64)> {
                   Ok((r.get(0)?, r.get(1)?, r.get(2)?))
                })
                .map(|rows| rows.filter_map(|r| r.ok()).collect())
                .unwrap_or_default()
            } else {
                Vec::new()
            }
        };

        if audit_history.len() >= 2 {
            let cr1_vec: Vec<f64> = audit_history.iter().map(|h| h.1).collect();
            let delta_cr1: Vec<f64> = cr1_vec.windows(2).map(|w| w[1] - w[0]).collect();
            
            // Signature Classification Logic
            let last_delta = *delta_cr1.last().unwrap_or(&0.0);
            let signature = if last_delta > 0.4 {
                format!("Emerging Dominance ({:?} Structural Break)", audit_history.last().unwrap().0)
            } else if last_delta.abs() < 0.05 {
                "Stable Structure".to_string()
            } else if last_delta > 0.1 {
                "Gradual Concentration Growth".to_string()
            } else {
                "Volatile/Indeterminate".to_string()
            };

            println!("--- [FLUX_EXP] Account: {} ---", acc);
            println!("CR1 Vector: {:?}", cr1_vec);
            println!("ΔCR1: {:?}", delta_cr1);
            println!("Signature: {}", signature);

            // Risk Signal Escalation (if meaningful)
                if last_delta > 0.3 {
                     // [FIX] Target Specific Year for Financial Accuracy
                     let target_year = audit_history.last().unwrap().0;
                     let prev_year_data = audit_history.get(audit_history.len() - 2).unwrap();
                     
                     // [CFO CALIBRATION V3] Realism First.
                     // Risk is not 2% of total volume, but a tiny fraction of the ACTUAL SHIFT in balance (delta).
                     // If payroll increased by 100M, perhaps 0.5% (500k) is "statistically unverified".
                     
                     let current_balance: f64 = conn.query_row(
                         "SELECT SUM(net_amount) FROM entity_event WHERE source_object_id = ?1 AND account_code = ?2 AND strftime('%Y', event_date) = ?3",
                         params![new_obj_id, acc, target_year.to_string()],
                         |r| r.get(0)
                     ).unwrap_or(0.0);

                     let previous_balance: f64 = conn.query_row(
                        "SELECT SUM(net_amount) FROM entity_event WHERE source_object_id = ?1 AND account_code = ?2 AND strftime('%Y', event_date) = ?3",
                        params![new_obj_id, acc, prev_year_data.0.to_string()],
                        |r| r.get(0)
                    ).unwrap_or(0.0);

                     let absolute_money_delta = (current_balance - previous_balance).abs();
                     let exposure_amount = absolute_money_delta * 0.005; // 0.5% of the money that actually shifted in balance
                     
                     // [FIX] Fetch Account Name for readability
                     let acc_name: String = conn.query_row(
                         "SELECT account_name FROM entity_event WHERE source_object_id = ?1 AND account_code = ?2 LIMIT 1",
                         params![new_obj_id, acc],
                         |r| r.get(0)
                     ).unwrap_or(acc.to_string());

                     // Identify the "Dominant Player" (entity with max share in the latest period)
                     let dominant_entity: String = conn.query_row(
                         "SELECT entity_id FROM entity_event WHERE source_object_id = ?1 AND account_code = ?2 AND strftime('%Y', event_date) = ?3 GROUP BY entity_id ORDER BY SUM(ABS(net_amount)) DESC LIMIT 1",
                         params![new_obj_id, acc, target_year.to_string()],
                         |r| r.get(0)
                     ).unwrap_or_else(|_| "Unknown Player".to_string());

                     let latest_share = cr1_vec.last().unwrap_or(&0.0) * 100.0;
                     let observation = format!("[Flux Alert] '{}년' 계정 '{} ({})'에서 상당한 구조적 변화({})가 감지되었습니다. 주요 요인: '{}' (점유율: {:.1}%). 변동 위험 노출: ₩{}", 
                        target_year, acc_name, acc, signature, dominant_entity, latest_share, num_format::ToFormattedString::to_formatted_string(&(exposure_amount as i64), &num_format::Locale::en));
                     
                     // [DYNAMIC SCORING] Calculate score based on delta intensity
                     let base_score = (last_delta * 1.5).min(0.95).max(0.6);
                     let final_score = if latest_share > 90.0 { (base_score + 0.1).min(1.0) } else { base_score };

                  let sig_id = uuid::Uuid::new_v4().to_string();
                  let metadata = serde_json::json!({ 
                      "account": acc,
                      "account_name": acc_name, 
                      "signature": signature, 
                      "dominant_entity": dominant_entity,
                      "share_pct": latest_share,
                      "delta": last_delta,
                      "amount": exposure_amount,
                      "total_volume": current_balance,
                      "fiscal_year": target_year,
                      "confidence": if last_delta > 0.6 { "High" } else { "Medium" },
                      "detection_method": "FluxV2:SequentialBreak"
                  }).to_string();
                  
                  conn.execute(
                     "INSERT INTO risk_signal (id, object_id, project_id, signal_type, description, score, related_ids, metadata) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                     params![
                         sig_id,
                         new_obj_id,
                         project_id,
                         "FLUX:STRUCTURAL_BREAK",
                         observation,
                         final_score,
                         "[]",
                         metadata
                     ]
                 ).ok();
            }
        }
    } // End of Phase 4 loop (accounts_in_obj)
    
    // [PHASE 6] Risk Correlation Engine (Cross-Modal Intelligence)
    println!(">>> [PHASE 6] Executing Risk Correlation Engine...");
    
    // 1. Fetch high-score structural signals for correlation
    let structural_signals = {
        let mut stmt = conn.prepare("SELECT id, description, score, metadata FROM risk_signal WHERE object_id = ?1 AND score > 0.7").context("Failed to prepare signal fetch")?;
        let rows = stmt.query_map(params![new_obj_id], |r| -> SqlResult<(String, String, f64, String)> {
            Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?))
        })?;
        let mut v = Vec::new();
        for r in rows { if let Ok(s) = r { v.push(s); } }
        v
    };

    // 2. Identify relevant communications (Emails)
    let communications: Vec<&crate::models::EntityEvent> = all_events.iter()
        .filter(|e| e.source_type.as_ref().map(|s| s == "EMAIL" || s == "DOC").unwrap_or(false))
        .collect();

    let risk_keywords = vec!["urgent", "emergency", "bypass", "manual", "cash", "confidential", "delete", "긴급", "우회", "현금", "삭제"];

    for (sig_id, _desc, score, meta_str) in structural_signals {
        let mut found_context = false;
        let mut evidence = String::new();

        // Check if any email correlates with this structural risk
        for comm in &communications {
            let comm_body = comm.description.to_lowercase();
            let comm_meta = comm.metadata.as_ref().map(|m| m.to_lowercase()).unwrap_or_default();
            
            // Heuristic: Does email mention the structural risk description or risk keywords?
            let has_keyword = risk_keywords.iter().any(|&k| comm_body.contains(k) || comm_meta.contains(k));
            
            if has_keyword {
                found_context = true;
                evidence = format!("Correlated with event '{}' ({})", comm.id, comm.description);
                break;
            }
        }

        if found_context {
            println!(">>> [PHASE 6] Hybrid Correlation Found for signal: {}", sig_id);
            
            // A. Create Correlation Signal
            let corr_id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO correlation_signal (id, object_id, account_code, structural_score, contextual_flag, final_priority, evidence_summary) 
                 VALUES (?1, ?2, 'N/A', ?3, 1, ?4, ?5)",
                params![corr_id, new_obj_id, score, score + 0.2, evidence]
            ).ok();

            // B. Adjust RiskSignal priority (Bump score in metadata but don't auto-confirm)
            let mut meta_v: serde_json::Value = serde_json::from_str(&meta_str).unwrap_or(serde_json::json!({}));
            meta_v["correlation_escalated"] = serde_json::json!(true);
            meta_v["correlation_evidence"] = serde_json::json!(evidence);
            meta_v["final_priority_score"] = serde_json::json!(score + 0.2);

            conn.execute(
                "UPDATE risk_signal SET score = MIN(1.0, score + 0.15), metadata = ?1 WHERE id = ?2",
                params![meta_v.to_string(), sig_id]
            ).ok();
        }
    }

    // [INTELLIGENCE Final] Case Elevation Trigger
    let _ = elevate_to_case_candidates(&conn, project_id);

    Ok(())
}

#[allow(dead_code)]
pub async fn run_generic_ai_audit(
    _target_files: Vec<(String, String)>,
    _reference_files: Vec<(String, String)>,
    _project_type: &str,
    _db_path: &PathBuf,
    _app_handle: &AppHandle,
    _api_key: &str,
    _enable_masking: bool,
    _external_context: Option<String>
) -> EngineResult<()> {
    println!(">>> [AuditEngine] Generic AI audit handled via commands/ai_detection.");
    Ok(())
}

/// [Analysis Filter] Checks if an account code warrants deep structural inspection
fn is_analytically_significant(code: &str) -> bool {
    // 1. P&L Accounts (Revenue, Cost, Expense)
    if code.starts_with('4') || code.starts_with('5') || code.starts_with('8') { return true; }

    // 2. High-Risk Balance Sheet Items (Watch List Accounts)
    let watch_list = [
        "141", // Temporary payment (가지급금)
        "258", // Suspense account (가수금)
        "121", // Accounts receivable (미수금) - often carries manual adjustments
        "251", // Accounts Payable (매입채무)
        "253", // Accrued Expenses (미지급금)
        "257", // Deposit Received (예수금)
        "255", // Unearned Revenue (선수수익)
    ];

    if watch_list.iter().any(|&w| code.starts_with(w)) {
        return true;
    }

    // 3. Fallback: If it's something unidentified but not Cash (101/103) or Equity (3xxx)
    if code.starts_with("101") || code.starts_with("103") || code.starts_with('3') {
        return false;
    }

    // By default, capture it for now if we're unsure, but prioritizing the above.
    false 
}
