import React, { useEffect, useState, useMemo } from 'react';
import { safeInvoke } from '../lib/tauri-bridge';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAutoSave } from '../hooks/useAutoSave';
import {
    Loader2, Search, ArrowLeft,
    AlertTriangle,
    Database, Fingerprint, Clock, BrainCircuit,
    PlusCircle, XCircle, Info, Image as ImageIcon, Mail
} from 'lucide-react';

interface AuditIssue {
    id: number;
    issue_title: string;
    description: string;
    severity: string;
    detected_at: string;
    row_index?: number;
    raw_row_data?: string;
    recommendations?: string;
    evidence_quote?: string;
    audit_id?: string;
    evidence_image?: string;
    manager_comment?: string;
    remediation_plan?: string;
}

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={"bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden " + (className || "")}>{children}</div>
);

const SeverityBadge = ({ severity }: { severity: string }) => {
    const styles: Record<string, string> = {
        Critical: "bg-rose-600 text-white border-rose-700",
        High: "bg-red-500 text-white border-red-600",
        Medium: "bg-amber-500 text-white border-amber-600",
        Low: "bg-blue-500 text-white border-blue-600",
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${styles[severity] || "bg-slate-500 text-white"}`}>
            {severity}
        </span>
    );
};

import { useApp } from '../App';

export default function AnalysisResult({ onBack }: { onBack: () => void }) {
    const { activeProject } = useApp();
    const [issues, setIssues] = useState<AuditIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const location = useLocation();
    const navigate = useNavigate();
    const [categories, setCategories] = useState<string[]>([]);
    const [showCatModal, setShowCatModal] = useState(false);
    const [modalData, setModalData] = useState({ category: 'EXP', custom: '', issueId: 0 });
    const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
    const fetchIssues = async () => {
        try {
            setLoading(true);
            const res: any[] = await safeInvoke('get_audit_issues', { projectType: activeProject || "Unknown" });
            let data = (res as AuditIssue[]) || [];

            const state = location.state as any;
            if (state?.filterSeverity) {
                const filtered = data.filter(i => i.severity === state.filterSeverity);
                if (state.filterSeverity === 'High') data = filtered; // Apply hard filter if requested
                if (filtered.length > 0) setSelectedId(filtered[0].id);
            } else if (state?.selectedIssueId) {
                setSelectedId(state.selectedIssueId);
            } else if (state?.filterDate) {
                data = data.filter(i => i.detected_at.includes(state.filterDate));
                if (data.length > 0) setSelectedId(data[0].id);
            }

            // Severity 정렬 (High > Medium > Low)
            const severityOrder: Record<string, number> = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
            data.sort((a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99));

            setIssues(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIssues();
    }, [activeProject, location.state]);

    const handleDismiss = async (id: number) => {
        if (!confirm("해당 발견 사항을 항목에서 제외하시겠습니까?")) return;
        try {
            await safeInvoke('dismiss_audit_issue', { issueId: id });
            setIssues(prev => prev.filter(i => i.id !== id));
            setSelectedId(null);
            alert("기각 처리되었습니다.");
        } catch (err) {
            console.error(err);
            alert("처리 중 오류가 발생했습니다.");
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await safeInvoke('get_scenario_categories');
            setCategories(res as string[]);
        } catch (err) { console.error(err); }
    };

    const getDisplayImage = (issue: AuditIssue) => {
        if (issue.evidence_image) return issue.evidence_image;
        if (issue.issue_title.includes('회식비') || issue.issue_title.includes('고기집')) {
            // Demo purpose: Mapping a generated image for the "meat place" issue
            return "/gangnam_menu.png";
        }
        return null;
    };

    const handleAddScenarioClick = (id: number) => {
        fetchCategories();
        setModalData({ category: 'EXP', custom: '', issueId: id });
        setShowCatModal(true);
    };

    const submitToScenario = async () => {
        const finalCategory = modalData.category === 'CUSTOM' ? modalData.custom : modalData.category;
        if (!finalCategory) { alert("카테고리를 입력해주세요."); return; }

        try {
            await safeInvoke('add_issue_to_scenarios', { issueId: modalData.issueId, category: finalCategory, isAi: true });
            alert("시나리오에 성공적으로 반영되었습니다. (AI 지식베이스 학습 완료)");
            setIssues(prev => prev.filter(i => i.id !== modalData.issueId));
            setSelectedId(null);
            setShowCatModal(false);
        } catch (err) {
            alert("반영 실패: " + err);
        }
    };

    const handleSendEmail = (issue: AuditIssue) => {
        const subject = `[감사 소명 요청] ${issue.issue_title} 관련 확인 요청`;
        const body = `
수신: 관련 담당자
참조: 감사팀

귀 부서의 지출 내역 감사 중 아래와 같은 특이사항이 발견되었습니다.

1. 발견 항목: ${issue.issue_title}
2. 상세 내용: ${issue.description}
3. 증빙 데이터: ${issue.evidence_quote || "별첨 참조"}
4. 조치 권고: ${issue.recommendations || "관련 증빙 제출 및 소명"}

위 내용에 대해 3일 이내에 소명 자료를 제출해 주시기 바랍니다.

- AuditFlow 자동 생성됨 -
        `;

        // 클립보드 복사
        navigator.clipboard.writeText(body).then(() => {
            alert("이메일 본문이 클립보드에 복사되었습니다.\n메일 작성 창에 붙여넣기(Ctrl+V) 하세요.");
        });

        // 메일 앱 띄우기
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const stats = useMemo(() => {
        const total = issues.length;
        const high = issues.filter(i => i.severity === 'High' || i.severity === 'Critical').length;
        const criticalCount = issues.filter(i => i.severity === 'Critical').length;
        const score = total === 0 ? 100 : Math.max(0, 100 - (criticalCount * 20) - ((high - criticalCount) * 10) - ((total - high) * 2));

        const counts: any = { FSC: 0, TRE: 0, EXP: 0, STP: 0, HR: 0, SEC: 0 };
        issues.forEach(i => {
            const txt = (i.issue_title + i.description).toLowerCase();
            if (txt.includes('인사') || txt.includes('hr') || txt.includes('회식')) counts.HR++;
            else if (txt.includes('횡령') || txt.includes('paper') || txt.includes('kickback')) counts.FSC++;
            else if (txt.includes('카드') || txt.includes('접대') || txt.includes('payment')) counts.EXP++;
            else if (txt.includes('구매') || txt.includes('영업') || txt.includes('procurement')) counts.STP++;
            else counts.SEC++;
        });

        return { total, score, high, counts };
    }, [issues]);

    const selectedIssue = useMemo(() => issues.find(i => i.id === selectedId), [issues, selectedId]);

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-[#fcfdfe]">
            <Loader2 className="animate-spin w-10 h-10 text-slate-300" />
        </div>
    );

    return (
        <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
            <div className="w-[450px] flex flex-col border-r border-slate-200 bg-white">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <button onClick={onBack} className="flex items-center gap-1 text-xs text-slate-400 font-bold hover:text-blue-600 mb-2 group">
                            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> {location.state ? 'BACK TO DASHBOARD' : 'COMMAND CENTER'}
                        </button>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <Fingerprint className="w-5 h-5 text-blue-600" /> AI 정밀 탐지 리포트
                        </h2>
                        {location.state && (
                            <button
                                onClick={() => { navigate(location.pathname, { replace: true, state: null }); window.location.reload(); }}
                                className="mt-2 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-500 px-2 py-1 rounded-md font-bold uppercase flex items-center gap-1"
                            >
                                <XCircle className="w-3 h-3" /> 필터 해제 (전체 보기)
                            </button>
                        )}
                    </div>
                </div>

                <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex gap-2">
                    {['Critical', 'High', 'Medium', 'Low'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterSeverity(filterSeverity === s ? null : s)}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter border transition-all ${filterSeverity === s
                                ? (s === 'Critical' ? 'bg-rose-600 text-white border-rose-700 shadow-sm' : s === 'High' ? 'bg-red-500 text-white border-red-600 shadow-sm' : s === 'Medium' ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'bg-blue-500 text-white border-blue-600 shadow-sm')
                                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            {s} ONLY
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                    {issues.filter(i => !filterSeverity || i.severity === filterSeverity).map(issue => (
                        <div
                            key={issue.id}
                            onClick={() => setSelectedId(issue.id)}
                            className={`p-6 cursor-pointer transition-all border-l-4 ${selectedId === issue.id ? 'bg-blue-50/50 border-blue-600' : 'hover:bg-slate-50 border-transparent'}`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                    {(issue.row_index || 0) > 0 ? `ENTRY #00${issue.row_index}` : 'SYSTEM DOC'}
                                </span>
                                <SeverityBadge severity={issue.severity} />
                            </div>
                            <h4 className={`font-black text-sm mb-2 leading-tight ${selectedId === issue.id ? 'text-blue-700' : 'text-slate-800'}`}>
                                {issue.issue_title}
                            </h4>
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{issue.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
                {selectedIssue ? (
                    <div className="flex-1 overflow-y-auto bg-slate-50/30">
                        <div className="p-10 bg-white border-b border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-[0.03] rotate-12">
                                <Search size={200} />
                            </div>
                            <div className="relative z-10 max-w-4xl">
                                <div className="flex items-center gap-3 mb-6">
                                    <SeverityBadge severity={selectedIssue.severity} />
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 border-l pl-3">
                                        <Clock className="w-3 h-3" /> {selectedIssue.detected_at}
                                    </span>
                                </div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-6 leading-tight">
                                    {selectedIssue.issue_title}
                                </h1>
                                <Card className="bg-red-50/50 border-red-100 p-4 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-500 mt-1 shrink-0" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">AUDIT SOURCE</span>
                                        <h3 className="text-sm font-black text-slate-800 line-clamp-1">{selectedIssue.issue_title}</h3>
                                        <p className="text-[10px] font-black text-red-400 uppercase mt-3 mb-1">AI DETECTED RISK</p>
                                        <p className="text-sm text-red-900 font-medium leading-relaxed">{selectedIssue.description}</p>
                                    </div>
                                </Card>
                            </div>
                        </div>

                        <div className="p-10 max-w-5xl space-y-8">
                            <section>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <Database className="w-4 h-4" /> Hard Evidence (Raw Data)
                                </h3>
                                <Card className="p-0 border-none shadow-2xl">
                                    <div className="bg-slate-900 p-6 font-mono text-xs text-blue-400 overflow-x-auto leading-loose whitespace-pre-wrap">
                                        {selectedIssue.evidence_quote || selectedIssue.raw_row_data || "증빙 데이터를 찾을 수 없습니다."}
                                    </div>
                                </Card>
                            </section>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="p-6 bg-white border-blue-100">
                                    <h4 className="flex items-center gap-2 font-black text-slate-800 text-sm uppercase tracking-tight mb-4 text-blue-600">
                                        <BrainCircuit className="w-4 h-4" /> Recommended Action
                                    </h4>
                                    <p className="text-sm text-slate-600 font-medium leading-relaxed">{selectedIssue.recommendations || "추천 조치가 없습니다."}</p>
                                </Card>
                                {getDisplayImage(selectedIssue) && (
                                    <Card className="p-6 bg-white border-amber-100">
                                        <h4 className="flex items-center gap-2 font-black text-slate-800 text-sm uppercase tracking-tight mb-4 text-amber-600">
                                            <ImageIcon className="w-4 h-4" /> Visual Evidence
                                        </h4>
                                        <div className="rounded-xl overflow-hidden border border-slate-100">
                                            <img
                                                src={getDisplayImage(selectedIssue)!}
                                                alt="Evidence"
                                                className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500"
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-3 font-bold text-center uppercase tracking-widest">
                                            Reference Image (Menu/Receipt)
                                        </p>
                                    </Card>
                                )}
                                <Card className="p-6 bg-slate-900 border-none">
                                    <h4 className="flex items-center gap-2 font-black text-white text-sm uppercase tracking-tight mb-4">
                                        <Info className="w-4 h-4 text-slate-400" /> Auditor Decision
                                    </h4>
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => handleAddScenarioClick(selectedIssue.id)}
                                            className="w-full py-3 bg-blue-600 text-white text-[11px] font-black uppercase rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                        >
                                            <PlusCircle className="w-4 h-4" /> 시나리오 반영 (Learning)
                                        </button>
                                        <button
                                            onClick={() => handleDismiss(selectedIssue.id)}
                                            className="w-full py-3 bg-slate-800 text-slate-300 text-[11px] font-black uppercase rounded-xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                                        >
                                            <XCircle className="w-4 h-4" /> 발견 사항 기각 (Dismiss)
                                        </button>
                                        <button
                                            onClick={() => handleSendEmail(selectedIssue)}
                                            className="w-full py-3 bg-indigo-600 text-white text-[11px] font-black uppercase rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 mt-4"
                                        >
                                            <Mail className="w-4 h-4" /> 담당자 소명 요청 (Email)
                                        </button>
                                    </div>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-200">
                                <AutoSaveEditor
                                    title="Manager's Review Comment"
                                    initialValue={selectedIssue.manager_comment || ""}
                                    placeholder="감사인의 검토 의견을 입력하세요. (자동 저장됨)"
                                    onSave={async (val) => safeInvoke('update_audit_issue_field', { id: selectedIssue.id, field: 'manager_comment', value: val })}
                                />
                                <AutoSaveEditor
                                    title="Remediation Plan"
                                    initialValue={selectedIssue.remediation_plan || ""}
                                    placeholder="구체적인 개선 계획을 입력하세요. (자동 저장됨)"
                                    onSave={async (val) => safeInvoke('update_audit_issue_field', { id: selectedIssue.id, field: 'remediation_plan', value: val })}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-20 text-center bg-white/50">
                        <Search size={80} className="text-slate-200 mb-8" />
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Investigation Required</h3>
                        <p className="text-sm text-slate-400 font-medium">리스트에서 발견 사항을 선택하세요.</p>
                    </div>
                )}
            </div>

            <div className="w-[80px] border-l border-slate-200 bg-white flex flex-col items-center py-8 gap-10">
                <div className="flex flex-col items-center gap-1 group cursor-help">
                    <span className="text-[10px] font-black text-slate-400 uppercase rotate-90 my-6">SCORE</span>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border-2 ${stats.score < 70 ? 'border-red-500 text-red-500' : 'border-blue-600 text-blue-600'}`}>
                        {stats.score}
                    </div>
                </div>
            </div>

            {showCatModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <Card className="w-full max-w-lg shadow-2xl border-none animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center text-slate-900 font-bold">
                            <span>시나리오 카테고리 설정</span>
                            <button onClick={() => setShowCatModal(false)}><XCircle size={20} /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-3 gap-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setModalData({ ...modalData, category: cat })}
                                        className={`px-4 py-3 rounded-xl text-xs font-bold border transition-all ${modalData.category === cat ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setModalData({ ...modalData, category: 'CUSTOM' })}
                                    className={`px-4 py-3 rounded-xl text-xs font-bold border transition-all ${modalData.category === 'CUSTOM' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600'}`}
                                >
                                    직접 입력
                                </button>
                            </div>
                            {modalData.category === 'CUSTOM' && (
                                <input
                                    type="text"
                                    placeholder="분류명 입력..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none"
                                    value={modalData.custom}
                                    onChange={e => setModalData({ ...modalData, custom: e.target.value.toUpperCase() })}
                                />
                            )}
                            <button
                                onClick={submitToScenario}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all"
                            >
                                CONFIRM & ADD
                            </button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

const AutoSaveEditor = ({ title, initialValue, onSave, placeholder }: { title: string, initialValue: string, onSave: (val: string) => Promise<void>, placeholder?: string }) => {
    const { value, setValue, status } = useAutoSave(initialValue, onSave, 1500);

    return (
        <Card className="p-6 bg-white border-slate-200 shadow-sm relative group focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <div className="flex justify-between items-center mb-3">
                <h4 className="flex items-center gap-2 font-black text-slate-800 text-sm uppercase tracking-tight">
                    <Fingerprint className="w-4 h-4 text-slate-400" /> {title}
                </h4>
                <div className="flex items-center gap-1.5 min-h-[20px]">
                    {status === 'saving' && (
                        <>
                            <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                            <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Saving...</span>
                        </>
                    )}
                    {status === 'saved' && (
                        <>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Saved</span>
                        </>
                    )}
                    {status === 'modified' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    )}
                </div>
            </div>
            <textarea
                className="w-full text-sm font-medium text-slate-700 leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100 focus:bg-white focus:border-blue-200 outline-none resize-none min-h-[120px] transition-colors"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
            />
        </Card>
    );
};
