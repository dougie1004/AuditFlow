import React, { createContext, useState, useContext } from 'react';
import { safeInvoke } from '../lib/tauri-bridge';
import { AuditIssue, AuditProject } from '../types';

interface AuditState {
    department: string;
    files: any[];
    findings: AuditIssue[];
    isInitialized: boolean;
    currentProjectId: string | null;
    cardData: any[]; // [CRITICAL] Corporate card transaction data session
    dataType: 'general' | 'card' | 'mixed'; // Track data source type
}

interface AuditContextType {
    state: AuditState;
    setState: React.Dispatch<React.SetStateAction<AuditState>>;
    startNewAudit: (dept: string) => string;
    hydrateProject: (projectId: string) => Promise<boolean>;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export const AuditProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, setState] = useState<AuditState>({
        department: '',
        files: [],
        findings: [],
        isInitialized: true,
        currentProjectId: null,
        cardData: [],
        dataType: 'general'
    });

    const startNewAudit = (dept: string) => {
        const newId = `PRJ-${Date.now()}`;
        setState({
            department: dept,
            files: [],
            findings: [],
            isInitialized: true,
            currentProjectId: newId,
            cardData: [],
            dataType: 'general'
        });
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
                setState({
                    department: project.title || 'Unknown',
                    files: files || [],
                    findings: issues || [],
                    isInitialized: true,
                    currentProjectId: projectId,
                    cardData: [],
                    dataType: 'general'
                });
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
