/// ============================================================================
/// 🛡️ COMPLIANCE DD FLOW: THE SUPREME AUTHORITY
/// ============================================================================
/// 
/// [PHILOSOPHY]
/// This module is the final authority on what constitutes a violation.
/// AI must NEVER override or bypass this judgement.
/// AI is treated as a "Witness" (Narrator), not a "Judge".
///
/// [ARCHITECTURE]
/// 1. Data Ingestion -> Structured Rows
/// 2. Rule Engine (Deterministic) -> `ComplianceFinding` (Violation Declared)
/// 3. AI Witness Layer -> `AICommentary` (Contextual Explanation)
/// 4. Persistence -> DB (Process Complete)
/// ============================================================================

use serde::{Serialize, Deserialize};
use rusqlite::{params, Connection};
#[allow(unused_imports)]
use std::path::{Path, PathBuf};
#[allow(unused_imports)]
use chrono::NaiveDateTime;
use crate::ai::{call_gemini_flash, extract_json};

// =========================================================================
//  TYPE DEFINITIONS: The Structural Seal
// =========================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComplianceFinding {
    pub issue_id: String,           
    pub violation_type: String,     
    pub regulation_ref: String,     
    pub evidence: Vec<String>,      
    pub severity: String,           
    pub confidence: f32,            
    pub verdict_mode: String,       // "AUTOMATED" | "MANUAL_REVIEW"
    pub is_auto_confirmable: bool,  // Explicit whitelist flag for Phase 4
    pub grade: String,              // "A" | "B" | "C" | "D"
    pub logic_chain: Vec<String>,   // List of specific boolean checks passed
    
    #[serde(skip)] 
    #[allow(dead_code)]
    pub row_indices: Vec<usize>,
    #[allow(dead_code)]
    pub related_data: String, 
}

#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct AICommentary {
    pub narrative: String,           // The "Story"
    pub similarity_score: Option<f32>,
    pub disclaimers: Vec<String>,
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct TransactionRow {
    pub row_idx: usize,
    pub date_str: String,
    pub vendor: String,
    pub amount: f64,
    pub description: String,
    pub card_owner: String,
    pub timestamp: i64, 
}

// =========================================================================
//  LIFECYCLE: ADJUDICATION INTERFACE (Processing Layer)
//  Connects Suspicion Inbox -> Rule Engine
// =========================================================================

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum JudicialInabilityReason {
    NoApplicableRule,      // 헌법에 정의된 규범 중 매칭되는 조항 없음
    InsufficientFields,    // 판정에 필수적인 관측 데이터 필드 부족
    AmbiguousMapping,      // 데이터 매칭의 모호성으로 인한 판단 거부
    ConflictingRules,      // 상충하는 규칙으로 인한 확정 불가
    HeuristicOnlyViolation, // [MANIFESTO 3.1] 명시적 규칙 없이 AI 추론만 존재하는 경우
}

#[derive(Debug, Serialize, Deserialize)]
pub enum AdjudicationOutcome {
    Confirmed(ComplianceFinding), // Grade A (Auto) or B (Manual)
    Dismissed {                   // Grade D (Auto)
        reason: String,
        logic_chain: Vec<String>
    }, 
    Investigation {               // Grade C (Auto - Interpretation Limit)
        context: String,
        ai_signal_id: String
    },
    Unclassified {                // [PHASE 4.2] Boundary Check Failure
        reason: JudicialInabilityReason,
        message: String,
        logic_chain: Vec<String>
    },
    NeedsMoreEvidence(String),    // Legacy / Hold
}

pub struct Adjudicator;

