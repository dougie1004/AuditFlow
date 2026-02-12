use std::path::Path;
use std::fs::File;
use std::io::Read;
use calamine::{Range, Data};
use pdf_extract::extract_text;
use mailparse::{parse_mail, MailHeaderMap};
use encoding_rs::EUC_KR;
use zip::ZipArchive;
use reqwest::Client;
use serde_json::Value;
use regex::Regex;
use std::collections::HashMap;
use lazy_static::lazy_static;

lazy_static! {
    static ref TITLES: Vec<&'static str> = vec![
        "사장","부사장","선생","교수","변호사","회계사","대표","사장","부사장","전무","상무","이사",
        "본부장","실장","팀장","부장","차장","과장","대리","사원","CEO","CFO","COO","CTO","계장","주임",
        "Manager", "Director", "Chief", "Lead", "Associate"
    ];
    static ref LABELS: Vec<&'static str> = vec![
        "작성자","검토자","승인자","담당자","보고자","요청자","결재","수신","참조","승인","기안"
    ];
    static ref BUSINESS_TERMS: std::collections::HashSet<&'static str> = {
        let mut s = std::collections::HashSet::new();
        for &t in &["전략","대표","급여","인사","감사","이사회","결재","보고","회의","법인카드","증빙","리스트","통제","내부통제","프로세스","시나리오","전무","상무","이사","지출","수입","지급", "미팅", "카드", "송금", "금액", "적요", "내역", "임금", 
                    "팀", "부서", "본부", "지점", "사업부", "센터", "그룹", "총무", "영업", "기획", "개발", "디자인", "마케팅", "재무", "회계", "자금", "구매", "생산", "품질", "물류", "교육", "법무", "홍보", "비서",
                    "고기집", "선물용", "회의비", "회식비", "수수료", "관리비", "임차료", "보험료", "접대비", "복리후생", "여비",
                    // Stems for ambiguous suffix check
                    "고기", "선물", "회식", "야근", "수선", "주차", "교통", "소모품", "비품", "탕비", "접대", "관리", "임차", "보험", "복리", "식대", "용역", "급식"] { s.insert(t); }
        s
    };
    
    // De-identification Regexes
    pub static ref RRN_REGEX: Regex = Regex::new(r"\d{6}-?[1-4]\d{6}").unwrap();
    pub static ref PHONE_REGEX: Regex = Regex::new(r"(?:01[016789])[-.\s]?\d{3,4}[-.\s]?\d{4}").unwrap();
    pub static ref CARD_REGEX: Regex = Regex::new(r"\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}").unwrap();
    pub static ref EMAIL_REGEX: Regex = Regex::new(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}").unwrap();
    pub static ref NAME_REGEX: Regex = Regex::new(r"\b[가-힣]{2,4}\b").unwrap();
    pub static ref NAME_TITLE_REGEX: Regex = Regex::new(r"([가-힣]{2,4})\s+(선생|교수|변호사|회계사|대표|사장|부사장|전무|상무|이사|본부장|실장|팀장|부장|차장|과장|대리|사원|계장|주임|CEO|CFO|COO|CTO|Manager|Director)").unwrap();
    
    // [SMART MASKING V2 DATASETS]
    pub static ref SURNAMES: std::collections::HashSet<char> = {
        let mut s = std::collections::HashSet::new();
        for c in "김이박최정강조윤장임한오서신권황안송류전홍고문양손배조백허유남심노하곽성차주우구신임나전민유진지엄채원천방공현함변염양변여추노소현구치도신모선담석옥장".chars() {
            s.insert(c);
        }
        s
    };

    pub static ref EXCLUSION_TERMS: std::collections::HashSet<&'static str> = {
        let mut s = std::collections::HashSet::new();
        let words = vec![
            "공휴일", "공지", "공동", "공사", "공원", "공유", "공급",
            "반드시", "반납", "반품", "반영", "반장", 
            "서울시", "서류", "서비스", "서명", "서로", "서신",
            "강남구", "강조", "강화", "강의", "강당",
            "한도", "한국", "한정", "한번", "한계",
            "정상", "정기", "정리", "정보", "정책", "정부", "정산",
            "조사", "조치", "조정", "조직", "조회",
            "문서", "문제", "문화", "문의",
            "전체", "전화", "전결", "전달", "전문", "전략", "전자",
            "장소", "장비", "장부", "장기",
            "신청", "신규", "신뢰", "신고",
            "권한", "권리",
            "대상", "대리", "대표",
        ];
        for w in words { s.insert(w); }
        s
    };
    
    pub static ref BINARY_STR_RE: Regex = Regex::new(r"[\u{AC00}-\u{D7A3}a-zA-Z0-9\s\.,!\?@#$%&\(\)\-]{3,}").unwrap();
}

