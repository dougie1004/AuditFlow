import React, { createContext, useState, useContext } from 'react';
import { safeInvoke } from '../lib/tauri-bridge';
import { AuditIssue, AuditProject } from '../types';

interface Message {
    role: "bot" | "user";
    content: string;
    type?: "standard" | "management" | "search";
}

interface WorkspaceState {
    activeTab: 'explorer' | 'queue' | 'financials';
    role: 'Auditor' | 'Reviewer';
    currentSessionId: string | null;
}

interface AuditState {
    department: string;
    files: any[];
    findings: AuditIssue[];
    isInitialized: boolean;
    currentProjectId: string | null;
    cardData: any[]; // [CRITICAL] Corporate card transaction data session
    dataType: 'general' | 'card' | 'mixed'; // Track data source type
    uploadStep: number;
    isMasked: boolean;
    // [EPHEMERAL UI STATE]
    aiChatHistory: Message[];
    workspaceState: WorkspaceState;
}

interface AuditContextType {
    state: AuditState;
    setState: React.Dispatch<React.SetStateAction<AuditState>>;
    startNewAudit: (dept: string) => string;
    hydrateProject: (projectId: string) => Promise<boolean>;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

const INITIAL_WORKSPACE_STATE: WorkspaceState = {
    activeTab: 'explorer',
    role: 'Auditor',
    currentSessionId: null
};

const INITIAL_AI_CHAT: Message[] = [
    {
        role: "bot",
        content: "반갑습니다. AI 감사 분석관입니다. 대량의 데이터에서 리스크 패턴을 찾거나, 경영진 보고를 위한 핵심 요약이 필요하시면 언제든 말씀해 주세요."
    }
];

export const AuditProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, setState] = useState<AuditState>({
        department: '',
        files: [],
        findings: [],
        isInitialized: true,
        currentProjectId: null,
        cardData: [],
        dataType: 'general',
        uploadStep: 1,
        isMasked: false,
        aiChatHistory: INITIAL_AI_CHAT,
        workspaceState: INITIAL_WORKSPACE_STATE
    });

    const startNewAudit = (dept: string) => {
        const newId = `PRJ-${Date.now()}`;
        setState(prev => ({
            ...prev,
            department: dept,
            files: [],
            findings: [],
            isInitialized: true,
            currentProjectId: newId,
            cardData: [],
            dataType: 'general',
            uploadStep: 1,
            isMasked: false,
            // Keep AI chat history if user wants, or reset? Let's keep it but maybe reset workspace
            workspaceState: INITIAL_WORKSPACE_STATE
        }));
        return newId;
    };

    const hydrateProject = async (projectId: string) => {
        try {
            // [FIX] Even if 0 issues, we should be able to load the project session
            const [projects, issues, files] = await Promise.all([
                safeInvoke('get_audit_projects') as Promise<any[]>,
                safeInvoke('get_audit_issues', { projectType: projectId }) as Promise<any[]>,
                safeInvoke('get_files_by_type', { projectType: projectId }) as Promise<any[]>
            ]);

            const project = projects.find(p => p.id === projectId);

            if (project) {
                setState(prev => ({
                    ...prev,
                    department: project.title || 'Unknown',
                    files: files || [],
                    findings: issues || [],
                    isInitialized: true,
                    currentProjectId: projectId,
                    cardData: [],
                    dataType: 'general',
                    uploadStep: files && files.length > 0 ? 2 : 1,
                    isMasked: false,
                }));
                console.log(`>>> [Session] Hydrated project ${projectId} with ${files.length} files and ${issues.length} findings.`);
                return true;
            }
            console.warn(`>>> [Session] Project ${projectId} not found in database.`);
            return false;
        } catch (error) {
            console.error("Hydration failed:", error);
            return false;
        }
    };

    return (
        <AuditContext.Provider value={{ state, setState, startNewAudit, hydrateProject }}>
            {children}
        </AuditContext.Provider>
    );
};

export const useAudit = () => {
    const context = useContext(AuditContext);
    if (!context) throw new Error("useAudit must be used within AuditProvider");
    return context;
};