impl Adjudicator {
    /// The Core Processing Function: "The Trial"
    /// Takes a Signal ID, loads evidence, applies rules, and delivers a verdict.
    pub fn adjudicate_signal(
        conn: &Connection, 
        signal_id: &str
    ) -> Result<AdjudicationOutcome, String> {
        
        // 1. Load SuspicionSignal (The Indictment)
        let signal_row = conn.query_row(
            "SELECT observation, scope, related_tx_ids, metadata, anomaly_score FROM suspicion_inbox WHERE signal_id = ?1",
            params![signal_id],
            |row| Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, f64>(4)?
            ))
        ).map_err(|e| format!("Signal Load Failed: {}", e))?;

        let (_observation, _scope, _related_ids_json, metadata_json, db_anomaly_score) = signal_row;
        
        // Parse metadata into JSON Value
        let metadata: serde_json::Value = metadata_json
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or(serde_json::json!({}));

        // 2. Structural Adjudication (Phase 4 Judge)
        // Judge does NOT read 'observation' text. Judge only consumes 'metadata' structure.
        
        // -------------------------------------------------------------------------
        // [PHASE 4.2] PRE-JUDGMENT: Field Validity Check
        // -------------------------------------------------------------------------
        let mut logic_chain = vec!["[공식 심사규정 v1.1] 검토 프로세스 시작".to_string()];
        
        let raw_amount = metadata.get("amount");
        let raw_location = metadata.get("location").or(metadata.get("merchant"));
        
        if raw_amount.is_none() || raw_location.is_none() {
            logic_chain.push("🚨 [HARD GUARD] Essential fields missing for regulation-based judgment.".to_string());
            return Ok(AdjudicationOutcome::Unclassified {
                reason: JudicialInabilityReason::InsufficientFields,
                message: "Essential fields (Amount/Location) missing in Observation.".to_string(),
                logic_chain
            });
        }

        let amount = raw_amount.and_then(|v| v.as_f64()).unwrap_or(0.0);
        let location = raw_location.and_then(|v| v.as_str()).unwrap_or("Unknown");
        let is_holiday = metadata.get("is_holiday").or(metadata.get("is_weekend")).and_then(|v| v.as_bool()).unwrap_or(false);
        let is_near_home = metadata.get("is_near_home").and_then(|v| v.as_bool()).unwrap_or(false);
        let is_split = metadata.get("is_split").and_then(|v| v.as_bool()).unwrap_or(false);
        let anomaly_score = metadata.get("anomaly_score").and_then(|v| v.as_f64()).unwrap_or(db_anomaly_score);

        // [Grade Constitution v1.1] Rule Category Mapping
        #[derive(PartialEq, Debug)]
        enum RuleCategory { IntentStrong, ObjectiveViolation, WeakSignal }
        
        let mut triggered_metadata = Vec::new(); // (ID, Category, Name)

        // Helper to log adjudication (PHASE 1-2 Guardian)
        let log_adj = |c: &Connection, sid: &str, rid: &str, crit: &str, res: &str, reas: &str| -> Result<(), String> {
            // [IDEMPOTENCY] Clear old logs for this rule/signal before inserting new ones
            let _ = c.execute("DELETE FROM adjudication_log WHERE signal_id = ?1 AND rule_id = ?2", params![sid, rid]);
            c.execute(
                "INSERT INTO adjudication_log (signal_id, rule_id, criterion, result, reasoning) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![sid, rid, crit, res, reas]
            ).map_err(|e| format!("Trace Path Incompleteness Error: 판단 로그 기록 실패 ({}). 실행을 중단합니다.", e))?;
            Ok(())
        };
        
        // --- 1. Intent-Strong Rules (IS) ---
        if is_split {
            let rule_id = "Rule_CC_SPLIT_01";
            let rule_name = "분할 결제(쪼개기) 의심";
            triggered_metadata.push((rule_id, RuleCategory::IntentStrong, rule_name));
            log_adj(conn, signal_id, rule_id, "동일 가맹점/시간대 분할 결제 여부", "Match", "단기간 내 반복 결제로 한도 회피 정황 포착")?;
        }
        
        // --- 2. Objective Violation Rules (OV) ---
        let restricted_keywords = vec!["Club", "Bar", "Lounge", "유흥", "주점", "클럽", "라운지", "단란", "멤버스", "노래", "안마", "룸"];
        let is_restricted = restricted_keywords.iter().any(|&kw| location.to_lowercase().contains(&kw.to_lowercase()));
        if is_restricted {
            let rule_id = "Rule_DET_RESTRICTED_01";
            let rule_name = "제한 업종 가맹점 이용";
            triggered_metadata.push((rule_id, RuleCategory::ObjectiveViolation, rule_name));
            log_adj(conn, signal_id, rule_id, "제한 업종(유흥/사치) 키워드 매칭", "Match", format!("가맹점명({})에 제한 키워드 포함 확인", location).as_str())?;
        }
        
        // --- 3. Contextual / Weak Signal Rules (CW) ---
        if is_holiday {
            let rule_id = "Rule_CW_HOLIDAY";
            triggered_metadata.push((rule_id, RuleCategory::WeakSignal, "휴무일 결제"));
            log_adj(conn, signal_id, rule_id, "공휴일 사용 여부", "Match", "공휴일 실사용 발생")?;
        }

        if is_near_home {
            let rule_id = "Rule_CW_NEAR_HOME";
            triggered_metadata.push((rule_id, RuleCategory::WeakSignal, "자택 인근 결제"));
            log_adj(conn, signal_id, rule_id, "거주지 반경 1km 이내", "Match", "사용자 자택 주변 결제 발생")?;
        }

        if amount >= 100_000.0 {
            let rule_id = "Rule_CW_HIGH_AMOUNT";
            let context_reason = if location.contains("호텔") || location.contains("숙박") {
                "업무상 숙박 한도 기준 확인 필요 (10만원 상회)"
            } else if location.contains("하이마트") || location.contains("전자") || location.contains("쿠팡") {
                "고액 자산성 물품 구매 패턴 관측 (증빙 대조 권고)"
            } else {
                "일반 식대 가이드라인(10만원)을 상회하는 결제액"
            };
            
            triggered_metadata.push((rule_id, RuleCategory::WeakSignal, context_reason));
            log_adj(conn, signal_id, rule_id, "단일 결제금액 10만원 상회", "Match", context_reason)?;
        }

        // [Phase 4-2] Grade Constitution v1.1 Matrix Mapping
        let is_count = triggered_metadata.iter().filter(|(_, cat, _)| *cat == RuleCategory::IntentStrong).count();
        let ov_count = triggered_metadata.iter().filter(|(_, cat, _)| *cat == RuleCategory::ObjectiveViolation).count();
        let cw_count = triggered_metadata.iter().filter(|(_, cat, _)| *cat == RuleCategory::WeakSignal).count();
        
        // No Adjudicator.anomaly_score usage for direct grading (Constitutional Guard)
        
        // [PHASE 4 CONSTITUTIONAL GUARDIAN] 
        // 1. Separation of Witness and Judge
        let witness_anomaly_score = metadata.get("anomaly_score").and_then(|v| v.as_f64()).unwrap_or(db_anomaly_score);
        let rule_hits = triggered_metadata.len();
        
        // 2. Adjudication evidence count per category
        let is_count = triggered_metadata.iter().filter(|(_, cat, _)| *cat == RuleCategory::IntentStrong).count();
        let ov_count = triggered_metadata.iter().filter(|(_, cat, _)| *cat == RuleCategory::ObjectiveViolation).count();
        let cw_count = triggered_metadata.iter().filter(|(_, cat, _)| *cat == RuleCategory::WeakSignal).count();

        // -------------------------------------------------------------------------
        // [AUDIT START] - AI Score is strictly ∉ Grade Assignment logic.
        // -------------------------------------------------------------------------

        // 1. GRADE A (AUTO-CONFIRMED): IS ∩ OV
        if is_count >= 1 && ov_count >= 1 {
            let main_rule = triggered_metadata.iter().find(|(_, cat, _)| *cat == RuleCategory::IntentStrong).unwrap();
            logic_chain.push(format!("검증: IS({}) & OV 교집합 확인됨", main_rule.0));
            return Ok(AdjudicationOutcome::Confirmed(ComplianceFinding {
                issue_id: format!("AUTO-A-{}", signal_id),
                violation_type: format!("{} ({})", main_rule.2, location),
                regulation_ref: "내부통제 표준 지침 §5.2".to_string(),
                evidence: vec![format!("가맹점: {}, 매칭 규칙: IS/OV", location)],
                severity: "Critical".to_string(),
                confidence: 1.0,
                verdict_mode: "AUTOMATED".to_string(),
                is_auto_confirmable: true,
                grade: "A".to_string(),
                logic_chain,
                row_indices: vec![],
                related_data: signal_id.to_string(),
            }));
        }

        // 2. GRADE B (PROBABLE IRREGULARITY): Primary Rule + Material Context (CW >= 2)
        if (is_count >= 1 || ov_count >= 1) && cw_count >= 2 {
            let main_rule = triggered_metadata.iter().find(|(_, cat, _)| *cat != RuleCategory::WeakSignal).unwrap();
            logic_chain.push(format!("검증: 주요 신호 및 정황 보강({}) 확인", cw_count));
            return Ok(AdjudicationOutcome::Confirmed(ComplianceFinding {
                issue_id: format!("REV-B-{}", signal_id),
                violation_type: format!("{} (정황 보강)", main_rule.2),
                regulation_ref: "카드 관리 가이드라인 §4.0".to_string(),
                evidence: vec![format!("패턴: {}, 정황 {}건", main_rule.2, cw_count)],
                severity: "Medium".to_string(),
                confidence: 0.8,
                verdict_mode: "MANUAL_REVIEW".to_string(),
                is_auto_confirmable: false,
                grade: "B".to_string(),
                logic_chain,
                row_indices: vec![],
                related_data: signal_id.to_string(),
            }));
        }

        // 3. GRADE C (UNRESOLVED ANOMALY): Reporting Interpretation Limit
        if is_count >= 1 || ov_count >= 1 || cw_count >= 2 {
             logic_chain.push("검증: 내부 규정 확정 요건 미달(C)".to_string());
             return Ok(AdjudicationOutcome::Investigation {
                context: format!("Interpretation Limit. IS:{}, OV:{}, CW:{}", is_count, ov_count, cw_count),
                ai_signal_id: signal_id.to_string()
            });
        }

        // 4. GRADE D (AUTO-DISMISSED): Zero IS/OV && Minimal CW (0 < CW < 2)
        if rule_hits > 0 && cw_count < 2 {
            logic_chain.push(format!("검증: 미미한 정황 노이즈({})로 기각", cw_count));
            return Ok(AdjudicationOutcome::Dismissed {
                reason: "Noise-Level Signal (Pass)".to_string(),
                logic_chain
            });
        }

        // -------------------------------------------------------------------------
        // [HARD GUARD] Rule Hits == 0 MUST result in UNCLASSIFIED: NoApplicableRule
        // -------------------------------------------------------------------------
        if rule_hits == 0 {
            logic_chain.push("🚨 [PHASE 1-3] Heuristic-only judgment detected and refused.".to_string());
            return Ok(AdjudicationOutcome::Unclassified {
                reason: JudicialInabilityReason::HeuristicOnlyViolation,
                message: format!("Manifesto 3.1 위반: 명시적 규칙(Deterministic Rules) 없이 AI 추론만으로 판결을 내릴 수 없습니다. (Score: {:.2})", witness_anomaly_score),
                logic_chain
            });
        }

        // Catch-all (Should be unreachable if guardian is exhaustive)
        Err("Fatal Engine Failure: Logic reached unhandled state without verdict.".to_string())
    }
}

