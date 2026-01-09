use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use serde_json::{json, Value};
use rusqlite::{params, Connection};
use calamine::{open_workbook_auto, Reader};
use crate::file_utils::{read_any_file, read_file_with_encoding, compress_excel_data, compress_csv_data, geocode_address, MaskingSession, mask_sensitive_data};
use tauri::{AppHandle, Emitter};

pub fn calculate_distance(lat1: f64, lng1: f64, lat2: f64, lng2: f64) -> f64 {
    let r: f64 = 6371.0;
    let d_lat = (lat2 - lat1).to_radians();
    let d_lng = (lng2 - lng1).to_radians();
    let a = (d_lat / 2.0).sin().powi(2) + lat1.to_radians().cos() * lat2.to_radians().cos() * (d_lng / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());
    r * c
}

pub fn parse_csv_line(line: &str) -> Vec<String> {
    let mut result = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    for c in line.chars() {
        if c == '"' { in_quotes = !in_quotes; }
        else if c == ',' && !in_quotes {
            result.push(current.trim().to_string());
            current.clear();
        } else { current.push(c); }
    }
    result.push(current.trim().to_string());
    result
}

pub fn load_file_rows(path_str: &str) -> Vec<Vec<String>> {
    let path = Path::new(path_str);
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    
    if ext == "xlsx" || ext == "xls" {
        if let Ok(mut workbook) = open_workbook_auto(path) {
            if let Some((_, range)) = workbook.worksheets().first() {
                return range.rows().map(|row| {
                    row.iter().map(|c| c.to_string()).collect()
                }).collect();
            }
        }
    } else if ext == "csv" || ext == "txt" || ext == "log" {
         if let Ok(content) = read_file_with_encoding(path) {
             return content.lines().map(|line| parse_csv_line(line)).collect();
         }
    } else {
        // Binary files (PDF, DOCX) or unsupported types should NOT be read as text lines here.
        // They are handled by read_any_file in the AI loop, but load_file_rows is for structured data rules.
        println!(">>> [WARN] load_file_rows skipping non-structured file: {}", path_str);
    }
    Vec::new()
}

