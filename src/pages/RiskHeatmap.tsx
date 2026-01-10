import { useState, useEffect } from "react";
import { safeInvoke } from "../lib/tauri-bridge";
import ReactMarkdown from 'react-markdown';
import {
    ScatterChart, Scatter, XAxis, YAxis, ZAxis,
    CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, ReferenceArea, LabelList, Label
} from "recharts";
import {
    ShieldAlert, Plus, Save,
    ChevronRight, Zap, Target, RefreshCw, X, Building2,
    History, BrainCircuit, Maximize2, Minimize2, Printer
} from "lucide-react";

interface ImpactBreakdown {
    financial_loss: number;
    strategic_impact: number;
    reputation_risk: number;
}

interface LikelihoodBreakdown {
    historical_frequency: number;
    control_weakness: number;
    process_complexity: number;
}

interface AiRiskAnalysis {
    reason: string;
    impact_score: number;
    likelihood_score: number;
    impact_breakdown: ImpactBreakdown;
    likelihood_breakdown: LikelihoodBreakdown;
    audit_approach?: string;
    reference_standard?: string;
}

interface AuditEntity {
    id: number;
    unit_name: string;
    category: string;
    last_audit_year: number;
    impact_score: number;
    likelihood_score: number;
    ai_analysis?: AiRiskAnalysis;
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const totalScore = data.impact_score * data.likelihood_score;
        const riskZone = data.impact_score >= 8 && data.likelihood_score >= 8 ? 'Critical' : totalScore >= 50 ? 'High' : totalScore >= 25 ? 'Medium' : 'Low';

