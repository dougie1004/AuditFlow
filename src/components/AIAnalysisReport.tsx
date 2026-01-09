import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Check, X, Mail, FileText, AlertTriangle, ArrowLeft, Database } from 'lucide-react';
import { useApp } from '../App';

interface AuditFinding {
    id: string;
    category: string;
    severity: 'High' | 'Medium' | 'Low';
    description: string;
    evidence: string;
    recommendation: string;
    status: 'Pending' | 'Accepted' | 'Rejected';
}

const AIAnalysisReport = () => {
    const navigate = useNavigate();
    const { activeProject } = useApp();
    const [findings, setFindings] = useState<AuditFinding[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFinding, setSelectedFinding] = useState<AuditFinding | null>(null);

    useEffect(() => {
        loadAnalysisResults();
    }, []);

    const loadAnalysisResults = async () => {
        try {
            setLoading(true);
            const result: any = await invoke('get_latest_analysis', { projectId: activeProject });
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

    const handleAccept = async (id: string) => {
        try {
            await invoke('update_audit_issue_status', { id, status: 'Accepted' });
            setFindings(prev => prev.map(f => f.id === id ? { ...f, status: 'Accepted' } : f));

            // [CRITICAL] Trigger real-time topology update
            // Force refresh of audit_universe data to reflect the new risk scores
            try {
                await invoke('get_audit_universe', { projectId: activeProject });
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
            await invoke('update_audit_issue_status', { id, status: 'Rejected' });
            setFindings(prev => prev.map(f => f.id === id ? { ...f, status: 'Rejected' } : f));
        } catch (e) {
            console.error(e);
        }
    };

    const handleSendEmail = (finding: AuditFinding) => {
        const subject = `[감사 소명 요청] ${finding.category} 건`;
        const body = `
수신: 관련 담당자
참조: 감사팀

귀 부서의 지출 내역 감사 중 아래와 같은 특이사항이 발견되었습니다.

1. 발견 항목: ${finding.category}
2. 상세 내용: ${finding.description}
3. 증빙 데이터: ${finding.evidence}
4. 조치 권고: ${finding.recommendation}

위 내용에 대해 3일 이내에 소명 자료를 제출해 주시기 바랍니다.

- AuditFlow 자동 생성됨 -
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

    if (loading) return <div className="p-10 text-white">AI 분석 결과를 불러오는 중입니다...</div>;

    return (
        <div className="flex h-full bg-[#0B1221] text-white">
            <div className="w-1/3 border-r border-gray-700 overflow-y-auto p-4 flex flex-col">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <AlertTriangle className="text-red-400" />
                        탐지된 리스크 ({findings.length})
                    </h2>
                </div>

                <div className="space-y-3">
                    {findings.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => setSelectedFinding(item)}
                            className={`p-4 rounded-lg cursor-pointer border transition-all ${selectedFinding?.id === item.id
                                ? 'bg-blue-900/30 border-blue-500'
                                : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${item.severity === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                    {item.severity}
                                </span>
                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${item.status === 'Accepted' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                    item.status === 'Rejected' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                        'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                    }`}>
                                    {item.status === 'Accepted' ? '채택됨' : item.status === 'Rejected' ? '기각됨' : '대기중'}
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
                                    <X size={16} /> 기각
                                </button>
                                <button
                                    onClick={() => handleAccept(selectedFinding.id)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold shadow-lg shadow-blue-900/50"
                                >
                                    <Check size={16} /> 채택 (지적사항 등록)
                                </button>
                                <button
                                    onClick={() => handleConvertToScenario(selectedFinding)}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded text-sm font-bold shadow-lg shadow-purple-900/50"
                                >
                                    <Database size={16} /> 시나리오 자산화
                                </button>
                            </div>
                        </div>

                        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 flex-1 overflow-y-auto">
                            <div className="mb-6">
                                <h3 className="text-sm text-gray-400 mb-2 uppercase tracking-wider">상세 내용</h3>
                                <p className="text-lg leading-relaxed">{selectedFinding.description}</p>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-sm text-gray-400 mb-2 uppercase tracking-wider">AI 추천 (Recommendation)</h3>
                                <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-800/50 text-blue-100">
                                    {selectedFinding.recommendation}
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-sm text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                                    <FileText size={16} /> 관련 증빙 데이터
                                </h3>
                                <div className="bg-black/50 p-4 rounded font-mono text-xs text-green-400 overflow-x-auto">
                                    <pre className="whitespace-pre-wrap">{selectedFinding.evidence}</pre>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-700 flex justify-end">
                            <button
                                onClick={() => handleSendEmail(selectedFinding)}
                                className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 rounded font-bold"
                            >
                                <Mail size={18} /> 담당자 소명 요청 메일 발송
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