pub async fn run_specialized_card_rules(
    card_file_path: &str,
    emp_file_path: &str,
    project_type: &str,
    db_path: &PathBuf,
    app_handle: &AppHandle,
    api_key: &str,
    _enable_masking: bool
) -> Result<(), String> {
    app_handle.emit("analysis-progress", json!({
        "progress": 15,
        "message": "법인카드 사용 내역 정밀 분석 시작...",
        "step": 1
    })).ok();

    // 1. Load Employee Data IF AVAILABLE
    let mut emp_home_map: std::collections::HashMap<String, (f64, f64)> = std::collections::HashMap::new();
    if !emp_file_path.is_empty() {
        let emp_rows = load_file_rows(emp_file_path);
        if !emp_rows.is_empty() {
            let mut name_idx = 0;
            let mut addr_idx = 4;
            let mut lat_idx: i32 = -1;
            let mut lng_idx: i32 = -1;
            for (i, parts) in emp_rows.iter().enumerate() {
                if i == 0 {
                    for (idx, header) in parts.iter().enumerate() {
                        if header.contains("성명") || header.contains("Name") { name_idx = idx; }
                        if header.contains("주소") || header.contains("Address") || header.contains("거주지") { addr_idx = idx; }
                        if header == "lat" || header.contains("위도") || header == "latitude" { lat_idx = idx as i32; }
                        if header == "lng" || header.contains("경도") || header == "longitude" || header == "lon" { lng_idx = idx as i32; }
                    }
                    continue;
                }
                if parts.len() > std::cmp::max(name_idx, addr_idx) {
                    let name = parts[name_idx].trim().to_string();
                    let addr = parts[addr_idx].trim().to_string();
                    if !name.is_empty() && !addr.is_empty() && !emp_home_map.contains_key(&name) {
                        let mut lat = if lat_idx >= 0 && parts.len() > lat_idx as usize { parts[lat_idx as usize].parse::<f64>().unwrap_or(0.0) } else { 0.0 };
                        let mut lng = if lng_idx >= 0 && parts.len() > lng_idx as usize { parts[lng_idx as usize].parse::<f64>().unwrap_or(0.0) } else { 0.0 };

                        if lat == 0.0 && lng == 0.0 {
                            if let Some((g_lat, g_lng, _)) = geocode_address(&addr, api_key).await {
                                lat = g_lat; lng = g_lng;
                            }
                        }
                        if lat != 0.0 && lng != 0.0 {
                            emp_home_map.insert(name, (lat, lng));
                        }
                    }
                }
            }
        }
    }

    // 2. Load Card Data & Analyze
    let card_rows = load_file_rows(card_file_path);
    println!(">>> [TRACE] Card rows loaded: {}", card_rows.len());
    if card_rows.is_empty() { return Ok(()); }

    let mut store_idx = -1;
    let mut date_idx = -1;
    let mut addr_idx = -1;
    let mut amt_idx = -1;
    let mut user_idx = -1;
    let mut lat_idx = -1;
    let mut lng_idx = -1;
    let mut transactions = Vec::new();
    let mut geo_cache: std::collections::HashMap<String, (f64, f64, String)> = std::collections::HashMap::new();

    for (i, parts) in card_rows.iter().enumerate() {
        if i == 0 {
            for (idx, header) in parts.iter().enumerate() {
                let h = header.to_lowercase();
                if h.contains("가맹점") || h.contains("상호") || h.contains("store") || h.contains("merchant") || h.contains("vend") { store_idx = idx as i32; }
                if h.contains("일시") || h.contains("일자") || h.contains("date") || h.contains("time") || h.contains("승인일") { date_idx = idx as i32; }
                if h.contains("주소") || h.contains("addr") || h.contains("location") || h.contains("위치") { addr_idx = idx as i32; }
                if h.contains("금액") || h.contains("amount") || h.contains("승인금") || h.contains("합계") || h.contains("price") { amt_idx = idx as i32; }
                if (h.contains("사용자") || h.contains("user") || h.contains("성명") || h.contains("소유자") || h.contains("성함")) && !h.contains("업종") { user_idx = idx as i32; }
                if h == "lat" || h.contains("위도") || h == "latitude" { lat_idx = idx as i32; }
                if h == "lng" || h.contains("경도") || h == "longitude" || h == "lon" { lng_idx = idx as i32; }
            }
            continue;
        }

        if store_idx >= 0 && date_idx >= 0 && amt_idx >= 0 {
            let p_len = parts.len() as i32;
            if p_len > store_idx && p_len > date_idx && p_len > amt_idx {
                let store_name = parts[store_idx as usize].trim().to_string();
                let date_str = parts[date_idx as usize].trim().to_string();
                let store_addr = if addr_idx >= 0 && p_len > addr_idx { parts[addr_idx as usize].trim().to_string() } else { "주소미상".to_string() };
                let amt_str = parts[amt_idx as usize].trim().replace(",", "").replace("₩", "").replace("\"", ""); 
                let amount = if let Ok(f_val) = amt_str.parse::<f64>() { f_val as i64 } else { amt_str.parse::<i64>().unwrap_or(0) }; 
                let user_name = if user_idx >= 0 && p_len > user_idx { parts[user_idx as usize].trim().to_string() } else { "미확인 사용자".to_string() };

                if amount > 0 {
                    let mut lat = if lat_idx >= 0 && p_len > lat_idx { parts[lat_idx as usize].parse::<f64>().unwrap_or(37.5) } else { 37.5 };
                    let mut lng = if lng_idx >= 0 && p_len > lng_idx { parts[lng_idx as usize].parse::<f64>().unwrap_or(127.0) } else { 127.0 };
                    let query_addr = if store_addr == "주소미상" || store_addr.is_empty() { &store_name } else { &store_addr };

                    if lat == 37.5 && lng == 127.0 {
                        let geo_result = if let Some(cached) = geo_cache.get(query_addr) {
                            Some(cached.clone())
                        } else {
                            if let Some(res) = geocode_address(query_addr, api_key).await {
                                geo_cache.insert(query_addr.clone(), res.clone());
                                Some(res)
                            } else { None }
                        };
                        if let Some((l, g, _)) = geo_result { lat = l; lng = g; }
                    }

                    // Rule A: Home Vicinity
                    if let Some(home_coords) = emp_home_map.get(&user_name) {
                        let dist = calculate_distance(home_coords.0, home_coords.1, lat, lng);
                        if dist < 1.0 {
                            let (hl, hg) = home_coords;
                            let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
                            let clean_raw = format!("{}|{}|{}|{}|{}|{}|{}|{}|{}|{}", date_str, store_name, store_addr, amount, user_name, lat, lng, hl, hg, "자택 주소");
                            let _ = conn.execute(
                                "INSERT INTO audit_issues (project_type, issue_title, description, severity, raw_row_data, row_index, recommendations, evidence_quote, audit_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)", 
                                params![&project_type, "[Rule A] 자택 인근 사용", format!("거주지 반경 {:.2}km 이내 결제 탐지", dist), "High", clean_raw, i as i64, "업무 관련성 소명 요청", store_addr, &project_type]
                            );
                        }
                    }
                    transactions.push((store_name, date_str, amount, i, store_addr, user_name, lat, lng));
                }
            }
        }
    }

    // Rule B: Split Payment
    let mut map: std::collections::HashMap<(String, String), (i64, f64, f64, String, String)> = std::collections::HashMap::new();
    for (store, date, amt, _idx, addr, user, lat, lng) in &transactions {
        let day = if date.len() >= 10 { &date[0..10] } else { date };
        let entry = map.entry((store.clone(), day.to_string())).or_insert((0, *lat, *lng, addr.clone(), user.clone()));
        entry.0 += amt;
    }
    
    for ((store, day), (total, lat, lng, s_addr, s_user)) in map {
        if total >= 100000 {
            let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
            let clean_raw = format!("{}|{}|{}|{}|{}|{}|{}", day, store, s_addr, total, s_user, lat, lng);
            let _ = conn.execute(
                "INSERT INTO audit_issues (project_type, issue_title, description, severity, raw_row_data, row_index, recommendations, evidence_quote, audit_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)", 
                params![&project_type, "[Rule B] 분할 결제 의심", format!("동일 가맹점({}) 단시간 내 합산 금액 {}원", store, total), "Medium", clean_raw, 0, "상세 영수증 및 결제 사유서 제출 요청", "N/A", &project_type]
            );
        }
    }

    Ok(())
}

