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
    pub manager_comment: Option<String>
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AnalysisResult {
    pub findings_count: i32,
    pub risk_score: i32,
    pub status: String,
}

// AI 분석 결과 전체를 담는 구조체
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuditAnalysisResult {
    pub summary: String,
    pub risk_score: i32,
    pub findings: Vec<AuditFinding>,
}

// 개별 발견 사항 (여기에 채택/기각 여부, 증빙 등이 포함되어야 함)
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SheetData {
    pub name: String,
    pub data: Vec<Vec<String>>,
}