pub fn safe_truncate(s: &str, max_chars: usize) -> String {
    if s.chars().count() <= max_chars {
        return s.to_string();
    }
    let mut result: String = s.chars().take(max_chars).collect();
    result.push_str("...");
    result
}

pub fn is_word_boundary(text: &str, idx: usize) -> bool {
    if idx == 0 || idx >= text.len() { return true; }
    if !text.is_char_boundary(idx) { return false; }
    
    let is_boundary_char = |c: char| c.is_whitespace() || ".,:;()[]{}<>\"'!?\n\r\t".contains(c);
    
    if let Some(prev) = text[..idx].chars().last() {
        if is_boundary_char(prev) { return true; }
    }
    if let Some(next) = text[idx..].chars().next() {
        if is_boundary_char(next) { return true; }
    }
    false
}


pub fn score_candidate(text: &str, name: &str, start: usize, end: usize) -> i32 {
    let mut score = 0;
    let char_count = name.chars().count();
    
    match char_count {
        4 => score += 2,
        3 => score += 1,
        2 => score += 0,
        _ => return -20,
    }

    if is_word_boundary(text, start) { score += 1; }
    if is_word_boundary(text, end) { score += 1; }

    // Standalone word in a data grid cell
    if text.trim() == name { score += 5; }

    // Safe Suffix Check
    let tail_sample: String = text[end..].chars().take(12).collect();
    if TITLES.iter().any(|t| tail_sample.contains(t)) { score += 5; }

    // Safe Prefix Check
    let head_sample: String = text[..start].chars().rev().take(12).collect::<String>().chars().rev().collect();
    if LABELS.iter().any(|l| head_sample.contains(l)) { score += 3; }

    if BUSINESS_TERMS.contains(name) { score -= 20; }

    // Safe Around Check for PII
    let window_start = text[..start].char_indices().rev().nth(20).map(|(i, _)| i).unwrap_or(0);
    let window_end = text[end..].char_indices().nth(20).map(|(i, _)| end + i).unwrap_or(text.len());
    let around = &text[window_start..window_end];
    if around.contains("@") || around.contains("010-") || around.contains("사번") || around.contains("ID") {
        score += 4;
    }

    score
}

fn mask_hangul_name(name: &str) -> String {
    let chars: Vec<char> = name.chars().collect();
    match chars.len() {
        4 => {
            if name.starts_with("독고") || name.starts_with("남궁") || name.starts_with("제갈") || name.starts_with("사공") || name.starts_with("황보") {
                format!("{}{}**", chars[0], chars[1])
            } else {
                format!("{}**{}", chars[0], chars[3])
            }
        },
        3 => format!("{}*{}", chars[0], chars[2]),
        2 => format!("{}*", chars[0]),
        _ => name.to_string()
    }
}


pub fn apply_deidentification(input: &str) -> String {
    // [SAFETY] 입력 길이 제한 (정규표현식 스택 부하 방지 및 UTF-8 안전 처리)
    let safe_input = safe_truncate(input, 5000);
    // Stage 1: Statutory Hard Masking (Legal Safety Belt)
    // - RRN, Credit Cards, Phone Numbers, Emails
    // - Deterministic, No AI Judgment involved.
    let stage1 = mask_statutory_pii(&safe_input);

    // Stage 2: Context-Aware Inference (Audit Context)
    // - Names, Positions, Entities
    // - Protects privacy while PRESERVING audit evidence (e.g. "Gift Cards", "Vendors")
    let stage2 = mask_contextual_inference(&stage1);

    if &stage2 != &safe_input {
    // println!(">>> [DE-ID] Masked content: '{}' -> '{}'", safe_input, stage2);
    }

    stage2
}