// =========================================================================
//  LAYER 1: RULE ENGINE (Deterministic)
// =========================================================================

#[allow(dead_code)]
pub struct RuleEngine;

impl RuleEngine {
    
    // --- 1. Split Payment Check (쪼개기 결제) ---
    // Logic: Same vendor, Same person, Time gap < 30 min, Sum > Limit
    pub fn detect_split_payments(rows: &Vec<TransactionRow>) -> Vec<ComplianceFinding> {
        let mut findings = Vec::new();
        let limit = 500_000.0; // Corporate card limit per usage (Example)
        let time_threshold_sec = 1800; // 30 minutes

        // Group by (CardOwner, Vendor)
        let mut groups: std::collections::HashMap<(String, String), Vec<&TransactionRow>> = std::collections::HashMap::new();
        for r in rows {
            groups.entry((r.card_owner.clone(), r.vendor.clone())).or_default().push(r);
        }

        for ((owner, vendor), txs) in groups {
            if txs.len() < 2 { continue; }
            let mut sorted = txs.clone();
            sorted.sort_by_key(|r| r.timestamp);

            let mut batch: Vec<&TransactionRow> = Vec::new();
            
            for i in 0..sorted.len() {
                if batch.is_empty() {
                    batch.push(sorted[i]);
                } else {
                    let prev = batch.last().unwrap();
                    if (sorted[i].timestamp - prev.timestamp).abs() <= time_threshold_sec {
                        batch.push(sorted[i]);
                    } else {
                         // Check previous batch
                         if batch.len() >= 2 {
                             let sum_amt: f64 = batch.iter().map(|r| r.amount).sum();
                             if sum_amt >= limit {
                                 findings.push(Self::create_split_finding(owner.clone(), vendor.clone(), &batch, sum_amt));
                             }
                         }
                         batch.clear();
                         batch.push(sorted[i]);
                    }
                }
            }
            // Check last batch
            if batch.len() >= 2 {
                let sum_amt: f64 = batch.iter().map(|r| r.amount).sum();
                if sum_amt >= limit {
                     findings.push(Self::create_split_finding(owner.clone(), vendor.clone(), &batch, sum_amt));
                }
            }
        }
        findings
    }

