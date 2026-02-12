use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuditIssue { 
    pub id: i64, 
    pub issue_title: String, 
    pub description: String, 
    pub severity: String, 
    pub raw_row_data: Option<String>, 
    pub row_index: i32,
    pub detected_at: String,
    pub recommendations: String,
    pub evidence_quote: String,
    pub audit_id: Option<String>,
    pub evidence_image: Option<String>,
    pub status: String,
    pub assignee: Option<String>,
    pub due_date: Option<String>,
    pub remediation_plan: Option<String>,
    pub manager_comment: Option<String>,
    pub grade: String,
    pub verdict_mode: String,
    pub logic_chain: String
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuditProject {
    pub id: String, // UUID
    pub title: String,
    pub status: String, // Planning, Fieldwork, Reporting, Closed
    pub progress_pct: i32,
    pub start_date: String,
    pub end_date: String,
    pub lead_auditor: String,
    // Detailed Editable Fields
    pub planning_start: Option<String>,
    pub planning_end: Option<String>,
    pub fieldwork_start: Option<String>,
    pub fieldwork_end: Option<String>,
    pub reporting_start: Option<String>,
    pub reporting_end: Option<String>,
    pub audit_scope: Option<String>,
    pub findings_count: i32,
    pub risk_score: i32,
    pub created_at: Option<String>,
    pub valuation_tier: Option<String>, // seed, startup, enterprise
    pub entity_id: Option<i64>,
}

// AuditFinding removed as it is currently unused and causing warnings.

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemEvent {
    pub id: String, // UUID
    pub timestamp: String,
    pub event_type: String, // AI_SIGNAL, RISK_CHANGE, SYSTEM_ALERT
    pub description: String,
    pub related_entity_id: Option<i64>,
    pub audit_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuditPlan {
    pub id: i64,
    pub year: i32,
    pub audit_domain: String,
    pub risk_score: i32,
    pub strategic_importance: String,
    pub resource_days: i32,
    pub status: String,
    pub description: String
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuditUniverseEntity {
    pub id: i64,
    pub unit_name: String,
    pub category: String,
    pub impact_score: i32,
    pub likelihood_score: i32,
    pub last_audit_year: i32,
    pub budget_size: String,
    pub headcount: i32,
    pub last_audit_rating: String,
    pub key_systems: String,
    pub ai_analysis: Option<AiRiskAnalysis>,
    pub findings_count: i32,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CardTransaction {
    pub id: i64,
    pub emp_name: String,
    pub dept_name: String,
    pub card_num: String,
    pub vendor_name: String,
    pub amount: i64,
    pub date: String,
    pub category: String,
    pub address: String,
    pub lat: f64,
    pub lng: f64,
    pub risk_score: i32,
    pub risk_reason: String,
    pub is_near_home: bool,
    pub is_late_night: bool,
    pub home_address: String,
    pub home_lat: f64,
    pub home_lng: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImpactBreakdown {
    pub financial_loss: i32,
    pub strategic_impact: i32,
    pub reputation_risk: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LikelihoodBreakdown {
    pub historical_frequency: i32,
    pub control_weakness: i32,
    pub process_complexity: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AiRiskAnalysis {
    pub reason: String,
    pub impact_score: i32,
    pub likelihood_score: i32,
    pub impact_breakdown: ImpactBreakdown,
    pub likelihood_breakdown: LikelihoodBreakdown,
    pub audit_approach: Option<String>,
    pub reference_standard: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AnalysisResult {
    pub findings_count: i32,
    pub risk_score: i32,
    pub status: String,
}

// AI 분석 결과 전체를 담는 구조체
#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuditAnalysisResult {
    pub summary: String,
    pub risk_score: i32,
    pub findings: Vec<AuditFinding>,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuditFinding {
    pub id: String,
    pub category: String,
    pub severity: String, // High, Medium, Low
    pub description: String,
    pub evidence: String, // 상세 증빙 데이터
    pub recommendation: String,
    pub status: String, // "Pending", "Accepted", "Rejected"
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SheetData {
    pub name: String,
    pub data: Vec<Vec<String>>,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuditScenario {
    pub id: String, // e.g., "PR-01", "CC-01"
    pub name: String,
    pub domain: String,
    pub risk_level: String, // High, Medium, Low
    pub description: String,
    pub rules: Option<String>, // JSON string
    pub ai_prompt_template: Option<String>,
    pub required_fields: Option<String>,
    pub version: String,
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuditObject {
    pub id: String, // UUID
    pub object_type: String, // LEDGER, APPROVAL, POLICY, EMAIL, DOC
    pub source: String, // file, manual, api
    pub extracted_fields: String, // JSON
    pub ingested_at: String,
    pub version: i32,
    pub status: String, // ACTIVE, SUPERSEDED
    pub project_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RelationCandidate {
    pub from_object_id: String,
    pub to_object_id: String,
    pub reason_codes: String, // JSON Array
    pub confidence: String, // heuristic, pattern, exact
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReEvaluationEvent {
    pub trigger_object_id: String,
    pub affected_object_id: String,
    pub reason: String, // e.g. "new policy context"
    pub logged_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuditSession {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub period_start: String,
    pub period_end: String,
    pub included_object_types: String,
    pub status: String, // OPEN, CLOSED, ARCHIVED
    pub final_report: Option<String>, // Generated summary report after closing
    pub reviewer_name: Option<String>,
    pub reviewer_ack: Option<String>, // Timestamp of Reviewer acknowledgement
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReviewItem {
    pub id: String,
    pub session_id: String,
    pub object_id: Option<String>,
    pub relation_candidate_id: Option<String>,
    pub reason: String,
    pub status: String, // PENDING, CONFIRMED, ESCALATED, DEFERRED, DISMISSED
    pub snapshot_data: Option<String>, // JSON snapshot of the object/context at creation
    pub reviewer_note: Option<String>,
    pub reviewer_final_note: Option<String>, // Note by the Reviewer on ESCALATED items
    pub created_at: String,
}

// [PATENT CLAIM] The Structure of Audit Signal Vector (Cloud Transmission)
// This struct enforces the "Zero-Trust" architecture at the compiler level.
// It is physically impossible to construct this payload with raw text fields.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuditSignalPayload {
    // 1. Identity is Hashed (Zero Knowledge)
    pub evidence_hash: String, 
    
    // 2. Content is Signalized (Vectorization)
    pub extracted_signals: Vec<String>, // e.g. ["urgent", "weekend", "high_amount", "gift_card"]
    
    // 3. Context is Metadata (No Raw Text)
    // Using HashMap requires std::collections::HashMap or models.rs import
    pub meta_dimension: std::collections::HashMap<String, String>, 
    
    // 4. Minimal Context Snippet (Must be Masked)
    pub masked_snippet: Option<String>,
}
