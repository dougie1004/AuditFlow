import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { sendMessageToGemini } from "../../services/geminiService";

export const isTauri = () => {
    return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
};

export const safeInvoke = async <T>(command: string, args?: any): Promise<T> => {
    if (isTauri()) {
        return await tauriInvoke<T>(command, args);
    } else {
        console.warn(`[Web Mode] Invoke called for command: ${command}`, args);

        // AI Command Mappings for Web Mode
        if (command === 'ask_ai_assistant') {
            const systemPrompt = "당신은 기업 내부 감사 전문가입니다. 사용자의 질문에 전문적인 지식을바탕으로 감사인의 관점에서 답변하세요.";
            const contents = [{ role: "user", parts: [{ text: args.message }] }];
            const res = await sendMessageToGemini(contents, systemPrompt, "general-chat", false);
            return (res.response || res.error) as any;
        }

        if (command === 'generate_professional_report') {
            const systemPrompt = "기업 내부 감사 최종 보고서를 전문적인 형식으로 작성해 주세요. 지적 사항들을 요약하고 개선 권고 사항을 포함하세요.";
            const contents = [{ role: "user", parts: [{ text: `프로젝트 ${args.projectId}에 대한 보고서를 작성해줘.` }] }];
            const res = await sendMessageToGemini(contents, systemPrompt, "audit-findings", false);
            return (res.response || res.error) as any;
        }

        // Mock responses for web mode to allow UI to function
        if (command === 'get_audit_projects' || command === 'get_projects') return [{ id: "P2026-001", title: "Global Factory Audit", audit_type: "Operational" }] as any;
        if (command === 'get_audit_issues') return [] as any;
        if (command === 'init_db') return true as any;
        if (command === 'create_project') return Math.floor(Math.random() * 1000) as any;

        throw new Error(`Command ${command} not supported in web mode`);
    }
};
