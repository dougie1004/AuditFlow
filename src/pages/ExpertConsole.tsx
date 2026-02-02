import React, { useEffect, useState } from 'react';
import { safeInvoke } from '../lib/tauri-bridge';
import {
    Activity, Shield, ShieldCheck, ShieldAlert,
    FileText, Zap, Search, ChevronRight,
    Database, Cpu, AlertCircle, BarChart3, BrainCircuit,
    ArrowUpRight, ArrowDownRight, RefreshCw, X, Info
} from 'lucide-react';

interface ExpertSignal {
    signal_id: string;
    detected_at: string;
    observation: string;
    anomaly_score: number;
    source: string;
    status: string;
    verdict_title?: string;
}

interface AdjudicationResult {
    rule_id: string;
    criterion: string;
    result: string;
    reasoning?: string;
}

interface CaseDetail {
    signal: ExpertSignal;
    adjudications: AdjudicationResult[];
    related_tx_data: string[];
}

interface EngineHealth {
    total_observations: number;
    confirmed_findings: number;
    dismissed_signals: number;
    conversion_rate: number;
    false_positive_rate: number;
    avg_anomaly_score_confirmed: number;
}

export default function ExpertConsole() {
    const [signals, setSignals] = useState<ExpertSignal[]>([]);
    const [stats, setStats] = useState<EngineHealth | null>(null);
    const [selectedSignal, setSelectedSignal] = useState<string | null>(null);
    const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [sigData, healthData] = await Promise.all([
                safeInvoke('get_expert_risk_signals'),
                safeInvoke('get_engine_health_stats')
            ]);
            setSignals(sigData as ExpertSignal[]);
            setStats(healthData as EngineHealth);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSelectSignal = async (id: string) => {
        if (selectedSignal === id) {
            setSelectedSignal(null);
            setCaseDetail(null);
            return;
        }
        setSelectedSignal(id);
        setCaseDetail(null);
        try {
            const detail = await safeInvoke('get_case_detail', { signalId: id });
            setCaseDetail(detail as CaseDetail);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="p-8 bg-[#0B1221] min-h-screen text-slate-300 font-sans">
            {/* 상단 헤더 */}
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
                        <Cpu className="text-blue-500" size={28} /> 리스크 판정 커맨드 센터
                        <span className="text-[10px] bg-white/10 text-slate-400 px-3 py-1 rounded-full border border-white/10 ml-4 font-bold tracking-widest uppercase">Adjudication Hub</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-2 font-medium">표준 판정 로직 (Logic v1.1)에 근거하여 탐지된 시그널의 등급과 정합성을 검증합니다.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={async () => {
                            setLoading(true);
                            try {
                                const result = await safeInvoke<any>('run_formal_adjudication');
                                alert(`🏛️ [AuditFlow Constitution] Phase 4.1 Adjudication Result\n` +
                                    `--------------------------------------------------\n` +
                                    `Total Signals   : ${result.total}\n` +
                                    `Grade A (Auto)  : ${result.confirmed_a || 0}\n` +
                                    `Grade B (Review): ${result.review_b || 0}\n` +
                                    `Grade C (Invest): ${result.invest_c || 0}\n` +
                                    `Grade D (Pass)  : ${result.dismissed || 0}\n` +
                                    `Unclassified    : ${result.unclassified || 0}\n` +
                                    `--------------------------------------------------\n` +
                                    `Verdict         : SUCCESS (Formal Adjudication Complete)`);
                                fetchData();
                            } catch (e: any) {
                                alert(e);
                            } finally {
                                setLoading(false);
                            }
                        }}
                        className="h-10 px-4 bg-rose-500/10 text-rose-500 font-black text-[10px] uppercase tracking-widest rounded-xl border border-rose-500/20 hover:bg-rose-500/20 transition-all flex items-center gap-3 whitespace-nowrap"
                    >
                        <BrainCircuit size={14} className="text-rose-500" />
                        Run Phase 4.1 Adjudication
                    </button>

                    <button onClick={fetchData} className="flex items-center gap-2 h-10 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-xs font-bold">
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> 데이터 동기화
                    </button>
                </div>
            </div>

            {/* KPI 섹션: 핵심 2종으로 요약 */}
            <div className="grid grid-cols-2 gap-8 mb-10">
                <div className="bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/20 p-8 rounded-[32px] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Search size={80} />
                    </div>
                    <h4 className="text-[11px] font-black text-blue-400 tracking-[0.2em] uppercase mb-2">Total Risk Signals</h4>
                    <div className="text-5xl font-black text-white tracking-tighter mb-2">{stats?.total_observations || 0} <span className="text-xl text-slate-500">건</span></div>
                    <p className="text-xs text-slate-500 font-bold">분석 엔진이 포착한 전체 이상 징후 시그널</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-600/10 to-transparent border border-emerald-500/20 p-8 rounded-[32px] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap size={80} />
                    </div>
                    <h4 className="text-[11px] font-black text-emerald-400 tracking-[0.2em] uppercase mb-2">Verdict Conversion</h4>
                    <div className="text-5xl font-black text-white tracking-tighter mb-2">{stats?.conversion_rate.toFixed(1) || 0} <span className="text-xl text-slate-500">%</span></div>
                    <p className="text-xs text-slate-500 font-bold">시그널 대비 최종 위반 판정 비율 (시스템 정확도)</p>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-10">
                {/* 리스크 시그널 로그 (좌측) */}
                <div className={`${selectedSignal ? 'col-span-7' : 'col-span-12'} transition-all duration-500`}>
                    <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <h3 className="font-black text-white text-xs tracking-widest flex items-center gap-2 uppercase">
                                <Activity size={14} className="text-blue-500" /> Risk Signal Logs
                            </h3>
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] text-emerald-500 font-black animate-pulse">● LOGIC v1.1 ACTIVE</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-separate border-spacing-0">
                                <thead>
                                    <tr className="bg-white/[0.01] text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        <th className="px-8 py-5 border-b border-white/5">상태</th>
                                        <th className="px-8 py-5 border-b border-white/5">관측 요약 (Observation)</th>
                                        <th className="px-8 py-5 border-b border-white/5">이상 강도</th>
                                        <th className="px-8 py-5 border-b border-white/5 text-right">상세</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs">
                                    {signals.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-24 text-center text-slate-600 font-bold italic">현재 분석된 리스크 시그널이 없습니다.</td>
                                        </tr>
                                    ) : (
                                        signals.map((sig) => (
                                            <tr
                                                key={sig.signal_id}
                                                onClick={() => handleSelectSignal(sig.signal_id)}
                                                className={`hover:bg-white/[0.03] cursor-pointer transition-all ${selectedSignal === sig.signal_id ? 'bg-blue-500/10' : ''}`}
                                            >
                                                <td className="px-8 py-6">
                                                    <StatusBadge status={sig.status} />
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="font-bold text-slate-200 tracking-tight">{sig.observation}</p>
                                                    <p className="text-[10px] text-slate-500 mt-1 font-mono uppercase">{sig.detected_at.split('T')[0]} | {sig.source}</p>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 w-20 h-1 bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-blue-500"
                                                                style={{ width: `${sig.anomaly_score * 100}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[11px] font-black font-mono w-8 text-slate-500">
                                                            {(sig.anomaly_score * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <ChevronRight size={18} className={`ml-auto transition-transform duration-300 ${selectedSignal === sig.signal_id ? 'rotate-90 text-blue-500' : 'opacity-20'}`} />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* 상세 분석 패널 (우측 드릴다운) */}
                {selectedSignal && (
                    <div className="col-span-5 animate-in slide-in-from-right-10 duration-500 ease-out">
                        {caseDetail ? (
                            <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl sticky top-8">
                                <div className="p-6 border-b border-white/5 bg-white/[0.03] flex justify-between items-center">
                                    <h3 className="font-black text-white text-xs tracking-widest uppercase flex items-center gap-2">
                                        <Search size={14} className="text-blue-500" /> 사례 검토
                                    </h3>
                                    <button onClick={() => setSelectedSignal(null)} className="text-slate-500 hover:text-white transition-colors">
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="p-8 space-y-10">
                                    {/* 1. Observation */}
                                    <section>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">1단계: 관측 (사실)</label>
                                        <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                            <p className="text-sm font-bold text-white leading-relaxed mb-4">"{caseDetail.signal.observation}"</p>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                                    <p className="text-[9px] text-slate-500 uppercase font-black mb-1">관측 이상치 (Witness)</p>
                                                    <p className="text-sm font-black text-slate-400">{(caseDetail.signal.anomaly_score * 100).toFixed(1)}%</p>
                                                </div>
                                                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                                    <p className="text-[9px] text-slate-500 uppercase font-black mb-1">소스 엔진</p>
                                                    <p className="text-sm font-black text-slate-300 uppercase">{caseDetail.signal.source}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* 2. Rule Evaluation */}
                                    <section>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">2단계: 심사 매칭 (규칙)</label>
                                        <div className="space-y-4">
                                            {caseDetail.adjudications.map((adj, idx) => (
                                                <div key={idx} className="bg-emerald-500/5 p-6 rounded-2xl border border-emerald-500/10 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                                        <ShieldCheck size={40} className="text-emerald-500" />
                                                    </div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="text-[9px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded uppercase">규칙 일치</span>
                                                        <span className="text-xs font-black text-white">{adj.rule_id}</span>
                                                    </div>
                                                    <p className="text-xs text-emerald-100/60 font-medium mb-3">기준: {adj.criterion}</p>
                                                    <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                                        <p className="text-[11px] text-emerald-400 font-bold italic leading-relaxed">
                                                            <Zap size={10} className="inline mr-1" /> {adj.reasoning}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                            {caseDetail.adjudications.length === 0 && (
                                                <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                                                    <p className="text-xs text-slate-600 font-bold">적용된 명시적 규칙이 없습니다. AI 의미론적 분석 여부를 확인하세요.</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    {/* 3. Disposition */}
                                    <section>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">3단계: 검토 결과 (Conclusion)</label>
                                        <div className={`p-6 rounded-2xl border ${caseDetail.signal.status === 'Confirmed' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-slate-500/5 border-white/5'}`}>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="space-y-1">
                                                    <h5 className="font-black text-white text-sm uppercase tracking-tight">{caseDetail.signal.status}</h5>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Investigation Status: {caseDetail.signal.status === 'Confirmed' ? 'INVESTIGATION REQUIRED' : 'NO FURTHER ACTION'}</p>
                                                </div>
                                                <StatusBadge status={caseDetail.signal.status} />
                                            </div>

                                            <div className="p-4 bg-black/20 rounded-xl border border-white/5 space-y-2">
                                                <p className="text-xs text-white font-bold leading-relaxed">
                                                    {caseDetail.signal.verdict_title || (caseDetail.signal.status.startsWith('Processed') ? "사내 심사 가이드라인에 따른 자동 종결" : "심사 절차 진행 중")}
                                                </p>
                                                <div className="pt-2 border-t border-white/5 flex items-center gap-2">
                                                    <Info size={10} className="text-slate-600" />
                                                    <p className="text-[9px] text-slate-600 font-medium">
                                                        탐지 참고 지표: AI 통계적 이상 수치 {(caseDetail.signal.anomaly_score * 100).toFixed(1)}% (심사 기준 미포함 데이터)
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Related Artifacts */}
                                    {caseDetail.related_tx_data.length > 0 && (
                                        <section className="pt-6 border-t border-white/5">
                                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4 block">증빙 데이터 바인딩 (Evidence Binding)</label>
                                            <div className="bg-black/40 p-5 rounded-2xl font-mono text-[10px] text-slate-500 space-y-1.5 overflow-x-auto">
                                                {caseDetail.related_tx_data.map((item, idx) => (
                                                    <div key={idx} className="flex gap-3">
                                                        <span className="opacity-30">[{idx}]</span>
                                                        <span className="truncate">{item}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-[600px] flex flex-col items-center justify-center bg-white/5 rounded-[32px] border border-dashed border-white/10">
                                <RefreshCw className="animate-spin text-blue-500 mb-4" size={24} />
                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">데이터 로딩 중...</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 하단 텔레메트리 바 */}
            <div className="fixed bottom-6 right-8 left-[300px] pointer-events-none flex justify-end">
                <div className="bg-[#0B1221]/80 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-6 pointer-events-auto shadow-2xl shadow-black/50">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Engine Pipeline OK</span>
                    </div>
                    <div className="w-px h-4 bg-white/10" />
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Intelligence Core:</span>
                        <span className="text-[10px] font-black text-blue-400">ACTIVE (SECURE)</span>
                    </div>
                    <div className="w-px h-4 bg-white/10" />
                    <div className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors cursor-help">
                        <BarChart3 size={14} />
                        <span className="text-[10px] font-black uppercase">상태: 정상 (Healthy)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, trend, sub }: any) {
    return (
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl shadow-xl hover:bg-white/[0.07] transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 border border-white/10 rounded-xl bg-white/5 text-blue-400">
                    {icon}
                </div>
                {trend && (
                    <span className={`flex items-center text-[10px] font-black uppercase ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} ACTIVE
                    </span>
                )}
            </div>
            <h4 className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase mb-1">{title}</h4>
            <div className="text-3xl font-black text-white tracking-tighter mb-2">{value}</div>
            <p className="text-[10px] text-slate-500 font-bold uppercase">{sub}</p>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        'Confirmed': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        'Dismissed': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        'Pending': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        'Processing': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        'Processed (Auto-Dismissed)': 'bg-slate-500/10 text-slate-500 border-white/5',
        'Processed (Unclassified:NoRule)': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };
    return (
        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase border tracking-widest ${styles[status] || styles['Pending']}`}>
            {status}
        </span>
    );
}

function DetailPanel({ detail }: { detail: CaseDetail }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                <h3 className="font-black text-white text-sm tracking-widest uppercase">리스크 상세 분석 결과 (Detail View)</h3>
                <X size={16} className="text-slate-600 cursor-pointer" />
            </div>

            <div className="p-6 space-y-8">
                {/* 1. Observation (The Detective) */}
                <div>
                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-3 flex items-center gap-2">
                        <Search size={12} /> ① Observation (FACT)
                    </label>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <p className="text-sm font-bold text-white leading-relaxed">{detail.signal.observation}</p>
                        <div className="flex gap-4 mt-3">
                            <div className="text-[10px] font-mono text-slate-500">SCORE: {detail.signal.anomaly_score.toFixed(2)}</div>
                            <div className="text-[10px] font-mono text-slate-500">SRC: {detail.signal.source}</div>
                        </div>
                    </div>
                </div>

                {/* 2. Rule Evaluation (The Judge) */}
                <div>
                    <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-3 flex items-center gap-2">
                        <ShieldCheck size={12} /> ② Rule Evaluation (ADJUDICATION)
                    </label>
                    <div className="space-y-3">
                        {detail.adjudications.length === 0 ? (
                            <div className="text-[10px] text-slate-600 italic px-4">No specific rule evaluation logs found.</div>
                        ) : (
                            detail.adjudications.map((adj, idx) => (
                                <div key={idx} className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="text-xs font-black text-white tracking-tight">{adj.rule_id}</div>
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${adj.result === 'Match' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                            {adj.result === 'Match' ? 'VIOLATED' : 'PASS'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-emerald-100/70 mb-2 font-medium">Criterion: {adj.criterion}</p>
                                    <p className="text-[11px] text-emerald-500 italic font-bold">Reasoning: {adj.reasoning}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 3. Verdict (The Sentence) */}
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3 flex items-center gap-2">
                        <ShieldAlert size={12} /> ③ Verdict (SENTENCE)
                    </label>
                    <div className={`p-4 rounded-2xl border ${detail.signal.status === 'Confirmed' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-slate-500/10 border-white/10'}`}>
                        <div className="text-xs font-black text-white mb-1 uppercase tracking-tight">Final Designation: {detail.signal.status}</div>
                        <p className="text-[11px] text-slate-400 font-bold">{detail.signal.verdict_title || "Pending final classification"}</p>
                    </div>
                </div>

                {/* Related Data Snippet */}
                {detail.related_tx_data.length > 0 && (
                    <div className="pt-4 border-t border-white/5">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-3">Evidence Artifacts</label>
                        <div className="bg-black/20 p-4 rounded-xl font-mono text-[10px] text-slate-500 space-y-1 overflow-x-auto truncate">
                            {detail.related_tx_data.map((item, idx) => (
                                <div key={idx}>[{idx}] {item}</div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function TelemetryItem({ label, value, status }: { label: string, value: string, status: 'good' | 'warn' | 'bad' }) {
    return (
        <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-500 font-bold">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-white font-medium">{value}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${status === 'good' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </div>
        </div>
    );
}

const ListIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="square" strokeLinejoin="miter" className="text-blue-500">
        <line x1="8" y1="6" x2="21" y2="6"></line>
        <line x1="8" y1="12" x2="21" y2="12"></line>
        <line x1="8" y1="18" x2="21" y2="18"></line>
        <line x1="3" y1="6" x2="3.01" y2="6"></line>
        <line x1="3" y1="12" x2="3.01" y2="12"></line>
        <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </svg>
);