        return (
            <div
                className="bg-[#0B1221]/95 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl text-white min-w-[260px]"
                style={{ pointerEvents: 'none' }}
            >
                <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-3">
                    <Building2 size={16} className="text-blue-500" />
                    <span className="font-black text-sm uppercase tracking-tight">{data.unit_name}</span>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between text-[10px] uppercase tracking-[0.2em] font-black opacity-40">
                        <span>Category</span>
                        <span className="text-white">{data.category}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-xl border border-white/5">
                        <span className="text-[10px] uppercase font-black tracking-widest opacity-60">Risk Zone</span>
                        <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${riskZone === 'Critical' ? 'bg-rose-500/20 text-rose-500 border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]' : riskZone === 'High' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/20' : 'bg-blue-500/20 text-blue-500 border border-blue-500/20'}`}>
                            {riskZone}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="text-center bg-white/5 rounded-2xl p-3 border border-white/5">
                            <p className="text-[8px] opacity-40 uppercase font-black mb-1 text-white tracking-[0.2em]">Impact (Y)</p>
                            <p className="text-2xl font-black text-blue-500">{data.impact_score}</p>
                        </div>
                        <div className="text-center bg-white/5 rounded-2xl p-3 border border-white/5">
                            <p className="text-[8px] opacity-40 uppercase font-black mb-1 text-white tracking-[0.2em]">Likelihood (X)</p>
                            <p className="text-2xl font-black text-amber-500">{data.likelihood_score}</p>
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-600 italic">
                        <History size={12} /> Last Audit: {data.last_audit_year}년
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export default function RiskHeatmap() {
    const [entities, setEntities] = useState<AuditEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEntity, setSelectedEntity] = useState<AuditEntity | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Add Form States
    const [newEntityName, setNewEntityName] = useState("");
    const [newCategory, setNewCategory] = useState("Department");
    const [newLastAudit, setNewLastAudit] = useState("");

    // Risk Edit States
    const [editImpact, setEditImpact] = useState(5);
    const [editLikelihood, setEditLikelihood] = useState(5);
    const [aiAnalysis, setAiAnalysis] = useState<AiRiskAnalysis | null>(null);
    const [isSuggesting, setIsSuggesting] = useState(false);

    // Priority List States
    const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
    const [priorityReport, setPriorityReport] = useState("");
    const [isGeneratingPriority, setIsGeneratingPriority] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [useLiveAi, setUseLiveAi] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            console.log(">>> [RiskHeatmap] Fetching Audit Universe...");
            const data: AuditEntity[] = await safeInvoke("get_audit_universe");
            console.log(">>> [RiskHeatmap] Received Data:", data);
            setEntities(data);
        } catch (err) {
            console.error(">>> [RiskHeatmap] Fetch Error:", err);
            if (entities.length === 0) {
                console.warn("Using fallback mock data for development visibility.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // [CRITICAL] Listen for real-time topology updates from AIAnalysisReport
        const handleTopologyUpdate = () => {
            console.log(">>> [RiskHeatmap] Topology update event received, refreshing...");
            fetchData();
        };

        window.addEventListener('topology-updated', handleTopologyUpdate);

        return () => {
            window.removeEventListener('topology-updated', handleTopologyUpdate);
        };
    }, []);

    const handleAddEntity = async () => {
        try {
            await safeInvoke("add_audit_entity", {
                entity: {
                    unit_name: newEntityName,
                    category: newCategory,
                    last_audit_year: parseInt(newLastAudit) || 2024
                }
            });
            setIsAddModalOpen(false);
            setNewEntityName("");
            setPriorityReport("");
            fetchData();
        } catch (err) {
            alert(err);
        }
    };

    const handleApplyToPlan = async () => {
        if (!selectedEntity) return;
        try {
            await safeInvoke("add_audit_plan", {
                year: 2024,
                domain: selectedEntity.unit_name,
                risk_score: editImpact * editLikelihood,
                importance: (editImpact * editLikelihood) >= 50 ? "High" : "Medium",
                days: 14,
                description: aiAnalysis?.audit_approach || "AI Risk Assessment based audit scope."
            });
            alert(`[Success] Draft Audit Plan created for ${selectedEntity.unit_name}.`);
            setSelectedEntity(null);
        } catch (err) {
            console.error(err);
            alert("Failed to draft plan: " + err);
        }
    };

    const handleUpdateScores = async () => {
        if (!selectedEntity) return;
        try {
            await safeInvoke("update_risk_assessment", {
                id: selectedEntity.id,
                impact: editImpact,
                likelihood: editLikelihood,
                ai_analysis_data: aiAnalysis ? JSON.stringify(aiAnalysis) : null
            });
            setSelectedEntity(null);
            setPriorityReport(""); // Invalidate report cache
            fetchData();
        } catch (err) {
            alert(err);
        }
    };

    const handleSelectForEdit = (entity: AuditEntity) => {
        setSelectedEntity(entity);
        setEditImpact(entity.impact_score);
        setEditLikelihood(entity.likelihood_score);
        if (entity.ai_analysis) {
            setAiAnalysis(entity.ai_analysis);
        } else {
            setAiAnalysis(null);
        }
    };

    const handleAiSuggest = async () => {
        if (!selectedEntity) return;
        setIsSuggesting(true);
        try {
            const res: AiRiskAnalysis = await safeInvoke("ai_suggest_risk_score", {
                id: selectedEntity.id,
                use_live_ai: useLiveAi
            });
            setEditImpact(res.impact_score);
            setEditLikelihood(res.likelihood_score);
            setAiAnalysis(res);
        } catch (err) {
            alert(err);
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleGeneratePriorityReport = async () => {
        setIsGeneratingPriority(true);
        setIsPriorityModalOpen(true);
        try {
            const report: string = await safeInvoke("generate_audit_priorities", { entities });
            setPriorityReport(report);
        } catch (err) {
            alert(err);
        } finally {
            setIsGeneratingPriority(false);
        }
    };


    const handleForceSeed = async () => {
        try {
            setLoading(true);
            await safeInvoke("force_seed_universe");
            setPriorityReport("");
            await fetchData();
            alert("샘플 데이터가 성공적으로 생성되었습니다.");
        } catch (err) {
            alert(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#0B1221] min-h-screen p-10 overflow-x-hidden text-slate-300">
            <div className="max-w-[1600px] mx-auto space-y-12">

                {/* Header Area */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
                    <div className="animate-in slide-in-from-left duration-700">
                        <div className="flex items-center gap-2 mb-3">
                            <Target className="text-blue-500 w-5 h-5 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Risk-Based Audit Strategy</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Audit Universe <span className="text-blue-500">Risk Heatmap</span></h1>
                        <p className="text-slate-500 font-medium mt-3 max-w-3xl leading-relaxed text-lg">
                            시스템 외부에서 일어나는 비공식 '그림자 프로세스'와 담당자 로컬 데이터, 전사 로그를 AI가 상시 분석하여 <strong className="text-rose-500 font-black">감사 우선순위</strong>가 높은 고위험 영역을 식별합니다.
                        </p>
                    </div>
                    <div className="flex gap-4 items-center">
                        <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-5 py-3 rounded-2xl shadow-xl transition-all hover:bg-white/10">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5">Forensic Engine</span>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${useLiveAi ? 'bg-blue-500 animate-pulse' : 'bg-slate-700'}`} />
                                    <span className={`text-[10px] font-black uppercase tracking-tight ${useLiveAi ? 'text-blue-400' : 'text-slate-600'}`}>
                                        {useLiveAi ? 'GEMINI 3.0 ACTIVE' : 'LOCAL SIMULATOR'}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setUseLiveAi(!useLiveAi)}
                                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 shadow-inner ${useLiveAi ? 'bg-blue-600' : 'bg-slate-800 border border-white/5'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-xl transform transition-transform duration-300 ${useLiveAi ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <button
                            onClick={fetchData}
                            className="p-4 bg-white/5 border border-white/10 text-slate-500 rounded-2xl hover:bg-white/10 hover:text-white transition-all flex items-center gap-2 shadow-sm"
                        >
                            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                        </button>
                        <button
                            onClick={handleGeneratePriorityReport}
                            className="bg-blue-600 text-white px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40 flex items-center gap-3 active:scale-95"
                        >
                            <BrainCircuit size={20} /> AI 우선순위 산출
                        </button>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-slate-800 text-white px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all border border-white/5 shadow-xl flex items-center gap-3 active:scale-95"
                        >
                            <Plus size={20} /> 대상(Entity) 추가
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                    {/* Left Panel: Quadrant Chart */}
                    <div className="lg:col-span-8 bg-white/5 border border-white/10 rounded-[48px] p-10 md:p-14 shadow-2xl relative overflow-hidden group">
                        <div className="flex justify-between items-center mb-12">
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight italic uppercase">리스크 집중 구획 분석 <span className="text-slate-600 font-medium">(4-Quadrant)</span></h3>
                                <div className="flex items-center gap-8 mt-4">
                                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" /> <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Critical Zone</span></div>
                                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" /> <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">High Strategic</span></div>
                                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" /> <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Management Area</span></div>
                                </div>
                            </div>
                            <div className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20"><Zap size={24} className="fill-rose-500" /></div>
                        </div>

                        <div className="h-[550px] w-full relative bg-slate-900/40 rounded-[40px] border border-white/5 p-6 backdrop-blur-sm">
                            {/* Static Quadrant Labels in Corners */}
                            <div className="absolute top-10 right-10 text-right pointer-events-none z-20">
                                <span className="inline-block text-[11px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 backdrop-blur-md px-4 py-2 rounded-xl border border-rose-500/20 shadow-lg mb-2">Zone 1: Must Audit</span>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-tight max-w-[160px] leading-relaxed">High Exposure / Immediate Action Required</p>
                            </div>
                            <div className="absolute top-10 left-16 text-left pointer-events-none z-20">
                                <span className="inline-block text-[11px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 backdrop-blur-md px-4 py-2 rounded-xl border border-amber-500/20 shadow-lg mb-2">Zone 2: Strategic</span>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-tight max-w-[160px] leading-relaxed">Systemic Risk / Structural Improvement</p>
                            </div>
                            <div className="absolute bottom-32 right-10 text-right pointer-events-none z-20">
                                <span className="inline-block text-[11px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 backdrop-blur-md px-4 py-2 rounded-xl border border-blue-500/20 shadow-lg mb-2">Zone 3: Compliance</span>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-tight max-w-[160px] leading-relaxed">Process Maturity / Periodic Check Required</p>
                            </div>
                            <div className="absolute bottom-32 left-16 text-left pointer-events-none z-20">
                                <span className="inline-block text-[11px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 backdrop-blur-md px-4 py-2 rounded-xl border border-emerald-500/20 shadow-lg mb-2">Zone 4: Monitoring</span>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-tight max-w-[160px] leading-relaxed">Continuous Oversight / Stable Records</p>
                            </div>

                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 40, bottom: 60, left: 30 }}>
                                    <CartesianGrid strokeDasharray="5 5" stroke="rgba(255,255,255,0.05)" vertical={true} horizontal={true} />
                                    <XAxis
                                        type="number"
                                        dataKey="likelihood_score"
                                        name="Likelihood"
                                        domain={[0, 10]}
                                        tickCount={11}
                                        stroke="#475569"
                                        fontSize={11}
                                        tick={{ fontWeight: 900, fill: '#64748b' }}
                                    >
                                        <Label value="Likelihood / Vulnerability Index (X)" position="bottom" offset={35} style={{ textAnchor: 'middle', fontWeight: 900, fontSize: 13, fill: '#94a3b8', letterSpacing: '0.1em' }} />
                                    </XAxis>
                                    <YAxis
                                        type="number"
                                        dataKey="impact_score"
                                        name="Impact"
                                        domain={[0, 10]}
                                        tickCount={11}
                                        stroke="#475569"
                                        fontSize={11}
                                        tick={{ fontWeight: 900, fill: '#64748b' }}
                                    >
                                        <Label value="Financial & Strategic Impact (Y)" angle={-90} position="left" offset={0} style={{ textAnchor: 'middle', fontWeight: 900, fontSize: 13, fill: '#94a3b8', letterSpacing: '0.1em' }} />
                                    </YAxis>
                                    <ZAxis type="number" range={[500, 500]} />
                                    <Tooltip
                                        content={<CustomTooltip />}
                                        cursor={{ strokeDasharray: '4 4', stroke: '#334155' }}
                                        isAnimationActive={false}
                                    />

                                    {/* Quadrant Background Colors */}
                                    <ReferenceArea x1={5} x2={10} y1={5} y2={10} fill="#f43f5e" fillOpacity={0.03} stroke="none" />
                                    <ReferenceArea x1={0} x2={5} y1={5} y2={10} fill="#f59e0b" fillOpacity={0.02} stroke="none" />
                                    <ReferenceArea x1={5} x2={10} y1={0} y2={5} fill="#3b82f6" fillOpacity={0.02} stroke="none" />
                                    <ReferenceArea x1={0} x2={5} y1={0} y2={5} fill="#10b981" fillOpacity={0.02} stroke="none" />

                                    <Scatter
                                        name="Audit Units"
                                        data={entities}
                                        onClick={(e: any) => handleSelectForEdit(e.payload)}
                                    >
                                        {entities.map((entry, index) => {
                                            const isCritical = entry.impact_score >= 8 && entry.likelihood_score >= 8;
                                            const total = entry.impact_score * entry.likelihood_score;
                                            const color = isCritical ? '#f43f5e' : total >= 50 ? '#f59e0b' : total >= 25 ? '#3b82f6' : '#10b981';
                                            return (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={color}
                                                    stroke="rgba(255,255,255,0.2)"
                                                    strokeWidth={2}
                                                    style={{ filter: `drop-shadow(0 0 12px ${color}44)`, cursor: 'pointer' }}
                                                    className="hover:scale-150 transition-all duration-300 transform-gpu"
                                                />
                                            );
                                        })}
                                        <LabelList
                                            dataKey="unit_name"
                                            position="top"
                                            offset={18}
                                            style={{ fontSize: '10px', fontWeight: 900, fill: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                        />
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Right Panel: Quick Management & List */}
                    <div className="lg:col-span-4 space-y-8 animate-in slide-in-from-right duration-700">
                        <div className="bg-white/5 border border-white/10 rounded-[48px] p-10 shadow-2xl h-full flex flex-col">
                            <div className="flex items-center gap-4 mb-8">
                                <History className="text-blue-500" size={24} />
                                <h3 className="text-xl font-black text-white tracking-tight italic uppercase">Audit Universe 상세</h3>
                            </div>

                            <div className="space-y-5 flex-1 overflow-y-auto pr-3 custom-scrollbar">
                                {entities.length === 0 ? (
                                    <div className="text-center py-24 bg-white/5 rounded-[40px] border border-dashed border-white/10">
                                        <Building2 className="mx-auto text-slate-700 mb-6 opacity-20" size={64} />
                                        <p className="text-sm font-black text-slate-600 uppercase tracking-widest leading-relaxed">No entities detected in<br />current universe state.</p>
                                        <button
                                            onClick={handleForceSeed}
                                            className="mt-8 px-8 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40 active:scale-95"
                                        >
                                            샘플 시나리오 생성하기
                                        </button>
                                    </div>
                                ) : (
                                    entities.map(e => {
                                        const total = e.impact_score * e.likelihood_score;
                                        const isCritical = e.impact_score >= 8 && e.likelihood_score >= 8;
                                        const riskZone = isCritical ? 'Critical' : total >= 50 ? 'High' : total >= 25 ? 'Medium' : 'Low';
                                        return (
                                            <div
                                                key={e.id}
                                                onClick={() => handleSelectForEdit(e)}
                                                className={`p-6 rounded-[32px] border transition-all cursor-pointer group hover:scale-[1.02] active:scale-95 ${selectedEntity?.id === e.id ? 'bg-blue-600 border-blue-500 shadow-2xl shadow-blue-900/40' : 'bg-white/5 border-white/5 hover:border-blue-500/50 hover:bg-white/10'}`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1.5 ${selectedEntity?.id === e.id ? 'text-blue-100' : 'text-slate-600'}`}>{e.category}</p>
                                                        <h4 className={`text-md font-black transition-colors tracking-tight ${selectedEntity?.id === e.id ? 'text-white' : 'text-slate-200'}`}>{e.unit_name}</h4>
                                                    </div>
                                                    <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${isCritical ? 'bg-rose-500 text-white shadow-lg shadow-rose-900/40' : selectedEntity?.id === e.id ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-500 border border-white/5'}`}>
                                                        {riskZone}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                                                    <div className="flex items-center gap-3">
                                                        <span className={selectedEntity?.id === e.id ? 'text-blue-200' : 'text-slate-600'}>Exposure:</span>
                                                        <span className={`text-base ${selectedEntity?.id === e.id ? 'text-white' : 'text-slate-300'}`}>{total}</span>
                                                    </div>
                                                    <ChevronRight size={16} className={`opacity-40 group-hover:translate-x-1 transition-transform ${selectedEntity?.id === e.id ? 'text-white scale-125' : 'text-slate-600'}`} />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Risk Assessment Modal */}
            {selectedEntity && (
                <div className="fixed inset-0 z-[2000] bg-[#020617]/80 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-[48px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col">
                        <div className="p-10 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-[48px]">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-rose-600 text-white rounded-2xl shadow-xl shadow-rose-900/40">
                                    <ShieldAlert size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white tracking-tight italic uppercase">리스크 정량 평가 <span className="text-slate-600 font-medium">Quantification</span></h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1.5">{selectedEntity.unit_name} • ID: {selectedEntity.id}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleAiSuggest}
                                    disabled={isSuggesting}
                                    className="bg-blue-600/10 text-blue-400 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-3 border border-blue-500/20 disabled:opacity-50"
                                >
                                    {isSuggesting ? (
                                        <>
                                            <RefreshCw size={14} className="animate-spin" />
                                            <span className="animate-pulse">Analyzing telemetry...</span>
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw size={14} /> AI 전문가 진단
                                        </>
                                    )}
                                </button>
                                <button onClick={() => setSelectedEntity(null)} className="p-3 hover:bg-white/10 rounded-full transition-colors">
                                    <X size={28} className="text-slate-500" />
                                </button>
                            </div>
                        </div>

                        <div className="p-12 space-y-12 overflow-y-auto custom-scrollbar max-h-[70vh]">
                            <div className="bg-blue-600/5 border border-blue-600/10 p-8 rounded-[32px] animate-in fade-in slide-in-from-top-4 duration-300 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5"><BrainCircuit size={64} /></div>
                                <div className="flex items-center gap-3 mb-4">
                                    <BrainCircuit size={18} className="text-blue-500" />
                                    <span className="text-[11px] font-black text-blue-400 uppercase tracking-[0.2em]">Forensic Logic Explanation</span>
                                </div>
                                <p className="text-base text-slate-300 font-medium leading-[1.8] italic relative z-10">
                                    {aiAnalysis ? `"${aiAnalysis.reason}"` : "시스템이 상시 모니터링 중인 리스크 패턴 분석 데이터가 없습니다. 상단 'AI 전문가 진단'을 통해 최신 리스크 매트릭스를 구성하십시오."}
                                </p>
                            </div>

                            {/* Detailed Breakdown */}
                            {aiAnalysis && (
                                <div className="grid grid-cols-2 gap-10 py-2 animate-in fade-in duration-500">
                                    <div className="space-y-6">
                                        <h6 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-white/5 pb-3">Impact Metrics</h6>
                                        <div className="space-y-4">
                                            {[
                                                { label: "Financial Loss", value: aiAnalysis.impact_breakdown.financial_loss },
                                                { label: "Strategic Impt.", value: aiAnalysis.impact_breakdown.strategic_impact },
                                                { label: "Reputation Defect", value: aiAnalysis.impact_breakdown.reputation_risk }
                                            ].map((item, idx) => (
                                                <div key={idx} className="space-y-2">
                                                    <div className="flex justify-between text-[11px] font-black uppercase text-slate-400">
                                                        <span className="tracking-tighter">{item.label}</span>
                                                        <span className="text-white">{item.value}/10</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-1000 ${item.value >= 8 ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : item.value >= 5 ? 'bg-blue-500' : 'bg-emerald-500'}`}
                                                            style={{ width: `${item.value * 10}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <h6 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-white/5 pb-3">Likelihood Metrics</h6>
                                        <div className="space-y-4">
                                            {[
                                                { label: "History Index", value: aiAnalysis.likelihood_breakdown.historical_frequency },
                                                { label: "Control Vulnerability", value: aiAnalysis.likelihood_breakdown.control_weakness },
                                                { label: "Operational Complexity", value: aiAnalysis.likelihood_breakdown.process_complexity }
                                            ].map((item, idx) => (
                                                <div key={idx} className="space-y-2">
                                                    <div className="flex justify-between text-[11px] font-black uppercase text-slate-400">
                                                        <span className="tracking-tighter">{item.label}</span>
                                                        <span className="text-white">{item.value}/10</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-1000 ${item.value >= 8 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : item.value >= 5 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                                            style={{ width: `${item.value * 10}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-8">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-2">
                                        <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.3em]">Critical Dimension 1</p>
                                        <h5 className="text-2xl font-black text-white italic">Inherent Impact <span className="text-slate-600">(전략 영향도)</span></h5>
                                    </div>
                                    <span className="text-5xl font-black text-blue-500 tracking-tighter">{editImpact}</span>
                                </div>
                                <input
                                    type="range" min="1" max="10"
                                    value={editImpact}
                                    onChange={(e) => setEditImpact(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-800 rounded-full appearance-none accent-blue-600 cursor-pointer shadow-inner"
                                />
                                <div className="flex justify-between text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] px-1">
                                    <span>Nominal</span>
                                    <span>Extreme Scale</span>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-2">
                                        <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.3em]">Critical Dimension 2</p>
                                        <h5 className="text-2xl font-black text-white italic">Control Weakness <span className="text-slate-600">(취약성 지수)</span></h5>
                                    </div>
                                    <span className="text-5xl font-black text-amber-500 tracking-tighter">{editLikelihood}</span>
                                </div>
                                <input
                                    type="range" min="1" max="10"
                                    value={editLikelihood}
                                    onChange={(e) => setEditLikelihood(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-800 rounded-full appearance-none accent-amber-500 cursor-pointer shadow-inner"
                                />
                                <div className="flex justify-between text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] px-1">
                                    <span>Optimized Control</span>
                                    <span>Critically Vulnerable</span>
                                </div>
                            </div>

                            <div className="bg-white/5 p-8 rounded-[32px] border border-white/5 flex items-center justify-between shadow-inner">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-slate-800 text-blue-500 rounded-2xl border border-white/5"><Zap size={20} /></div>
                                    <div>
                                        <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest mb-1">Risk Exposure Metric</p>
                                        <p className="text-xl font-black text-white">Calculated Exposure: <span className="text-blue-500">{editImpact * editLikelihood}</span></p>
                                    </div>
                                </div>
                                <div className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${editImpact >= 8 && editLikelihood >= 8 ? 'bg-rose-600 text-white shadow-xl shadow-rose-900/40 border border-rose-500' : 'bg-slate-800 text-slate-500 border border-white/5'}`}>
                                    {editImpact >= 8 && editLikelihood >= 8 ? 'Critical Zone' : 'Standard Assessment'}
                                </div>
                            </div>
                        </div>

                        <div className="p-10 bg-[#0B1221] border-t border-white/10 flex justify-between items-center rounded-b-[48px]">
                            <div className="flex gap-4">
                                <button
                                    onClick={handleApplyToPlan}
                                    className="px-8 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[20px] font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-900/40 flex items-center gap-3 active:scale-95"
                                >
                                    <Target size={18} /> 감사 로드맵에 반영
                                </button>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setSelectedEntity(null)}
                                    className="px-10 py-5 text-slate-600 hover:text-white rounded-[20px] font-black text-xs uppercase tracking-widest transition-all"
                                >
                                    Discard Changes
                                </button>
                                <button
                                    onClick={handleUpdateScores}
                                    className="px-12 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[20px] font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/40 flex items-center gap-3 active:scale-95"
                                >
                                    <Save size={18} /> 평가 결과 확정
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Entity Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[2000] bg-[#020617]/80 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-10 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-[40px]">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-slate-800 text-white rounded-2xl border border-white/10 shadow-lg">
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white tracking-tight italic uppercase">대상(Entity) 신규 등록</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Audit Universe Entry Initialization</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-3 hover:bg-white/10 rounded-full transition-colors">
                                <X size={28} className="text-slate-500" />
                            </button>
                        </div>

                        <div className="p-10 space-y-8">
                            <div className="space-y-3">
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block pl-1">Entity / Object Name</label>
                                <input
                                    type="text"
                                    value={newEntityName}
                                    onChange={(e) => setNewEntityName(e.target.value)}
                                    placeholder="부서, 팀 또는 분석 대상 프로세스명을 입력하세요..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-[15px] font-bold text-white outline-none focus:ring-4 ring-blue-500/10 transition-all placeholder:text-slate-700"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block pl-1">Category</label>
                                    <select
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-[15px] font-bold text-white outline-none focus:ring-4 ring-blue-500/10 transition-all appearance-none"
                                    >
                                        <option value="Department" className="bg-slate-900">Department / 부서</option>
                                        <option value="Subsidiary" className="bg-slate-900">Subsidiary / 법인</option>
                                        <option value="Process" className="bg-slate-900">Process / 프로세스</option>
                                        <option value="IT System" className="bg-slate-900">IT System / 인프라</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block pl-1">Baseline Year</label>
                                    <select
                                        value={newLastAudit}
                                        onChange={(e) => setNewLastAudit(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-[15px] font-bold text-white outline-none focus:ring-4 ring-blue-500/10 transition-all appearance-none"
                                    >
                                        <option value="" disabled className="bg-slate-900">연도 선택</option>
                                        {Array.from({ length: 7 }, (_, i) => 2026 - i).map(year => (
                                            <option key={year} value={year} className="bg-slate-900">{year} FISCAL YEAR</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="p-10 bg-[#0B1221] border-t border-white/10 flex justify-end gap-4 rounded-b-[40px]">
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-10 py-5 text-slate-600 hover:text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all"
                            >
                                Cancel Initialization
                            </button>
                            <button
                                onClick={handleAddEntity}
                                className="px-12 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-900/40 active:scale-95"
                            >
                                Initialize Object
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Priority List Modal */}
            {isPriorityModalOpen && (
                <div className={`fixed inset-0 z-[3000] bg-[#020617]/90 backdrop-blur-xl flex items-center justify-center ${isMaximized ? 'p-0' : 'p-6'}`}>
                    <div className={`bg-slate-900 shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300 flex flex-col transition-all duration-500 ${isMaximized ? 'w-full h-full rounded-none' : 'w-full max-w-5xl max-h-[90vh] rounded-[48px]'}`}>
                        <div className={`p-10 border-b border-white/10 flex justify-between items-center bg-white/5 ${isMaximized ? 'rounded-none' : 'rounded-t-[48px]'}`}>
                            <div className="flex items-center gap-6">
                                <div className="p-5 bg-blue-600 text-white rounded-3xl shadow-2xl shadow-blue-900/40">
                                    <BrainCircuit size={40} />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic">차년도 감사 우선순위 리포트</h3>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">Strategic Audit Priority Vector Analysis</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setIsMaximized(!isMaximized)}
                                    className="p-3 hover:bg-white/10 rounded-full transition-colors text-slate-500 hover:text-white"
                                    title={isMaximized ? "축소" : "최대화"}
                                >
                                    {isMaximized ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
                                </button>
                                <button onClick={() => setIsPriorityModalOpen(false)} className="p-3 hover:bg-white/10 rounded-full transition-colors text-slate-500 hover:text-white">
                                    <X size={32} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-black/20 relative">
                            {/* Watermark */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] select-none rotate-[-30deg]">
                                <span className="text-[120px] font-black text-white whitespace-nowrap">CONFIDENTIAL • AUDITFLOW</span>
                            </div>

                            {isGeneratingPriority ? (
                                <div className="flex flex-col items-center justify-center py-32 space-y-8">
                                    <div className="relative">
                                        <div className="w-24 h-24 border-4 border-white/5 border-t-blue-600 rounded-full animate-spin" />
                                        <BrainCircuit size={40} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 animate-pulse" />
                                    </div>
                                    <div className="text-center space-y-3">
                                        <p className="text-2xl font-black text-white tracking-tight uppercase italic">Advanced Strategy Synthesis...</p>
                                        <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.3em] font-mono">Simulating Risk Factors & Conflict Scenarios</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="prose prose-invert max-w-none relative z-10">
                                    <div className="bg-white/5 border border-white/10 rounded-[40px] p-12 shadow-inner leading-relaxed backdrop-blur-sm">
                                        <div className="report-content markdown-body prose prose-invert prose-xl max-w-none 
                                            [&>h1]:text-4xl [&>h1]:font-black [&>h1]:mb-8 [&>h1]:text-white [&>h1]:tracking-tighter [&>h1]:uppercase [&>h1]:italic
                                            [&>h2]:text-2xl [&>h2]:font-black [&>h2]:mt-12 [&>h2]:mb-6 [&>h2]:text-blue-400 [&>h2]:uppercase [&>h2]:tracking-tight
                                            [&>table]:w-full [&>table]:border-collapse [&>table]:my-10 [&>table_th]:bg-white/5 [&>table_th]:p-5 [&>table_th]:text-[11px] [&>table_th]:font-black [&>table_th]:uppercase [&>table_th]:tracking-widest [&>table_th]:border-b [&>table_th]:border-white/10
                                            [&>table_td]:p-5 [&>table_td]:border-b [&>table_td]:border-white/5 [&>table_td]:text-slate-400 [&>table_td]:text-sm [&>table_td]:font-bold
                                            [&>p]:text-slate-400 [&>p]:text-lg [&>p]:leading-loose
                                            [&>ul]:list-none [&>ul]:space-y-3 [&>li]:flex [&>li]:items-start [&>li]:before:content-['•'] [&>li]:before:mr-4 [&>li]:before:text-blue-500 [&>li]:before:font-black">
                                            <ReactMarkdown>
                                                {priorityReport || "생성된 리포트가 없습니다."}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={`p-10 bg-[#0B1221] border-t border-white/10 flex justify-between items-center ${isMaximized ? 'rounded-none' : 'rounded-b-[48px]'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Analysis Identity Verified</span>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setIsPriorityModalOpen(false)}
                                    className="px-10 py-5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white rounded-[20px] font-black text-xs uppercase tracking-widest transition-all"
                                >
                                    리뷰 종료
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="px-12 py-5 bg-white text-slate-950 hover:bg-slate-200 rounded-[20px] font-black text-xs uppercase tracking-widest transition-all shadow-2xl flex items-center gap-3 active:scale-95"
                                >
                                    <Printer size={18} /> 정식 보고서 발행
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
            `}} />
        </div>
    );
}
