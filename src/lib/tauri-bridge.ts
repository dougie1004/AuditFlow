import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { listen as tauriListen, UnlistenFn } from "@tauri-apps/api/event";
import { sendMessageToGemini } from "../services/geminiService";
import {
    AuditIssue,
    AuditProject,
    SystemEvent,
    DashboardSummary,
    AuditUniverseEntity,
    AuditPlan
} from "../types";

/**
 * Robust check if running inside Tauri environment.
 */
export const isTauri = (): boolean => {
    return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
};

/**
 * Standardized error notification handler.
 * In a real app, this could trigger a Toast UI.
 */
const notifyError = (message: string) => {
    console.error(`[App Error] ${message}`);
    // Optional: Trigger a window event that UI components can listen to
    window.dispatchEvent(new CustomEvent('app-error', { detail: message }));
};

/**
 * Safe Invoke wrapper with type safety and error handling.
 */
export const safeInvoke = async <T>(command: string, args?: Record<string, any>): Promise<T> => {
    try {
        if (isTauri()) {
            return await tauriInvoke<T>(command, args);
        } else {
            return await mockInvoke<T>(command, args);
        }
    } catch (error: any) {
        const errorMessage = error?.message || String(error);
        notifyError(`Backend command failed: ${command}. ${errorMessage}`);

        // Return a safe 'empty' value based on known commands to prevent UI crashes
        if (command.startsWith('get_')) {
            if (command.endsWith('s') || command === 'get_audit_universe') return [] as unknown as T;
            if (command === 'get_dashboard_summary') return { total_risks: 0, ai_signals: 0, critical_coverage: "0%", open_findings: 0, risk_exposure_score: 0, trends: [] } as unknown as T;
        }

        throw error; // Still throw so the caller knows it failed, but we notified the user
    }
};

/**
 * Mock implementation of backend commands for Web (Vercel) mode.
 */
const mockInvoke = async <T>(command: string, args?: any): Promise<T> => {
    console.warn(`[Web Mode] Falling back to mock for command: ${command}`, args);

    switch (command) {
        case 'ask_ai_assistant': {
            const systemPrompt = "당신은 기업 내부 감사 전문가입니다. 사용자의 질문에 전문적인 지식을 바탕으로 감사인의 관점에서 답변하세요.";
            const contents = [{ role: "user", parts: [{ text: args.message }] }];
            const res = await sendMessageToGemini(contents, systemPrompt, "general-chat", false);
            return (res.response || res.error) as unknown as T;
        }

        case 'generate_professional_report': {
            const systemPrompt = "기업 내부 감사 최종 보고서를 전문적인 형식으로 작성해 주세요. 지적 사항들을 요약하고 개선 권고 사항을 포함하세요.";
            const contents = [{ role: "user", parts: [{ text: `프로젝트 ${args.projectId}에 대한 보고서를 작성해줘.` }] }];
            const res = await sendMessageToGemini(contents, systemPrompt, "audit-findings", false);
            return (res.response || res.error) as unknown as T;
        }

        case 'get_audit_projects':
        case 'get_projects':
            return [{
                id: "P2026-001",
                title: "Global Factory Audit (Web Preview)",
                status: "Planning",
                progress_pct: 0,
                findings_count: 0,
                start_date: "2026-01-01",
                end_date: "2026-12-31",
                lead_auditor: "Web Auditor",
                risk_score: 0
            }] as unknown as T;

        case 'get_dashboard_summary':
            return {
                total_risks: 0,
                ai_signals: 0,
                critical_coverage: "N/A",
                open_findings: 0,
                risk_exposure_score: 0,
                trends: []
            } as unknown as T;

        case 'init_db': return true as unknown as T;
        case 'get_audit_issues': return [] as unknown as T;
        case 'get_system_events': return [] as unknown as T;
        case 'get_all_scenarios': return [] as unknown as T;
        case 'get_audit_universe': return [] as unknown as T;
        case 'get_audit_plans': return [] as unknown as T;

        default:
            if (command.startsWith('get_') && command.endsWith('s')) return [] as unknown as T;
            return null as unknown as T;
    }
};

/**
 * Safe Listen wrapper for Tauri events.
 */
export const safeListen = async <T>(event: string, handler: (event: any) => void): Promise<UnlistenFn> => {
    try {
        if (isTauri()) {
            return await tauriListen<T>(event, handler);
        } else {
            console.warn(`[Web Mode] Listen called for event: ${event}`);
            return () => { };
        }
    } catch (error) {
        notifyError(`Failed to listen to event: ${event}`);
        return () => { };
    }
};

