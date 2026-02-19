export interface AuditObject {
    id: string;
    object_type: string;
    source: string;
    extracted_fields: string;
    ingested_at: string;
    version: number;
    status: string;
    project_id?: string | null;
}

export interface RelationCandidate {
    from_object_id: string;
    to_object_id: string;
    reason_codes: string;
    confidence: string;
    created_at: string;
}

export type AccountBehavior =
    | 'StructuralConcentrationAllowed'
    | 'DistributionExpected'
    | 'VolatilityObserved'
    | 'AdjustmentSensitive'
    | 'EarningsManagementSensitive'
    | 'Normal';

export interface StructuralInsight {
    account: string;
    behavior: AccountBehavior;
    volatility: number;
    concentration_ratio_1: number;
    concentration_ratio_3: number;
    hhi_index: number;
    distribution_shift: number;
    structural_score: number;
    status: string;
    reasons: string[];
    recommended_focus: boolean;
    is_statistically_significant: boolean;
}

export interface AuditSession {
    id: string;
    project_id: string;
    name: string;
    period_start: string;
    period_end: string;
    included_object_types: string;
    status: 'OPEN' | 'CLOSED' | 'ARCHIVED';
    final_report?: string | null;
    reviewer_name?: string | null;
    reviewer_ack?: string | null;
    created_at: string;
}

export interface ReviewItem {
    id: string;
    session_id: string;
    object_id?: string | null;
    relation_candidate_id?: string | null;
    reason: string;
    status: 'PENDING' | 'CONFIRMED' | 'ESCALATED' | 'DEFERRED' | 'DISMISSED';
    snapshot_data?: string | null;
    reviewer_note?: string | null;
    reviewer_final_note?: string | null;
    created_at: string;
}

export interface AuditIssue {
    id: number;
    issue_title: string;
    description: string;
    severity: 'High' | 'Medium' | 'Low';
    raw_row_data?: string | null;
    row_index: number;
    detected_at: string;
    recommendations: string;
    evidence_quote: string;
    audit_id?: string | null;
    evidence_image?: string | null;
    status: 'Open' | 'Accepted' | 'Rejected' | 'Remediated' | 'Closed';
    assignee?: string | null;
    due_date?: string | null;
    remediation_plan?: string | null;
    manager_comment?: string | null;
}

export interface AuditProject {
    id: string;
    title: string;
    status: 'Planning' | 'Fieldwork' | 'Reporting' | 'Closed';
    progress_pct: number;
    start_date: string;
    end_date: string;
    lead_auditor: string;
    planning_start?: string | null;
    planning_end?: string | null;
    fieldwork_start?: string | null;
    fieldwork_end?: string | null;
    reporting_start?: string | null;
    reporting_end?: string | null;
    audit_scope?: string | null;
    findings_count: number;
    risk_score: number;
    created_at?: string | null;
    audit_type?: string | null;
    valuation_tier?: 'seed' | 'startup' | 'enterprise' | null;
    entity_id?: number | null;
}

export interface SystemEvent {
    id: string;
    timestamp: string;
    event_type: 'AI_SIGNAL' | 'RISK_CHANGE' | 'SYSTEM_ALERT' | 'ANALYSIS_COMPLETE';
    description: string;
    related_entity_id?: number | null;
    audit_id?: string | null;
}

export interface AuditPlan {
    id: number;
    year: number;
    audit_domain: string;
    risk_score: number;
    strategic_importance: string;
    resource_days: number;
    status: string;
    description: string;
}

export interface ImpactBreakdown {
    financial_loss: number;
    strategic_impact: number;
    reputation_risk: number;
}

export interface LikelihoodBreakdown {
    historical_frequency: number;
    control_weakness: number;
    process_complexity: number;
}

export interface AiRiskAnalysis {
    reason: string;
    impact_score: number;
    likelihood_score: number;
    impact_breakdown: ImpactBreakdown;
    likelihood_breakdown: LikelihoodBreakdown;
    audit_approach?: string | null;
    reference_standard?: string | null;
}

export interface AuditUniverseEntity {
    id: number;
    unit_name: string;
    category: string;
    impact_score: number;
    likelihood_score: number;
    last_audit_year: number;
    budget_size: string;
    operating_profit: string;
    headcount: number;
    last_audit_rating: string;
    key_systems: string;
    ai_analysis?: AiRiskAnalysis | null;
    findings_count: number;
}

export interface EntitySummary {
    total_events: number;
    total_exposure: number;
    risk_score: number;
    repetition_index: number;
    first_seen: string;
    last_seen: string;
}