    fn create_split_finding(owner: String, vendor: String, batch: &Vec<&TransactionRow>, total: f64) -> ComplianceFinding {
        let times: Vec<String> = batch.iter().map(|r| format!("{} ({} KRW)", r.date_str, r.amount)).collect();
        ComplianceFinding {
            issue_id: format!("SPLIT-{}-{}", owner, batch[0].timestamp),
            violation_type: "Split Payment (쪼개기 결제)".to_string(),
            regulation_ref: "Internal Control §5.2 (Prohibition of Payment Splitting)".to_string(),
            evidence: vec![
                format!("Vendor: {}", vendor),
                format!("Card Owner: {}", owner),
                format!("Total Amount: {} KRW", total),
                format!("Transactions ({}): {:?}", batch.len(), times)
            ],
            severity: "High".to_string(),
            confidence: 1.0,
            verdict_mode: "MANUAL_REVIEW".to_string(), 
            is_auto_confirmable: false, // Legacy fallback is always manual
            grade: "B".to_string(),
            logic_chain: vec!["Source: Legacy RuleEngine (Split Detect)".to_string()],
            row_indices: batch.iter().map(|r| r.row_idx).collect(),
            related_data: format!("Split payment group by {} at {}", owner, vendor),
        }
    }

    // --- 2. Restricted Vendor Check (유흥업종) ---
    pub fn detect_restricted_vendors(rows: &Vec<TransactionRow>) -> Vec<ComplianceFinding> {
        let mut findings = Vec::new();
        let restricted = vec!["Club", "Bar", "Room Salon", "Karaoke", "유흥", "단란", "주점", "안마"];
        
        for r in rows {
            for kw in &restricted {
                if r.vendor.to_lowercase().contains(&kw.to_lowercase()) || r.description.contains(kw) {
                    findings.push(ComplianceFinding {
                        issue_id: format!("RES-{}-{}", r.row_idx, kw),
                        violation_type: format!("부적절 가맹점 이용 ({})", r.vendor),
                        regulation_ref: "경비 집행 정책 §3.1 (제한업종)".to_string(),
                        evidence: vec![
                            format!("가맹점명: {}", r.vendor),
                            format!("매칭 키워드: {}", kw),
                            format!("결제 금액: {}", r.amount),
                            format!("결제 일자: {}", r.date_str)
                        ],
                        severity: "Critical".to_string(),
                        confidence: 1.0,
                        verdict_mode: "AUTOMATED".to_string(), 
                        is_auto_confirmable: true,
                        grade: "A".to_string(),
                        logic_chain: vec![format!("출처: 레거시 룰 엔진 (키워드: {})", kw)],
                        row_indices: vec![r.row_idx],
                        related_data: format!("제한 업종 이용 감지: {}", r.vendor),
                    });
                    break; 
                }
            }
        }
        findings
    }
}

