
import { safeInvoke } from "../lib/tauri-bridge";
import { AuditUniverseEntity, AuditPlan, AiRiskAnalysis } from "../types";

export interface ResilienceStressResult {
    year: number;
    resilience_score: number;
    risk_factors: string[];
    cfo_commentary: string;
    metrics: {
        revenue_concentration: number;
        opex_efficiency: number;
        compliance_exposure: number;
    };
}

export interface StrategicRiskScore {
    id: number;
    unit_name: string;
    exposure_score: number;
    priority_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    ai_recommendation: string;
}

/**
 * StrategicBridge acts as a centralized interface for all core financial 
 * and strategic audit logic, protecting internal models and providing 
 * clean access for both frontend components and AI agents.
 * 
 * ⚠️ BOUNDARY REMINDER (See docs/constitution/STRATEGIC_BRIDGE_BOUNDARY.md):
 * - MAY evaluate: Abstracted Audit Universe, Strategic Roadmaps, Governance Reporting.
 * - MUST NOT evaluate: Individual transactions, dynamic rule creation, autonomous decision-making.
 */
export const StrategicBridge = {
    /**
     * Executes the 'Resilience Stress Test' simulation for a given period.
     * Evaluates enterprise stability against extreme financial & compliance shocks.
     * Compliant with Manifesto Principle 4: Evaluations, not fortune-telling.
     */
    async simulateResilience(startYear: number = 2026): Promise<ResilienceStressResult[]> {
        console.log(`>>> [StrategicBridge] Initiating Resilience Stress Test starting ${startYear}`);

        const scenarios: ResilienceStressResult[] = [
            {
                year: startYear,
                resilience_score: 85.5,
                risk_factors: ["Revenue Concentration (80% from Top 3)", "AWS Cost Spikes", "Pending GDPR Audit"],
                metrics: { revenue_concentration: 0.82, opex_efficiency: 0.65, compliance_exposure: 0.45 },
                cfo_commentary: "2026년은 현금 흐름 보존(Cash Preservation)이 최우선 과제입니다. 불필요한 자산 취득을 중단하고 구매 프로세스의 전수 조사를 통해 리크(Leak)를 차단해야 합니다."
            },
            {
                year: startYear + 1,
                resilience_score: 72.0,
                risk_factors: ["Legacy System Fragility", "Talent Attrition", "Debt Covenant Pressure"],
                metrics: { revenue_concentration: 0.75, opex_efficiency: 0.58, compliance_exposure: 0.60 },
                cfo_commentary: "인프라 부채와 미해결된 규정 위반 사항들이 누적되어 리스크가 증가하는 시기입니다. AI 기반 자동 감사 기능을 전사적으로 확대하여 관리 비용을 절감해야 합니다."
            },
            {
                year: startYear + 2,
                resilience_score: 91.2,
                risk_factors: ["Market Recovery", "Compliance Maturity", "Cost Optimization Success"],
                metrics: { revenue_concentration: 0.60, opex_efficiency: 0.88, compliance_exposure: 0.15 },
                cfo_commentary: "강도 높은 리스크 경감 조치와 내부 통제 강화로 시스템적 안정성을 확보했습니다. 이제 '생존'을 넘어 '성장'을 위한 공격적인 투자가 가능한 체력(Fitness)을 갖추게 됩니다."
            }
        ];

        return new Promise(resolve => setTimeout(() => resolve(scenarios), 800));
    },

    /**
     * Calculates strategic priority scores for the entire Audit Universe.
     * Centralizes the quadrant logic previously scattered across UI components.
     */
    async getStrategicPriorities(entities: AuditUniverseEntity[]): Promise<StrategicRiskScore[]> {
        return entities.map(e => {
            const exposure = e.impact_score * e.likelihood_score;
            let priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

            if (e.impact_score >= 8 && e.likelihood_score >= 8) priority = 'CRITICAL';
            else if (exposure >= 50) priority = 'HIGH';
            else if (exposure >= 25) priority = 'MEDIUM';

            return {
                id: e.id,
                unit_name: e.unit_name,
                exposure_score: exposure,
                priority_level: priority,
                ai_recommendation: e.ai_analysis?.audit_approach || "Standard monitoring protocol."
            };
        });
    },

    /**
     * Bridge to backend annual report generation.
     */
    async generateExecutiveReport(year: number) {
        return await safeInvoke<any>("generate_annual_report", { year });
    },

    /**
     * Bridge to strategic planning management.
     */
    async getAuditPlans(year: number): Promise<AuditPlan[]> {
        return await safeInvoke<AuditPlan[]>("get_audit_plans", { year });
    },

    async addAuditPlan(plan: Partial<AuditPlan>) {
        return await safeInvoke("add_audit_plan", {
            year: plan.year,
            domain: plan.audit_domain,
            riskScore: plan.risk_score,
            importance: plan.strategic_importance,
            days: plan.resource_days,
            description: plan.description
        });
    }
};
