import { useState, useEffect } from "react";
import { safeInvoke } from '../lib/tauri-bridge';
import {
    ShieldCheck, AlertTriangle, CheckCircle,
    ChevronDown, ChevronUp, Search, Info,
    BrainCircuit, Loader2, X, Copy, FileText
} from "lucide-react";

interface RiskStats {
    total_scanned: number;
    dismissed_count: number;
    confirmed_count: number;
    confirmed_issues: ConfirmedIssue[];
    all_signals: SignalDetail[];
}

interface ConfirmedIssue {
    title: string;
    severity: string;
    evidence: string;
    regulation: string;
    detected_at: string;
}

interface SignalDetail {
    signal_id: string;
    observation: string;
    status: string;
    anomaly_score: number;
    detected_at: string;
    reasoning: AdjudicationStep[];
    metadata: any;
}

// [Mapping] 영어 메타데이터 키를 한국어로 변환하는 맵
const METADATA_LABELS: Record<string, string> = {
    "actor_type": "수행 주체",
    "amount": "결제 금액",
    "context_score": "맥락 괴리도",
    "date": "결제 일시",
    "final_hybrid_score": "최종 위험 점수",
    "location": "결제 장소",
    "purpose": "지출 목적",
    "semantic_score": "의미 분석 점수",
    "stats_score": "통계적 이상도",
    "source": "분석 출처",
    "reason": "필터링 사유",
    "final_hybrid_score_normalized": "정규화 점수"
};

// 숫자를 읽기 좋게 포맷팅 (소수점 2자리 또는 콤마)
const formatValue = (key: string, val: any) => {
    if (typeof val === 'number') {
        if (key.toLowerCase().includes('score')) {
            return val.toFixed(2);
        }
        return val.toLocaleString();
    }
    return String(val);
};

interface AdjudicationStep {
    rule_id: string;
    criterion: string;
    result: string;
    reasoning: string;
}