// =========================================================================
//  LAYER 2: AI WITNESS (Commentary)
// =========================================================================

#[allow(dead_code)]
pub struct AIWitness; // "Your job is NOT to judge."

impl AIWitness {
    pub async fn testify(finding: &ComplianceFinding) -> AICommentary {
        let prompt = format!(
            r#"
            You are a senior auditor providing a testimony for an internal investigation.
            A violation has already been established determined by the Rule Engine.
            
            [ESTABLISHED FACTS]
            Violation: {}
            Regulation: {}
            Evidence: {:?}
            
            Your Task: Explain this violation in professional Korean auditing language.
            - Do not evaluate if it is a violation (it IS one).
            - Explain WHY this pattern is generally prohibited.
            - Suggest standard remediation steps.
            
            Response Format (JSON):
            {{
                "narrative": "...",
                "disclaimers": ["Automatic AI inference based on rule finding"]
            }}
            "#,
            finding.violation_type,
            finding.regulation_ref,
            finding.evidence
        );

        match call_gemini_flash(&prompt).await {
            Ok(json_str) => {
                let cleaned = extract_json(&json_str);
                let mut commentary: AICommentary = serde_json::from_str(&cleaned).unwrap_or(AICommentary {
                    narrative: "AI Testimony Unavailable (JSON Parse Error)".to_string(),
                    similarity_score: None,
                    disclaimers: vec!["Analysis Failed".to_string()]
                });

                // [SAFETY SEAL] Mandatory Legal Disclaimers (Force Injection)
                // AI cannot override these statements.
                let mandatory_disclaimers = vec![
                    "본 설명은 위반 여부에 대한 판단이 아닌, 확정된 사실에 대한 정황 참고 의견입니다.".to_string(),
                    "최종 위반/리스크 판정은 Rule Engine에 의해 이미 확정되었습니다.".to_string()
                ];
                
                // Prepend mandatory disclaimers
                for (i, d) in mandatory_disclaimers.into_iter().enumerate() {
                    commentary.disclaimers.insert(i, d);
                }

                commentary
            },
            Err(_) => AICommentary {
                narrative: "AI Testimony Unavailable (API Error)".to_string(),
                similarity_score: None,
                disclaimers: vec!["Network Error".to_string()]
            }
        }
    }
}