// Stage 1: Mandatory Legal Protection
fn mask_statutory_pii(text: &str) -> String {
    let mut result = text.to_string();

    // 1. 주민등록번호 (뒷7자리 마스킹)
    result = RRN_REGEX.replace_all(&result, "$1-*******").to_string();

    // 2. 전화번호 (가운데/끝자리 마스킹)
    result = PHONE_REGEX.replace_all(&result, |caps: &regex::Captures| {
        let full = &caps[0];
        if full.contains('-') || full.contains(' ') {
            let parts: Vec<&str> = full.split(|c| c == '-' || c == ' ').filter(|s| !s.is_empty()).collect();
            if parts.len() >= 2 {
                format!("{}-****-{}", parts[0], parts.last().unwrap())
            } else {
                format!("{}****{}", &full[0..3], &full[full.len()-4..])
            }
        } else if full.len() >= 10 {
            format!("{}****{}", &full[0..3], &full[full.len()-4..])
        } else {
            full.to_string()
        }
    }).to_string();

    // 3. 카드번호 (중간 8자리 마스킹)
    result = CARD_REGEX.replace_all(&result, |caps: &regex::Captures| {
        let full = &caps[0];
        if full.len() >= 16 {
             format!("{}********{}", &full[0..4], &full[full.len()-4..])
        } else {
             full.to_string()
        }
    }).to_string();

    // 4. 이메일 (계정명 일부 마스킹)
    result = EMAIL_REGEX.replace_all(&result, |caps: &regex::Captures| {
        let email = &caps[0];
        let parts: Vec<&str> = email.split('@').collect();
        if parts.len() == 2 {
            let name = parts[0];
            let domain = parts[1];
            if name.len() > 2 {
                format!("{}***@{}", &name[0..2], domain)
            } else {
                format!("***@{}", domain)
            }
        } else {
            email.to_string()
        }
    }).to_string();

    result
}

// Stage 2: Audit Context & Risk Preservation
fn mask_contextual_inference(text: &str) -> String {
    let mut masked_text = text.to_string();

    // 1. Strict Name+Title Pattern (Very High Confidence)
    // Matches: "김철수 부장", "이영희 님"
    // Regex: NAME_TITLE_REGEX
    for cap in NAME_TITLE_REGEX.captures_iter(text) {
        if let Some(m) = cap.get(1) {
            let name = m.as_str();
            let range = m.range();
            
            // Check Exclusion (Title implies Name, but safe check)
            if EXCLUSION_TERMS.contains(name) { continue; }
            
            // Mask Middle Char
            let chars: Vec<char> = name.chars().collect();
            if chars.len() >= 2 {
                let mask_idx = if chars.len() == 2 { 1 } else { 1 };
                let mut new_name = String::new();
                for (i, c) in chars.iter().enumerate() {
                    if i == mask_idx { new_name.push('*'); } else { new_name.push(*c); }
                }
                masked_text.replace_range(range, &new_name);
            }
        }
    }

    // 2. Loose Name Scanner (Heuristic)
    // We scan for 3-char words starting with Surname that are NOT in exclusion list
    let working_text = masked_text.clone();
    let pattern = Regex::new(r"\b([가-힣]{3})\b").unwrap();
    
    for mat in pattern.find_iter(&working_text) {
        let word = mat.as_str();
        
        let chars: Vec<char> = word.chars().collect();
        if chars.len() != 3 { continue; }
        
        let first_char = chars[0];
        
        // Filter 1: Must start with a known Surname
        if !SURNAMES.contains(&first_char) { continue; }

        // Filter 2: Must NOT be in Exclusion list
        if EXCLUSION_TERMS.contains(word) { continue; }

        // Apply masking (Global replace for safety in this demo context)
        let mut masked_word = String::new();
        masked_word.push(chars[0]);
        masked_word.push('*');
        masked_word.push(chars[2]);
        
        masked_text = masked_text.replace(word, &masked_word);
    }

    masked_text
}