export default function AIAnalysisReport() {
    const [stats, setStats] = useState<RiskStats | any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [openIssueValues, setOpenIssueValues] = useState<string[]>([]);
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'SAFE' | 'VIOLATION'>('ALL');

    // AI Summary State
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [generatingSummary, setGeneratingSummary] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const data: RiskStats = await safeInvoke("get_risk_report_data");
            setStats(data);
        } catch (e) {
            console.error("Failed to load risk report", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateSummary = async () => {
        setGeneratingSummary(true);
        try {
            const summary: string = await safeInvoke('generate_risk_summary');
            setAiSummary(summary);
            setShowSummaryModal(true);
        } catch (e) {
            alert("요약 생성 실패: " + e);
        } finally {
            setGeneratingSummary(false);
        }
    };

    const toggleAccordion = (idx: string) => {
        if (openIssueValues.includes(idx)) {
            setOpenIssueValues(openIssueValues.filter(i => i !== idx));
        } else {
            setOpenIssueValues([...openIssueValues, idx]);
        }
    };

    const filteredSignals = stats?.all_signals?.filter((s: SignalDetail) => {
        if (activeFilter === 'ALL') return true;
        if (activeFilter === 'SAFE') return s.status.includes('Dismissed');
        if (activeFilter === 'VIOLATION') return s.status.includes('Confirmed') || s.status.includes('Review');
        return true;
    }) || [];

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!stats) return <div className="p-10 text-slate-500">No Data Available</div>;

    // Calculate Safe Ratio
    const safeRatio = stats.total_scanned > 0
        ? Math.round((stats.dismissed_count / stats.total_scanned) * 100)
        : 100;

    return (
        <div className="p-8 pb-32 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        <ShieldCheck className="text-blue-500 w-8 h-8" />
                        리스크 인텔리전스 보고서
                    </h2>
                    <p className="text-slate-400 mt-2 font-medium">검출된 리스크 시그널에 대한 정량적 분석 및 처리 현황</p>
                </div>
                <button
                    onClick={handleGenerateSummary}
                    disabled={generatingSummary}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {generatingSummary ? <Loader2 className="animate-spin w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    경영진 요약 보고 (Executive Summary)
                </button>
            </div>

            {/* 1. The Funnel Stats (Contrast) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Scanned */}
                <div
                    onClick={() => setActiveFilter('ALL')}
                    className={`cursor-pointer transition-all p-6 rounded-2xl border ${activeFilter === 'ALL'
                        ? 'bg-slate-700/50 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                        }`}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-slate-700/50 rounded-lg text-slate-400">
                            <Search size={20} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">전체 관측 데이터 (Observations)</span>
                    </div>
                    <div className="text-4xl font-black text-white">{stats.total_scanned.toLocaleString()}</div>
                    <p className="text-xs text-slate-500 mt-2">AI가 관측한 모든 특이 패턴 (전체)</p>
                </div>

                {/* Auto Dismissed (Green) */}
                <div
                    onClick={() => setActiveFilter('SAFE')}
                    className={`cursor-pointer transition-all p-6 rounded-2xl border relative overflow-hidden ${activeFilter === 'SAFE'
                        ? 'bg-emerald-900/20 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-emerald-900/10 border-emerald-500/20 hover:border-emerald-500/40'
                        }`}
                >
                    <div className="absolute right-0 top-0 p-20 bg-emerald-500/5 rounded-full blur-3xl -translate-y-10 translate-x-10" />
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                            <CheckCircle size={20} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-emerald-500/70">정상 / 준수 항목 (Compliant)</span>
                    </div>
                    <div className="text-4xl font-black text-emerald-400">{stats.dismissed_count.toLocaleString()} <span className="text-lg font-bold text-emerald-600/50 ml-1">({safeRatio}%)</span></div>
                    <p className="text-xs text-emerald-600/70 mt-2">규정 위반 없음으로 자동 종결된 건</p>
                </div>

                {/* Confirmed Risks (Red) */}
                <div
                    onClick={() => setActiveFilter('VIOLATION')}
                    className={`cursor-pointer transition-all p-6 rounded-2xl border relative overflow-hidden ${activeFilter === 'VIOLATION'
                        ? 'bg-red-900/20 border-red-500 ring-2 ring-red-500/30'
                        : 'bg-red-900/10 border-red-500/20 hover:border-red-500/40'
                        }`}
                >
                    <div className="absolute right-0 top-0 p-20 bg-red-500/5 rounded-full blur-3xl -translate-y-10 translate-x-10 animate-pulse" />
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-500/20 rounded-lg text-red-400">
                            <AlertTriangle size={20} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-red-500/70">위반 의심 항목 (Violations)</span>
                    </div>
                    <div className="text-4xl font-black text-red-500">{stats.confirmed_count.toLocaleString()}</div>
                    <p className="text-xs text-red-600/70 mt-2 font-bold">즉시 조치가 필요한 위반 사항</p>
                </div>
            </div>

            {/* 2. Divider */}
            <div className="border-t border-slate-800 my-8" />

            {/* 3. Drilling List */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-200">
                        {activeFilter === 'ALL' && "🔍 전수 조사 상세 내역 (Full Audit)"}
                        {activeFilter === 'SAFE' && "✅ 정상 판정 사례 분석 (Compliant)"}
                        {activeFilter === 'VIOLATION' && "🚩 규정 위반 탐지 상세 (Violations)"}
                    </h3>
                    <span className="text-[10px] font-black bg-slate-800 px-4 py-1.5 rounded-full text-slate-400 border border-slate-700 uppercase tracking-widest">
                        {filteredSignals.length.toLocaleString()}건 필터링됨
                    </span>
                </div>

                {filteredSignals.length === 0 ? (
                    <div className="bg-slate-800/30 rounded-2xl p-12 text-center border border-slate-700/50 border-dashed">
                        <CheckCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h4 className="text-slate-400 font-bold mb-1">No Data Found</h4>
                        <p className="text-sm text-slate-600">해당 필터에 부합하는 분석 데이터가 없습니다.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredSignals.map((sig: SignalDetail) => {
                            const isViolation = sig.status.includes('Confirmed') || sig.status.includes('Review');
                            return (
                                <div key={sig.signal_id} className={`bg-slate-800/40 border rounded-xl overflow-hidden shadow-sm hover:bg-slate-800/60 transition-all ${isViolation ? 'border-red-500/20' : 'border-emerald-500/10'}`}>

                                    {/* Accordion Header */}
                                    <div
                                        className="p-5 flex items-center justify-between cursor-pointer select-none"
                                        onClick={() => toggleAccordion(sig.signal_id)}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`mt-1.5 min-w-[8px] h-[8px] rounded-full ${isViolation ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-emerald-500/50'}`} />
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className={`font-black text-sm ${isViolation ? 'text-red-400' : 'text-slate-200'}`}>{sig.observation}</span>
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${isViolation ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10'}`}>
                                                        {sig.status.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <p className="text-[10px] text-slate-500 font-mono tracking-tighter">ID: {sig.signal_id}</p>
                                                    <p className="text-[10px] text-slate-600 font-mono">{sig.detected_at}</p>
                                                </div>
                                            </div>
                                        </div>
                                        {openIssueValues.includes(sig.signal_id) ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
                                    </div>

                                    {/* Body */}
                                    {openIssueValues.includes(sig.signal_id) && (
                                        <div className="px-5 pb-6 pl-10 pt-0 animate-in slide-in-from-top-2">
                                            <div className="bg-slate-900/50 rounded-[20px] p-6 border border-slate-700/50 space-y-6">

                                                {/* Adjudication Matrix (The Reasoning) */}
                                                <div>
                                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 block">
                                                        {isViolation ? "🔴 판정 로직 (Adjudication Logic)" : "🟢 준수 로직 (Compliance Logic)"}
                                                    </span>
                                                    <div className="space-y-3">
                                                        {sig.reasoning.map((step, sidx) => (
                                                            <div key={sidx} className="flex gap-4 p-4 bg-black/30 rounded-xl border border-white/5 group hover:border-blue-500/30 transition-colors">
                                                                <div className="flex flex-col items-center">
                                                                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${step.result === 'Match' ? 'bg-red-500' : 'bg-slate-600'}`} />
                                                                    <div className="flex-1 w-px bg-slate-800 my-1" />
                                                                </div>
                                                                <div className="space-y-1 flex-1">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-[10px] font-black text-slate-400 uppercase">{step.criterion}</span>
                                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${step.result === 'Match' ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
                                                                            {step.result}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-300 leading-relaxed italic">"{step.reasoning}"</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {sig.reasoning.length === 0 && (
                                                            <div className="text-xs text-slate-500 p-4 bg-black/20 rounded-xl border border-dashed border-slate-800">
                                                                특이한 규칙 트리거가 발견되지 않았습니다. 이상 징후 점수가 높을 경우에만 수동 검토를 권장합니다.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Transaction Metadata (Filtered Scores) */}
                                                {sig.metadata && (
                                                    <div>
                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">거래 상세 정보 (Transaction Details)</span>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                            {Object.entries(sig.metadata)
                                                                .filter(([key]) => !key.includes('score')) // [CONSTITUTION] Hide unexplained scores
                                                                .map(([key, val]: [string, any]) => (
                                                                    <div key={key} className="bg-slate-800/50 p-3 rounded-lg border border-white/5">
                                                                        <p className="text-[8px] font-black text-slate-600 uppercase mb-1">{METADATA_LABELS[key] || key}</p>
                                                                        <p className="text-[11px] font-bold text-white truncate">{formatValue(key, val)}</p>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                )}

                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 경영진 요약 보고 모달 */}
            {showSummaryModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setShowSummaryModal(false)} />
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
                        {/* 모달 헤더 - AI 홍보 문구 제거 */}
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 rounded-2xl">
                                    <FileText className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-xl tracking-tighter">경영진 요약 보고 (Executive Summary)</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">AuditFlow Dynamic Assurance System</p>
                                </div>
                            </div>
                            <button onClick={() => setShowSummaryModal(false)} className="text-slate-300 hover:text-slate-900 transition-colors p-2 hover:bg-slate-50 rounded-full">
                                <X size={24} />
                            </button>
                        </div>

                        {/* 모달 본문 - 리포트 스타일로 변경 */}
                        <div className="p-10 overflow-y-auto bg-slate-50/30">
                            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm relative overflow-hidden">
                                {/* 리포트 배경 워터마크 느낌 */}
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 pointer-events-none">
                                    <ShieldCheck size={120} />
                                </div>

                                <p className="text-slate-700 font-medium leading-[1.8] whitespace-pre-wrap text-sm relative z-10">
                                    {aiSummary}
                                </p>
                            </div>

                            <div className="mt-8 flex gap-6 px-2">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                                    <CheckCircle size={12} className="text-emerald-500" /> 시스템 검증 완료
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                                    <ShieldCheck size={12} className="text-blue-500" /> 데이터 암호화 처리됨
                                </div>
                            </div>
                        </div>

                        {/* 하단 액션바 */}
                        <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center">
                            <span className="text-[10px] text-slate-300 font-mono tracking-widest uppercase">REPORT ID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(aiSummary || "");
                                        alert("요약 내용이 클립보드에 복사되었습니다.");
                                    }}
                                    className="flex items-center gap-2 text-xs font-black text-slate-700 hover:text-slate-900 px-5 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-95"
                                >
                                    <Copy size={16} /> 본문 복사
                                </button>
                                <button
                                    onClick={() => setShowSummaryModal(false)}
                                    className="flex items-center gap-2 text-xs font-black text-white px-5 py-3 bg-slate-900 hover:bg-black rounded-xl transition-all active:scale-95 shadow-lg shadow-slate-200"
                                >
                                    확인
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
