import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { safeInvoke } from "../lib/tauri-bridge";
import {
    Upload, Zap, Loader2,
    FileText, EyeOff, CheckCircle2, XCircle,
    BrainCircuit, BarChart3, Database, Lock, MoveRight,
    ShieldAlert, ShieldCheck, Search, ChevronDown, Terminal,
    Layers, ClipboardList, Clock, Plus
} from 'lucide-react';
import { useApp } from '../App';
import { AuditSession, ReviewItem } from '../types';

export default function AuditWorkspace() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { activeProject, setActiveProject } = useApp();

    const [projects, setProjects] = useState<any[]>([]);
    const [auditObjects, setAuditObjects] = useState<any[]>([]);
    const [relationCandidates, setRelationCandidates] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [sessions, setSessions] = useState<AuditSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>([]);

    const location = useLocation();
    const [activeTab, setActiveTab] = useState<'explorer' | 'queue'>('explorer');
    const [role, setRole] = useState<'Auditor' | 'Reviewer'>('Auditor');

    useEffect(() => {
        const state = location.state as any;
        if (state?.metric === "Pending Reviews") {
            setActiveTab('queue');
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
        // [GLOBAL SUPPORT] Allow fetching even if activeProject is null (Company Wide)
        setIsLoading(true);
        const fetchContext = activeProject || null;

        Promise.all([
            safeInvoke("get_audit_objects", { projectId: fetchContext }),
            safeInvoke("get_relation_candidates", { projectId: fetchContext }),
            safeInvoke("get_audit_sessions", { projectId: fetchContext }),
            safeInvoke("get_risk_summary", {}) // Fetch new AI risks
        ]).then(([objs, candidates, sess, riskData]: [any, any, any, any]) => {
            setAuditObjects(objs);

            // [CRITICAL FIX] Merge New AI Risks into Legacy Candidate View
            // Mapping 'suspicion_inbox' items to 'relation_candidate' structure for display
            const newRisks = (riskData?.items || []).map((r: any) => ({
                // Make it look like a relation for the UI
                from_object_id: r.source || "AI_ENGINE",
                to_object_id: "RISK_FOUND", // Shortened from RISK_DETECTED to fit UI 12-char limit
                reason_codes: r.observation,
                confidence: (r.score || 0) >= 0.8 ? 'exact' : 'high',
                // Preserve original ID for traceability if needed
                original_id: r.id
            }));

            // Prepend risks so they appear first
            setRelationCandidates([...newRisks, ...candidates]);

            setSessions(sess);
            if (sess.length > 0 && !currentSessionId) {
                setCurrentSessionId(sess[0].id);
            }
            setIsLoading(false);
        });

    }, [activeProject]);

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
            setCurrentSessionId(sessId);
            setActiveTab('queue');
            // Refresh sessions
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

    const handleResolveEscalation = (itemId: string, status: 'CONFIRMED' | 'DISMISSED') => {
        const note = prompt("Reviewer Final Decision Note (ESCALATION RESOLUTION):");
        if (!note) return;
        safeInvoke("resolve_escalation", { itemId, status, finalNote: note }).then(() => {
            setReviewQueue(prev => prev.map(item => item.id === itemId ? { ...item, status, reviewer_final_note: note } : item));
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

                        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
                            <button
                                onClick={() => setRole('Auditor')}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${role === 'Auditor' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-500 hover:text-white'}`}
                            >
                                감사인 (Auditor)
                            </button>
                            <button
                                onClick={() => setRole('Reviewer')}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${role === 'Reviewer' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40' : 'text-slate-500 hover:text-white'}`}
                            >
                                검토 책임자 (Reviewer)
                            </button>
                        </div>

                        <div className="flex items-center gap-3 bg-white/5 p-1 rounded-2xl border border-white/5">
                            <button
                                onClick={() => setActiveTab('explorer')}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'explorer' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-500 hover:text-white'}`}
                            >
                                <Zap size={14} /> 증거 저장소 (Repository)
                            </button>
                            <button
                                onClick={() => setActiveTab('queue')}
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
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Active Audit Session</p>
                        <div className="flex gap-4">
                            {currentSession?.status === 'OPEN' && (
                                <button onClick={handleCloseSession} className="text-emerald-500 hover:text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                    Close Session
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
                                setCurrentSessionId(e.target.value);
                                // Default to queue/report tab when switching session
                                setActiveTab('queue');
                            }}
                            className="appearance-none bg-black/40 border border-white/5 text-slate-200 font-bold text-sm py-3 px-4 pr-10 rounded-xl outline-none w-full cursor-pointer hover:bg-black/60 transition-all font-mono"
                        >
                            <option value="" disabled>No Active Session</option>
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
                                                            <p className="text-sm font-black text-white">{obj.object_type}</p>
                                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{obj.id}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`text-[9px] font-black px-2 py-1 rounded ${obj.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-slate-500'}`}>{obj.status}</span>
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

                                <div className="space-y-6">
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
                                            <div key={i} className="bg-emerald-500/5 border border-emerald-500/10 rounded-[40px] p-8 flex items-center gap-8 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                                                <div className="flex-1 space-y-2">
                                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Candidate #{i + 1}</p>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-xs font-black text-white px-2 py-1 bg-white/5 rounded">{rel.from_object_id}</div>
                                                        <MoveRight className="text-emerald-500/40" size={16} />
                                                        <div className="text-xs font-black text-white px-2 py-1 bg-white/5 rounded">{rel.to_object_id}</div>
                                                    </div>
                                                </div>
                                                <div className="flex-[2]">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Reason Context</p>
                                                    <p className="text-xs text-slate-300 font-bold leading-relaxed">{rel.reason_codes}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Confidence</p>
                                                    <span className={`px-3 py-1 text-[9px] font-black rounded-full uppercase tracking-widest ${rel.confidence === 'exact' ? 'bg-emerald-500 text-black' : 'bg-white/10 text-slate-400'}`}>{rel.confidence}</span>
                                                </div>
                                                {role === 'Auditor' && rel.original_id && (
                                                    <button
                                                        onClick={() => handlePromoteToReview(rel.original_id)}
                                                        className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase rounded-lg transition-all shadow-lg shadow-blue-900/40"
                                                    >
                                                        이슈 등록
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : currentSession?.status === 'CLOSED' ? (
                        /* [PHASE 6] FINAL RECAP REPORT VIEW */
                        <div className="max-w-4xl mx-auto bg-slate-900/80 border border-white/10 rounded-[48px] p-16 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
                            <div className="flex justify-between items-start mb-12">
                                <div className="space-y-2">
                                    <span className="bg-emerald-500 text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Final Audit Report</span>
                                    <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">{currentSession.name}</h2>
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Session ID: {currentSession.id}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Closed Date</p>
                                    <p className="text-lg font-black text-white">{currentSession.created_at.split(' ')[0]}</p>
                                </div>
                            </div>

                            <div className="prose prose-invert max-w-none">
                                <div className="p-10 bg-black/40 border border-white/5 rounded-[32px] font-sans text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {currentSession.final_report || "No summary report generated for this session."}
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
                                            <p className="text-[9px] font-black text-slate-500 uppercase">Pending</p>
                                            <p className="text-xl font-black text-white">{reviewQueue.filter(i => i.status === 'PENDING').length}</p>
                                        </div>
                                        <div className="w-px h-8 bg-white/10" />
                                        <div className="text-center">
                                            <p className="text-[9px] font-black text-slate-500 uppercase">Confirmed</p>
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
                                                                {item.status}
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
                                                                    <ShieldCheck size={18} /> Resolve as CONFIRMED
                                                                </button>
                                                                <button
                                                                    onClick={() => handleResolveEscalation(item.id, 'DISMISSED')}
                                                                    className="w-full bg-white/5 border border-white/10 text-slate-400 py-4 rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                                                                >
                                                                    Dismiss Escalation
                                                                </button>
                                                            </>
                                                        ) : role === 'Reviewer' && item.status === 'CONFIRMED' ? (
                                                            <>
                                                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-2 text-center">
                                                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Auditor Verified</p>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleResolveEscalation(item.id, 'CONFIRMED')}
                                                                    className="w-full bg-emerald-600 text-white py-5 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-500 shadow-xl shadow-emerald-950/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                                                                >
                                                                    <CheckCircle2 size={18} /> Final Approve & Seal
                                                                </button>
                                                            </>
                                                        ) : role === 'Auditor' && item.status === 'PENDING' ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleUpdateStatus(item.id, 'CONFIRMED')}
                                                                    className="w-full bg-emerald-600 text-white py-5 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-500 shadow-xl shadow-emerald-950/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                                                                >
                                                                    <CheckCircle2 size={18} /> Confirm review (불변 처리)
                                                                </button>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <button
                                                                        onClick={() => handleUpdateStatus(item.id, 'ESCALATED')}
                                                                        className="bg-rose-500/10 border border-rose-500/20 text-rose-500 py-4 rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:bg-rose-500/20 transition-all flex items-center justify-center gap-2"
                                                                    >
                                                                        <ShieldAlert size={14} /> Escalate
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleUpdateStatus(item.id, 'DEFERRED')}
                                                                        className="bg-slate-500/10 border border-slate-500/20 text-slate-400 py-4 rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:bg-slate-500/20 transition-all flex items-center justify-center gap-2"
                                                                    >
                                                                        <Clock size={14} /> Defer
                                                                    </button>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleUpdateStatus(item.id, 'DISMISSED')}
                                                                    className="w-full bg-white/5 border border-white/10 text-slate-500 py-3 rounded-[24px] font-black text-[9px] uppercase tracking-widest hover:bg-white/10 transition-all"
                                                                >
                                                                    Dismiss Item
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

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
            `}</style>
        </div >
    );
}
