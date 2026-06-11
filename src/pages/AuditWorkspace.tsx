import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { safeInvoke } from "../lib/tauri-bridge";
import {
    Upload, Zap, Loader2,
    FileText, EyeOff, CheckCircle2, XCircle,
    BrainCircuit, BarChart3, Database, Lock, MoveRight,
    ShieldAlert, ShieldCheck, Search, ChevronDown, Terminal,
    Layers, ClipboardList, Clock, Plus, Activity
} from 'lucide-react';
import { useApp } from '../App';
import { useAudit } from '../context/AuditContext';
import { AuditSession, ReviewItem } from '../types';
import FinancialTrendPanel from '../components/workspace/FinancialTrendPanel';

export default function AuditWorkspace() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { activeProject, setActiveProject } = useApp();
    const { state, setState } = useAudit();

    const { activeTab, role, currentSessionId } = state.workspaceState;

    const [projects, setProjects] = useState<any[]>([]);
    const [auditObjects, setAuditObjects] = useState<any[]>([]);
    const [relationCandidates, setRelationCandidates] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sessions, setSessions] = useState<AuditSession[]>([]);
    const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>([]);
    const [structuralInsights, setStructuralInsights] = useState<any[]>([]);
    const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
    const [deepDiveResult, setDeepDiveResult] = useState<any | null>(null);
    const [isDeepDiveLoading, setIsDeepDiveLoading] = useState(false);

    const location = useLocation();

    // Helper to update workspace state
    const setWorkspaceState = (patch: Partial<typeof state.workspaceState>) => {
        setState(prev => ({
            ...prev,
            workspaceState: { ...prev.workspaceState, ...patch }
        }));
    };

    useEffect(() => {
        const routeState = location.state as any;
        if (routeState?.metric === "Pending Reviews") {
            setWorkspaceState({ activeTab: 'queue' });
        }
    }, [location]);

    useEffect(() => {
        safeInvoke("get_audit_projects").then((res: any) => {
            setProjects(res);
            if (id) {
                setActiveProject(id);
            }
        });
    }, [id, setActiveProject]);

    useEffect(() => {
        refreshAllData();
    }, [id, activeProject]);

    const refreshAllData = () => {
        setIsLoading(true);
        const fetchContext = activeProject || null;

        Promise.all([
            safeInvoke("get_audit_objects", { projectId: fetchContext }),
            safeInvoke("get_relation_candidates", { projectId: fetchContext }),
            safeInvoke("get_audit_sessions", { projectId: fetchContext }),
            safeInvoke("get_risk_summary", {}),
            safeInvoke("get_strategic_deviations", {})
        ]).then(([objs, candidates, sess, riskData, structuralData]: [any, any, any, any, any]) => {
            setAuditObjects(objs);
            setStructuralInsights(structuralData || []);
            setSessions(sess);

            // 1. Map GPT/LLM Risks
            const newRisks = (riskData?.items || []).map((r: any) => {
                let parsedMeta = {};
                try { parsedMeta = JSON.parse(r.metadata || '{}'); } catch (e) { }
                return {
                    from_object_id: r.source || "AI_JUROR",
                    to_object_id: "RISK_FOUND",
                    reason_codes: r.observation,
                    confidence: (r.score || 0) >= 0.8 ? 'exact' : 'high',
                    original_id: r.id,
                    meta: parsedMeta,
                    type: 'LLM'
                };
            });

            // 2. Map Structural (Deterministic AI) Risks
            const structuralRisks = (structuralData || [])
                .filter((s: any) => s.audit_score > 0.15) // WATCH threshold
                .map((s: any) => ({
                    from_object_id: "ENGINE_CORE",
                    to_object_id: s.account_name || s.account_code,
                    reason_codes: s.detection_reason,
                    confidence: s.audit_severity === "CRITICAL" ? "exact" : "high",
                    original_id: null, // Virtual ID
                    meta: {
                        is_structural: true,
                        score: s.audit_score,
                        status: s.audit_severity,
                        vol: s.delta_magnitude,
                        category: s.risk_category_label,
                        l1_signal: s.statistical_signature
                    },
                    type: 'STRUCTURAL'
                }));

            setRelationCandidates([...structuralRisks, ...newRisks, ...candidates]);

            if (activeProject) {
                const relevantSession = sess.find((s: any) => s.project_id === activeProject);
                if (relevantSession) {
                    setWorkspaceState({ currentSessionId: relevantSession.id });
                } else if (activeProject !== "_ALL_") {
                    console.log("No session found for project, auto-creating...");
                    safeInvoke("create_audit_session", {
                        projectId: activeProject,
                        name: "Default Audit Session",
                        periodStart: "2026-01-01",
                        periodEnd: "2026-12-31",
                        includedObjectTypes: "ALL"
                    }).then((newSessId: any) => {
                        setWorkspaceState({ currentSessionId: newSessId });
                        safeInvoke("get_audit_sessions", { projectId: activeProject }).then((updatedSess: any) => setSessions(updatedSess));
                    });
                }
            } else {
                if (sess.length > 0 && !currentSessionId) {
                    setWorkspaceState({ currentSessionId: sess[0].id });
                }
            }
            setIsLoading(false);
        }).catch(err => {
            console.error(err);
            setIsLoading(false);
        });
    };

    const handleDeepDive = (item: ReviewItem) => {
        setIsDeepDiveLoading(true);
        // We need the numeric ID of the audit_issue.
        // Assuming original_id or similar is passed. 
        // For simplicity, we'll try to find it via get_audit_issues if not direct.
        // In this mock context, we'll use a numeric seed from the string ID if necessary.
        const numericId = parseInt(item.id.replace('task-', '')) || 1; 

        safeInvoke("get_ai_fraud_deep_dive", { issueId: numericId })
            .then((res: any) => {
                setDeepDiveResult(res);
                setIsDeepDiveLoading(false);
            })
            .catch(err => {
                console.error(err);
                setIsDeepDiveLoading(false);
            });
    };

    const fetchStructuralInsights = () => {
        setIsLoading(true);
        safeInvoke("get_strategic_deviations", {}).then((res: any) => {
            setStructuralInsights(res || []);
            setIsLoading(false);
        }).catch(() => setIsLoading(false));
    };

    useEffect(() => {
        if (currentSessionId) {
            safeInvoke("get_review_queue", { sessionId: currentSessionId }).then((res: any) => {
                setReviewQueue(res);
            });
        }
    }, [currentSessionId]);

    const handleCreateSession = () => {
        const name = prompt("Enter Session Name (e.g., 2026 Q1 Expense Audit)");
        if (!name || !activeProject) return;

        safeInvoke("create_audit_session", {
            projectId: activeProject,
            name,
            periodStart: "2026-01-01",
            periodEnd: "2026-03-31",
            includedObjectTypes: "LEDGER,POLICY,EMAIL"
        }).then((sessId: any) => {
            setWorkspaceState({ currentSessionId: sessId, activeTab: 'queue' });
            safeInvoke("get_audit_sessions", { projectId: activeProject }).then((sess: any) => setSessions(sess));
        });
    };

    const handlePromoteToReview = (signalId: string) => {
        if (!currentSessionId) {
            alert("활성화된 감사 세션이 없습니다. 세션을 먼저 시작해주세요.");
            return;
        }

        safeInvoke("promote_risk_v2", { sessionId: currentSessionId, signalId: signalId })
            .then(() => {
                alert("이슈가 검토 대기열(Queue)로 등록되었습니다.");
                if (activeProject) {
                    Promise.all([
                        safeInvoke("get_risk_summary", {}),
                        safeInvoke("get_review_queue", { sessionId: currentSessionId }),
                        safeInvoke("get_relation_candidates", { projectId: activeProject })
                    ]).then(([riskData, queue, candidates]: [any, any, any]) => {
                        const newRisks = (riskData?.items || []).map((r: any) => ({
                            from_object_id: r.source || "AI_ENGINE",
                            to_object_id: "RISK_FOUND",
                            reason_codes: r.observation,
                            confidence: (r.score || 0) >= 0.8 ? 'exact' : 'high',
                            original_id: r.id
                        }));
                        setRelationCandidates([...newRisks, ...candidates]);
                        setReviewQueue(queue);
                    });
                }
            })
            .catch((err: any) => alert("등록 실패: " + err));
    };

    const handleUpdateStatus = (itemId: string, status: 'CONFIRMED' | 'ESCALATED' | 'DEFERRED' | 'DISMISSED') => {
        safeInvoke("update_status_v2", { itemId, status, note: "Updated status in Workspace" }).then(() => {
            setReviewQueue(prev => prev.map(item => item.id === itemId ? { ...item, status } : item));
        });
    };

    const handleResolveEscalation = (itemId: string, status: 'CONFIRMED' | 'DISMISSED' | 'SEALED') => {
        // If SEALED, we map it to CONFIRMED for backend but add a special note or handle local state to hide it
        const effectiveStatus = status === 'SEALED' ? 'CONFIRMED' : status;

        // For SEALED, we auto-generate the note to speed up workflow
        const note = status === 'SEALED'
            ? "Final Approval Granted. Sealed by Reviewer."
            : prompt("Reviewer Final Decision Note (ESCALATION RESOLUTION):");

        if (!note) return;

        safeInvoke("resolve_escalation", { itemId, status: effectiveStatus, finalNote: note }).then(() => {
            setReviewQueue(prev => prev.map(item => item.id === itemId ? {
                ...item,
                status: effectiveStatus,
                // If sealed, we artificially add a flag or just rely on the note/status combination. 
                // Ideally, we update the local state to reflect 'SEALED' behavior visually immediately.
                reviewer_final_note: note
            } : item));
        });
    };

    const handleAcknowledgeReport = () => {
        if (!currentSessionId) return;
        const name = prompt("Enter Reviewer Name for Digital Signature:");
        if (!name) return;
        safeInvoke("acknowledge_session_report", { sessionId: currentSessionId, reviewerName: name }).then(() => {
            alert("보고서가 성공적으로 승인 및 서명되었습니다.");
            safeInvoke("get_audit_sessions", { projectId: activeProject }).then((sess: any) => setSessions(sess));
        });
    };

    const handleCloseSession = () => {
        if (!currentSessionId) return;
        safeInvoke("close_audit_session", { sessionId: currentSessionId })
            .then(() => {
                alert("세션이 성공적으로 성공 처리(CLOSED)되었습니다.");
                // Refresh sessions
                safeInvoke("get_audit_sessions", { projectId: activeProject }).then((sess: any) => setSessions(sess));
            })
            .catch((err) => {
                alert(err);
            });
    };

    const currentSession = sessions.find(s => s.id === currentSessionId);


    return (
        <div className="min-h-screen bg-[#020617] text-slate-300 font-sans p-8 lg:px-12">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start mb-12 gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black text-white tracking-tight italic uppercase">감사 실행 워크스페이스</h1>
                        {currentSession?.status === 'CLOSED' && (
                            <span className="bg-slate-800 text-slate-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5 flex items-center gap-2">
                                <Lock size={12} /> 감사 종료
                            </span>
                        )}
                        {currentSession?.reviewer_ack && (
                            <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/30 flex items-center gap-2 animate-pulse">
                                <ShieldCheck size={12} /> 최종 승인 및 봉인 (Sealed)
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                        <div className="relative group">
                            <select
                                value={activeProject || ""}
                                onChange={(e) => setActiveProject(e.target.value || null)}
                                className="appearance-none bg-slate-900/80 border border-white/10 text-white font-black text-xs py-3 px-6 pr-12 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/20 w-80 shadow-2xl transition-all cursor:pointer hover:border-blue-500/30 font-mono"
                            >
                                <option value="" className="font-bold text-emerald-400">❖ 전사 통합 감사 (Company Wide)</option>
                                <option value="" disabled>──────────────────────────</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.id} - {p.title}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-blue-500 transition-colors" size={16} />
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl group relative cursor-help">
                                <ShieldCheck size={16} className="text-emerald-500 animate-pulse" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">Privacy Shield</span>
                                    <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-tighter">B2B Compliance ON</span>
                                </div>
                                <div className="absolute top-full right-0 mt-3 hidden group-hover:block z-50">
                                    <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-2xl shadow-2xl w-64">
                                        <p className="text-[11px] font-black text-emerald-500 uppercase tracking-widest mb-2">Data Privacy Policy</p>
                                        <p className="text-[10px] text-slate-300 leading-relaxed">
                                            개인정보보호법 및 내부 통제 규정에 따라 성명, 연락처, 계좌번호 등 민감 정보가 실시간 비식별(Masking) 처리되고 있습니다. 분석 데이터는 익명화되어 보안 서버에 저장됩니다.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={refreshAllData}
                                className={`p-4 bg-slate-900 border border-white/5 rounded-3xl text-slate-400 hover:text-white hover:border-white/20 transition-all ${isLoading ? 'animate-spin' : ''}`}
                            >
                                <Zap size={20} />
                            </button>
                        </div>

                        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
                            <button
                                onClick={() => setWorkspaceState({ role: 'Auditor' })}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${role === 'Auditor' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-500 hover:text-white'}`}
                            >
                                감사인 (Auditor)
                            </button>
                            <button
                                onClick={() => setWorkspaceState({ role: 'Reviewer' })}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${role === 'Reviewer' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40' : 'text-slate-500 hover:text-white'}`}
                            >
                                검토 책임자 (Reviewer)
                            </button>
                        </div>

                        <div className="flex items-center gap-3 bg-white/5 p-1 rounded-2xl border border-white/5">
                            <button
                                onClick={() => setWorkspaceState({ activeTab: 'explorer' })}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'explorer' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-500 hover:text-white'}`}
                            >
                                <Zap size={14} /> 증거 저장소 (Repository)
                            </button>
                            <button
                                onClick={() => setWorkspaceState({ activeTab: 'queue' })}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'queue' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-500 hover:text-white'}`}
                            >
                                <ClipboardList size={14} /> {currentSession?.status === 'CLOSED' ? '감사 결과 보고서' : (role === 'Reviewer' ? '이슈 최종 승인' : '이슈 검토 목록')}
                                {reviewQueue.filter(i => i.status === 'PENDING').length > 0 && (
                                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 flex flex-col gap-4 w-full md:w-auto min-w-[320px]">
                    <div className="flex justify-between items-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">활성 감사 세션 (Active Session)</p>
                        <div className="flex gap-4">
                            {currentSession?.status === 'OPEN' && (
                                <button onClick={handleCloseSession} className="text-emerald-500 hover:text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                    세션 종료 (Close)
                                </button>
                            )}
                            <button onClick={handleCreateSession} className="text-blue-400 hover:text-blue-300 transition-colors">
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                    <div className="relative">
                        <select
                            value={currentSessionId || ""}
                            onChange={(e) => {
                                setWorkspaceState({ currentSessionId: e.target.value, activeTab: 'queue' });
                            }}
                            className="appearance-none bg-black/40 border border-white/5 text-slate-200 font-bold text-sm py-3 px-4 pr-10 rounded-xl outline-none w-full cursor-pointer hover:bg-black/60 transition-all font-mono"
                        >
                            <option value="" disabled>진행 중인 세션 없음</option>
                            {sessions.map(s => (
                                <option key={s.id} value={s.id}>{s.status === 'CLOSED' ? "🔒" : "🔓"} {s.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={14} />
                    </div>
                    {currentSession && (
                        <div className="flex items-center gap-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            <div className="flex items-center gap-1.5"><Clock size={12} /> {currentSession.period_start} ~ {currentSession.period_end}</div>
                            <div className="flex items-center gap-1.5"><Database size={12} /> {currentSession.included_object_types}</div>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4 opacity-50">
                        <Loader2 className="animate-spin text-blue-500" size={48} />
                        <p className="text-xs font-black uppercase tracking-[0.3em]">Synching Knowledge Hub...</p>
                    </div>
                ) : (
                    activeTab === 'explorer' ? (
                        <div className="grid grid-cols-12 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Audit Memory Objects (Left) */}
                            <div className="col-span-12 lg:col-span-5 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-black text-white italic uppercase flex items-center gap-3">
                                        <Database className="text-blue-500" size={24} /> 수집된 감사 증거 저장소
                                    </h3>
                                    <button onClick={() => navigate('/import')} className="bg-blue-600/10 border border-blue-500/20 text-blue-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600/20 transition-all">
                                        + 자료 추가
                                    </button>
                                </div>

                                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {auditObjects.length === 0 ? (
                                        <div className="bg-white/5 border border-white/5 rounded-[32px] p-12 text-center opacity-30">
                                            <p className="text-xs font-black uppercase tracking-widest">수집된 증거가 없습니다.</p>
                                        </div>
                                    ) : (
                                        auditObjects.map((obj, i) => (
                                            <div key={i} className="bg-white/5 border border-white/5 rounded-[32px] p-6 hover:border-blue-500/30 transition-all group">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                                            {obj.object_type === 'POLICY' ? <ShieldCheck size={16} /> : obj.object_type === 'EMAIL' ? <Search size={16} /> : <FileText size={16} />}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-white">
                                                                {obj.object_type === 'POLICY' ? '감사 규정 (Policy)' :
                                                                    obj.object_type === 'EMAIL' ? '이메일 (Email)' :
                                                                        obj.object_type === 'LEDGER' ? '원장 (Ledger)' :
                                                                            obj.object_type === 'COMMUNICATION' ? '커뮤니케이션 (Comm.)' :
                                                                                obj.object_type}
                                                            </p>
                                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{obj.id}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`text-[9px] font-black px-2 py-1 rounded ${obj.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-slate-500'}`}>
                                                        {obj.status === 'ACTIVE' ? '활성 (Active)' : '비활성'}
                                                    </span>
                                                </div>
                                                <div className="bg-black/20 rounded-2xl p-4 font-mono text-[10px] text-slate-400 max-h-32 overflow-hidden relative">
                                                    {obj.extracted_fields}
                                                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#1a1c2e]/50 to-transparent" />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Relation Candidates (Right) */}
                            <div className="col-span-12 lg:col-span-7 space-y-6">
                                <h3 className="text-xl font-black text-white italic uppercase flex items-center gap-3">
                                    <BrainCircuit className="text-emerald-500" size={24} /> AI 기반 이슈 분석 (Insights)
                                </h3>

                                <div className="space-y-8">
                                    {/* Financial Trend Analysis Section */}
                                    <FinancialTrendPanel projectId={activeProject || undefined} />

                                    {/* 1. Structural Analytics (Deterministic) */}
                                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-[48px] p-8">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-amber-500/10 rounded-lg">
                                                    <BarChart3 className="text-amber-500" size={18} />
                                                </div>
                                                <div>
                                                    <h4 className="text-[11px] font-black uppercase text-amber-500 tracking-[0.2em]">전략적 이상 징후 분석 (Strategic Deviations)</h4>
                                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 flex gap-2">
                                                        <span>Statistical Signal (L1)</span>
                                                        <span className="text-slate-700">|</span>
                                                        <span>Audit Severity (L2)</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={fetchStructuralInsights}
                                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 transition-all active:scale-95"
                                            >
                                                <Loader2 className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {structuralInsights.length > 0 ? (
                                                structuralInsights.map((insight, idx) => {
                                                    const isExpanded = expandedInsight === insight.account_name;
                                                    return (
                                                        <div
                                                            key={`strategic-${idx}`}
                                                            onClick={() => setExpandedInsight(isExpanded ? null : insight.account_name)}
                                                            className={`border rounded-3xl p-6 transition-all group relative overflow-hidden flex flex-col gap-4 cursor-pointer select-none
                                                            ${isExpanded
                                                                    ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10'
                                                                    : 'bg-black/40 border-white/5 hover:border-amber-500/30'}`}
                                                        >
                                                            {/* Severity Bar */}
                                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${insight.audit_severity === 'CRITICAL' ? 'bg-red-500' :
                                                                insight.audit_severity === 'HIGH' ? 'bg-orange-500' :
                                                                    insight.audit_severity === 'WATCH' ? 'bg-blue-500' : 'bg-slate-700'
                                                                }`} />

                                                            {/* Header */}
                                                            <div className="pl-2">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{insight.account_code}</span>
                                                                        <h5 className={`font-black text-sm truncate ${isExpanded ? 'text-amber-400' : 'text-white'}`}>{insight.account_name}</h5>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="px-2 py-1 bg-white/5 rounded border border-white/5 text-[9px] font-mono text-slate-400">
                                                                            ₩{(insight.total_volume / 1000000).toFixed(0)}M
                                                                        </div>
                                                                        <div className={`text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-amber-500' : ''}`}>
                                                                            ▶
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Dual Metrics */}
                                                            <div className="pl-2 grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                                                                <div>
                                                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Statistical Signal</p>
                                                                    <div className="text-lg font-black text-slate-300">
                                                                        {(insight.statistical_signature * 100).toFixed(1)}%
                                                                    </div>
                                                                </div>
                                                                <div className="relative group/score">
                                                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Audit Severity</p>
                                                                    <div className={`text-lg font-black cursor-help ${insight.audit_severity === 'CRITICAL' ? 'text-red-500' :
                                                                        insight.audit_severity === 'HIGH' ? 'text-orange-500' :
                                                                            insight.audit_severity === 'WATCH' ? 'text-blue-500' : 'text-slate-500'
                                                                        }`}>
                                                                        {insight.audit_severity}
                                                                    </div>
                                                                    {insight.score_formula && (
                                                                        <div className="absolute bottom-full right-0 mb-2 z-50 hidden group-hover/score:block">
                                                                            <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-3 shadow-xl min-w-[220px]">
                                                                                <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-1.5">Score Calculation</p>
                                                                                <p className="text-[9px] font-mono text-slate-300 leading-relaxed">Signal × Materiality × NatureAdj × Multiplier</p>
                                                                                <p className="text-[11px] font-mono font-black text-white mt-1">= {insight.score_formula}</p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Logic Context */}
                                                            <div className="pl-2 bg-white/5 p-3 rounded-xl border border-white/5">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Logic:</span>
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{insight.risk_category_label}</span>
                                                                </div>
                                                                <p className="text-[10px] text-slate-300 leading-tight">{insight.nature_context}</p>
                                                            </div>

                                                            {/* ── Drill-Down Detail (클릭 시 펼침) ── */}
                                                            {isExpanded && (
                                                                <div className="pl-2 border-t border-amber-500/20 pt-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                                                    <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest">세부 분석 내역</p>
                                                                    <div className="bg-black/60 rounded-xl p-3 border border-white/5">
                                                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">탐지 사유</p>
                                                                        <p className="text-[11px] text-slate-200 leading-relaxed">{insight.detection_reason}</p>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                                                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">변동 규모</p>
                                                                            <p className="text-sm font-black text-white">{(insight.delta_magnitude * 100).toFixed(1)}%</p>
                                                                        </div>
                                                                        <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                                                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">권고 조치</p>
                                                                            <p className="text-[10px] font-black text-amber-400">{insight.recommended_action}</p>
                                                                        </div>
                                                                    </div>
                                                                    {insight.score_formula && (
                                                                        <div className="bg-black/40 rounded-xl p-3 border border-amber-500/20">
                                                                            <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-1">Score Formula</p>
                                                                            <p className="text-[10px] font-mono text-slate-300">Signal × Materiality × NatureAdj × Multiplier</p>
                                                                            <p className="text-xs font-mono font-black text-white mt-1">= {insight.score_formula}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="col-span-2 py-10 text-center opacity-40">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">전략적 특이사항 없음 (Clean)</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 2. Transaction Relations (AI Juror) */}
                                    <h4 className="text-[11px] font-black uppercase text-emerald-500 tracking-[0.2em] flex items-center gap-3 px-4">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 이상 관계 탐지 (AI Relation Matrix)
                                    </h4>

                                    {relationCandidates.length === 0 ? (
                                        <div className="bg-white/5 border border-white/5 rounded-[48px] p-24 text-center">
                                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 opacity-20">
                                                <Search size={32} />
                                            </div>
                                            <p className="text-slate-500 font-bold">AI가 아직 새로운 관계를 발견하지 못했습니다.</p>
                                            <p className="text-xs text-slate-600 mt-2">자료가 더 유입거나 Policy 객체가 등록되면 관계가 생성됩니다.</p>
                                        </div>
                                    ) : (
                                        relationCandidates.map((rel, i) => (
                                            <div key={i} className={`${rel.type === 'STRUCTURAL' ? 'bg-rose-500/5 border-rose-500/10' : 'bg-emerald-500/5 border-emerald-500/10'} border rounded-[40px] p-8 flex items-center gap-8 relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-lg`}>
                                                <div className="flex-1 space-y-2">
                                                    <p className={`text-[10px] font-black ${rel.type === 'STRUCTURAL' ? 'text-rose-500' : 'text-emerald-500'} uppercase tracking-widest`}>
                                                        {rel.type === 'STRUCTURAL' ? '구조적 리스크 (Structural)' : `분석 후보 (Candidate) #${i + 1}`}
                                                    </p>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-xs font-black text-white px-2 py-1 bg-white/5 rounded truncate max-w-[120px]">{rel.from_object_id}</div>
                                                        <MoveRight className={rel.type === 'STRUCTURAL' ? 'text-rose-500/40' : 'text-emerald-500/40'} size={16} />
                                                        <div className="text-xs font-black text-white px-2 py-1 bg-white/5 rounded truncate max-w-[120px]">{rel.to_object_id}</div>
                                                    </div>
                                                </div>
                                                <div className="flex-[2]">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">탐지 근거 (Reason)</p>
                                                    <p className="text-xs text-slate-300 font-bold leading-relaxed">{rel.reason_codes}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">상태 (Status)</p>
                                                    <span className={`px-3 py-1 text-[9px] font-black rounded-full uppercase tracking-widest ${rel.type === 'STRUCTURAL' ? 'bg-rose-500 text-white' : (rel.confidence === 'exact' ? 'bg-emerald-500 text-black' : 'bg-white/10 text-slate-400')}`}>
                                                        {rel.meta?.status || (rel.confidence === 'exact' ? '정밀 일치' : rel.confidence === 'high' ? '높음' : '패턴 매칭')}
                                                    </span>
                                                </div>
                                                {role === 'Auditor' && rel.original_id && (
                                                    <button
                                                        onClick={() => handlePromoteToReview(rel.original_id)}
                                                        className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase rounded-lg transition-all shadow-lg shadow-blue-900/40 whitespace-nowrap"
                                                    >
                                                        이슈 등록
                                                    </button>
                                                )}
                                                {rel.type === 'STRUCTURAL' && (
                                                    <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
                                                        <BarChart3 size={24} className="text-rose-500" />
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}



                                    {/* [New] Audit Evidence Detail Modal Logic Placeholder */}
                                    {/* Implementing inline for now to avoid large refactor */}
                                    {relationCandidates.map((rel, i) => (
                                        (rel.meta?.evidence_quote) && (
                                            <div key={`evidence-${i}`} className="hidden group-hover:block absolute z-50 bg-slate-800 border border-emerald-500/30 p-6 rounded-2xl shadow-2xl w-[400px] right-full mr-4 top-0 animate-in fade-in zoom-in-95">
                                                <h5 className="text-emerald-500 font-black uppercase text-xs mb-2 flex items-center gap-2">
                                                    <BrainCircuit size={12} /> 배심원(AI) 제보 증거 (Evidence)
                                                </h5>
                                                <div className="bg-black/40 p-3 rounded-lg border border-white/5 mb-4">
                                                    <p className="text-white text-xs italic">"{rel.meta.evidence_quote}"</p>
                                                </div>

                                                <h5 className="text-blue-500 font-black uppercase text-xs mb-2 flex items-center gap-2">
                                                    <Database size={12} /> 판심(Engine) 산출 근거 (Logic)
                                                </h5>
                                                <div className="space-y-1 text-[10px] text-slate-400 font-mono">
                                                    <div className="flex justify-between">
                                                        <span>일치 기준 (Matched Criterion):</span>
                                                        <span className="text-white">{rel.meta.matched_criterion}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>이상 점수 (Anomaly Score):</span>
                                                        <span className="text-white">{rel.meta.s_score?.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between border-t border-white/10 pt-1 mt-1">
                                                        <span>최종 판결 (Verdict):</span>
                                                        <span className="text-emerald-400 font-bold">{rel.meta.risk_label === 'HIGH' ? '심각' : rel.meta.risk_label === 'MEDIUM' ? '주의' : '낮음'} 위험 (RISK)</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (currentSession?.status === 'CLOSED' || currentSession?.status === 'ARCHIVED') ? (
                        /* [PHASE 6] FINAL RECAP REPORT VIEW - ARCHITECTURE REVISION */
                        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
                            {/* Header Section */}
                            <div className="bg-slate-900/80 border border-white/10 rounded-[48px] p-12 shadow-2xl">
                                <div className="flex justify-between items-start mb-12">
                                    <div className="space-y-3">
                                        <span className="bg-emerald-500 text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">감사 최종 보고서 (Final Report)</span>
                                        <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">{currentSession.name}</h2>
                                        <div className="flex items-center gap-4 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                                            <span>Session ID: {currentSession.id}</span>
                                            <span className="w-1 h-1 bg-slate-700 rounded-full" />
                                            <span>Period: {currentSession.period_start} ~ {currentSession.period_end}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">종료 일자 (Closed Date)</p>
                                        <p className="text-xl font-black text-white">{currentSession.created_at.split(' ')[0]}</p>
                                    </div>
                                </div>

                                {/* [ARCHITECTURE V2] 3-BLOCK EXECUTIVE SUMMARY */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                                    {/* [1] Confirmed Risk Level */}
                                    <div className="bg-black/40 border border-emerald-500/20 p-8 rounded-[32px] relative overflow-hidden group">
                                        <div className="relative z-10">
                                            <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <ShieldCheck size={14} /> Confirmed Risk Level
                                            </h4>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-5xl font-black text-white italic">
                                                    {(() => {
                                                        const conf = reviewQueue.filter(i => i.status === 'CONFIRMED');
                                                        const h = conf.filter(i => i.reason.toLowerCase().includes('high') || i.reason.toLowerCase().includes('critical')).length;
                                                        const m = conf.length - h;
                                                        return Math.min(100, (h * 25) + (m * 10));
                                                    })()}
                                                </span>
                                                <span className="text-slate-500 font-black text-xl italic uppercase">pts</span>
                                            </div>
                                            <p className="text-[9px] text-slate-400 mt-4 leading-relaxed font-bold uppercase italic">
                                                *공식 리스크 점수: 확정된 발견 사항(Confirmed)만 반영되었습니다.
                                            </p>
                                        </div>
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <Zap size={80} />
                                        </div>
                                    </div>

                                    {/* [2] Review Status Overview */}
                                    <div className="bg-black/40 border border-amber-500/20 p-8 rounded-[32px] relative overflow-hidden group">
                                        <div className="relative z-10">
                                            <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <BrainCircuit size={14} /> Review Status Overview
                                            </h4>
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-3xl font-black text-white italic">
                                                        {reviewQueue.filter(i => ['PENDING', 'ESCALATED', 'DEFERRED'].includes(i.status)).length}
                                                    </span>
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending Signals</span>
                                                </div>
                                                <div className="h-10 w-[1px] bg-white/10" />
                                                <div className="flex flex-col">
                                                    <span className="text-3xl font-black text-white/40 italic">
                                                        {reviewQueue.filter(i => i.status === 'CONFIRMED').length}
                                                    </span>
                                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Confirmed</span>
                                                </div>
                                            </div>
                                            <p className="text-[9px] text-amber-500/70 mt-4 leading-relaxed font-bold uppercase italic">
                                                "현재 다수의 발견 사항이 검토 대기(Open) 상태이며, 최종 확정 시 공식 점수에 반영됩니다."
                                            </p>
                                        </div>
                                    </div>

                                    {/* [3] Financial Exposure Summary */}
                                    <div className="bg-black/40 border border-blue-500/20 p-8 rounded-[32px] relative overflow-hidden group">
                                        <div className="relative z-10">
                                            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <Database size={14} /> Financial Exposure
                                            </h4>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-baseline">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Confirmed</span>
                                                    <span className="text-xl font-black text-white italic">
                                                        ₩{reviewQueue.filter(i => i.status === 'CONFIRMED').reduce((acc, curr) => {
                                                            try { return acc + (JSON.parse(curr.snapshot_data || '{}').amount || 0); } catch (e) { return acc; }
                                                        }, 0).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-baseline opacity-40">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Potential (Open)</span>
                                                    <span className="text-lg font-black text-slate-300 italic">
                                                        ₩{reviewQueue.filter(i => ['PENDING', 'ESCALATED', 'DEFERRED'].includes(i.status)).reduce((acc, curr) => {
                                                            try { return acc + (JSON.parse(curr.snapshot_data || '{}').amount || 0); } catch (e) { return acc; }
                                                        }, 0).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Report Content */}
                                <div className="prose prose-invert max-w-none">
                                    <div className="p-12 bg-black/60 border border-white/5 rounded-[40px] font-sans text-slate-300 leading-relaxed whitespace-pre-wrap text-sm shadow-inner">
                                        {currentSession.final_report || "No summary report generated for this session."}
                                    </div>

                                    <div className="mt-8 text-center text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] italic">
                                        “본 보고서의 공식 리스크 평가는 감사인의 최종 확정(adjudication)을 완료한 사항만을 기준으로 산출되었습니다.”
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12 p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-[32px] flex flex-col md:flex-row justify-between items-center gap-8">
                                <div>
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Quality Assurance Status</p>
                                    <h4 className="text-xl font-black text-white italic uppercase tracking-tighter">
                                        {currentSession.reviewer_ack ? "Confirmed & Signed" : "Pending Signature"}
                                    </h4>
                                    {currentSession.reviewer_ack && (
                                        <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
                                            Signed by: {currentSession.reviewer_name} on {currentSession.reviewer_ack.substring(0, 10)}
                                        </p>
                                    )}
                                </div>
                                {currentSession.reviewer_ack ? (
                                    <div className="flex items-center gap-3 text-emerald-500">
                                        <ShieldCheck size={32} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Digital Audit Seal Applied</span>
                                    </div>
                                ) : role === 'Reviewer' ? (
                                    <button
                                        onClick={handleAcknowledgeReport}
                                        className="px-10 py-4 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/40 flex items-center gap-3"
                                    >
                                        <CheckCircle2 size={18} /> Sign & Approve Report
                                    </button>
                                ) : (
                                    <div className="text-slate-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                        <Clock size={16} /> Auditor Waiting for Reviewer Action
                                    </div>
                                )}
                            </div>

                            <div className="mt-12 flex items-center justify-center gap-6">
                                <button className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2">
                                    <FileText size={16} /> Export to PDF
                                </button>
                                <button className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center gap-2 shadow-lg shadow-blue-900/40">
                                    <Layers size={16} /> Share with Compliance
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-black text-white italic uppercase flex items-center gap-3">
                                        <ShieldAlert className="text-rose-500" size={28} /> 이상 징후 및 이슈 검토 목록
                                    </h3>
                                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">배정된 전수 조사 대상 중 AI가 추출한 검토 필요 항목입니다.</p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/5 flex items-center gap-6 shadow-2xl">
                                        <div className="text-center">
                                            <p className="text-[9px] font-black text-slate-500 uppercase">검토 대기 (Pending)</p>
                                            <p className="text-xl font-black text-white">{reviewQueue.filter(i => i.status === 'PENDING').length}</p>
                                        </div>
                                        <div className="w-px h-8 bg-white/10" />
                                        <div className="text-center">
                                            <p className="text-[9px] font-black text-slate-500 uppercase">조사 확정 (Confirmed)</p>
                                            <p className="text-xl font-black text-emerald-500">{reviewQueue.filter(i => i.status === 'CONFIRMED').length}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {reviewQueue.length === 0 ? (
                                    <div className="bg-white/5 border border-white/5 border-dashed rounded-[64px] p-32 text-center shadow-inner">
                                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
                                            <CheckCircle2 className="text-emerald-500" size={40} />
                                        </div>
                                        <h4 className="text-xl font-black text-white uppercase italic">Queue is Empty</h4>
                                        <p className="text-slate-500 font-bold mt-2 max-w-md mx-auto">새로운 자료가 입고되거나 AI가 관계 불일치를 발견하면 여기에 검토 항목이 생성됩니다.</p>
                                    </div>
                                ) : (
                                    reviewQueue
                                        .filter(item => {
                                            if (role === 'Reviewer') return item.status === 'ESCALATED' || item.status === 'CONFIRMED' || item.status === 'DISMISSED';
                                            return true;
                                        })
                                        .map((item) => {
                                            const isActionable = !currentSession?.reviewer_ack && ((role === 'Auditor' && item.status === 'PENDING') || (role === 'Reviewer' && item.status === 'ESCALATED'));

                                            return (
                                                <div key={item.id} className={`bg-white/5 border border-white/10 rounded-[48px] p-10 flex flex-col xl:flex-row gap-10 transition-all ${!isActionable ? 'opacity-40 grayscale-[0.6]' : 'hover:bg-white/[0.08] hover:border-emerald-500/20 shadow-xl'}`}>
                                                    <div className="flex-1 space-y-6">
                                                        <div className="flex items-center gap-4">
                                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase ${item.status === 'PENDING' ? 'bg-amber-500/20 text-amber-500' :
                                                                item.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-500' :
                                                                    item.status === 'ESCALATED' ? 'bg-rose-500/20 text-rose-500' :
                                                                        'bg-slate-500/20 text-slate-500'
                                                                }`}>
                                                                {item.status === 'PENDING' ? '검토 대기 (Pending)' :
                                                                    item.status === 'CONFIRMED' ? '이슈 확정 (Confirmed)' :
                                                                        item.status === 'ESCALATED' ? '상신 (Escalated)' :
                                                                            item.status === 'DISMISSED' ? '기각 (Dismissed)' : item.status}
                                                            </span>
                                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">ID: #{item.id}</span>
                                                        </div>

                                                        <div className="space-y-6">
                                                            <h4 className="text-2xl font-black text-white tracking-tight leading-snug">
                                                                {item.reason}
                                                            </h4>

                                                            {item.snapshot_data && (
                                                                <div className="space-y-3">
                                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><EyeOff size={11} /> 분석 내용 및 증거 추출 (Audit Trail Snapshot)</p>
                                                                    <div className="bg-black/60 border border-white/5 rounded-2xl p-6 font-mono text-[11px] text-emerald-500/80 leading-relaxed shadow-inner">
                                                                        {item.snapshot_data}
                                                                    </div>
                                                                </div>
                                                            )}



                                                            {item.reviewer_final_note && (
                                                                <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                                                                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-2"><ShieldCheck size={11} /> 검토 책임자 최종 판단 (Reviewer Verdict)</p>
                                                                    <p className="text-xs text-white font-bold italic">"{item.reviewer_final_note}"</p>
                                                                </div>
                                                            )}

                                                            <div className="flex flex-wrap items-center gap-4">
                                                                <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-xl border border-white/5 text-blue-400">
                                                                    <Database size={14} />
                                                                    <span className="text-[10px] font-black font-mono uppercase">Target: {item.object_id || 'Global Context'}</span>
                                                                </div>
                                                                {item.relation_candidate_id && (
                                                                    <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-xl border border-white/5 text-emerald-400">
                                                                        <BrainCircuit size={14} />
                                                                        <span className="text-[10px] font-black font-mono uppercase">Rel: {item.relation_candidate_id}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="w-full xl:w-96 flex flex-col justify-center gap-3">
                                                        {role === 'Reviewer' && item.status === 'ESCALATED' ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleResolveEscalation(item.id, 'CONFIRMED')}
                                                                    className="w-full bg-rose-600 text-white py-5 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] hover:bg-rose-500 shadow-xl shadow-rose-950/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                                                                >
                                                                    <ShieldCheck size={18} /> 조사 확정 (Confirm issues)
                                                                </button>
                                                                <button
                                                                    onClick={() => handleResolveEscalation(item.id, 'DISMISSED')}
                                                                    className="w-full bg-white/5 border border-white/10 text-slate-400 py-4 rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                                                                >
                                                                    상신 기각 (Dismiss Escalation)
                                                                </button>
                                                            </>

                                                        ) : role === 'Reviewer' && item.status === 'CONFIRMED' ? (
                                                            // Check if it's already "Sealed" (has a final note from reviewer)
                                                            item.reviewer_final_note ? (
                                                                <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-[32px] text-center flex flex-col items-center justify-center gap-3 animate-in fade-in zoom-in w-full h-full">
                                                                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                                                                        <Lock size={20} />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">최종 승인 및 봉출됨 (Sealed)</p>
                                                                        <p className="text-[9px] text-slate-500 font-bold mt-1">Status Locked</p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-2 text-center">
                                                                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">감사인 검증 완료</p>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleResolveEscalation(item.id, 'SEALED')}
                                                                        className="w-full bg-emerald-500 text-white py-5 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-400 shadow-xl shadow-emerald-500/50 hover:shadow-emerald-500/70 transition-all flex items-center justify-center gap-3 active:scale-95 animate-pulse hover:animate-none"
                                                                    >
                                                                        <CheckCircle2 size={18} /> 최종 승인 및 봉출 (Seal)
                                                                    </button>
                                                                </>
                                                            )
                                                        ) : role === 'Auditor' && item.status === 'PENDING' ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleUpdateStatus(item.id, 'CONFIRMED')}
                                                                    className="w-full bg-emerald-600 text-white py-5 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-500 shadow-xl shadow-emerald-950/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                                                                >
                                                                    <CheckCircle2 size={18} /> Confirm review (불변 처리)
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeepDive(item)}
                                                                    disabled={isDeepDiveLoading}
                                                                    className="w-full bg-blue-600/20 border border-blue-500/30 text-blue-400 py-4 rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:bg-blue-600/30 transition-all flex items-center justify-center gap-3"
                                                                >
                                                                    {isDeepDiveLoading ? <Loader2 className="animate-spin" size={14} /> : <BrainCircuit size={14} />}
                                                                    AI Fraud Deep Dive (심층 분석)
                                                                </button>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <button
                                                                        onClick={() => handleUpdateStatus(item.id, 'ESCALATED')}
                                                                        className="bg-rose-500/10 border border-rose-500/20 text-rose-500 py-4 rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:bg-rose-500/20 transition-all flex items-center justify-center gap-2"
                                                                    >
                                                                        <ShieldAlert size={14} /> 상신 (Escalate)
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleUpdateStatus(item.id, 'DEFERRED')}
                                                                        className="bg-slate-500/10 border border-slate-500/20 text-slate-400 py-4 rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:bg-slate-500/20 transition-all flex items-center justify-center gap-2"
                                                                    >
                                                                        <Clock size={14} /> 보류 (Defer)
                                                                    </button>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleUpdateStatus(item.id, 'DISMISSED')}
                                                                    className="w-full bg-white/5 border border-white/10 text-slate-500 py-3 rounded-[24px] font-black text-[9px] uppercase tracking-widest hover:bg-white/10 transition-all"
                                                                >
                                                                    기각 처리 (Dismiss)
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <div className="text-center py-8 opacity-40">
                                                                <Lock size={24} className="mx-auto mb-2" />
                                                                <p className="text-[9px] font-black uppercase tracking-widest">
                                                                    {currentSession?.reviewer_ack ? 'Session Sealed (봉인됨)' : `Action Locked for ${role}`}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                )}
                            </div>
                        </div>
                    )
                )}
            </div>

            <AnimatePresence>
                {deepDiveResult && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#020617]/90 backdrop-blur-xl animate-in fade-in duration-300">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-slate-900 border border-white/10 rounded-[48px] shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col relative"
                        >
                            <button 
                                onClick={() => setDeepDiveResult(null)}
                                className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"
                            >
                                <XCircle size={32} />
                            </button>

                            <div className="p-12 overflow-y-auto custom-scrollbar">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                        <BrainCircuit size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">AI Fraud Deep Dive</h2>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">In-depth Intent & Pattern Analysis</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                                    <div className="md:col-span-4 space-y-8">
                                        <div className="bg-black/40 rounded-[32px] p-8 border border-white/5 text-center">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Fraud Probability</p>
                                            <div className="relative inline-flex items-center justify-center">
                                                <svg className="w-32 h-32 transform -rotate-90">
                                                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                                                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                                                        strokeDasharray={364.4}
                                                        strokeDashoffset={364.4 * (1 - deepDiveResult.fraud_probability)}
                                                        className={deepDiveResult.fraud_probability > 0.8 ? "text-rose-500" : "text-amber-500"} 
                                                    />
                                                </svg>
                                                <span className="absolute text-3xl font-black text-white italic">{(deepDiveResult.fraud_probability * 100).toFixed(0)}%</span>
                                            </div>
                                            <p className={`mt-4 text-[10px] font-black uppercase tracking-widest ${deepDiveResult.fraud_probability > 0.8 ? "text-rose-500" : "text-amber-500"}`}>
                                                {deepDiveResult.fraud_probability > 0.8 ? "Critical Warning" : "High Suspicion"}
                                            </p>
                                        </div>

                                        <div className="bg-blue-500/5 rounded-[32px] p-6 border border-blue-500/10">
                                            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <Activity size={14} /> Similar Case Correlation
                                            </h4>
                                            <div className="text-3xl font-black text-white italic mb-1">{deepDiveResult.similar_cases_count} 건</div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">관련 데이터 탐지됨</p>
                                        </div>
                                    </div>

                                    <div className="md:col-span-8 space-y-8">
                                        <section>
                                            <h4 className="text-[11px] font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <Terminal size={14} /> Intent Analysis (의도 분석)
                                            </h4>
                                            <div className="bg-black/60 rounded-3xl p-8 border border-white/5 shadow-inner">
                                                <p className="text-slate-200 leading-relaxed font-bold italic text-sm">
                                                    "{deepDiveResult.intent_analysis}"
                                                </p>
                                            </div>
                                        </section>

                                        <section>
                                            <h4 className="text-[11px] font-black text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <Layers size={14} /> Pattern Signatures
                                            </h4>
                                            <div className="space-y-3">
                                                {deepDiveResult.pattern_correlation.map((p: string, i: number) => (
                                                    <div key={i} className="flex items-start gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                                        <p className="text-[11px] font-bold text-slate-300">{p}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <section>
                                            <h4 className="text-[11px] font-black text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <ClipboardList size={14} /> Recommended Interview Questions
                                            </h4>
                                            <div className="space-y-3">
                                                {deepDiveResult.suggested_interview_questions.map((q: string, i: number) => (
                                                    <div key={i} className="bg-rose-500/5 border border-rose-500/10 p-5 rounded-2xl">
                                                        <p className="text-xs text-rose-300 font-black italic">Q: {q}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </div>
                                </div>

                                <div className="mt-12 pt-8 border-t border-white/5">
                                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-6">Evidence Cluster (Cross-Transaction Evidence)</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {deepDiveResult.evidence_cluster.map((e: string, i: number) => (
                                            <div key={i} className="bg-black/40 p-4 rounded-2xl border border-white/5 font-mono text-[9px] text-slate-400">
                                                {e}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-black/40 border-t border-white/5 flex justify-end">
                                <button 
                                    onClick={() => setDeepDiveResult(null)}
                                    className="px-10 py-4 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
                                >
                                    Close Analysis
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
            `}</style>
        </div>
    );
}
