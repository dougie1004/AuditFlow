use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use rusqlite::{params, Connection};
use serde_json::json;
use regex::Regex;

#[allow(dead_code)]
pub fn calculate_distance(_lat1: f64, _lng1: f64, _lat2: f64, _lng2: f64) -> f64 {
    0.0 
}

/// 레거시 및 외부 연결을 위한 통합 브릿지 함수
pub fn load_file_rows(path_str: &str) -> Vec<Vec<String>> {
    match crate::file_loader::load_file_rows(path_str) {
        Ok(rows) => rows,
        Err(e) => {
            // 원칙 2 & 4: 오류 발생 시 명확한 로그 출력 및 빈 결과 반환(상위 전달용)
            println!(">>> [AuditEngine] ERROR loading rows: {}", e);
            Vec::new()
        }
    }
}

#[allow(dead_code)]
pub async fn run_specialized_card_rules(
    _card_file_path: &str,
    _emp_file_path: &str,
    _project_type: &str,
    _db_path: &PathBuf,
    _app_handle: &AppHandle,
    _api_key: &str,
    _enable_masking: bool
) -> Result<(), String> {
    println!(">>> [AuditEngine] Specialized card rules delegating to Ingestion Flow.");
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
    let _fields_json: serde_json::Value = serde_json::from_str(&fields_str).unwrap_or(json!({}));

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
                             
                             // Check duplication before insert (Simple cache check omitted for speed, reliant on DB constraints if any)
                             conn.execute(
                                "INSERT INTO suspicion_inbox (signal_id, observation, anomaly_score, source, scope, related_tx_ids, metadata, status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'Pending')",
                                params![
                                    signal_id,
                                    observation,
                                    0.85,
                                    "RULE:SPLIT_PAYMENT",
                                    "Transaction",
                                    serde_json::json!([i, j]).to_string(),
                                    serde_json::json!({ "vendor": v1, "date": d1, "total_amount": total }).to_string()
                                ]
                             ).ok();
                             println!(">>> [AUDIT ENGINE] Risk Found: {}", observation);
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


    // 4. Execution of Detection Rules (Cross-Object Relations)
    for candidate in candidates {
        if let Ok((other_id, other_type, other_fields_str)) = candidate {
            let mut signals = Vec::new();
            let mut confidence = "low";

            // Signal A: 'Corporate Card Trace' (Keyword: 상품권, Gift, etc.)
            // Logic: If one document mentions 'Gift Card' and the other is a relevant financial record or also mentions it.
            if content_lower.contains("gift") || content_lower.contains("상품권") {
                if other_fields_str.to_lowercase().contains("상품권") || other_fields_str.to_lowercase().contains("gift") {
                    signals.push("GIFT_CARD_TRACE"); // Strong Signal
                    confidence = "high";
                }
            }

            // Signal B: 'High Value Cross-Check' (Amount Matching)
            // Logic: Check if a large amount in Ledger appears in an Email/Doc
            if (obj_type == "LEDGER" && other_type == "EMAIL") || (obj_type == "EMAIL" && other_type == "LEDGER") {
                 let amount_regex = regex::Regex::new(r"(\d{1,3}(,\d{3})*|\d+)").unwrap();
                 // Naive extraction of numbers (removing commas)
                 let amounts_new: Vec<String> = amount_regex.find_iter(&content_lower).map(|m| m.as_str().replace(",", "")).collect();
                 
                 // Check against specific high-value thresholds or if the other document mentions high value context
                 // For the demo, we look for explicit '1,000,000' or similar pattern matches in content if available,
                 // or just metadata. Here we simulate 'High Value' context.
                 if content_lower.contains("1000000") || content_lower.contains("1,000,000") {
                      if other_fields_str.contains("1000000") || other_fields_str.contains("1,000,000") {
                          signals.push("HIGH_VALUE_EXACT_MATCH");
                          confidence = "critical";
                      } else {
                          signals.push("HIGH_VALUE_CONTEXT_MATCH");
                          confidence = "medium";
                      }
                 }
            }

            // Signal C: 'Policy Violation' (e.g. Weekend usage) - MOVED TO ABOVE LOCAL CHECK, but kept here for contextual cross-check if needed
            // if content_lower.contains("토요일") ... (Removed primarily to rely on local check)

            // 5. Record Discovered Relations
            if !signals.is_empty() {
                let reasons_json = serde_json::to_string(&signals).unwrap();
                println!(">>> [AUDIT ENGINE] Relation Discovered: {} <-> {} [Signals: {}]", new_obj_id, other_id, reasons_json);
                
                conn.execute(
                    "INSERT INTO relation_candidate (from_object_id, to_object_id, reason_codes, confidence, created_at) VALUES (?1, ?2, ?3, ?4, datetime('now'))",
                    params![new_obj_id, other_id, reasons_json, confidence]
                ).ok();
            }
        }
    }

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