pub struct MaskingSession {
    pub map: HashMap<String, String>,
    pub reverse_map: HashMap<String, String>,
    pub counters: HashMap<String, usize>,
}

impl MaskingSession {
    pub fn new() -> Self {
        Self {
            map: HashMap::new(),
            reverse_map: HashMap::new(),
            counters: HashMap::new(),
        }
    }

    pub fn get_mask(&mut self, original: &str, category: &str) -> String {
        if let Some(masked) = self.map.get(original) {
            return masked.clone();
        }
        let count = self.counters.entry(category.to_string()).or_insert(0);
        *count += 1;
        
        // [FIX] Align with Frontend Identity Vault demo (Employee_NN instead of Name_01)
        let mask = if category == "Name" {
            format!("Employee_{}", count)
        } else {
            format!("{}_{:02}", category, count)
        };
        
        self.map.insert(original.to_string(), mask.clone());
        self.reverse_map.insert(mask.clone(), original.to_string());
        mask
    }

    pub fn unmask_string(&self, text: &str) -> String {
        let mut result = text.to_string();
        // Sort keys by length (desc) to avoid partial replacement issues (e.g. Name_1 replacing start of Name_10)
        let mut masked_keys: Vec<&String> = self.reverse_map.keys().collect();
        masked_keys.sort_by(|a, b| b.len().cmp(&a.len()));

        for masked in masked_keys {
            if let Some(original) = self.reverse_map.get(masked) {
                result = result.replace(masked, original);
            }
        }
        result
    }
}

