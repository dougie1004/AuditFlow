import { useState, useEffect } from "react";
import { safeInvoke } from "../lib/tauri-bridge";
import {
    TrendingUp, BarChart3,
    Zap, AlertTriangle,
    ChevronRight, Plus,
    Printer, BrainCircuit, Activity,
    Target, Star, ArrowUpRight, Loader2, FileText
} from "lucide-react";

interface AnnualReport {
    year: number;
    total_issues: number;
    high_risk_count: number;
    top_domains: string[];
    ai_insight: string;
}

interface AuditPlan {
    id: number;
    year: number;
    audit_domain: string;
    risk_score: number;
    strategic_importance: string;
    resource_days: number;
    status: string;
    description: string;
}

export default function ExecutiveAdmin() {
    const [activeTab, setActiveTab] = useState<"REPORT" | "PLAN">("REPORT");
    const [selectedYear, setSelectedYear] = useState(2026);

    // Report States
    const [report, setReport] = useState<AnnualReport | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Plan States
    const [plans, setPlans] = useState<AuditPlan[]>([]);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

    // New Plan Form
    const [newDomain, setNewDomain] = useState("");
    const [newImportance, setNewImportance] = useState("Medium");
    const [newDays, setNewDays] = useState(10);
    const [newDesc, setNewDesc] = useState("");
    const [impactScore, setImpactScore] = useState(3);
    const [complexScore, setComplexScore] = useState(3);

    const fetchReport = async () => {
        setIsGenerating(true);
        try {
            const res: AnnualReport = await safeInvoke("generate_annual_report", { year: selectedYear });
            setReport(res);
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    const fetchPlans = async () => {
        try {
            const res: AuditPlan[] = await safeInvoke("get_audit_plans", { year: selectedYear });
            setPlans(res);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (activeTab === "PLAN") {
            fetchPlans();
        }
    }, [activeTab, selectedYear]);

    const handleAddPlan = async () => {
        const riskScore = Math.round((impactScore + complexScore) / 2);
        try {
            await safeInvoke("add_audit_plan", {
                year: selectedYear,
                domain: newDomain,
                riskScore,
                importance: newImportance,
                days: newDays,
                description: newDesc
            });
            setIsPlanModalOpen(false);
            fetchPlans();
            // Reset
            setNewDomain("");
            setNewDesc("");
        } catch (err) {
            alert(err);
        }
    };

    return (
        <div className="bg-[#0B1221] min-h-screen text-slate-300">
            {/* Top Navigation / Tab Header */}
            <div className="bg-[#0B1221]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-[100]">
                <div className="max-w-7xl mx-auto px-8 md:px-12 flex justify-between items-center h-20">
                    <div className="flex gap-10">
                        <button
                            onClick={() => setActiveTab("REPORT")}
                            className={`flex items-center gap-2 text-sm font-black uppercase tracking-widest transition-all ${activeTab === "REPORT" ? 'text-blue-500 border-b-2 border-blue-500 h-20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <TrendingUp size={18} /> Management Report
                        </button>
                        <button
                            onClick={() => setActiveTab("PLAN")}
                            className={`flex items-center gap-2 text-sm font-black uppercase tracking-widest transition-all ${activeTab === "PLAN" ? 'text-blue-500 border-b-2 border-blue-500 h-20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <Target size={18} /> Strategic Planning
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 font-black text-xs outline-none focus:ring-2 ring-blue-500/20"
                        >
                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y} className="bg-slate-900">{y} FISCAL YEAR</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-8 md:p-12">
                {activeTab === "REPORT" ? (
                    <div className="space-y-12 animate-in fade-in duration-500">
                        {/* Summary Stats Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="bg-white/5 p-8 rounded-[32px] border border-white/10 shadow-sm transition-all hover:bg-white/10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Compliance Score</p>
                                <div className="flex items-end gap-2">
                                    <h3 className="text-5xl font-black text-white leading-none">
                                        {report ? Math.max(0, 100 - (report.high_risk_count * 5) - (report.total_issues * 0.5)).toFixed(1) : "--"}
                                    </h3>
                                    {report && (
                                        <span className="text-emerald-500 font-bold text-sm mb-1 flex items-center">
                                            <ArrowUpRight size={14} />
                                            {((report.total_issues === 0) ? "0.0" : "2.4")}%
                                        </span>
                                    )}
                                </div>
                                <div className="mt-8 w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)] transition-all duration-1000"
                                        style={{ width: report ? `${Math.max(0, 100 - (report.high_risk_count * 5) - (report.total_issues * 0.5))}%` : '0%' }}
                                    />
                                </div>
                            </div>
                            <div className="bg-white/5 p-8 rounded-[32px] border border-white/10 shadow-sm flex flex-col justify-between transition-all hover:bg-white/10">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Observations</p>
                                        <h3 className="text-4xl font-black text-white">{report?.total_issues || 0}</h3>
                                    </div>
                                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl border border-blue-500/20"><BarChart3 size={20} /></div>
                                </div>
                                <p className="text-xs text-slate-400 font-medium mt-6">Top Domains: {report?.top_domains.join(", ") || "-"}</p>
                            </div>
                            <div className="bg-white/5 p-8 rounded-[32px] border border-white/10 shadow-sm flex flex-col justify-between transition-all hover:bg-white/10">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">High Risk Criticals</p>
                                        <h3 className="text-4xl font-black text-rose-500">{report?.high_risk_count || 0}</h3>
                                    </div>
                                    <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20"><AlertTriangle size={20} /></div>
                                </div>
                                <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest mt-6">Immediate Attention Required</p>
                            </div>
                        </div>

                        {/* AI Insight Explorer */}
                        <div className="bg-slate-900/60 backdrop-blur-xl rounded-[40px] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl border border-white/5">
                            <div className="absolute top-0 right-0 p-20 opacity-5 rotate-12"><BrainCircuit size={400} /></div>
                            <div className="relative z-10 max-w-4xl">
                                <div className="flex items-center gap-3 mb-10">
                                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40">
                                        <Zap size={24} className="text-white fill-white" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-black uppercase tracking-[0.3em] text-blue-400 block mb-0.5">Insightrix AI Core</span>
                                        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Executive Intelligence Summary</span>
                                    </div>
                                </div>
                                {/* Report Content */}
                                {!report && !isGenerating && (
                                    <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed">
                                        <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-6 animate-pulse">
                                            <FileText className="w-8 h-8 text-blue-400" />
                                        </div>
                                        <h3 className="text-2xl font-black text-white mb-2">Ready to Generate {selectedYear} Report</h3>
                                        <p className="text-slate-400 mb-8 text-center max-w-md">
                                            All audit telemetry has been synchronized. Click below to synthesize the annual executive summary using the latest AI models.
                                        </p>
                                        <button
                                            onClick={fetchReport}
                                            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-[0_10px_30px_rgba(37,99,235,0.3)] transition-all active:scale-95 flex items-center gap-2"
                                        >
                                            <BrainCircuit className="w-5 h-5" />
                                            Generate Annual Analysis
                                        </button>
                                    </div>
                                )}

                                {isGenerating ? (
                                    <div className="py-24 flex flex-col items-center gap-6 text-slate-500">
                                        <Loader2 className="animate-spin" size={48} />
                                        <p className="font-black uppercase tracking-[0.2em] text-[10px]">Processing global multi-layer risk telemetry...</p>
                                    </div>
                                ) : (
                                    <div className="prose prose-invert max-w-none">
                                        <div
                                            className="text-lg md:text-xl font-medium leading-relaxed opacity-90 whitespace-pre-wrap text-slate-300"
                                            dangerouslySetInnerHTML={{
                                                __html: report?.ai_insight
                                                    .replace(/# (.*)/g, '<h1 class="text-4xl font-black mb-8 mt-12 text-white tracking-tighter">$1</h1>')
                                                    .replace(/## (.*)/g, '<h2 class="text-2xl font-black mb-6 mt-10 text-blue-400">$1</h2>')
                                                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-black">$1</strong>') || "보고서 데이터가 없습니다."
                                            }}
                                        />
                                    </div>
                                )}

                                <div className="mt-20 flex gap-4 pt-12 border-t border-white/10 no-print">
                                    <button onClick={() => window.print()} className="bg-white text-slate-950 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl flex items-center gap-3 active:scale-95">
                                        <Printer size={18} /> PDF Export
                                    </button>
                                    <button onClick={fetchReport} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 active:scale-95">
                                        <Activity size={18} className="text-blue-500" /> Re-analyze Data
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-10 animate-in slide-in-from-right-10 duration-500">
                        {/* Planning Section */}
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h1 className="text-4xl font-black text-white tracking-tighter">{selectedYear} Strategic Audit Roadmap</h1>
                                <p className="text-slate-500 font-medium italic mt-2 text-lg">Risk-Based allocation of global audit resources.</p>
                            </div>
                            <button
                                onClick={() => setIsPlanModalOpen(true)}
                                className="bg-blue-600 text-white px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40 flex items-center gap-3 active:scale-95"
                            >
                                <Plus size={20} /> New Audit Planning
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {plans.map((plan) => (
                                <div key={plan.id} className="bg-white/5 border border-white/10 rounded-[32px] p-10 shadow-lg hover:bg-white/10 transition-all group relative overflow-hidden">
                                    {/* Risk Indicator Strip */}
                                    <div className={`absolute top-0 left-0 bottom-0 w-2.5 ${plan.risk_score >= 4 ? 'bg-rose-500 shadow-[2px_0_10px_rgba(244,63,94,0.3)]' : plan.risk_score >= 3 ? 'bg-amber-500' : 'bg-blue-500'}`} />

                                    <div className="flex flex-col lg:flex-row gap-10 items-start lg:items-center">
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] px-3 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20">{plan.audit_domain}</span>
                                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg border ${plan.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border-white/10'}`}>{plan.status}</span>
                                            </div>
                                            <h4 className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors">{plan.description || `${plan.audit_domain} 정밀 감사 및 통제 진단`}</h4>
                                        </div>

                                        <div className="flex gap-16 lg:text-center shrink-0">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Risk Index</p>
                                                <div className="flex items-center gap-1.5 justify-center">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <Star key={star} size={14} className={star <= plan.risk_score ? 'text-amber-500 fill-amber-500' : 'text-slate-800'} />
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Impact</p>
                                                <span className={`text-sm font-black uppercase ${plan.strategic_importance === 'High' ? 'text-rose-500' : 'text-slate-400'}`}>{plan.strategic_importance}</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Resource</p>
                                                <span className="text-sm font-black text-white">{plan.resource_days} M/D</span>
                                            </div>
                                        </div>

                                        <button className="p-4 bg-white/5 text-slate-500 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                            <ChevronRight size={24} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {plans.length === 0 && (
                                <div className="py-24 text-center border-4 border-dashed border-white/5 rounded-[48px] text-slate-600 font-black uppercase tracking-widest">
                                    No strategic plans detected.<br />
                                    <span className="text-xs font-bold mt-2 block opacity-50">Initiate a new audit roadmap to ensure enterprise compliance.</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Planning Modal */}
            {isPlanModalOpen && (
                <div className="fixed inset-0 z-[2000] bg-[#020617]/80 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-white/10 rounded-[40px] w-full max-w-3xl shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/5 rounded-t-[40px]">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-900/40">
                                    <Plus size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white tracking-tight">전략 감사 계획 수립</h3>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">New Strategic Roadmap Entry</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-12 space-y-10">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block pl-1">Audit Domain</label>
                                    <select
                                        value={newDomain}
                                        onChange={(e) => setNewDomain(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[15px] font-bold text-white outline-none focus:ring-4 ring-blue-500/10 transition-all appearance-none"
                                    >
                                        <option value="" className="bg-slate-900">도메인 선택</option>
                                        <option value="HR" className="bg-slate-900">HR / 인사노무</option>
                                        <option value="Procurement" className="bg-slate-900">Procurement / 구매</option>
                                        <option value="Sales" className="bg-slate-900">Sales / 영업</option>
                                        <option value="IT" className="bg-slate-900">IT / Security</option>
                                        <option value="Finance" className="bg-slate-900">Finance / 재무</option>
                                        <option value="Legal" className="bg-slate-900">Legal / 법무</option>
                                    </select>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block pl-1">Importance</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['High', 'Medium', 'Low'].map(imp => (
                                            <button
                                                key={imp}
                                                onClick={() => setNewImportance(imp)}
                                                className={`py-4 rounded-2xl text-[11px] font-black uppercase border transition-all ${newImportance === imp ? 'bg-blue-600 text-white border-blue-500 shadow-xl' : 'bg-white/5 text-slate-500 border-white/5 hover:bg-white/10'}`}
                                            >
                                                {imp}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-600/5 p-10 rounded-[32px] border border-blue-600/10 space-y-8">
                                <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                    <Activity size={18} /> Risk Assessment Calculator
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-6">
                                        <div className="flex justify-between">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Financial Impact</label>
                                            <span className="text-[11px] font-black text-blue-400">{impactScore} pts</span>
                                        </div>
                                        <input type="range" min="1" max="5" value={impactScore} onChange={e => setImpactScore(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                    </div>
                                    <div className="space-y-6">
                                        <div className="flex justify-between">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Op. Complexity</label>
                                            <span className="text-[11px] font-black text-blue-400">{complexScore} pts</span>
                                        </div>
                                        <input type="range" min="1" max="5" value={complexScore} onChange={e => setComplexScore(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                    </div>
                                    <div className="space-y-6">
                                        <div className="flex justify-between">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Resource Demand</label>
                                            <span className="text-[11px] font-black text-blue-400">{newDays} M/D</span>
                                        </div>
                                        <input type="range" min="1" max="100" value={newDays} onChange={e => setNewDays(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                    </div>
                                </div>
                                <div className="pt-8 border-t border-blue-600/10 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Auto-Calculated Risk Profile</span>
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <Star key={s} size={20} className={s <= Math.round((impactScore + complexScore) / 2) ? 'text-blue-500 fill-blue-500' : 'text-slate-800'} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block pl-1">Audit Objectives & Scope</label>
                                <textarea
                                    rows={4}
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    placeholder="본 감사의 중점 점검 사항과 목적을 기록하세요..."
                                    className="w-full bg-white/5 border border-white/10 rounded-3xl px-6 py-5 text-[15px] font-medium text-white outline-none focus:ring-4 ring-blue-500/10 transition-all resize-none placeholder:text-slate-700"
                                />
                            </div>
                        </div>

                        <div className="p-10 bg-white/5 border-t border-white/5 flex justify-end gap-4 rounded-b-[40px]">
                            <button
                                onClick={() => setIsPlanModalOpen(false)}
                                className="px-10 py-5 text-slate-500 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleAddPlan}
                                className="px-12 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-900/40 active:scale-95"
                            >
                                Confirm Strategic Plan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