// =========================================================================
//  ORCHESTRATOR
// =========================================================================

#[allow(dead_code)]
pub async fn run_compliance_check_flow(
    target_files: Vec<(String, String)>, // (Path, Name)
    project_type: &str,
    db_path: &PathBuf,
    app_handle: &tauri::AppHandle
) -> Result<(usize, usize), String> {
    
    // 1. Data Ingestion & Normalization
    let mut all_txs: Vec<TransactionRow> = Vec::new();
    
    for (path_str, _) in target_files {
        let rows = crate::audit_engine::load_file_rows(&path_str);
        if rows.is_empty() { continue; }

        // [STRICT GUARD] Detect Headers & Map Columns
        let mut date_idx: i32 = -1;
        let mut vendor_idx: i32 = -1;
        let mut amt_idx: i32 = -1;
        let mut user_idx: i32 = -1;
        let mut desc_idx: i32 = -1;

        if let Some(headers) = rows.get(0) {
            for (idx, h) in headers.iter().enumerate() {
                let lower = h.to_lowercase();
                if lower.contains("date") || lower.contains("일자") || lower.contains("일시") { date_idx = idx as i32; }
                if lower.contains("vendor") || lower.contains("가맹점") || lower.contains("거래처") || lower.contains("상호") { vendor_idx = idx as i32; }
                if lower.contains("amount") || lower.contains("금액") || lower.contains("합계") || lower.contains("가격") { amt_idx = idx as i32; }
                if lower.contains("user") || lower.contains("사용자") || lower.contains("성명") || lower.contains("이름") { user_idx = idx as i32; }
                if lower.contains("description") || lower.contains("적요") || lower.contains("내용") || lower.contains("목적") || lower.contains("category") { desc_idx = idx as i32; }
            }
        }

        // [MANIFESTO 3.1] If no amount column, it's likely master data or reference, NOT a transaction file.
        if amt_idx == -1 {
            println!(">>> [CONSTITUTIONAL FILTER] Skipping non-transactional file (No Amount column): {}", path_str);
            continue;
        }

        for (i, row) in rows.iter().enumerate() {
            if i == 0 { continue; } // Skip header
            
            let date = if date_idx >= 0 { row.get(date_idx as usize).cloned().unwrap_or_else(|| \"NOT_SPECIFIED\".to_string()) } else { \"NOT_SPECIFIED\".to_string() };
            let vendor = if vendor_idx >= 0 { row.get(vendor_idx as usize).cloned().unwrap_or_else(|| \"MISSING_VENDOR\".to_string()) } else { \"MISSING_VENDOR\".to_string() };
            let amt_str = if amt_idx >= 0 { row.get(amt_idx as usize).cloned().unwrap_or_else(|| \"0\".to_string()).replace(\",\", \"\") } else { \"0\".to_string() };
            let user = if user_idx >= 0 { row.get(user_idx as usize).cloned().unwrap_or_else(|| \"MISSING_USER\".to_string()) } else { \"MISSING_USER\".to_string() };
            let desc = if desc_idx >= 0 { row.get(desc_idx as usize).cloned().unwrap_or_else(|| \"-\".to_string()) } else { \"-\".to_string() };
            
            let amount = amt_str.parse::<f64>().unwrap_or(0.0);
            if amount <= 0.0 { continue; } // Skip zero or invalid amounts

            // [FIX] Parse Timestamp to avoid Split-Payment Logic Overload/Infinite Loop
            let mut ts = 0;
            if !date.is_empty() {
                // Try common formats: YYYY-MM-DD
                if let Ok(ndt) = chrono::NaiveDate::parse_from_str(&date, "%Y-%m-%d") {
                    ts = ndt.and_hms_opt(0, 0, 0).map(|d| d.and_utc().timestamp()).unwrap_or(0);
                }
            }
            // Fallback: If no date, use row index as a seed for a stable (yet distinct) timestamp
            if ts == 0 { ts = (i as i64 + 1) * 86400; } 

            all_txs.push(TransactionRow {
                row_idx: i,
                date_str: date,
                vendor,
                amount,
                description: desc,
                card_owner: user, 
                timestamp: ts
            });
        }
    }

    if all_txs.is_empty() {
        println!(">>> [AUDIT] No valid transactions found after filtering. Process ended.");
        return Ok((0, 0));
    }
    let total_tx_count = all_txs.len();

    // 2. Rule Engine Execution (Deterministic)
    let mut findings: Vec<ComplianceFinding> = Vec::new();
    
    findings.extend(RuleEngine::detect_split_payments(&all_txs));
    findings.extend(RuleEngine::detect_restricted_vendors(&all_txs));
    
    // 3. AI Witness "Testimony" (Parallelized)
    use futures::future::join_all;
    
    let mut tasks = Vec::new();
    for finding in findings {
        tasks.push(tokio::spawn(async move {
            let commentary = AIWitness::testify(&finding).await;
            (finding, commentary)
        }));
    }

    let results = join_all(tasks).await;
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let mut saved_count = 0;

    for res in results {
        if let Ok((finding, commentary)) = res {
            // 4. Persistence
            let _ = conn.execute(
                "INSERT INTO audit_issues (
                    project_type, issue_title, description, severity, 
                    detected_at, evidence_quote, status, recommendations,
                    verdict_mode, logic_chain
                ) VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP, ?5, 'Open', ?6, ?7, ?8)",
                params![
                    project_type,
                    finding.violation_type,
                    commentary.narrative, 
                    finding.severity,     
                    finding.evidence.join("\n"),
                    format!("Violation of {}", finding.regulation_ref),
                    finding.verdict_mode,
                    serde_json::to_string(&finding.logic_chain).unwrap_or_else(|_| "[]".to_string())
                ]
            );
            saved_count += 1;
        }
    }

    Ok((total_tx_count, saved_count))
}