pub fn mask_sensitive_data(text: &str, session: &mut MaskingSession) -> String {
    let mut result = text.to_string();

    // 1. Resident Registration Number (RRN) - Static Masking or Pseudonym
    let rrn_re = Regex::new(r"\d{6}-?[1-4]\d{6}").unwrap();
    let rrn_matches: Vec<String> = rrn_re.find_iter(&result).map(|m| m.as_str().to_string()).collect();
    for m in rrn_matches {
        let mask = session.get_mask(&m, "RRN");
        result = result.replace(&m, &mask);
    }

    // 2. Credit Card
    let card_re = Regex::new(r"\d{4}-\d{4}-\d{4}-\d{4}").unwrap();
    let card_matches: Vec<String> = card_re.find_iter(&result).map(|m| m.as_str().to_string()).collect();
    for m in card_matches {
        let last_4 = &m[m.len()-4..];
        let mask = format!("****-****-****-{}", last_4);
        result = result.replace(&m, &mask);
    }

    // 3. Email
    let email_re = Regex::new(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}").unwrap();
    let email_matches: Vec<String> = email_re.find_iter(&result).map(|m| m.as_str().to_string()).collect();
    for m in email_matches {
        if let Some(at_pos) = m.find('@') {
            let local = &m[..at_pos];
            if local.len() > 1 {
                let masked_email = format!("{}***{}", &local[..1], &m[at_pos..]);
                result = result.replace(&m, &masked_email);
            } else {
                result = result.replace(&m, &format!("***{}", &m[at_pos..]));
            }
        }
    }

    // 4. Phone Number (Pseudonymization)
    let phone_re = Regex::new(r"010-\d{3,4}-\d{4}").unwrap();
    let phone_matches: Vec<String> = phone_re.find_iter(&result).map(|m| m.as_str().to_string()).collect();
    for m in phone_matches {
        let mask = session.get_mask(&m, "Phone");
        result = result.replace(&m, &mask);
    }

    // 5. Employee Number (Pseudonymization)
    // Patterns: 240123 (6 digits starting with 2) or EMP-1234
    let emp_re = Regex::new(r"(?:\b2\d{5}\b|EMP-\d{4})").unwrap();
    let emp_matches: Vec<String> = emp_re.find_iter(&result).map(|m| m.as_str().to_string()).collect();
    for m in emp_matches {
        let mask = session.get_mask(&m, "EMP");
        result = result.replace(&m, &mask);
    }

    // 6. Address (Pseudonymization - Simple heuristics)
    // Looking for "시, "군", "구", "동", "길", "번지" patterns
    let addr_re = Regex::new(r"(?:[가-힣]+(?:시|도|군|구|동|면|리|길|로)\s?)+\d*번지?").unwrap();
    let addr_matches: Vec<String> = addr_re.find_iter(&result).map(|m| m.as_str().to_string()).collect();
    for m in addr_matches {
        if m.len() > 5 { // Avoid too short matches
            let mask = session.get_mask(&m, "Addr");
            result = result.replace(&m, &mask);
        }
    }

    // 7. Entity/Vendor (Pseudonymization - Heuristics for (주), Inc, etc.)
    let entity_re = Regex::new(r"[가-힣A-zA-Z0-9\s]{2,20}(?:\(주\)|주식회사|Inc\.|Ltd\.)").unwrap();
    let entity_matches: Vec<String> = entity_re.find_iter(&result).map(|m| m.as_str().to_string()).collect();
    for m in entity_matches {
        let mask = session.get_mask(&m, "Entity");
        result = result.replace(&m, &mask);
    }

    // 8. Positions/Ranks (Pseudonymization)
    let ranks = vec!["부장", "차장", "과장", "대리", "사원", "주임", "이사", "본부장", "상무", "전무", "대표", "회장", "주임", "계장"];
    for rank in ranks {
        let rank_re = Regex::new(&format!(r"\b{}\b", rank)).unwrap();
        let rank_matches: Vec<String> = rank_re.find_iter(&result).map(|m| m.as_str().to_string()).collect();
        for m in rank_matches {
            let mask = session.get_mask(&m, "Rank");
            result = result.replace(&m, &mask);
        }
    }

    // 9. Departments - DISABLED (User feedback: Team names should be visible)
    // let dept_re = Regex::new(r"[가-힣]{2,10}(?:팀|부|과|센터|파트|실)\b").unwrap();
    // ... disable logic ...


    // 10. Individual Names (Pseudonymization - 2-4 Korean chars)
    let name_re = Regex::new(r"\b[가-힣]{2,4}\b").unwrap();
    let name_matches: Vec<String> = name_re.find_iter(&result).map(|m| m.as_str().to_string()).collect();
    for m in name_matches {
        // [FIX] Department/Team Exclusion
        if m.ends_with("팀") || m.ends_with("부") || m.ends_with("과") || m.ends_with("센터") || m.ends_with("본부") || m.ends_with("그룹") || m.ends_with("지점") {
            continue;
        }

        let mask = session.get_mask(&m, "Name");
        result = result.replace(&m, &mask);
    }

    result
}

pub fn count_pii_entities(text: &str) -> usize {
    // [CRITICAL] Use global regexes for consistency
    let mut count = 0;
    
    count += RRN_REGEX.find_iter(text).count();
    count += PHONE_REGEX.find_iter(text).count();
    count += CARD_REGEX.find_iter(text).count();
    count += EMAIL_REGEX.find_iter(text).count();
    
    // Smart Name detection with business exclusion
    let business_exclusions = vec![
        "김가네", "이마트", "스타벅스", "하이마트", "쿠팡", "네이버", "카카오", "오피스디포",
        "고급", "회식비", "일식", "주류", "마트", "호텔", "숙박", "전자", "거래", "지우"
    ];
    
    let name_count = NAME_REGEX.find_iter(text)
        .filter(|m| {
            let s = m.as_str();
            !business_exclusions.iter().any(|&ex| s.contains(ex))
        })
        .count();
    
    count + name_count
}

