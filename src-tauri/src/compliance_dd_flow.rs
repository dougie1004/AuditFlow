use serde::{Serialize, Deserialize};
use rusqlite::{params, Connection};
use std::path::{Path, PathBuf};

// --- DATA STRUCTURES ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComplianceFinding {
    pub issue_id: String,           
    pub violation_type: String,     
    pub regulation_ref: String,     
    pub evidence: Vec<String>,      
    pub severity: String,           
    pub confidence: f32,            
    pub verdict_mode: String,       
    pub is_auto_confirmable: bool,  
    pub grade: String,              
    pub logic_chain: Vec<String>,   
    #[serde(skip)] pub row_indices: Vec<usize>,
    pub related_data: String, 
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AICommentary {
    pub narrative: String,           
    pub similarity_score: Option<f32>,
    pub disclaimers: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct TransactionRow {
    pub row_idx: usize,
    pub date_str: String,
    pub vendor: String,
    pub amount: f64,
    pub description: String,
    pub card_owner: String,
    pub timestamp: i64, 
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum JudicialInabilityReason {
    NoApplicableRule,      
    InsufficientFields,    
    AmbiguousMapping,      
    ConflictingRules,      
    HeuristicOnlyViolation, 
}

#[derive(Debug, Serialize, Deserialize)]
pub enum AdjudicationOutcome {
    Confirmed(ComplianceFinding), 
    Dismissed { reason: String, logic_chain: Vec<String> }, 
    Investigation { context: String, ai_signal_id: String },
    Unclassified { reason: JudicialInabilityReason, message: String, logic_chain: Vec<String> },
    NeedsMoreEvidence(String),    
}

// --- ADJUDICATOR (Deterministic Choice 2) ---

pub struct Adjudicator;

impl Adjudicator {
    pub fn adjudicate_signal(
        conn: &Connection, 
        signal_id: &str
    ) -> Result<AdjudicationOutcome, String> {
        
        let signal_row = conn.query_row(
            "SELECT observation, anomaly_score, metadata FROM suspicion_inbox WHERE signal_id = ?1",
            params![signal_id],
            |row| Ok((
                row.get::<_, String>(0)?,
                row.get::<_, f64>(1)?,
                row.get::<_, Option<String>>(2)?
            ))
        ).map_err(|e| format!("Signal Load Failed: {}", e))?;

        let (observation, anomaly_score, metadata_json) = signal_row;
        let metadata: serde_json::Value = metadata_json
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or(serde_json::json!({}));

        let merchant = metadata.get("merchant").and_then(|v| v.as_str()).unwrap_or("Unknown");
        let amount = metadata.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let is_split = metadata.get("is_split").and_then(|v| v.as_bool()).unwrap_or(false);

        let mut logic_chain = vec!["[Deterministic Rule Check v1.0] 시작".to_string()];

        // Rule 1: Split Payment (Rule_CC_SPLIT_01)
        if is_split {
            logic_chain.push("규칙 매칭: Rule_CC_SPLIT_01 (분할 결제 정황)".to_string());
            return Ok(AdjudicationOutcome::Confirmed(ComplianceFinding {
                issue_id: format!("RULE-SPLIT-{}", signal_id),
                violation_type: "분할 결제(쪼개기) 의심".to_string(),
                regulation_ref: "내부통제 지침 §5.2".to_string(),
                evidence: vec![format!("가맹점: {}, 금액: {}, 정황: 단시간 내 반복 결제", merchant, amount)],
                severity: "High".to_string(),
                confidence: 1.0,
                verdict_mode: "DETERMINISTIC".to_string(),
                is_auto_confirmable: false,
                grade: "B".to_string(),
                logic_chain,
                row_indices: vec![],
                related_data: signal_id.to_string(),
            }));
        }

        // Rule 2: Restricted Vendor (Rule_CC_RESTRICTED_VENDOR)
        let restricted = vec!["Bar", "Club", "유흥", "주점", "단란"];
        if restricted.iter().any(|&kw| merchant.contains(kw) || observation.contains(kw)) {
            logic_chain.push("규칙 매칭: Rule_CC_RESTRICTED_VENDOR (제한 업종)".to_string());
            return Ok(AdjudicationOutcome::Confirmed(ComplianceFinding {
                issue_id: format!("RULE-RES-{}", signal_id),
                violation_type: "제한 업종 가맹점 이용".to_string(),
                regulation_ref: "법인카드 사용 정책 §3.1".to_string(),
                evidence: vec![format!("가맹점: {}, 키워드 매칭됨", merchant)],
                severity: "Critical".to_string(),
                confidence: 1.0,
                verdict_mode: "DETERMINISTIC".to_string(),
                is_auto_confirmable: true,
                grade: "A".to_string(),
                logic_chain,
                row_indices: vec![],
                related_data: signal_id.to_string(),
            }));
        }

        // Default: Dismiss but provide context on why it was a signal
        let reason = if anomaly_score >= 0.7 {
            "고위험군 관찰 데이터: 규정 위반은 아니나 평소보다 높은 금액 수준 보임".to_string()
        } else if anomaly_score >= 0.4 {
            "단순 관찰 데이터: 데이터 패턴상 특이점 발견됨 (규정 미위반)".to_string()
        } else {
            "일반 데이터: 통계적 유의미성 낮음".to_string()
        };

        Ok(AdjudicationOutcome::Dismissed { 
            reason,
            logic_chain 
        })
    }
}

pub struct RuleEngine; 
impl RuleEngine {
    pub fn detect_split_payments(_rows: &Vec<TransactionRow>) -> Vec<ComplianceFinding> { vec![] }
    pub fn detect_restricted_vendors(_rows: &Vec<TransactionRow>) -> Vec<ComplianceFinding> { vec![] }
}

pub struct AIWitness;
impl AIWitness {
    pub async fn testify(finding: &ComplianceFinding) -> AICommentary {
        AICommentary {
            narrative: format!("규정 준수 검토 결과: '{}' 위반 사항이 확정적 규칙에 의해 감지되었습니다.", finding.violation_type),
            similarity_score: None,
            disclaimers: vec!["Deterministic Rule Output".to_string()]
        }
    }
}

// flow to bridge data to audit_issues
#[allow(dead_code)]
pub async fn run_compliance_check_flow(
    target_files: Vec<(String, String)>,
    project_type: &str,
    db_path: &PathBuf,
    _app_handle: &tauri::AppHandle
) -> Result<(usize, usize), String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let mut total_processed = 0;
    let mut findings_saved = 0;

    for (path, _) in target_files {
        let rows = crate::audit_engine::load_file_rows(&path);
        total_processed += rows.len();
        
        // Simple Deterministic Scan on Raw Rows
        // Rule: Restricted Vendor
        let restricted_keywords = vec!["Bar", "Club", "유흥", "주점", "단란"];
        for (i, row) in rows.iter().enumerate() {
            let row_text = row.join(" | ");
            if restricted_keywords.iter().any(|&kw| row_text.contains(kw)) {
                let _ = conn.execute(
                    "INSERT INTO audit_issues (project_type, issue_title, description, severity, status, verdict_mode, grade, detected_at) 
                     VALUES (?1, ?2, ?3, 'Critical', 'Open', 'DETERMINISTIC', 'A', CURRENT_TIMESTAMP)",
                    params![project_type, "제한 업종 직접 감지", format!("행 {}: 가맹점 내 제한 키워드 포함", i)]
                );
                findings_saved += 1;
            }
        }
    }

    Ok((total_processed, findings_saved))
}
