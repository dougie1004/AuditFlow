use crate::models::EntityEvent;
use crate::ingestion::EventBuilder;
use crate::file_loader::load_file_rows;
use uuid::Uuid;
use regex::Regex;

pub struct LedgerBuilder {
    pub file_path: String,
}

impl EventBuilder for LedgerBuilder {
    fn build_events(&self) -> Vec<EntityEvent> {
        let mut events = Vec::new();
        
        // [TRANSPARENCY] Statistical Counters
        let mut total_rows = 0;
        let mut date_parsed = 0;
        let mut date_failed = 0;
        let mut amount_parsed = 0;
        let mut amount_failed = 0;
        let mut acc_null = 0;
        let mut cp_null = 0;

        // Date Format Detection Counters
        let mut fmt_dash = 0; // %Y-%m-%d
        let mut fmt_slash = 0; // %Y/%m/%d
        let mut fmt_dot = 0; // %Y.%m.%d
        let mut fmt_raw = 0; // %Y%m%d
        let mut fmt_us = 0; // %m/%d/%Y or %d/%m/%Y

        let re_dash = Regex::new(r"(\d{4})[-]\s*(\d{1,2})[-]\s*(\d{1,2})").unwrap();
        let re_slash = Regex::new(r"(\d{4})[/]\s*(\d{1,2})[/]\s*(\d{1,2})").unwrap();
        let re_dot = Regex::new(r"(\d{4})[\.]\s*(\d{1,2})[\.]\s*(\d{1,2})").unwrap();
        let re_kor = Regex::new(r"(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일").unwrap();
        let re_raw = Regex::new(r"\b(\d{4})(\d{2})(\d{2})\b").unwrap();
        let re_us = Regex::new(r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})").unwrap();
        
        let mut raw_date_samples = Vec::new();