// [PERMANENT] Hybrid PII Detection Engine
// Weight-based detection: analyzes COMBINATIONS of PII indicators in a row
#[allow(dead_code)]
pub fn calculate_row_pii_weight(row_text: &str) -> f32 {
    let mut weight = 0.0;
    
    // Use global constants/regexes where available
    if RRN_REGEX.is_match(row_text) { weight += 3.0; }
    if PHONE_REGEX.is_match(row_text) { weight += 1.5; }
    if CARD_REGEX.is_match(row_text) { weight += 2.0; }
    if EMAIL_REGEX.is_match(row_text) { weight += 1.0; }
    
    // Employee ID (Local regex for now)
    let emp_re = Regex::new(r"(?:\b2\d{5,7}\b|EMP-\d{4,6})").unwrap();
    if emp_re.is_match(row_text) { weight += 1.5; }
    
    // Department detection
    let dept_re = Regex::new(r"[\u{AC00}-\u{D7A3}]{2,10}(?:팀|부|과|센터|파트|실)\b").unwrap();
    let has_dept = dept_re.is_match(row_text);
    if has_dept { weight += 0.5; }
    
    // Name detection
    let has_name = if NAME_REGEX.is_match(row_text) {
        let matched = NAME_REGEX.find(row_text).map(|m| m.as_str()).unwrap_or("");
        let business_names = vec![
            "김가네", "이마트", "스타벅스", "하이마트", "쿠팡", "네이버", "카카오", "오피스디포",
            "고급", "회식비", "일식", "주류", "마트", "호텔", "숙박", "전자", "거래", "지우"
        ];
        if !business_names.iter().any(|&b| matched.contains(b)) {
            weight += 1.0;
            true
        } else {
            false
        }
    } else {
        false
    };
    
    // [CRITICAL] RE-IDENTIFICATION RISK: Name + Department combination
    if has_name && has_dept {
        weight += 1.5; // Significant boost for the combination as requested by user
    }
    
    // Address detection
    let address_re = Regex::new(r"(?:서울|경기|인천|부산|대구|광주|대전|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)[\u{AC00}-\u{D7A3}\s\d-]+(?:대로|길)\s*\d+").unwrap();
    if address_re.is_match(row_text) { weight += 1.0; }
    
    weight
}

// [PERMANENT] Batch PII Analysis for Large Datasets
#[allow(dead_code)]
pub fn analyze_batch_pii(rows: &[String], threshold: f32) -> Vec<bool> {
    rows.iter()
        .map(|row| calculate_row_pii_weight(row) >= threshold)
        .collect()
}


pub async fn geocode_address(address: &str, api_key: &str) -> Option<(f64, f64, String)> {
    println!(">>> [GEOCODE] Requesting: {}", address);
    let client = Client::new();
    let full_address = format!("{}, South Korea", address);
    let res_result = client.get("https://maps.googleapis.com/maps/api/geocode/json")
        .query(&[("address", &full_address), ("key", &api_key.to_string())])
        .send()
        .await;

    match res_result {
        Ok(res) => {
            if res.status().is_success() {
                let body: Value = res.json().await.ok()?;
                if let Some(results) = body.get("results").and_then(|r| r.as_array()) {
                    if let Some(first) = results.first() {
                        if let Some(loc) = first.get("geometry")?.get("location") {
                            let lat = loc.get("lat")?.as_f64()?;
                            let lng = loc.get("lng")?.as_f64()?;
                            let formatted_address = first.get("formatted_address")?.as_str()?.to_string();
                            return Some((lat, lng, formatted_address));
                        }
                    }
                }
            } else {
                println!(">>> [GEOCODE] API Error: {}", res.status());
            }
        },
        Err(e) => println!(">>> [GEOCODE] Network Error: {}", e),
    }

    println!(">>> [GEOCODE] Failed to locate: {}", address);
    None
}

pub fn read_file_with_encoding(path: &Path) -> Result<String, String> {
    let mut file = File::open(path).map_err(|e| e.to_string())?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer).map_err(|e| e.to_string())?;

    // 1. Try UTF-8 first
    if let Ok(utf8) = std::str::from_utf8(&buffer) {
        return Ok(utf8.to_string());
    }

    // 2. Try EUC-KR explicitly (User Request)
    let (cow, _, _) = EUC_KR.decode(&buffer);
    Ok(cow.to_string())
}

