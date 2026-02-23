import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { safeInvoke } from "../lib/tauri-bridge";
import {
    Clock, AlertCircle, TrendingUp, ShieldAlert,
    ArrowLeft, Calendar, DollarSign, Activity,
    ChevronRight, ExternalLink, Info
} from "lucide-react";
import { EntityTimelineResponse, ExposureVerdict } from "../types";

export default function EntityTimeline() {
    const { entityId } = useParams<{ entityId: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<EntityTimelineResponse | null>(null);
    const [verdict, setVerdict] = useState<ExposureVerdict | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!entityId) return;
        setLoading(true);
        try {
            const res: EntityTimelineResponse = await safeInvoke("get_entity_timeline", { entityId });
            setData(res);

            // Fetch verdict for the highest severity found or default to HIGH for simulation
            // In a real app, this might be triggered by selecting a specific issue.
            const v: ExposureVerdict = await safeInvoke("judge_risk_exposure", { entity_id: parseInt(entityId), severity: "HIGH" });
            setVerdict(v);
        } catch (err) {
            console.error("Failed to fetch timeline", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [entityId]);

    const formatCurrency = (amt: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amt);
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-[#0B1221]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );

    if (!data) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B1221] text-white">
            <ShieldAlert size={48} className="text-red-500 mb-4" />
            <p className="text-xl font-black">Entity Not Found</p>
            <button onClick={() => navigate(-1)} className="mt-4 text-blue-500 underline">Go Back</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0B1221] p-8 lg:p-12 text-left">
            <div className="max-w-6xl mx-auto space-y-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="space-y-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
                        >
                            <ArrowLeft size={14} /> Back to Universe
                        </button>
                        <div className="flex items-center gap-3">
                            <Activity className="text-blue-500" size={24} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Event Memory Timeline</span>
                        </div>
                        <h1 className="text-5xl font-black text-white tracking-tighter leading-none">
                            {data.canonical_name}
                        </h1>
                        <p className="text-slate-500 text-sm font-medium">Unique Entity ID: <span className="text-slate-300 font-mono">{data.entity_id}</span></p>
                    </div>

                    <div className="flex gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Risk Score</p>
                                <p className="text-2xl font-black text-white">{data.summary.risk_score.toFixed(1)}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full border-2 border-red-500/30 flex items-center justify-center">
                                <AlertCircle className="text-red-500" size={20} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Materiality Dashboard (The Triple-Loss View) */}
                {verdict && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-blue-600/20 to-transparent backdrop-blur-2xl rounded-3xl border border-blue-500/20 p-8 space-y-4 col-span-1 lg:col-span-2">
                            <div className="flex justify-between items-start">
                                <h3 className="text-xl font-black text-white flex items-center gap-2">
                                    <ShieldAlert className="text-blue-500" size={24} /> CFO Triple-Loss Analysis
                                </h3>
                                <span className={`${verdict.risk_level === 'CRITICAL' ? 'bg-red-500' : 'bg-blue-500'} text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest`}>
                                    {verdict.risk_level} Risk
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-4">
                                <div className="space-y-2">
                                    <div className="flex flex-col text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <span>Direct Leakage</span>
                                        <span className="text-red-400 text-lg">{formatCurrency(verdict.leakage_impact)}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-tight">직접적인 현금 유출, 횡령 및 오지급 가능성.</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex flex-col text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <span>Penalty Risk</span>
                                        <span className="text-orange-400 text-lg">{formatCurrency(verdict.penalty_risk)}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-tight">규제 위반에 따른 추징금 및 과태료 위험.</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex flex-col text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <span>Operational Waste</span>
                                        <span className="text-yellow-400 text-lg">{formatCurrency(verdict.operational_waste)}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-tight">비효율로 인한 운영 손실 및 기회 비용.</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <Info size={16} className="text-slate-500 shrink-0" />
                                    <p className="text-xs font-medium text-slate-400">
                                        <strong>Formula Used:</strong> {verdict.formula_used}
                                    </p>
                                </div>
                                <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                                    <p className="text-xs text-indigo-300 font-medium leading-relaxed">
                                        "{verdict.cfo_commentary}"
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-3xl border border-white/10 p-8 space-y-6">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Total Exposure</h4>
                            <div className="space-y-4 flex flex-col h-full justify-center pb-8">
                                <div className="p-6 bg-slate-900/50 rounded-2xl border border-white/5 text-center">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Calculated Total</p>
                                    <p className="text-3xl font-black text-white">{formatCurrency(verdict.calculated_exposure)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Timeline Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-black text-white">Event Chronology</h2>
                        <div className="h-px flex-1 bg-white/5" />
                        <span className="text-xs font-bold text-slate-500">{data.events.length} Events Logged</span>
                    </div>

                    <div className="relative space-y-8 before:absolute before:left-[17px] before:top-2 before:bottom-0 before:w-px before:bg-white/5">
                        {data.events.length > 0 ? data.events.map((event, idx) => (
                            <div key={event.id} className="relative pl-12 group">
                                <div className={`absolute left-0 top-0 w-9 h-9 rounded-full flex items-center justify-center border-4 border-[#0B1221] transition-transform group-hover:scale-110 z-10 ${event.is_flagged ? 'bg-red-500 shadow-lg shadow-red-500/20' : 'bg-slate-800'
                                    }`}>
                                    {event.event_type === 'TRANSACTION' ? (
                                        <DollarSign size={14} className="text-white" />
                                    ) : (
                                        <Clock size={14} className="text-white" />
                                    )}
                                </div>

                                <div className="bg-white/5 hover:bg-white/[0.07] border border-white/10 rounded-[24px] p-6 transition-all group-hover:translate-x-1">
                                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{event.event_type}</span>
                                                <span className="text-xs font-bold text-slate-500">{event.event_date}</span>
                                            </div>
                                            <h4 className="text-lg font-black text-white tracking-tight leading-tight">{event.description}</h4>
                                            {event.rule_flags && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {event.rule_flags.split(',').map(flag => (
                                                        <span key={flag} className="bg-red-500/10 text-red-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-red-500/20 uppercase tracking-tighter">
                                                            {flag.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-row md:flex-col items-end gap-2 shrink-0">
                                            {event.amount && (
                                                <p className="text-lg font-black text-white">{formatCurrency(event.amount)}</p>
                                            )}
                                            {event.risk_delta > 0 && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-lg border border-red-500/20">
                                                    <TrendingUp size={12} /> +{event.risk_delta.toFixed(2)} Risk
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {event.source_object_id && (
                                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                                            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold">
                                                <Calendar size={12} /> Source ID: {event.source_object_id}
                                            </div>
                                            <button className="text-blue-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:underline">
                                                View Source <ExternalLink size={10} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div className="p-20 text-center bg-white/5 rounded-[32px] border-2 border-dashed border-white/5">
                                <p className="text-slate-500 font-bold uppercase tracking-widest">No timeline history recorded for this entity.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
