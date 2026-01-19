
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
    headcount: number;
    last_audit_rating: string;
    key_systems: string;
    ai_analysis?: AiRiskAnalysis | null;
    findings_count: number;
}

export interface DashboardSummary {
    total_risks: number;
    ai_signals: number;
    critical_coverage: string;
    open_findings: number;
    total_findings: number;
    raw_signals: number;  // Step 1: All detected patterns (the 828 count)
    critical_risks: number; // Step 3: Aggregated management risks (the ~12 count)
    risk_exposure_score: number;
    potential_impact_value: number; // Added: Estimated financial impact for DD
    trends: { day: string; value: number }[];
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