pub fn extract_text_from_zip(path: &Path, file_patterns: Vec<&str>) -> Result<String, String> {
    let file = File::open(path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
    let mut full_text = String::new();

    let mut files_to_read = Vec::new();
    for i in 0..archive.len() {
        if let Ok(file) = archive.by_index(i) {
            let name = file.name().to_string();
            if file_patterns.iter().any(|&p| name.contains(p) && name.ends_with(".xml")) {
                files_to_read.push(name);
            }
        }
    }

    for name in files_to_read {
        if let Ok(mut file) = archive.by_name(&name) {
            let mut content = String::new();
            if file.read_to_string(&mut content).is_ok() {
                full_text.reserve(content.len());
                let mut is_tag = false;
                for c in content.chars() {
                    if c == '<' { is_tag = true; }
                    else if c == '>' { is_tag = false; full_text.push(' '); }
                    else if !is_tag { full_text.push(c); }
                }
                full_text.push('\n');
            }
        }
    }

    if full_text.trim().is_empty() {
        return Err("No text extracted from document".to_string());
    }
    Ok(full_text)
}

pub fn compress_excel_data(range: &Range<Data>) -> (String, Vec<String>) {
    let mut row_store = Vec::new();
    for (_i, row) in range.rows().enumerate().skip(1).take(100000) { 
        let mut row_cells = Vec::new();
        for cell in row.iter() { row_cells.push(cell.to_string()); }
        let row_str = row_cells.join("|");
        row_store.push(row_str);
    }
    ("Full Scan Ready".to_string(), row_store)
}

pub fn compress_csv_data(content: String) -> (String, Vec<String>) {
    let mut row_store = Vec::new();
    for (_i, line) in content.lines().enumerate().skip(1).take(100000) {
        row_store.push(line.to_string());
    }
    ("Full Scan Ready".to_string(), row_store)
}

fn extract_strings_from_binary(path: &Path) -> Result<String, String> {
    let metadata = std::fs::metadata(path).map_err(|e| e.to_string())?;
    let mut file = File::open(path).map_err(|e| e.to_string())?;
    
    // [SAFETY] 프리뷰용 바이너리 스캔은 최대 2MB로 더 축소 (메모리 스파이크 방지)
    let read_size = std::cmp::min(metadata.len(), 2 * 1024 * 1024) as usize;
    let mut buffer = vec![0u8; read_size];
    file.read_exact(&mut buffer).map_err(|e| e.to_string())?;

    let mut result = String::new();
    
    // 1. 인코딩 디코딩 (전체 버퍼 한꺼번에)
    let (cow_euc, _, _) = EUC_KR.decode(&buffer);
    let (cow_u16, _, _) = encoding_rs::UTF_16LE.decode(&buffer);

    let mut combined_content = Vec::new();
    
    // 2. 정규표현식 기반 단어 추출 (최대 수집 개수 제한)
    for text in &[cow_euc, cow_u16] {
        for mat in BINARY_STR_RE.find_iter(text) {
            let s = mat.as_str().trim();
            if s.chars().count() >= 4 && s.chars().any(|c| c.is_alphanumeric()) {
                combined_content.push(s.to_string());
                if combined_content.len() > 500 { break; } // 너무 많이 수집하지 않음
            }
        }
        if combined_content.len() > 500 { break; }
    }

    // [SAFETY] 중복 제거 전 필터링
    combined_content.sort();
    combined_content.dedup();
    
    for s in combined_content.into_iter().take(150) {
        let line = safe_truncate(&s, 200);
        result.push_str(&line);
        result.push('\n');
    }

    if result.is_empty() {
        return Err("의미 있는 데이터를 찾을 수 없습니다.".into());
    }
    Ok(result)
}

pub fn read_any_file(path: &Path, ext: &str) -> Result<String, String> {
    // [SAFETY] 프리뷰용 파일 읽기 통합 제한 (10MB)
    let metadata = std::fs::metadata(path).map_err(|e| e.to_string())?;
    if metadata.len() > 10 * 1024 * 1024 && ext != "xlsx" && ext != "xls" {
        return Err("파일이 너무 커서 미리보기를 생성할 수 없습니다. (10MB 제한)".into());
    }

    match ext {
        "pdf" => {
            if metadata.len() > 5 * 1024 * 1024 {
                return Err("대용량 PDF는 미리보기를 지원하지 않습니다.".into());
            }
            match extract_text(path) {
                Ok(t) => Ok(t),
                Err(_) => extract_strings_from_binary(path).map(|s| format!("[PDF 텍스트 추출 폴백]\n(구조화된 추출에 실패하여 바이너리에서 복구된 데이터입니다)\n\n{}", s))
            }
        },
        "docx" => extract_text_from_zip(path, vec!["word/document"]),
        "pptx" => extract_text_from_zip(path, vec!["ppt/slides/slide"]),
        "xlsx" => extract_text_from_zip(path, vec!["xl/sharedStrings", "xl/worksheets/sheet"]),
        "eml" => {
            let content = std::fs::read(path).map_err(|e| e.to_string())?;
            let parsed = parse_mail(&content).map_err(|e| e.to_string())?;
            let subject = parsed.headers.get_first_value("Subject").unwrap_or("No Subject".to_string());
            let from = parsed.headers.get_first_value("From").unwrap_or("[SENDER_NOT_IDENTIFIED]".to_string());
            let body = parsed.get_body().unwrap_or("[EMPTY_EMAIL_BODY]".to_string());
            Ok(format!("[EMAIL]\nFrom: {}\nSubject: {}\nBody:\n{}", from, subject, body))
        },
        "msg" => extract_strings_from_binary(path).map(|s| format!("[MS-OUTLOOK .MSG 미리보기]\n(바이너리에서 텍스트만 추출되었습니다)\n\n{}", s)),
        "txt" | "md" | "json" | "xml" | "log" | "sql" | "csv" | "html" | "htm" => {
            read_file_with_encoding(path)
        },
        "exe" | "dll" | "zip" | "7z" | "rar" | "bin" | "dat" => {
            Err(format!("바이너리 파일로 감지되었습니다 (.{}), 안전을 위해 미리보기를 생략합니다.", ext))
        },
        _ => {
            let metadata = std::fs::metadata(path).map_err(|e| e.to_string())?;
            if metadata.len() > 1 * 1024 * 1024 { // Strict 1MB limit for unknown types
                 return Err(format!("Unknown binary or large file ({} bytes), preview skipped.", metadata.len()));
            }
            if let Ok(text) = read_file_with_encoding(path) {
                if text.len() > 0 && text.chars().take(200).all(|c| !c.is_control() || c.is_whitespace()) {
                    return Ok(text);
                }
            }
            Err(format!("Unsupported format or binary file: .{}", ext))
        }
    }
}

pub fn clean_json_response(raw: &str) -> String {
    // 1. Markdown Code Block Removal
    let re = Regex::new(r"(?s)```(?:json)?\s*([\s\S]*?)\s*```").unwrap();
    let cleaned = if let Some(caps) = re.captures(raw) {
        caps.get(1).map_or(raw, |m| m.as_str())
    } else {
        raw
    };

    // [CRITICAL FIX] Do NOT apply de-identification here. 
    // AI output must be parsed as valid JSON first. 
    // Unmasking happens in the audit engine using the session map.
    cleaned.to_string()
}

pub fn extract_json(text: &str) -> String {
    let cleaned = clean_json_response(text);
    // Fallback to finding the largest balanced block of { } or [ ]
    let first_brace = cleaned.find('{');
    let first_bracket = cleaned.find('[');

    match (first_brace, first_bracket) {
        (Some(brace_idx), Some(bracket_idx)) => {
            if brace_idx < bracket_idx {
                if let Some(last_brace) = cleaned.rfind('}') {
                    return cleaned[brace_idx..=last_brace].to_string();
                }
            } else {
                if let Some(last_bracket) = cleaned.rfind(']') {
                    return cleaned[bracket_idx..=last_bracket].to_string();
                }
            }
        }
        (Some(idx), None) => {
            if let Some(last) = cleaned.rfind('}') {
                return cleaned[idx..=last].to_string();
            }
        }
        (None, Some(idx)) => {
            if let Some(last) = cleaned.rfind(']') {
                return cleaned[idx..=last].to_string();
            }
        }
        _ => {}
    }
    cleaned
}
