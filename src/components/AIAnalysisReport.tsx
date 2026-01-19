import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { safeInvoke } from '../lib/tauri-bridge';
import { Check, X, Mail, FileText, AlertTriangle, ArrowLeft, Database, FilterX, Lock, ShieldCheck } from 'lucide-react';
import { useApp } from '../App';

interface AuditFinding {
    id: string;
    category: string;
    severity: 'High' | 'Medium' | 'Low' | 'Critical';
    description: string;
    evidence: string;
    recommendation: string;
    status: 'Pending' | 'Accepted' | 'Rejected';
}

const AIAnalysisReport = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { activeProject } = useApp();
    const [findings, setFindings] = useState<AuditFinding[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFinding, setSelectedFinding] = useState<AuditFinding | null>(null);

    // [DRILL-DOWN FILTER] Get filter from dashboard navigation state
    const filterMetric = location.state?.metric;

    const filteredFindings = useMemo(() => {
        // [SCENARIO 1] Assurance Signal Coverage: Show absolutely EVERYTHING (e.g. all signals)
        if (!filterMetric || filterMetric === "실사 데이터 커버리지" || filterMetric === "Assurance Signal Coverage") return findings;

        // [SCENARIO 2] Compliance Pillars: Only show the "Risk" part (Critical/High) that matches keywords
        const keywords: Record<string, string[]> = {
            "고위험 컴플라이언스 신호": [
                "Governance", "거버넌스", "Compliance", "컴플라이언스", "Risk", "리스크", "Integrity", "신뢰", "Red Flag",
                "Advanced Integrity", "자금 순환", "Round-tripping", "명의 불일치", "Mismatch", "휴면", "Dormant", "신뢰성 검증", "Assurance", "Override", "Bypass"
            ],
            "재무 익스포저 분석": [
                "Process", "프로세스", "SOP", "Inventory", "재고", "매출", "Revenue", "Burn", "번레이트", "Cash", "현금", "Window",
                "Structuring", "쪼개기", "Lapping", "돌려막기", "Threshold", "우회", "Exposure", "Counterparty"
            ],
            "조직 문화 컴플라이언스": ["Culture", "문화", "Ethic", "윤리", "Fraud", "부정", "우회", "분할", "쪼개기", "인사", "HR", "카드", "Observation", "Behavior"]
        };

        const currentKeywords = keywords[filterMetric] || [];
        return findings.filter(f =>
            (f.severity === 'Critical' || f.severity === 'High') &&
            currentKeywords.some(k => f.category.includes(k) || f.description.includes(k))
        );
    }, [findings, filterMetric]);

    useEffect(() => {
        loadAnalysisResults();
    }, []);

    const loadAnalysisResults = async () => {
        try {
            setLoading(true);
            const result: any = await safeInvoke('get_latest_analysis', { projectId: activeProject });
            console.log(">>> [DEBUG] loadAnalysisResults: findings count =", result?.findings?.length);
            handleAnalysisUpdate(result);
        } catch (error) {
            console.error("분석 결과 로드 실패:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAnalysisUpdate = (data: any) => {
        try {
            // Antigravity의 JSON 클리닝 로직을 보완하는 프론트엔드 방어 코드
            const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
            if (parsedData && parsedData.findings) {
                setFindings(parsedData.findings);
                // Summary가 있으면 업데이트 (선택 사항)
            }
        } catch (e) {
            console.error("데이터 파싱 실패: 형식이 올바르지 않은 분석 데이터입니다.", e);
        }
    };

    const handleAcceptAll = async () => {
        if (!window.confirm(`현재 대기 중인 ${findings.filter(f => f.status !== 'Accepted').length}건의 항목을 모두 채택하시겠습니까?`)) return;

        try {
            const pendingFindings = findings.filter(f => f.status !== 'Accepted');
            if (pendingFindings.length === 0) return;

            // Batch processing
            await Promise.all(pendingFindings.map(f =>
                safeInvoke('update_audit_issue_status', { id: f.id, status: 'Accepted' })
            ));

            setFindings(prev => prev.map(f => ({ ...f, status: 'Accepted' })));

            // Trigger Topology Refresh
            try {
                await safeInvoke('get_audit_universe', { projectId: activeProject });
                window.dispatchEvent(new CustomEvent('topology-updated', {
                    detail: { projectId: activeProject, issueId: 'ALL' }
                }));
            } catch (e) { console.warn(e); }

            alert("모든 항목이 성공적으로 채택되었습니다.");
        } catch (e) {
            console.error(e);
            alert("일괄 처리 중 오류가 발생했습니다.");
        }
    };

    const handleAccept = async (id: string) => {
        try {
            await safeInvoke('update_audit_issue_status', { id, status: 'Accepted' });
            setFindings(prev => prev.map(f => f.id === id ? { ...f, status: 'Accepted' } : f));

            // [CRITICAL] Trigger real-time topology update
            // Force refresh of audit_universe data to reflect the new risk scores
            try {
                await safeInvoke('get_audit_universe', { projectId: activeProject });
                // Emit custom event to notify Dashboard/RiskHeatmap to refresh
                window.dispatchEvent(new CustomEvent('topology-updated', {
                    detail: { projectId: activeProject, issueId: id }
                }));
            } catch (e) {
                console.warn("Topology refresh failed:", e);
            }

            alert("발견 사항이 '감사 지적사항'으로 채택되었습니다. 리스크 토폴로지가 업데이트되었습니다.");
        } catch (e) {
            console.error(e);
            alert("채택 처리 중 오류가 발생했습니다.");
        }
    };

    const handleReject = async (id: string) => {
        try {
            await safeInvoke('update_audit_issue_status', { id, status: 'Rejected' });
            setFindings(prev => prev.map(f => f.id === id ? { ...f, status: 'Rejected' } : f));
        } catch (e) {
            console.error(e);
        }
    };

    const handleSendEmail = (finding: AuditFinding) => {
        const subject = `[Assurance Inquiry] Clarification Requested: ${finding.category}`;
        const body = `
Attention: Relevant Project Partner / Department Head
CC: Compliance DD Team

During our investment-grade due diligence process, our AI Assurance Engine identified a critical inconsistency requiring further clarification.

1. Signal Category: ${finding.category}
2. Detail: ${finding.description}
3. Evidence Trail: ${finding.evidence}
4. Assurance Recommendation: ${finding.recommendation}

Please provide a formal clarification and supporting documentation regarding this signal within 48 hours for our valuation adjustment review.

- COMPLIANCE DD PRO (Automated Signal) -
        `;

        // 1. 클립보드에 복사
        navigator.clipboard.writeText(body).then(() => {
            alert("이메일 본문이 클립보드에 복사되었습니다.\n메일 작성 창에 붙여넣기(Ctrl+V) 하세요.");
        });

        // 2. 사용자 PC의 기본 메일 앱 띄우기
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const handleConvertToScenario = (finding: AuditFinding) => {
        navigate('/scenarios', {
            state: {
                prefill: {
                    name: `[${finding.category}] 의심 패턴 탐지`,
                    category: finding.category,
                    risk_level: finding.severity,
                    description: `[AI 분석 내용]\n${finding.description}\n\n[증거 데이터]\n${finding.evidence}`,
                    source: activeProject || "Current Project",
                    isAI: true
                }
            }
        });
    };

    // [TRUST LAYER] Helper to render text with PII protection warnings
    const renderProtectedText = (text: string) => {
        if (!text) return null;
        const parts = text.split(/(Employee_\d+)/g);
        return parts.map((part, i) => {
            if (part.match(/Employee_\d+/)) {
                return (
                    <span
                        key={i}
                        className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20 font-black cursor-help group/pii relative"
                    >
                        {part}
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 border border-white/10 rounded-lg text-[10px] text-slate-300 opacity-0 invisible group-hover/pii:opacity-100 group-hover/pii:visible transition-all font-sans z-[100] shadow-2xl">
                            <Lock size={10} className="inline mr-1 text-blue-400" />
                            <strong>Identity Protected</strong><br />
                            Original name is encrypted in the local secure vault.
                        </span>
                    </span>
                );
            }
            return part;
        });
    };

    if (loading) return <div className="p-10 text-white">AI 분석 결과를 불러오는 중입니다...</div>;

    return (
        <div className="flex h-full bg-[#0B1221] text-white">
            <div className="w-1/3 border-r border-gray-700 overflow-y-auto p-4 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400">
                                <ArrowLeft size={20} />
                            </button>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                {filterMetric === "실사 데이터 커버리지" ? (
                                    <Database className="text-emerald-400" />
                                ) : (
                                    <AlertTriangle className="text-red-400" />
                                )}
                                {filterMetric === "실사 데이터 커버리지" ? "All Analyzed Signals" : (filterMetric || "Red Flags")} ({filteredFindings.length})
                            </h2>
                        </div>
                        {filterMetric && filterMetric !== "실사 데이터 커버리지" && (
                            <div className="flex items-center gap-2 mt-1 pl-10">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Active Filter</span>
                                <button
                                    onClick={() => navigate('/ai-discovery', { state: { ...location.state, metric: null } })}
                                    className="text-[9px] font-bold text-slate-500 hover:text-white flex items-center gap-1 transition-colors uppercase"
                                >
                                    <FilterX size={10} /> 전체보기
                                </button>
                            </div>
                        )}
                    </div>
                    {filteredFindings.some(f => f.status !== 'Accepted') && (
                        <button
                            onClick={handleAcceptAll}
                            className="bg-blue-600 hover:bg-blue-500 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-lg shadow-blue-900/40 border border-blue-500/50"
                        >
                            CONFIRM ALL
                        </button>
                    )}
                </div>

                <div className="space-y-3">
                    {filteredFindings.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => setSelectedFinding(item)}
                            className={`p-4 rounded-lg cursor-pointer border transition-all ${selectedFinding?.id === item.id
                                ? 'bg-blue-900/30 border-blue-500'
                                : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${item.severity === 'Critical' ? 'bg-rose-500 text-white shadow-lg shadow-rose-900/40' :
                                    item.severity === 'High' ? 'bg-red-500/20 text-red-400' :
                                        'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                    {item.severity}
                                </span>
                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${item.status === 'Accepted' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                    item.status === 'Rejected' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                        'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                    }`}>
                                    {item.status === 'Accepted' ? 'CONFIRMED' : item.status === 'Rejected' ? 'DISMISSED' : 'PENDING'}
                                </span>
                            </div>
                            <h3 className="font-semibold text-sm mb-1">{item.category}</h3>
                            <p className="text-xs text-gray-400 line-clamp-2">{item.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-2/3 p-6 flex flex-col">
                {selectedFinding ? (
                    <>
                        <div className="flex justify-between items-start mb-6">
                            <h1 className="text-2xl font-bold">{selectedFinding.category}</h1>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleReject(selectedFinding.id)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300"
                                >
                                    <X size={16} /> DISMISS
                                </button>
                                <button
                                    onClick={() => handleAccept(selectedFinding.id)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold shadow-lg shadow-blue-900/50"
                                >
                                    <Check size={16} /> CONFIRM (AS RISK)
                                </button>
                                <button
                                    onClick={() => handleConvertToScenario(selectedFinding)}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded text-sm font-bold shadow-lg shadow-purple-900/50"
                                >
                                    <Database size={16} /> ASSETIZE
                                </button>
                            </div>
                        </div>

                        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 flex-1 overflow-y-auto">
                            <div className="mb-6">
                                <h3 className="text-sm text-gray-400 mb-2 uppercase tracking-wider">상세 내용</h3>
                                <p className="text-lg leading-relaxed">{renderProtectedText(selectedFinding.description)}</p>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-sm text-gray-400 mb-2 uppercase tracking-wider">AI 추천 (Recommendation)</h3>
                                <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-800/50 text-blue-100">
                                    {selectedFinding.recommendation}
                                </div>
                            </div>

                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        <FileText size={16} /> 관련 증빙 데이터
                                    </h3>
                                    <div className="flex items-center gap-2 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] font-black text-emerald-400 uppercase tracking-tight">
                                        <Check size={12} /> Source Traced to Raw Data
                                    </div>
                                </div>
                                <div className="bg-black/50 p-4 rounded font-mono text-xs text-green-400 overflow-x-auto border border-white/5">
                                    <pre className="whitespace-pre-wrap">{renderProtectedText(selectedFinding.evidence)}</pre>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-700 flex justify-end">
                            <button
                                onClick={() => handleSendEmail(selectedFinding)}
                                className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 rounded font-bold"
                            >
                                <Mail size={18} /> REQUEST CLARIFICATION
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <AlertTriangle size={48} className="mb-4 opacity-20" />
                        <p>리스트에서 항목을 선택하여 상세 검토를 진행하세요.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIAnalysisReport;