export interface EntityEvent {
    id: string;
    entity_id: string;
    event_type: string;
    amount?: number | null;
    event_date: string;
    description: string;
    source_object_id?: string | null;
    is_flagged: boolean;
    risk_delta: number;
    rule_flags?: string | null;
    stat_flags?: string | null;
}

export interface EntityTimelineResponse {
    entity_id: string;
    canonical_name: string;
    summary: EntitySummary;
    events: EntityEvent[];
}

export interface ExposureVerdict {
    entity_name: String;
    risk_level: String;
    calculated_exposure: number;
    leakage_impact: number;      // 현금 유출
    penalty_risk: number;        // 과징금 리스크
    operational_waste: number;   // 운영 비효율
    formula_used: string;
    cfo_commentary: string;
}

export interface DashboardSummary {
    total_risks: number;
    ai_signals: number;
    critical_coverage: string;
    open_findings: number;
    total_findings: number;
    raw_signals: number;  // Step 1: All detected patterns (the 828 count)
    critical_risks: number; // Step 3: Aggregated management risks (the ~12 count)
    risk_score: number;
    potential_impact_value: number; // Added: Estimated financial impact for DD
    actual_detected_value?: number; // Added: Direct loss sum
    exposure_breakdown?: {
        governance_pct: number;
        process_pct: number;
        behavioral_pct: number;
        governance_val: number;
        process_val: number;
        behavioral_val: number;
    };
    key_drivers?: { label: string; val: string; exposure: number }[];
    trends: { day: string; value: number }[];
    flux_signals: { id: string; type: string; description: string; score: number; amount: number; account?: string }[];
    exposure_details: any[];
}

export interface AppConfig {
    theme: 'dark' | 'light';
    apiEndpoint: string;
    enableAi: boolean;
    lastProjectId?: string | null;
    userTier: 'Lite' | 'Pro' | 'Enterprise';
}

// Legacy types merged from types.ts
export type AuditAreaCode =
    | 'FSC' | 'TRE' | 'EXP' | 'OTC' | 'STP' | 'FXA' | 'INV' | 'HRE' | 'SEC';

export interface AuditArea {
    code: AuditAreaCode;
    name: string;
    description: string;
    totalScenarios: number;
    violationCount: number;
}

export interface Scenario {
    id: string;
    areaCode: AuditAreaCode;
    title: string;
    status: 'Pass' | 'Fail';
    description: string;
    detailedDescription: string;
    timestamp: string;
    type: 'Structured' | 'Unstructured';
    evidenceUrl: string;
    isNew: boolean;
    risk: 'High' | 'Medium' | 'Low';
    violationId?: string;
}

export interface ViolationDetail {
    id: string;
    areaCode: AuditAreaCode;
    riskLevel: 'High' | 'Medium' | 'Low';
    controlPoint: string;
    violationType: string;
    transactionInfo: {
        id: string;
        amount?: string;
        date: string;
        entity: string;
    };
    aiAnalysis: string;
    recommendation: string;
    evidenceDocumentUrl?: string;
    evidenceType: 'Contract' | 'Approval Email' | 'Log File' | 'Policy Doc';
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
    isJson?: boolean;
}

export type AnomalyType = '자택 근처 사용' | '주말/심야 사용' | '한도 초과' | '쪼개기 결제 의심' | '유흥업소 사용 의심' | '사적 사용 의심' | null;

export interface CorpCardTransaction {
    id: string;
    employee: {
        name: string;
        id: string;
        homeAddress: string;
        department: string;
        homeLocation: { lat: number; lng: number; };
    };
    merchant: string;
    location: { lat: number; lng: number, name: string; address: string; };
    amount: number;
    timestamp: string;
    category: string;
    anomaly: AnomalyType;
}

export interface ForecastDataPoint {
    week: string;
    sales?: number;
    demand?: number;
    production?: number;
    inventory?: number;
}

export interface MockDocument {
    id: string;
    title: string;
    category: string;
    content: string;
}

export interface MockUploadFile {
    id: string;
    name: string;
    type: 'Excel' | 'CSV' | 'PDF' | 'LOG';
    size: string;
    category: AuditAreaCode;
    content: string;
}

export type AuditPhase = 'Planning' | 'Fieldwork' | 'Reporting' | 'FollowUp';

export interface AuditTask {
    id: string;
    phase: AuditPhase;
    date: string;
    content: string;
    completed: boolean;
    assignee?: string;
}
