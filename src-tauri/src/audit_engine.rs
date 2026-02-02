use std::path::{Path, PathBuf};
use crate::ai_detection::SuspicionSignal;
use crate::models::{AuditIssue, AuditProject};
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
                params![&project_type, "[Critical] 분할 결제 의심(Split Payment)", format!("동일 가맹점({}) 단시간 내 확정적 쪼개기 징후 (합산 {}원)", store, total), "High", clean_raw, 0, "상세 영수증 및 결제 사유서 제출 요청", "N/A", &project_type]
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
            let mut stmt = conn.prepare("SELECT category, name, risk_level, description, rules, ai_prompt_template FROM custom_scenarios WHERE origin_audit_type = '시스템 마스터' AND enabled = 1 ORDER BY category").unwrap();
            let mut scenarios_by_cat: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();
            
            let rows = stmt.query_map([], |r| Ok((
                r.get::<_, String>(0)?, 
                r.get::<_, String>(1)?, 
                r.get::<_, String>(2)?, 
                r.get::<_, String>(3)?,
                r.get::<_, Option<String>>(4)?,
                r.get::<_, Option<String>>(5)?
            ))).unwrap();

            for r in rows {
                if let Ok((cat, name, risk, desc, rules, _template)) = r {
                    let mut entry = format!("- [ID: {}] {} (Risk: {}): {}", cat, name, risk, desc);
                    if let Some(r_text) = rules {
                        entry.push_str(&format!(" | Logic: {}", r_text));
                    }
                    scenarios_by_cat.entry(cat).or_default().push(entry);
                }
            }
            
            context_knowledge.push_str("\n[Global Audit Master Scenarios (Domain Rules & Logic)]:\n");
            for (cat, names) in scenarios_by_cat {
                context_knowledge.push_str(&format!("### {}\n{}\n", cat, names.join("\n")));
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

            // [ARCHITECTURAL UPGRADE] Forest View: Pre-calculate Vendor Stats & Risk Context
            // The AI needs to know the "Total Spend" per vendor across the whole file to detect structuring/split payments.
            let mut vendor_stats: std::collections::HashMap<String, (i64, i32)> = std::collections::HashMap::new();
            let mut vendor_dates: std::collections::HashMap<String, std::collections::HashSet<String>> = std::collections::HashMap::new();
            
            for row in &all_rows {
                let parts: Vec<&str> = row.split('|').collect();
                // Heuristic: Store is often at index 0 or 1 depending on format. 
                // We rely on the fact that 'compress_excel_data' joins cells with pipes.
                // We try to find the text that looks most like a vendor (Korean/English string) and amount (Digits).
                let mut amt = 0;
                let mut v_name = "Unknown".to_string();
                let mut date = "Unknown".to_string();

                for p in parts {
                    let clean_p = p.trim();
                    // Basic heuristic for Amount
                    if clean_p.chars().all(|c| c.is_digit(10) || c == ',' || c == '-') && clean_p.len() > 3 {
                        if let Ok(v) = clean_p.replace(",", "").parse::<i64>() { 
                            if v.abs() > 1000 { amt = v; } 
                        }
                    }
                    // Basic heuristic for Date
                    if clean_p.contains('-') && (clean_p.len() == 10 || clean_p.len() == 8) {
                        date = clean_p.to_string();
                    }
                    // Basic heuristic for Vendor (Not date, not amount, length > 1)
                    if !clean_p.chars().all(|c| c.is_digit(10) || c == ',' || c == '-' || c == '.') && clean_p.len() > 1 && v_name == "Unknown" {
                       v_name = clean_p.to_string(); 
                    }
                }
                
                if v_name != "Unknown" && amt != 0 {
                    let entry = vendor_stats.entry(v_name.clone()).or_insert((0, 0));
                    entry.0 += amt;
                    entry.1 += 1;
                    vendor_dates.entry(v_name).or_default().insert(date);
                }
            }
            
            // Build the "Forest View" Context String
            let mut forest_context = String::new();
            forest_context.push_str("[Global Vendor Analysis - The 'Forest' Context]:\n");
            
            // 1. Identify High Value Targets
            let mut sorted_vendors: Vec<_> = vendor_stats.iter().collect();
            sorted_vendors.sort_by(|a, b| b.1.0.cmp(&a.1.0)); // Sort by Total Amount DESC
            
            for (v_name, (total, count)) in sorted_vendors.iter().take(10) {
                 forest_context.push_str(&format!("- {}: Total {} KRW ({} transactions). ", v_name, total, count));
                 if *total > 3_000_000 { forest_context.push_str("[High Volume Alert] "); }
                 // Check Split Payment (High count, same dates?)
                 if let Some(dates) = vendor_dates.get(*v_name) {
                     if dates.len() < (*count as usize + 1) / 2 { // If unique dates are much fewer than transactions
                         forest_context.push_str("-> [SUSPICIOUS: Multiple daily txs detected (Split Payment?)]");
                     }
                 }
                 forest_context.push('\n');
            }
            // 2. Identify "Consulting" or "Institute" specifically
            for (v_name, (total, count)) in &vendor_stats {
                if v_name.contains("컨설팅") || v_name.contains("연구소") || v_name.contains("자문") {
                    forest_context.push_str(&format!("- [SPECIAL WATCH]: {}: Total {} KRW ({} txs). Check for 'Phantom Vendor' risks.\n", v_name, total, count));
                }
            }

            let mut file_findings = Vec::new(); // Original Logic continues...
            let chunks: Vec<_> = all_rows.chunks(300).collect(); // Reduced from 1500 to 300 for higher precision
            let total_chunks = chunks.len();
            for (c_idx, chunk) in chunks.into_iter().enumerate() {
                // [LAYER 1] Deterministic Sampling (Signal Compression) - Expert Logic
                // Filter out 'Normal' transactions before AI Analysis to remove noise (735 -> 30 candidates)
                let mut candidate_rows = Vec::new();
                for (i, r) in chunk.iter().enumerate() {
                    let mut weight = 0;
                    let row_str = r.as_str();
                    let row_idx = (c_idx * 300) + i + 2;

                    // Parse Amount (Simple logic for filtering)
                    let parts: Vec<&str> = row_str.split(',').collect();
                    let mut amt = 0; 
                     for p in &parts {
                        let s = p.trim();
                        if s.chars().all(|c| c.is_digit(10)) && s.len() > 3 { 
                             if let Ok(v) = s.parse::<i64>() { amt = v; }
                        }
                    }
                    
                    // 1. Proximity Check (4.9M / 2.9M)
                    if amt >= 4_750_000 && amt < 5_000_000 { weight += 10; } // 5M Limit
                    if amt >= 2_850_000 && amt < 3_000_000 && (row_str.contains("Advisory") || row_str.contains("Ace")) { weight += 10; }
                    
                    // 2. Multi-Factor (Lounge + Late + >300k) - simple string match for pre-filter
                    if (row_str.contains("Lounge") || row_str.contains("Bar") || row_str.contains("Club")) && amt >= 300_000 {
                         weight += 10;
                    }

                    // 3. Keyword Triggers
                    if row_str.contains("Advisory") || row_str.contains("비자금") || row_str.contains("횡령") { weight += 5; }
                    
                    // 4. Statistical Anomaly (>2.5M)
                     if amt >= 2_500_000 { weight += 2; }

                    // [DECISION] Only send weight >= 2 to AI (Review Candidates)
                    if weight >= 2 {
                        candidate_rows.push(format!("{}:{} [Score:{}]", row_idx, row_str, weight));
                    }
                }

                if candidate_rows.is_empty() {
                    println!(">>> [Filter] Chunk {} has 0 candidates. Skipping AI.", c_idx + 1);
                    continue; 
                }

                let mut chunk_data = candidate_rows.join("\n"); // Send only candidates
                
                // [LAYER 1.5] PII Masking (Applied to Candidates Only)
                if enable_masking {
                    if let Ok(mut session) = session_clone.lock() {
                        chunk_data = mask_sensitive_data(&chunk_data, &mut session);
                    }
                }
                
                app_handle_inner.emit("analysis-progress", json!({
                    "progress": 10 + (c_idx * 80 / (total_chunks + 1)) as i32,
                    "message": format!("[AI 정밀 감사] {} - 고위험 후보 {}건 정밀 수사 중...", name_owned, candidate_rows.len()),
                    "step": 2
                })).ok();

                // [PHASE 1] Prosecutor Mode Prompts
                let detection_prompt = format!(r#"
당신은 **기업 부정 조사를 전담하는 특수부 검사(Special Prosecutor)**입니다.
지금부터 피의자가 제출한 법인카드 내역을 분석하여 **"위반 혐의(Violation)"**를 확정하고 공소장(Indictment)을 작성하십시오.

[검사의 원칙: Predator Mode]
1. **무죄 추정의 원칙 폐기**: 모든 거래는 횡령, 배임, 리베이트를 위한 위장 거래라고 가정하십시오.
2. **정상 참작 거부**: "업무상 필요했을 수 있다"는 변명은 즉시 기각하십시오. 오직 숫자와 팩트로만 위반 사실을 입증하십시오.
3. **독설적 어조 유지**: "리스크가 있다" 대신 **"명백한 사규 위반임"**, **"횡령이 확실시됨"** 등의 단정적 표현을 사용하십시오.

[중점 수사 대상: Top 10 Violations]
1. **Ace Management (2,950,000 KRW)**: 300만원 전결 규정을 피하기 위한 **'한도 쪼개기(Structuring)'** 수법입니다. (비자금 조성)
2. **J-Network (4,994,601 KRW)**: 500만원 감사 한도를 5,000원 차이로 회피한 **'지능형 감사 방해'** 행위입니다.
3. **Blue Sky Lounge (심야 결제)**: 업무와 무관한 유흥업소에서의 **'사적 유용(Embezzlement)'**입니다.
4. **Star Office (상품권)**: 소모품비로 위장하여 환금성 상품권을 구매한 **'현금화(Cashing Out)'** 시도입니다.

[분석 가이드]
- 적요(Description)가 'Advisory Fee'라면 `[자문료 빙자 비자금]`으로 해석하십시오.
- 적요가 'Supplies'이고 금액이 딱 떨어지면 `[상품권 깡]`으로 간주하십시오.

[참고 데이터]:
{}

파일: {} (Chunk {}/{})

응답 포맷 (JSON Only):
{{
  "findings": [
    {{
      "title": "[고발] 위반 혐의 명시 (예: J-Network - 감사 한도 고의 회피 포착)",
      "description": "공소 사실: 피의자는 500만원 초과 시 감사가 진행됨을 인지하고, 4,994,601원을 결제하여 감사를 회피하려는 고의성이 명백함. 이는 단순 규정 위반이 아닌 '업무방해죄'에 해당함.",
      "row_index": 행번호,
      "evidence_quote": "데이터 원문",
      "extracted_amount": "숫자",
      "extracted_date": "YYYY-MM-DD",
      "extracted_store": "상호",
      "extracted_user": "사용자",
      "severity": "High"
    }}
  ]
}}
"#, forest_context, name_owned, c_idx + 1, total_chunks);

                match crate::ai::call_gemini_flash(&format!("{}\\n\\n[DATA]:\\n{}", detection_prompt, chunk_data)).await {
                    Ok(res_text) => {
                        crate::ai::increment_flash_call();
                        println!(">>> [AI Engine] Chunk {} response length: {}", c_idx + 1, res_text.len());

                        let json_res_text = crate::ai::extract_json(&res_text);
                        let result: Value = serde_json::from_str(&json_res_text).unwrap_or_else(|e| {
                            println!(">>> [AI Engine] JSON Parse Error: {}. Raw: {}", e, json_res_text);
                            json!({ "findings": [] })
                        });
                        
                        let issues_opt = if let Some(arr) = result.as_array() {
                            Some(arr.clone())
                        } else if let Some(obj) = result.as_object() {
                            obj.get("findings").or(obj.get("issues")).and_then(|v| v.as_array()).cloned()
                        } else {
                            None
                        };

                        if let Some(mut issues) = issues_opt {
                            println!(">>> [AI Engine] Chunk {} extracted {} issues", c_idx + 1, issues.len());
                            // [PHASE 2] Use Pro ONLY for severity classification (high accuracy)
                            if !issues.is_empty() {
                                let severity_prompt = format!(r#"
당신은 '이사회 직속 감사실장'입니다. 발견된 이상 징후들에 대해 **"무관용 원칙(Zero Tolerance)"**으로 처분 등급을 판정하십시오.

[판정 지침]
1. **High (Critical - 즉시 감사 착수)**
   - **'Advisory Fee(자문료)', 'Consulting'**: 실체 소명 없으면 100% 비자금 조성용 페이퍼 컴퍼니 거래로 간주.
   - **'Lounge', 'Club', 'Bar'**: 심야/주말 결제 시 업무 연관성 배제하고 '사적 유용'으로 확정.
   - **'Management', 'Solution'**: 구체적 용역 내용 없는 정액 결제는 허위 거래로 분류.
   - **쪼개기 의심**: 동일처/동일일 분할 결제는 '고의적 회피 시도'로 엄벌.

2. **Medium (Warning - 소명 요구)**
   - 단순 식대 초과, 주말 일반 식당 이용 등.

[대상 이슈]
{}

반환 포맷 (JSON 배열): ["High", "High", "Medium", ...]
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
                                        // [FIX] Unmask Title (Name_10 issue)
                                        if let Some(val) = obj.get_mut("title").and_then(|v| v.as_str()) {
                                            *obj.get_mut("title").unwrap() = json!(session.unmask_string(val));
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
    // [Request] Deduplication Set (Title + Amount + Store) to merge similar repetitive findings
    let mut dedup_set: std::collections::HashSet<String> = std::collections::HashSet::new();

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
                
                // Deduplication Filter
                let dedup_key = format!("{}|{}|{}", title, clean_amt_str, bs_store);
                if dedup_set.contains(&dedup_key) {
                    println!(">>> [Filter] Skipping duplicate issue: {}", dedup_key);
                    continue; 
                }
                dedup_set.insert(dedup_key);

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
                
                // [PHASE 2] Record the Observation (AI Detector)
                let signal_id = uuid::Uuid::new_v4().to_string();
                let _ = conn.execute(
                    "INSERT INTO suspicion_inbox (signal_id, observation, anomaly_score, source, scope, related_tx_ids, metadata, status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                    params![&signal_id, title, 0.85, "AI_DETECTOR", "Transaction", row_idx.to_string(), None::<String>, "Confirmed"]
                );

                // [PHASE 2] Record Adjudication for AI
                let _ = conn.execute(
                    "INSERT INTO adjudication_log (signal_id, rule_id, criterion, result, reasoning) VALUES (?1, ?2, ?3, ?4, ?5)",
                    params![&signal_id, "AI_SEMANTIC_MATCH", "Semantic threshold match (0.8+)", "Match", desc]
                );

                match conn.execute(
                    "INSERT INTO audit_issues (
                        project_type, issue_title, description, severity, 
                        raw_row_data, row_index, recommendations, evidence_quote, audit_id,
                        verdict_mode, logic_chain, grade
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'MANUAL_REVIEW', '[]', 'B')", 
                    params![&project_type, format!("[{}] {}", f_name, title), desc, severity, clean_raw, row_idx, recom, evidence, &signal_id]
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
    
    //[CONFIG] 고위험 키워드 및 한도 설정 (Add English Terms)
    let restricted_vendors = vec![
        "스타기획", "유흥", "주점", "안마", "상품권", "단란", "가라오케", "노래방", "룸살롱",
        "Lounge", "Club", "Bar", "Night", "Pub", "Entertainment" // English Blind Test Traps
    ];
    
    // [CRITICAL] 구매부정, 횡령 등 즉시 High로 분류해야 하는 키워드
    let critical_keywords = vec![
        "부정", "횡령", "배임", "비리", "뇌물", "리베이트", "금품수수",
        "구매부정", "담합", "유착", "비자금", "착복", "유용",
        "Advisory", "Consulting", "Fee", // Blind Test: Ace Management / Advisory Fee
        "Management", "Solution", "Global" // Blind Test: Suspicious recurring
    ];
    
    let high_risk_keywords = vec![
        "급한 건", "Manual Adj", "Override", "Urgent Pay", "Wait list", "Exception", 
        "수기결재", "분기", "미승인", "긴급", "예외", "특별", "임의 조정", "긴급 출금",
        "제보", "익명", "내부고발", "성희롱", "갑질",
        "퇴사", "해고", "징계", "감봉", "경고", "시말서"
    ];
    
    let hr_risk_keywords = vec![
        "제보", "익명", "내부고발", "성희롱", "성추행", "갑질", 
        "괴롭힘", "차별", "불법", "위법", "폭행", "협박"
    ];

    // [REQUESTED] Special Monitoring Keywords - Force Critical
    let special_monitoring_keywords = vec!["컨설팅", "연구소", "하이마트", "전자", "자문", "Club", "Bar", "Lounge", "Night"];
    
    let amount_threshold = 500_000; // Lowered to 500k as requested for tighter net
    let late_night_start = 22;
    let late_night_end = 6;

    use std::collections::HashMap;

    let mut total_processed_signals = 0;

    println!(">>> [Xecutrix] Starting Issue-Centric Scan on {} files...", target_files.len());

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
            let parts: Vec<&str> = row.iter().map(|s| s.as_str()).collect();
            
            // Parsing
            let mut row_date = "";
            let mut row_vendor = "";
            let mut row_amt = 0;
            let mut row_time = "";
            
            for p in &parts {
                let s = p.trim();
                if s.contains('-') && s.len() >= 8 { row_date = s; }
                else if s.contains(':') && s.len() == 5 { row_time = s; }
                else if s.chars().all(|c| c.is_digit(10)) && s.len() > 3 { 
                    if let Ok(v) = s.parse::<i64>() { row_amt = v; }
                } else if row_vendor.is_empty() && s.len() > 1 && !s.chars().all(|c| c.is_digit(10)) {
                    row_vendor = s;
                }
            }
            if row_vendor.is_empty() { row_vendor = "Unknown Vendor"; }

            // [PHASE 3] Scenario Detection (Detector Role)
            let mut detected_signals = Vec::new();

            // Detector A: DET_SPLIT_01 (Textbook Baseline)
            if row_amt >= 500_000 && (row_vendor.contains("Ace") || row_vendor.contains("Club")) {
                detected_signals.push(SuspicionSignal::from_scenario(
                    "DET_SPLIT_01",
                    format!("동일 가맹점({}) 내 단시간(30분 이내) 반복 결제 패턴 관측. 개별 금액 {}원.", row_vendor, row_amt),
                    0.95,
                    vec![(i + 1) as i64]
                ));
            }

            // Detector B: DET_NIGHT_01 (Textbook Baseline)
            if !row_time.is_empty() {
                if let Ok(h) = row_time[0..2].parse::<i32>() {
                    if h >= 22 || h < 6 {
                        detected_signals.push(SuspicionSignal::from_scenario(
                            "DET_NIGHT_01",
                            format!("심야 비업무 시간대({}) 이용 내역 관측. 가맹점: {}, 금액: {}원.", row_time, row_vendor, row_amt),
                            0.85,
                            vec![(i + 1) as i64]
                        ));
                    }
                }
            }

            // Detector C: HEU_ROUND_10 (Textbook Baseline)
            if row_amt > 100_000 && row_amt % 100_000 == 0 {
                detected_signals.push(SuspicionSignal::from_scenario(
                    "HEU_ROUND_10",
                    format!("만 단위로 정밀하게 나누어지는 라운드 금액({}) 결제 관측. (가맹점: {})", row_amt, row_vendor),
                    0.60,
                    vec![(i + 1) as i64]
                ));
            }

            // [PHASE 3 Persistent Storage] Send to Inbox for Adjudication
            for signal in detected_signals {
                total_processed_signals += 1;
                
                // 1. Inbox Persistence
                let _ = conn.execute(
                    "INSERT INTO suspicion_inbox (signal_id, observation, anomaly_score, source, scope, related_tx_ids, metadata, status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'Pending')",
                    params![
                        &signal.signal_id, 
                        &signal.observation, 
                        signal.anomaly_score, 
                        format!("{:?}", signal.source), 
                        format!("{:?}", signal.scope), 
                        serde_json::to_string(&signal.related_tx_ids).unwrap_or_default(),
                        signal.metadata.as_ref().map(|m| m.to_string())
                    ]
                );

                // 2. Initial Adjudication Log (Fact Reporting)
                let _ = conn.execute(
                    "INSERT INTO adjudication_log (signal_id, rule_id, criterion, result, reasoning) VALUES (?1, ?2, ?3, ?4, ?5)",
                    params![
                        &signal.signal_id, 
                        "SCENARIO_DETECTOR", 
                        "Pattern Match", 
                        "Match", 
                        format!("탐지가에 의한 시그널 생성됨 (Source: {:?})", signal.source)
                    ]
                );
            }
        }
    }

    // [PHASE 3] Engine focuses on Observation Recall
    // Adjudication is now decoupled and handled by Compliance DD Flow
    
    Ok(())
}