pub async fn run_generic_ai_audit(
    target_files: Vec<(String, String)>,
    reference_files: Vec<(String, String)>,
    project_type: &str,
    db_path: &PathBuf,
    app_handle: &AppHandle,
    api_key: &str,
    enable_masking: bool,
    external_context: Option<String>
) -> Result<(), String> {
    let mut context_knowledge = String::new();
    if let Some(ctx) = external_context {
        context_knowledge.push_str("\n[FRONTEND PROVIDED CONTEXT (Multi-Sheet Data & Guidelines)]:\n");
        context_knowledge.push_str(&ctx);
        context_knowledge.push_str("\n\n");
    }
    
    if reference_files.is_empty() {
        if let Ok(conn) = Connection::open(db_path) {
            let mut stmt = conn.prepare("SELECT category, name, risk_level FROM custom_scenarios WHERE origin_audit_type = '시스템 마스터' ORDER BY category").unwrap();
            let mut scenarios_by_cat: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();
            
            let rows = stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, String>(2)?))).unwrap();
            for r in rows {
                if let Ok((cat, name, _risk)) = r {
                    scenarios_by_cat.entry(cat).or_default().push(name);
                }
            }
            
            context_knowledge.push_str("\n[Global Audit Master Scenarios (Base Knowledge)]:\n");
            for (cat, names) in scenarios_by_cat {
                context_knowledge.push_str(&format!("- {}: {}\n", cat, names.join(", ")));
            }
            context_knowledge.push_str("\n\n");
        } else {
            context_knowledge.push_str("
            [기본 감사 가이드라인 (Fallback)]:
            1. 공휴일/주말 거래 중 고액 또는 비정상 업종 탐지.
            2. 동일 금액의 반복 결제 (쪼개기 결제).
            3. 심야 시간대(22시 이후) 유흥/주점 거래.
            4. 품의 결재 없는 고액 자산 구입 의심.
            5. 거래처와 임직원 간의 유공/유착 징후 탐지.
            ");
        }
    }

    for (f_path, f_name) in reference_files {
        if let Ok(content) = read_any_file(Path::new(&f_path), &Path::new(&f_path).extension().and_then(|e| e.to_str()).unwrap_or("")) {
            context_knowledge.push_str(&format!("\n--- [Reference File: {}] ---\n", f_name));
            context_knowledge.push_str(&content);
        }
        if context_knowledge.len() > 50000 { break; }
    }



    // [RAG] External Knowledge Injection
    if let Ok(conn) = Connection::open(db_path) {
        if let Ok(mut stmt) = conn.prepare("SELECT category, title, content_text FROM audit_knowledge_base ORDER BY id DESC LIMIT 5") {
            if let Ok(rows) = stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, String>(2)?))) {
                context_knowledge.push_str("\n\n[LATEST AUDIT KNOWLEDGE & CASES (RAG System)]:\n");
                for r in rows {
                    if let Ok((cat, title, content)) = r {
                        // Truncate content slightly if too long to save tokens
                        let display_content = if content.len() > 1000 { format!("{}...", &content[..1000]) } else { content };
                        context_knowledge.push_str(&format!("- [{}] {}: {}\n", cat, title, display_content));
                    }
                }
            }
        }
    }

    // [SaaS Intelligence] Global Risk Patterns
    if let Ok(conn) = Connection::open(db_path) {
        if let Ok(mut stmt) = conn.prepare("SELECT pattern_signature, industry_sector, frequency_count FROM global_risk_patterns ORDER BY frequency_count DESC LIMIT 5") {
             if let Ok(rows) = stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, i32>(2)?))) {
                context_knowledge.push_str("\n\n[GLOBAL FRAUD PATTERNS (SaaS Intelligence)]:\nConsider these common high-risk patterns detected across the system:\n");
                for r in rows {
                    if let Ok((sig, sector, freq)) = r {
                        context_knowledge.push_str(&format!("- [{}] Pattern: '{}' (Detected {} times)\n", sector, sig, freq));
                    }
                }
             }
        }
    }

    let shared_context = Arc::new(context_knowledge);
    let masking_session = Arc::new(Mutex::new(MaskingSession::new()));
    let mut tasks = Vec::new();

    for (f_path, f_name) in target_files {
        let path_owned = f_path.clone();
        let name_owned = f_name.clone();
        let _context_clone = Arc::clone(&shared_context);
        let app_handle_inner = app_handle.clone();
        let session_clone = Arc::clone(&masking_session);

        tasks.push(tokio::spawn(async move {
            let path = Path::new(&path_owned);
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
            println!(">>> [TRACE] Processing target file: {} (extension: {})", name_owned, ext);
            let all_rows = match ext.as_str() {
                "xlsx" | "xls" => {
                     match open_workbook_auto(path) {
                        Ok(mut workbook) => {
                            if let Some((_, range)) = workbook.worksheets().first() {
                                compress_excel_data(range).1
                            } else { Vec::new() }
                        }, Err(e) => { println!(">>> [ERROR] Excel open fail: {}", e); Vec::new() },
                     }
                },
                "csv" => {
                    read_file_with_encoding(path).map(|c| compress_csv_data(c).1).unwrap_or_else(|e| { println!(">>> [ERROR] CSV read fail: {}", e); Vec::new() })
                },
                _ => { // Consolidated all other file types into a generic text read fallback
                    println!(">>> [WARN] Unknown extension '{}', attempting text read fallback...", ext);
                    if let Ok(content) = read_any_file(path, &ext) { // Use read_any_file for robust handling
                        vec![content]
                    } else {
                        println!(">>> [ERROR] Doc read fail or unknown extension read fail: {}", name_owned);
                        Vec::new()
                    }
                }
            };

            println!(">>> [TRACE] Total rows to analyze in {}: {}", name_owned, all_rows.len());
            if all_rows.is_empty() { return Vec::new(); }
            let mut file_findings = Vec::new();
            let chunks: Vec<_> = all_rows.chunks(1500).collect();
            let total_chunks = chunks.len();
            for (c_idx, chunk) in chunks.into_iter().enumerate() {
                let mut chunk_data: String = chunk.iter().enumerate().map(|(i, r)| format!("{}:{}", (c_idx * 1500) + i + 2, r)).collect::<Vec<_>>().join("\n");
                
                if enable_masking {
                    if let Ok(mut session) = session_clone.lock() {
                        chunk_data = mask_sensitive_data(&chunk_data, &mut session);
                    }
                }
                
                app_handle_inner.emit("analysis-progress", json!({
                    "progress": 10 + (c_idx * 80 / (total_chunks + 1)) as i32,
                    "message": format!("[고성능 배치] {} - {}/{} 그룹 분석 중...", name_owned, c_idx + 1, total_chunks),
                    "step": 2
                })).ok();

                // [PHASE 1] Use Flash for fast detection (cost-effective)
                let detection_prompt = format!(r#"
다음 데이터에서 감사 이슈를 찾으십시오. 심각도는 판단하지 말고, 이슈만 탐지하십시오.

파일: {} (배치 {}/{})

출력 형식:
{{
  "findings": [
    {{
      "title": "이슈 제목",
      "description": "상세 설명",
      "row_index": 행번호,
      "evidence_quote": "증거",
      "extracted_amount": "금액(숫자만)",
      "extracted_date": "날짜",
      "extracted_store": "업체명",
      "extracted_user": "사용자명"
    }}
  ]
}}
"#, name_owned, c_idx + 1, total_chunks);

                match crate::ai::call_gemini_flash(&format!("{}\\n\\n[DATA]:\\n{}", detection_prompt, chunk_data)).await {
                    Ok(res_text) => {
                        crate::ai::increment_flash_call();
                        let json_res_text = crate::ai::extract_json(&res_text);
                        let result: Value = serde_json::from_str(&json_res_text).unwrap_or(json!({ "findings": [] }));
                        
                        let issues_opt = if let Some(arr) = result.as_array() {
                            Some(arr.clone())
                        } else if let Some(obj) = result.as_object() {
                            obj.get("findings").or(obj.get("issues")).and_then(|v| v.as_array()).cloned()
                        } else {
                            None
                        };

                        if let Some(mut issues) = issues_opt {
                            // [PHASE 2] Use Pro ONLY for severity classification (high accuracy)
                            if !issues.is_empty() {
                                let severity_prompt = format!(r#"
당신은 전문 감사관입니다. 다음 이슈들의 심각도를 판단하십시오.

[학습 예시]
- "구매부정", "횡령", "리베이트" → High
- "성희롱", "제보", "내부고발" → High  
- "승인 누락", "절차 위반" → Medium
- "문서 오류", "양식 미비" → Low

[판단 대상]
{}

각 이슈에 대해 "High", "Medium", "Low" 중 하나를 JSON 배열로 반환하십시오:
["High", "Medium", "Low", ...]
"#, serde_json::to_string(&issues).unwrap_or_default());

                                if let Ok(severity_res) = crate::ai::call_gemini_direct(&severity_prompt).await {
                                    crate::ai::increment_pro_call();
                                    
                                    if let Ok(severities) = serde_json::from_str::<Vec<String>>(&crate::ai::extract_json(&severity_res)) {
                                        for (idx, severity) in severities.iter().enumerate() {
                                            if let Some(issue) = issues.get_mut(idx) {
                                                if let Some(obj) = issue.as_object_mut() {
                                                    obj.insert("severity".to_string(), json!(severity));
                                                    obj.insert("recommendations".to_string(), json!("상세 조사 및 시정 조치 권고"));
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    // Fallback: assign Medium if Pro fails
                                    for issue in &mut issues {
                                        if let Some(obj) = issue.as_object_mut() {
                                            obj.insert("severity".to_string(), json!("Medium"));
                                            obj.insert("recommendations".to_string(), json!("검토 필요"));
                                        }
                                    }
                                }
                            }

                            let mut unmasked_issues = Vec::new();
                            if let Ok(session) = session_clone.lock() {
                                for issue in issues {
                                    let mut new_issue = issue.clone();
                                    if let Some(obj) = new_issue.as_object_mut() {
                                        if let Some(val) = obj.get_mut("evidence_quote").and_then(|v| v.as_str()) {
                                            *obj.get_mut("evidence_quote").unwrap() = json!(session.unmask_string(val));
                                        }
                                        if let Some(val) = obj.get_mut("description").and_then(|v| v.as_str()) {
                                            *obj.get_mut("description").unwrap() = json!(session.unmask_string(val));
                                        }
                                        if let Some(val) = obj.get_mut("recommendations").and_then(|v| v.as_str()) {
                                            *obj.get_mut("recommendations").unwrap() = json!(session.unmask_string(val));
                                        }
                                        if let Some(val) = obj.get_mut("extracted_user").and_then(|v| v.as_str()) {
                                            *obj.get_mut("extracted_user").unwrap() = json!(session.unmask_string(val));
                                        }
                                        if let Some(val) = obj.get_mut("extracted_store").and_then(|v| v.as_str()) {
                                            *obj.get_mut("extracted_store").unwrap() = json!(session.unmask_string(val));
                                        }
                                    }
                                    unmasked_issues.push(new_issue);
                                }
                            } else {
                                unmasked_issues = issues.clone();
                            }

                            for issue in unmasked_issues {
                                println!(">>> [AI Engine] Extracted Finding: {}", issue["title"].as_str().unwrap_or("Unnamed"));
                                file_findings.push(json!({ "file_name": name_owned.clone(), "issue": issue.clone() }));
                            }
                        } else {
                            println!(">>> [AI Engine] Gemini returned no findings for {} (Result: {})", name_owned, result);
                        }
                    },
                    Err(e) => {
                        println!(">>> [AI Engine] Gemini call FAILED for {} chunk {}: {}", name_owned, c_idx + 1, e);
                    }
                }
            }
            file_findings
        }));
    }

    let results = futures::future::join_all(tasks).await;
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut total_inserted = 0;
    for res in results {
        if let Ok(findings) = res {
            for item in findings {
                let f_name = item["file_name"].as_str().unwrap_or("Unknown");
                let issue = &item["issue"];
                let title = issue["title"].as_str().unwrap_or("AI 탐지 항목");
                let desc = issue["description"].as_str().unwrap_or("-");
                let severity = issue["severity"].as_str().unwrap_or("Medium");
                let row_idx = issue["row_index"].as_i64().unwrap_or(0);
                let recom = issue["recommendations"].as_str().unwrap_or("사후 조치 권고 사항이 없습니다.");
                let evidence = issue["evidence_quote"].as_str().unwrap_or("");
                let raw_amt_str = issue["extracted_amount"].as_str().unwrap_or("0");
                let clean_amt_str: String = raw_amt_str.chars().filter(|c| c.is_digit(10)).collect();
                let bs_amt = clean_amt_str.parse::<i64>().unwrap_or(0);
                let bs_date = issue["extracted_date"].as_str().unwrap_or("");
                let mut bs_store = issue["extracted_store"].as_str().unwrap_or("").to_string();
                let bs_user = issue["extracted_user"].as_str().unwrap_or("");
                
                if bs_store.contains(':') && bs_store.chars().all(|c| c.is_digit(10) || c == ':') {
                     bs_store = "미확인 가맹점".to_string();
                }
                if bs_store.trim().is_empty() || bs_store == "System" {
                     bs_store = "미확인 가맹점".to_string();
                }
                
                let mut lat = 37.5665;
                let mut lng = 126.9780;
                if !bs_store.is_empty() {
                    if let Some((l, g, _)) = geocode_address(&bs_store, api_key).await {
                        lat = l; lng = g;
                    }
                }
                let clean_raw = format!("{}|{}|-|{}|{}|{}|{}", bs_date, bs_store, bs_amt, bs_user, lat, lng);
                
                match conn.execute(
                    "INSERT INTO audit_issues (project_type, issue_title, description, severity, raw_row_data, row_index, recommendations, evidence_quote, audit_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)", 
                    params![&project_type, format!("[{}] {}", f_name, title), desc, severity, clean_raw, row_idx, recom, evidence, &project_type]
                ) {
                    Ok(_) => {
                        total_inserted += 1;
                        // [ALERT] If High severity, notify frontend
                        if severity == "High" {
                             app_handle.emit("risk-detected", json!({
                                "title": title,
                                "severity": "High",
                                "file_name": f_name
                            })).ok();
                        }
                    },
                    Err(e) => println!(">>> [DB] Failed to insert finding: {}", e),
                }
            }
        }
    }
    println!(">>> [AI Engine] Total issues successfully persisted to DB: {}", total_inserted);
    Ok(())
}

pub async fn run_weighted_rule_scan(
    target_files: Vec<(String, String)>,
    project_type: &str,
    db_path: &PathBuf,
    app_handle: &AppHandle,
) -> Result<(), String> {
    app_handle.emit("analysis-progress", json!({
        "progress": 8,
        "message": "[보완] 가중치 기반 고위험 패턴 스캔 중...",
        "step": 0
    })).ok();

    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    
    //[CONFIG] 고위험 키워드 및 한도 설정
    let restricted_vendors = vec!["스타기획", "유흥", "주점", "안마", "상품권", "단란", "가라오케", "노래방", "룸살롱"];
    
    // [CRITICAL] 구매부정, 횡령 등 즉시 High로 분류해야 하는 키워드
    let critical_keywords = vec![
        "부정", "횡령", "배임", "비리", "뇌물", "리베이트", "금품수수",
        "구매부정", "담합", "유착", "비자금", "착복", "유용"
    ];
    
    let high_risk_keywords = vec![
        "급한 건", "Manual Adj", "Override", "Urgent Pay", "Wait list", "Exception", 
        "수기결재", "분기", "미승인", "긴급", "예외", "특별", "임시", "조정",
        "제보", "익명", "내부고발", "성희롱", "갑질",
        "퇴사", "해고", "징계", "감봉", "경고", "시말서"
    ];
    
    let hr_risk_keywords = vec![
        "제보", "익명", "내부고발", "성희롱", "성추행", "갑질", 
        "괴롭힘", "차별", "불법", "위법", "폭행", "협박"
    ];
    
    let amount_threshold = 5_000_000;

    let mut total_found = 0;
    println!(">>> [Rule Engine] Starting weighted scan on {} files", target_files.len());

    for (f_path, f_name) in target_files {
        let rows = load_file_rows(&f_path);
        if rows.is_empty() { 
            println!(">>> [Rule Engine] File {} has no rows, skipping", f_name);
            continue; 
        }

        println!(">>> [Rule Engine] Scanning {} ({} rows)", f_name, rows.len());

        for (i, row) in rows.iter().enumerate() {
            if i == 0 { continue; } // Skip header

            let row_str = row.join(" ");
            let mut weight = 0;
            let mut matched_reasons = Vec::new();

            // 0. [PRIORITY] Critical 키워드 체크 - 즉시 High 등급
            for keyword in &critical_keywords {
                if row_str.contains(keyword) {
                    weight += 3; // Immediate High classification
                    matched_reasons.push(format!("중대 위반사항({}) 탐지", keyword));
                    break;
                }
            }

            // 1. 제한업체 체크
            for vendor in &restricted_vendors {
                if row_str.contains(vendor) {
                    weight += 2;
                    matched_reasons.push(format!("제한업체({}) 탐지", vendor));
                }
            }

            // 2. 금액 임계치 체크
            let mut max_amount_in_row = 0;
            for cell in row {
                let clean_cell: String = cell.chars().filter(|c| c.is_digit(10)).collect();
                if let Ok(amt) = clean_cell.parse::<i64>() {
                    if amt > max_amount_in_row { max_amount_in_row = amt; }
                }
            }
            if max_amount_in_row >= amount_threshold {
                weight += 1;
                matched_reasons.push(format!("고액 거래({}원) 탐지", max_amount_in_row));
            }

            // 3. 고위험 키워드 체크
            for keyword in &high_risk_keywords {
                if row_str.contains(keyword) {
                    weight += 1;
                    matched_reasons.push(format!("고위험 키워드({}) 탐지", keyword));
                    break; // Only count once per row
                }
            }

            // 4. HR 특화 키워드 체크 (제보감사용)
            for keyword in &hr_risk_keywords {
                if row_str.contains(keyword) {
                    weight += 2; // HR issues are critical
                    matched_reasons.push(format!("인사 리스크 키워드({}) 탐지", keyword));
                    break;
                }
            }

            // [LOWERED THRESHOLD] 가중치 1점 이상일 시 즉시 탐지 (기존 2점에서 완화)
            if weight >= 1 {
                let severity = if weight >= 3 { "High" } else if weight >= 2 { "Medium" } else { "Low" };
                let title = if !matched_reasons.is_empty() {
                    format!("[정밀탐지] {}", matched_reasons[0])
                } else {
                    "[정밀탐지] 이상 패턴 감지".to_string()
                };
                
                let desc = format!("가중치 기반 정밀 탐지 결과, 위험 징후가 발견되었습니다.\n\n탐지 사유:\n- {}", matched_reasons.join("\n- "));
                let evidence = row.join(" | ");
                
                // [DEDUP] Check if this issue already exists (by row_index, evidence, or similar title)
                // [FIXED] Use char-based slicing to avoid Korean string panic
                let evidence_preview: String = evidence.chars().take(50).collect();
                let title_preview: String = title.chars().take(30).collect();
                
                let exists: bool = conn.query_row(
                    "SELECT COUNT(*) FROM audit_issues WHERE project_type = ?1 AND (
                        (row_index = ?2 AND (evidence_quote LIKE ?3 OR raw_row_data LIKE ?3))
                        OR issue_title LIKE ?4
                    )",
                    params![&project_type, i as i64, format!("%{}%", evidence_preview), format!("%{}%", title_preview)],
                    |r| r.get::<_, i64>(0)
                ).unwrap_or(0) > 0;

                if !exists {
                    match conn.execute(
                        "INSERT INTO audit_issues (project_type, issue_title, description, severity, raw_row_data, row_index, recommendations, evidence_quote, audit_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)", 
                        params![&project_type, format!("[{}] {}", f_name, title), desc, severity, evidence, i as i64, "해당 거래의 증빙 자료 전수 점검 및 관련자 대면 인터뷰 실시 권고", evidence, &project_type]
                    ) {
                        Ok(_) => {
                            total_found += 1;
                            app_handle.emit("risk-detected", json!({
                                "title": title,
                                "severity": severity,
                                "file_name": f_name
                            })).ok();
                        },
                        Err(e) => println!(">>> [Rule Engine] Failed to insert: {}", e),
                    }
                } else {
                    println!(">>> [Rule Engine] Skipping duplicate issue at row {}", i);
                }
            }
        }
    }

    println!(">>> [Rule Engine] Weighted scan complete. {} High-risk issues found.", total_found);
    
    if total_found == 0 {
        println!(">>> [Rule Engine] WARNING: No issues found by rule scan. AI scan will proceed.");
    }
    
    Ok(())
}
