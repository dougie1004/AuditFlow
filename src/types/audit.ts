export type Severity = 'LOW' | 'MEDIUM' | 'HIGH';
export type AuditStatus = 'CONFIRMED' | 'REVIEW_REQUIRED' | 'DISMISSED';

export interface AuditVerdict {
    // 1. 배심원(AI)의 판단 (Juror's Observation)
    decision: {
        violationDetected: boolean;
        criteria: string;    // e.g., "Split Payment", "Off-Hour Activity"
        severity: Severity;  // AI가 관측한 현상의 강도 (NOT Risk, bu Intensity)
        reasoning: string;   // 논리적 근거 (Why matched?)
        evidence: string;    // 데이터 내 핵심 문구 (Quote)
    };

    // 2. 판사(Code)의 판결 (Judge's Ruling)
    meta: {
        calculatedExposure: number; // (예산 * severity 가중치 + 과거 이력 보정)
        finalStatus: AuditStatus;   // 시스템이 확정한 법적 상태
        policyVersion: string;      // 적용된 컴플라이언스 정책 버전 (e.g. "v2026.02.10")
    };
}