        if let Ok(rows) = load_file_rows(&self.file_path) {
             if rows.is_empty() { return vec![]; }
             total_rows = rows.len();

             // [HEADER NORMALIZATION LAYER]
             let mut date_idx = None;
             let mut amount_idx = None;
             let mut debit_idx = None;
             let mut credit_idx = None;
             let mut acc_name_idx = None;
             let mut acc_code_idx = None;
             let mut cp_idx = None;
             let mut desc_idx = None;
             let mut header_row_idx = 0;

             // Scan top 10 rows to find header
             for r_idx in 0..10.min(rows.len()) {
                let mut matches = 0;
                let row = &rows[r_idx];
                
                for (c_idx, original_header) in row.iter().enumerate() {
                    let h = original_header.trim_start_matches('\u{feff}')
                        .replace(" ", "")
                        .replace("\t", "")
                        .to_lowercase();
                    
                    if h.contains("일자") || h.contains("날짜") || h.contains("date") || h.contains("승인") { date_idx = Some(c_idx); matches += 1; }
                    else if h.contains("차변") || h.contains("debit") || h.contains("출금") { debit_idx = Some(c_idx); matches += 1; }
                    else if h.contains("대변") || h.contains("credit") || h.contains("입금") { credit_idx = Some(c_idx); matches += 1; }
                    else if h.contains("금액") || h.contains("amount") || h.contains("합계") || h.contains("잔액") || h.contains("가액") { amount_idx = Some(c_idx); matches += 1; }
                    else if (h.contains("계정") && h.contains("명")) || h.contains("accountname") || h.contains("과목") { acc_name_idx = Some(c_idx); matches += 1; }
                    else if (h.contains("계정") && (h.contains("코드") || h.contains("번호"))) || h.contains("accountcode") { acc_code_idx = Some(c_idx); matches += 1; }
                    else if h.contains("거래처") || h.contains("entity") || h.contains("customer") || h.contains("vendor") || h.contains("가맹점") { cp_idx = Some(c_idx); matches += 1; }
                    else if h.contains("적요") || h.contains("내용") || h.contains("desc") || h.contains("rem") || h.contains("비고") || h.contains("품명") { desc_idx = Some(c_idx); matches += 1; }
                }

                if matches >= 2 {
                    header_row_idx = r_idx;
                    println!(">>> [INGESTION] Identified header at row {}: {:?}", header_row_idx, row);
                    break;
                }
             }
                
             println!(">>> [INGESTION] Column Mapping Results:");
             println!("  - Date: {:?}, Amount(D/C): {:?}/{:?}, BaseAmt: {:?}", date_idx, debit_idx, credit_idx, amount_idx);
             println!("  - Account: {:?}/{:?}, Counterparty: {:?}, Desc: {:?}", acc_name_idx, acc_code_idx, cp_idx, desc_idx);

             total_rows = rows.len();
             println!("--------------------------------------------------");
             println!(">>> [INGESTION DEBUG] Mandatory Transparency Mode");
             println!("- File: {}", self.file_path);
             println!("- Total Rows: {}", total_rows);

             for (idx, row) in rows.iter().enumerate() {
                 if idx <= header_row_idx { continue; } // Header 및 그 이전 Row Skip
                 if row.len() < 3 { continue; }

                 // 1. Date Detection (Use mapped idx or search fallback)
                 let mut date_str = String::new();
                 let mut found_date = false;

                 // Try mapped index first
                 if let Some(d_idx) = date_idx {
                     if let Some(cell) = row.get(d_idx) {
                         let trimmed = cell.trim();
                         if re_dash.is_match(trimmed) || re_slash.is_match(trimmed) || re_dot.is_match(trimmed) || re_kor.is_match(trimmed) || re_raw.is_match(trimmed) || re_us.is_match(trimmed) {
                             // Perform normalization (logic same as before)
                             if let Some(caps) = re_dash.captures(trimmed).or(re_slash.captures(trimmed)).or(re_dot.captures(trimmed)).or(re_kor.captures(trimmed)).or(re_raw.captures(trimmed)) {
                                 date_str = format!("{}-{:0>2}-{:0>2}", &caps[1], &caps[2], &caps[3]);
                                 found_date = true;
                             }
                         }
                     }
                 }

                 // Fallback: search row if mapped index failed
                 if !found_date {
                     for cell in row.iter() {
                         let trimmed = cell.trim();
                         if let Some(caps) = re_dash.captures(trimmed).or(re_slash.captures(trimmed)).or(re_dot.captures(trimmed)).or(re_kor.captures(trimmed)).or(re_raw.captures(trimmed)) {
                             date_str = format!("{}-{:0>2}-{:0>2}", &caps[1], &caps[2], &caps[3]);
                             found_date = true; break;
                         }
                     }
                 }

                 if raw_date_samples.len() < 20 && !row.is_empty() {
                     let best_effort_date = date_idx.and_then(|i| row.get(i)).cloned().unwrap_or_else(|| "N/A".to_string());
                     raw_date_samples.push(best_effort_date);
                 }

                 if found_date { date_parsed += 1; } else { date_failed += 1; continue; }
                 
                 // 2. Amount Extraction
                 let debit: f64 = debit_idx.and_then(|i| row.get(i)).map(|s| s.replace(",", "").replace("\"", "").trim().parse().unwrap_or(0.0)).unwrap_or(0.0);
                 let credit: f64 = credit_idx.and_then(|i| row.get(i)).map(|s| s.replace(",", "").replace("\"", "").trim().parse().unwrap_or(0.0)).unwrap_or(0.0);
                 let base_amt: f64 = amount_idx.and_then(|i| row.get(i)).map(|s| s.replace(",", "").replace("\"", "").trim().parse().unwrap_or(0.0)).unwrap_or(0.0);
                 
                 let amount = if debit.abs() > 0.001 { debit } else if credit.abs() > 0.001 { credit } else { base_amt };

                 if amount.abs() > 0.001 {
                     amount_parsed += 1;
                 } else {
                     let mut fallback_amt = 0.0;
                     for cell in row.iter() {
                         let cleaned = cell.replace(",", "").replace("\"", "");
                         if let Ok(val) = cleaned.trim().parse::<f64>() {
                             if val.abs() > 1000.0 { fallback_amt = val; break; }
                         }
                     }
                     if fallback_amt.abs() > 0.001 { amount_parsed += 1; } else { amount_failed += 1; continue; }
                 }

                 // 3. Entity & Metadata
                 let acc_name = acc_name_idx.and_then(|i| row.get(i)).cloned().unwrap_or_else(|| { acc_null += 1; "Unknown Account".to_string() });
                 let acc_code = acc_code_idx.and_then(|i| row.get(i)).cloned().unwrap_or_default();
                 let counterparty = cp_idx.and_then(|i| row.get(i)).cloned().unwrap_or_else(|| { cp_null += 1; "Unknown Counterparty".to_string() });
                 let description = desc_idx.and_then(|i| row.get(i)).cloned().unwrap_or_default();

                 events.push(EntityEvent {
                     id: Uuid::new_v4().to_string(),
                     entity_id: counterparty,
                     event_type: "TRANSACTION".to_string(),
                     amount: Some(amount),
                     event_date: date_str,
                     description,
                     source_object_id: None,
                     is_flagged: false,
                     risk_delta: 0.0,
                     rule_flags: None,
                     stat_flags: None,
                     source_type: Some("LEDGER".to_string()),
                     metadata: Some(serde_json::json!({
                         "account": acc_name,
                         "acc_code": acc_code
                     }).to_string()),
                     account_code: Some(acc_code),
                     account_name: Some(acc_name),
                     debit: Some(debit),
                     credit: Some(credit),
                     net_amount: Some(amount), // Assuming amount is the net impact for now
                 });
             }
        }


        // Output Statistics
        println!("--------------------------------------------------");
        println!(">>> [DEBUG] Raw Date Samples (Top 20):");
        for (i, sample) in raw_date_samples.iter().enumerate() {
            println!("  [{:0>2}] \"{}\"", i+1, sample);
        }
        println!("--------------------------------------------------");
        println!(">>> Parsing Result Statistics:");
        println!("- Date Parse: Success {}, Failed {}", date_parsed, date_failed);
        println!("- Amount Parse: Success {}, Failed {}", amount_parsed, amount_failed);
        println!("- Account NULL: {}, Counterparty NULL: {}", acc_null, cp_null);
        println!("- Final ParsedTransaction Count: {}", events.len());
        println!("--------------------------------------------------");
        println!(">>> Date Format Detection Result:");
        println!("- %Y-%m-%d: {}", fmt_dash);
        println!("- %Y/%m/%d: {}", fmt_slash);
        println!("- %Y.%m.%d: {}", fmt_dot);
        println!("- %Y%m%d:   {}", fmt_raw);
        println!("- US/EU Format: {}", fmt_us);
        println!("--------------------------------------------------");
        
        if total_rows > 1 && events.is_empty() {
            eprintln!("CRITICAL ERROR: Ingestion Failed. {} rows found but 0 transactions parsed.", total_rows);
            if date_failed as f32 / total_rows as f32 > 0.9 {
                eprintln!("REASON: Date Parsing Failed for >90% of rows. Check sample output above.");
            }
        }

        events
    }
}
