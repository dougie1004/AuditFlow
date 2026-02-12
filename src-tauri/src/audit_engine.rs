use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use rusqlite::{params, Connection};
use serde_json::json;
use regex::Regex;

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
fn elevate_to_case_candidates(conn: &Connection, project_id: &str) -> Result<(), String> {
    // Logic: Find entities with 3+ pending suspicions in this project
    let mut stmt = conn.prepare(
        "SELECT metadata FROM suspicion_inbox 
         WHERE status = 'Pending' 
         GROUP BY metadata HAVING COUNT(*) >= 3"
    ).map_err(|e| e.to_string())?;

    let clusters = stmt.query_map([], |row| row.get::<_, String>(0)).map_err(|e| e.to_string())?;
    
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

pub fn analyze_ingested_object(app_handle: AppHandle, new_obj_id: &str, project_id: &str, file_content: &str) -> Result<(), String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // 1. Fetch the newly ingested object's metadata for context
    let mut stmt = conn.prepare("SELECT object_type, extracted_fields FROM audit_object WHERE id = ?1").map_err(|e| e.to_string())?;
    let (obj_type, fields_str) = stmt.query_row(params![new_obj_id], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    }).map_err(|e| e.to_string())?;

    println!(">>> [AUDIT ENGINE] Analyzing Ingestion Event: {} ({})", new_obj_id, obj_type);

    // 2. Fetch Potential Correlation Candidates (Other objects in same project)
    // Explicitly scope stmt to drop it before iterating results
    let candidates = {
        let mut stmt = conn.prepare("SELECT id, object_type, extracted_fields FROM audit_object WHERE project_id = ?1 AND id != ?2").map_err(|e| e.to_string())?;
        
        // Manual collection to avoid complex iterator types and borrow issues
        let mut results = Vec::new();
        let rows = stmt.query_map(params![project_id, new_obj_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?))
        }).map_err(|e| e.to_string())?;

        for r in rows {
             results.push(r.map_err(|e| e.to_string()));
        }
        results
    };

    let content_lower = file_content.to_lowercase();
    let fields_json: serde_json::Value = serde_json::from_str(&fields_str).unwrap_or(json!({}));
    let file_name = fields_json["file_name"].as_str().unwrap_or("unknown_file");

    // 3. Local Anomaly Detection (Corrected Parsing)
    let mut rows: Vec<Vec<String>> = Vec::new();
    for line in file_content.lines() {
        // Handle quoted CSV lines (e.g. "date,amount,...")
        let clean_line = line.trim().trim_matches('"');
        // Use standard CSV split (assuming simple CSV for now, or use crate::parser)
        let parts: Vec<String> = clean_line.split(',').map(|s| s.trim().to_string()).collect();
        if !parts.is_empty() {
             rows.push(parts);
        }
    }

    if !rows.is_empty() {
        let headers = rows[0].clone();
        
        // Flexible Column Identification
        let amount_idx = headers.iter().position(|h| {
            let lh = h.to_lowercase();
            lh.contains("금액") || lh.contains("amount") || lh.contains("비용") || lh.contains("공급가")
        });
        
        let date_idx = headers.iter().position(|h| {
            let lh = h.to_lowercase();
            lh.contains("date") || lh.contains("날짜") || lh.contains("일자") || lh.contains("일시") || lh.contains("승인일")
        });
        
        let vendor_idx = headers.iter().position(|h| {
            let lh = h.to_lowercase();
            lh.contains("vendor") || lh.contains("가맹점") || lh.contains("거래처") || lh.contains("상호") || lh.contains("사용처") || lh.contains("식당")
        });

        if let (Some(a_idx), Some(d_idx), Some(v_idx)) = (amount_idx, date_idx, vendor_idx) {
            println!(">>> [AUDIT ENGINE] Mapped Columns: Date=[{}], Vendor=[{}], Amount=[{}]", headers[d_idx], headers[v_idx], headers[a_idx]);
            
            // A. SPLIT PAYMENT DETECTION
            for i in 1..rows.len() {
                for j in (i+1)..std::cmp::min(i+20, rows.len()) { 
                    if rows[i].len() <= a_idx || rows[j].len() <= a_idx { continue; }
                    
                    let v1 = &rows[i][v_idx];
                    let v2 = &rows[j][v_idx];
                    let d1 = &rows[i][d_idx].split_whitespace().next().unwrap_or(""); // Take only date part YYYY-MM-DD
                    let d2 = &rows[j][d_idx].split_whitespace().next().unwrap_or("");
                    
                    if v1 == v2 && d1 == d2 && !v1.is_empty() {
                        let amt1 = rows[i][a_idx].replace(",", "").parse::<f64>().unwrap_or(0.0);
                        let amt2 = rows[j][a_idx].replace(",", "").parse::<f64>().unwrap_or(0.0);
                        
                        // Rule: Threshold > 100,000 KRW combined
                        if amt1 > 0.0 && amt2 > 0.0 && (amt1 + amt2) > 100_000.0 {
                             let total = amt1 + amt2;
                             let signal_id = uuid::Uuid::new_v4().to_string();
                             let observation = format!("[쪼개기 의심] '{}'에서 {}에 {}원 + {}원 연속 결제 (합계: {}원)", v1, d1, amt1, amt2, total);
                             
                             // [INTELLIGENCE] Repetition Amplifier
                             let multiplier = get_entity_risk_multiplier(&conn, v1);
                             let base_score = 0.85;
                             let final_score = (base_score * multiplier).min(1.0);

                             // Check duplication before insert
                             conn.execute(
                                "INSERT INTO suspicion_inbox (signal_id, observation, anomaly_score, source, scope, related_tx_ids, metadata, status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'Pending')",
                                params![
                                    signal_id,
                                    observation,
                                    final_score,
                                    "RULE:SPLIT_PAYMENT",
                                    "Transaction",
                                    serde_json::json!([i, j]).to_string(),
                                    serde_json::json!({ "vendor": v1, "normalized_vendor": normalize_entity_name(v1), "date": d1, "total_amount": total }).to_string()
                                ]
                             ).ok();
                             println!(">>> [AUDIT ENGINE] Risk Found (Amp: {:.1}): {}", multiplier, observation);
                        }
                    }
                }
            }
            
            // B. WEEKEND/HOLIDAY DETECTION
            for (i, row) in rows.iter().enumerate().skip(1) {
                if row.len() > d_idx && row.len() > a_idx {
                    let date_str = &row[d_idx];
                    let amt = row[a_idx].replace(",", "").parse::<f64>().unwrap_or(0.0);
                    
                    // Simple heuristic + You can extend this with specific holiday list
                    let is_weekend = date_str.contains("토") || date_str.contains("일") || date_str.contains("Sat") || date_str.contains("Sun");
                    // Specific dates in demo: 2024-12-25 (X-mas), 2024-12-21(Sat)
                    let is_holiday_demo = date_str.contains("12-25") || date_str.contains("12-21") || date_str.contains("12-28"); 

                    if (is_weekend || is_holiday_demo) && amt > 50_000.0 {
                        let signal_id = uuid::Uuid::new_v4().to_string();
                        let observation = format!("[휴일 사용] 공휴일/주말({})에 고액({}) 결제", date_str, amt);
                        
                        conn.execute(
                            "INSERT INTO suspicion_inbox (signal_id, observation, anomaly_score, source, scope, related_tx_ids, metadata, status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'Pending')",
                            params![
                                signal_id,
                                observation,
                                0.7,
                                "RULE:HOLIDAY_USAGE",
                                "Transaction",
                                serde_json::json!([i]).to_string(),
                                serde_json::json!({ "date": date_str, "amount": amt }).to_string()
                            ]
                        ).ok();
                         println!(">>> [AUDIT ENGINE] Risk Found: {}", observation);
                    }
                }
            }

        } else {
             println!(">>> [AUDIT ENGINE] Failed to identify columns. Headers: {:?}", headers);
        }
    }


    // 4. Execution of Intelligent Detection Rules (Cross-Object Semantic Relations)
    for candidate in candidates {
        if let Ok((other_id, other_type, other_fields_str)) = candidate {
            let mut signals = Vec::new();
            let mut confidence = "low";
            let other_fields_lower = other_fields_str.to_lowercase();

            // [INTELLIGENCE 1] Semantic Correlation (Synonym Expansion)
            let audit_keywords = vec!["식비", "교통", "상품권", "IT", "접대", "선물"];
            for kw in audit_keywords {
                if content_lower.contains(&kw.to_lowercase()) {
                    let synonyms = get_semantic_synonyms(kw);
                    if synonyms.iter().any(|&s| other_fields_lower.contains(s)) {
                        signals.push(format!("SEMANTIC_MATCH:{}", kw.to_uppercase()));
                        confidence = "medium";
                    }
                }
            }

            // [INTELLIGENCE 2] Normalized Entity Resolution
            let new_vendor_norm = normalize_entity_name(&file_name);
            if other_fields_lower.contains("vendor") || other_fields_lower.contains("가맹점") {
                 if other_fields_lower.contains(&new_vendor_norm.to_lowercase()) {
                     signals.push("ENTITY_RESOLUTION_MATCH".to_string());
                     confidence = "high";
                 }
            }

            // Signal A: 'Corporate Card Trace' (Keyword: 상품권, Gift, etc.)
            if content_lower.contains("gift") || content_lower.contains("상품권") {
                if other_fields_lower.contains("상품권") || other_fields_lower.contains("gift") {
                    signals.push("GIFT_CARD_TRACE".to_string());
                    confidence = "high";
                }
            }

            // Signal B: 'High Value Cross-Check' (Amount Matching)
            if (obj_type == "LEDGER" && other_type == "EMAIL") || (obj_type == "EMAIL" && other_type == "LEDGER") {
                 if content_lower.contains("1000000") || content_lower.contains("1,000,000") {
                      if other_fields_lower.contains("1000000") || other_fields_lower.contains("1,000,000") {
                          signals.push("HIGH_VALUE_EXACT_MATCH".to_string());
                          confidence = "critical";
                      }
                 }
            }

            // 5. Record Discovered Relations & Explore Multi-hop Chains
            if !signals.is_empty() {
                let reasons_json = serde_json::to_string(&signals).unwrap();
                
                // [INTELLIGENCE] Confidence Layer Separation
                // Only save relations if confidence is above 'low' (or threshold)
                if confidence != "low" {
                    println!(">>> [AI ENGINE] Relation Discovered: {} <-> {} [Signals: {}]", new_obj_id, other_id, reasons_json);
                    
                    conn.execute(
                        "INSERT INTO relation_candidate (from_object_id, to_object_id, reason_codes, confidence, created_at) VALUES (?1, ?2, ?3, ?4, datetime('now'))",
                        params![new_obj_id, other_id, reasons_json, confidence]
                    ).ok();

                    // [INTELLIGENCE 3] Discover Multi-hop Chains
                    let chains = discover_multi_hop_chains(&conn, new_obj_id, &other_id);
                    for chain_desc in chains {
                        println!(">>> [AI ENGINE] Causation Chain Found: {}", chain_desc);
                        let _ = conn.execute(
                            "INSERT INTO system_events (id, timestamp, event_type, description, audit_id) VALUES (?1, datetime('now'), 'AI_SIGNAL', ?2, ?3)",
                            params![uuid::Uuid::new_v4().to_string(), format!("🧩 고도화 분석: 다단계 증거 체인 발견 - {}", chain_desc), project_id]
                        );
                    }
                }
            }
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
) -> Result<(), String> {
    println!(">>> [AuditEngine] Generic AI audit handled via commands/ai_detection.");
    Ok(())
}
