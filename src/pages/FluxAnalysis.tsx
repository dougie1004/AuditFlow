import { useEffect, useState } from 'react';
import { safeInvoke } from '../lib/tauri-bridge';
import { useApp } from '../App';
import {
    BrainCircuit,
    TrendingUp,
    ArrowUpRight,
    TrendingDown,
    AlertCircle,
    Zap,
    Activity,
    ShieldAlert,
    Target,
    Users
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface FluxSignal {
    id: string;
    type: string;
    description: string;
    score: number;
    amount: number;
    account: string | null;
}

const FluxAnalysis = () => {
    const { activeProject } = useApp();
    const [signals, setSignals] = useState<FluxSignal[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalImpact: 0,
        highRiskCount: 0,
        avgScore: 0
    });

    useEffect(() => {
        const fetchFluxData = async () => {
            if (!activeProject) return;
            setLoading(true);
            try {
                // Reusing dashboard summary logic which we just enhanced with dynamic amounts
                const summary: any = await safeInvoke('get_dashboard_summary', { projectId: activeProject });
                const fluxSignals = (summary.flux_signals || []).filter((s: any) => s.type.includes('FLUX'));

                setSignals(fluxSignals);

                const impact = fluxSignals.reduce((acc: number, s: any) => acc + s.amount, 0);
                const highRisk = fluxSignals.filter((s: any) => s.score > 0.8).length;
                const avg = fluxSignals.length > 0 ? fluxSignals.reduce((acc: number, s: any) => acc + s.score, 0) / fluxSignals.length : 0;

                setStats({
                    totalImpact: impact,
                    highRiskCount: highRisk,
                    avgScore: avg
                });
            } catch (err) {
                console.error("Flux Data Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchFluxData();
    }, [activeProject]);

    if (!activeProject) {
        return (
            <div className="p-12 flex flex-col items-center justify-center h-[calc(100vh-90px)]">
                <ShieldAlert size={64} className="text-slate-700 mb-6" />
                <h2 className="text-2xl font-black text-slate-500 uppercase tracking-widest">No Active Project</h2>
                <p className="text-slate-600 mt-2 font-bold">감사 프로젝트를 먼저 선택해 주세요.</p>
            </div>
        );
    }

    return (
        <div className="p-12 space-y-12 bg-[#0B1221] min-h-screen">
            {/* Header Section */}
            <div className="flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                            <BrainCircuit className="text-blue-500" size={24} />
                        </div>
                        <h2 className="text-[12px] font-black text-blue-400 uppercase tracking-[0.4em]">Intelligent Sequential Analysis</h2>
                    </div>
                    <h1 className="text-4xl font-black text-white italic tracking-tighter">시계열 구조 변화 탐지 (FLUX)</h1>
                    <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-[10px]">Project Scope: {activeProject}</p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 px-10 text-right backdrop-blur-xl">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Impact Exposure</p>
                        <p className="text-3xl font-black text-white italic tracking-tighter">
                            ₩{(stats.totalImpact / 100000000).toFixed(1)}억
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    icon={<Activity className="text-blue-400" size={20} />}
                    label="Active Flux Signals"
                    value={signals.length.toString()}
                    subValue="Detected Anomalies"
                    color="blue"
                />
                <StatCard
                    icon={<ShieldAlert className="text-rose-400" size={20} />}
                    label="Critical Structural Breaks"
                    value={stats.highRiskCount.toString()}
                    subValue="Confidence > 80%"
                    color="rose"
                />
                <StatCard
                    icon={<TrendingUp className="text-emerald-400" size={20} />}
                    label="Avg Risk Calibration"
                    value={(stats.avgScore * 100).toFixed(1) + "%"}
                    subValue="Statistical Intensity"
                    color="emerald"
                />
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                {/* Left: Detailed Analysis List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                            <Target size={18} className="text-blue-500" /> Detected Structural Breaks
                        </h3>
                    </div>

                    {signals.length === 0 ? (
                        <div className="bg-white/5 border border-white/5 rounded-[48px] p-24 text-center">
                            <Zap size={48} className="text-slate-700 mx-auto mb-6 opacity-20" />
                            <p className="text-slate-500 font-black uppercase tracking-widest">No major structural breaks identified in current sequence.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {signals.map((sig) => (
                                <FluxDetailItem key={sig.id} signal={sig} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Insights & Distribution */}
                <div className="space-y-8">
                    <div className="bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/20 rounded-[48px] p-8 backdrop-blur-xl">
                        <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Zap size={14} /> FLUX INTELLIGENCE ENGINE
                        </h4>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <p className="text-xs text-slate-300 font-bold leading-relaxed">
                                    본 엔진은 계정별 거래처 집중도(CR1)와 변동성(CV)의 시계열 변화를 추적합니다.
                                    갑작스러운 구조적 변화는 <span className="text-blue-400">비정상적인 거래 경로 우회</span>나 <span className="text-rose-400">특정 업체와의 유착 리스크</span>를 시사할 수 있습니다.
                                </p>
                            </div>
                            <div className="pt-6 border-t border-white/5">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Risk Severity Matrix</p>
                                <div className="space-y-3">
                                    <MatrixLabel label="Emerging Dominance" desc="신규 거래처의 급격한 점유율 확대" status="Critical" />
                                    <MatrixLabel label="Gradual Concentration" desc="장기적인 독점화 경향" status="Watch" />
                                    <MatrixLabel label="Structural Re-routing" desc="주요 공급망의 갑작스러운 변경" status="Alert" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Simple Impact Distribution Chart (Mockup-style with real data) */}
                    <div className="bg-white/5 border border-white/5 rounded-[48px] p-8">
                        <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-8 text-center">Impact Distribution</h4>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={signals.slice(0, 5)}>
                                    <XAxis dataKey="account" hide />
                                    <Bar dataKey="amount" radius={[10, 10, 10, 10]}>
                                        {signals.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.score > 0.8 ? '#f43f5e' : '#3b82f6'} opacity={0.6 + (entry.score * 0.4)} />
                                        ))}
                                    </Bar>
                                    <Tooltip
                                        contentStyle={{ background: '#080E1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '10px' }}
                                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

const StatCard = ({ icon, label, value, subValue, color }: any) => {
    const colors: any = {
        blue: "from-blue-500/20 text-blue-400 border-blue-500/20 shadow-blue-900/10",
        rose: "from-rose-500/20 text-rose-400 border-rose-500/20 shadow-rose-900/10",
        emerald: "from-emerald-500/20 text-emerald-400 border-emerald-500/20 shadow-emerald-900/10"
    };

    return (
        <div className={`bg-white/5 border rounded-[32px] p-6 backdrop-blur-xl bg-gradient-to-br ${colors[color]} shadow-2xl`}>
            <div className="flex items-center gap-3 mb-4 opacity-70">
                {icon}
                <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
            </div>
            <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-white italic tracking-tighter">{value}</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{subValue}</span>
            </div>
        </div>
    );
};

const FluxDetailItem = ({ signal }: { signal: FluxSignal }) => {
    const isHigh = signal.score > 0.8;

    return (
        <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 group hover:bg-white/[0.07] hover:border-blue-500/30 transition-all relative overflow-hidden">
            {/* Background Glow */}
            <div className={`absolute -right-20 -top-20 w-64 h-64 blur-[100px] opacity-10 rounded-full transition-all group-hover:opacity-20 ${isHigh ? 'bg-rose-500' : 'bg-blue-500'}`} />

            <div className="flex items-center gap-8 relative z-10">
                {/* Account Badge */}
                <div className="w-24 h-24 rounded-full border-2 border-white/5 flex flex-col items-center justify-center bg-black/40 shadow-inner">
                    <span className="text-[10px] font-black text-slate-500 uppercase mb-1">Account</span>
                    <span className={`text-sm font-black ${isHigh ? 'text-rose-400' : 'text-blue-400'}`}>{signal.account || "N/A"}</span>
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${isHigh ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {isHigh ? 'Structural Break (Critical)' : 'Signature Detected'}
                        </span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Risk Index: {(signal.score * 100).toFixed(0)}%
                        </span>
                    </div>
                    <p className="text-lg font-bold text-slate-100 leading-snug max-w-2xl mb-4 italic">
                        {signal.description}
                    </p>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            <Target size={12} className="opacity-50" /> Target Entity Matched
                        </div>
                        <div className="w-1 h-1 rounded-full bg-slate-800" />
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            <Zap size={12} className="opacity-50" /> Technical Baseline Confirmed
                        </div>
                    </div>
                </div>

                <div className="text-right border-l border-white/5 pl-8">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Financial Impact</p>
                    <p className={`text-2xl font-black italic tracking-tighter ${isHigh ? 'text-white' : 'text-slate-300'}`}>
                        {signal.amount > 0 ? `₩${(signal.amount / 100000000).toFixed(1)}억` : "N/A"}
                    </p>
                </div>
            </div>
        </div>
    );
};

const MatrixLabel = ({ label, desc, status }: any) => {
    const statusColor = status === 'Critical' ? 'text-rose-400' : status === 'Alert' ? 'text-blue-400' : 'text-emerald-400';
    return (
        <div className="flex items-start gap-3">
            <div className={`mt-1.5 w-1 h-1 rounded-full bg-current ${statusColor}`} />
            <div>
                <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black text-slate-300 tracking-tight uppercase">{label}</p>
                    <span className={`text-[8px] font-black uppercase px-1 rounded bg-white/5 border border-white/5 ${statusColor}`}>{status}</span>
                </div>
                <p className="text-[9px] text-slate-500 font-bold">{desc}</p>
            </div>
        </div>
    );
};

export default FluxAnalysis;
