import React, { useState, useEffect, useMemo } from "react";
import { safeInvoke } from "../../lib/tauri-bridge";
import {
    TrendingUp, Activity,
    Search, RefreshCw,
    ArrowUpRight, ArrowDownRight, Minus,
    AlertCircle, ChevronDown, ChevronRight, Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    AreaChart, Area, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from "recharts";

interface AccountTrend {
    account: string;
    yearly_totals: Record<string, number>;
    yoy: Record<string, number>;
    max_abs_yoy: number;
}

interface FinancialTrendPanelProps {
    projectId?: string;
}

const FinancialTrendPanel = ({ projectId }: FinancialTrendPanelProps) => {
    const [trends, setTrends] = useState<AccountTrend[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await safeInvoke<AccountTrend[]>("get_multi_year_trial_balance", { projectId });
            setTrends(res || []);
        } catch (err: any) {
            setError(err.message || String(err));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [projectId]);

    const filteredTrends = useMemo(() =>
        trends.filter(t => t.account.toLowerCase().includes(searchTerm.toLowerCase())),
        [trends, searchTerm]
    );

    const topVolatile = useMemo(() =>
        [...trends].sort((a, b) => b.max_abs_yoy - a.max_abs_yoy).slice(0, 3),
        [trends]
    );

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(val);

    const formatPercent = (val: number) => (val * 100).toFixed(1) + "%";

    const getChartData = (totals: Record<string, number>) =>
        Object.keys(totals).sort().map(year => ({ year, value: totals[year] }));

    const handleRowClick = (account: string) => {
        setExpandedAccount(prev => prev === account ? null : account);
    };

    return (
        <div className="bg-slate-900/40 border border-white/5 rounded-[40px] overflow-hidden backdrop-blur-xl shadow-2xl">
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h3 className="text-xl font-black text-white italic uppercase flex items-center gap-3">
                        <TrendingUp className="text-emerald-500" size={24} /> 다년도 재무 트렌드 분석
                    </h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Multi-Year Financial Engine v1.0 · 계정 클릭 시 연도별 세부 내역 확인</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="계정 과목 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-2.5 pl-12 pr-4 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600"
                        />
                    </div>
                    <button onClick={fetchData} disabled={isLoading}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all active:scale-95 disabled:opacity-50">
                        <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-12 text-center">
                    <AlertCircle className="text-rose-500 mx-auto mb-4" size={48} />
                    <p className="text-sm font-bold text-rose-400">데이터 로드 실패</p>
                    <p className="text-[10px] text-slate-500 mt-2 uppercase">{error}</p>
                </div>
            )}

            {!isLoading && trends.length === 0 && !error && (
                <div className="p-20 text-center opacity-40">
                    <Activity className="mx-auto mb-6 text-slate-500" size={48} />
                    <p className="text-xs font-black uppercase tracking-[0.2em]">분석 가능한 시계열 데이터가 없습니다.</p>
                    <p className="text-[10px] text-slate-600 mt-2">최소 2년 이상의 원장 데이터가 필요합니다.</p>
                </div>
            )}

            <div className="p-8 space-y-8">
                {/* Top Highlights */}
                {!isLoading && topVolatile.length > 0 && !searchTerm && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {topVolatile.map((item, idx) => (
                            <div key={idx}
                                onClick={() => handleRowClick(item.account)}
                                className="bg-emerald-500/5 border border-emerald-500/10 rounded-[32px] p-6 group hover:border-emerald-500/30 transition-all cursor-pointer active:scale-[0.98]">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                                        <Activity size={16} />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Max Variance</p>
                                        <p className="text-sm font-black text-emerald-400">{formatPercent(item.max_abs_yoy)}</p>
                                    </div>
                                </div>
                                <h4 className="font-black text-white text-sm mb-2 truncate">{item.account}</h4>
                                <div className="h-16 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={getChartData(item.yearly_totals)}>
                                            <defs>
                                                <linearGradient id={`color-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill={`url(#color-${idx})`} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-[9px] text-slate-600 mt-2 font-bold uppercase tracking-widest text-center">클릭하여 세부 내역 보기</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Main Table */}
                <div className="bg-black/20 rounded-[32px] border border-white/5 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest w-8"></th>
                                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">계정 과목 (Account Name)</th>
                                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">트렌드 스파크라인</th>
                                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">최근 잔액 (Latest)</th>
                                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">YoY 변동률</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence mode="popLayout">
                                {isLoading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse border-b border-white/5">
                                            <td className="p-6"><div className="h-4 w-4 bg-white/5 rounded" /></td>
                                            <td className="p-6"><div className="h-4 w-32 bg-white/5 rounded" /></td>
                                            <td className="p-6"><div className="h-8 w-full bg-white/5 rounded" /></td>
                                            <td className="p-6"><div className="h-4 w-24 bg-white/5 rounded ml-auto" /></td>
                                            <td className="p-6"><div className="h-4 w-16 bg-white/5 rounded ml-auto" /></td>
                                        </tr>
                                    ))
                                ) : (
                                    filteredTrends.map((item, i) => {
                                        const years = Object.keys(item.yearly_totals).sort();
                                        const latestYear = years[years.length - 1];
                                        const latestVal = item.yearly_totals[latestYear];
                                        const latestYoY = item.yoy[latestYear] || 0;
                                        const isExpanded = expandedAccount === item.account;

                                        return (
                                            <React.Fragment key={item.account}>
                                                <motion.tr
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.03 }}
                                                    onClick={() => handleRowClick(item.account)}
                                                    className={`border-b border-white/5 transition-colors cursor-pointer select-none
                                                        ${isExpanded
                                                            ? 'bg-emerald-500/10 border-emerald-500/20'
                                                            : 'hover:bg-white/5 group'}`}
                                                >
                                                    <td className="pl-6 py-4">
                                                        <div className={`transition-transform duration-200 text-slate-500 ${isExpanded ? 'rotate-90 text-emerald-500' : ''}`}>
                                                            <ChevronRight size={14} />
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-1.5 h-1.5 rounded-full transition-all ${isExpanded ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-700 group-hover:bg-emerald-500'}`} />
                                                            <span className={`font-bold text-xs ${isExpanded ? 'text-emerald-400' : 'text-white'}`}>{item.account}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-6 w-32">
                                                        <div className="h-8 w-full opacity-50 group-hover:opacity-100 transition-opacity">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <AreaChart data={getChartData(item.yearly_totals)}>
                                                                    <Area type="monotone" dataKey="value"
                                                                        stroke={latestYoY >= 0 ? "#10b981" : "#f43f5e"}
                                                                        strokeWidth={1.5} fill="transparent" />
                                                                </AreaChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    </td>
                                                    <td className="p-6 text-right font-mono text-xs text-white">{formatCurrency(latestVal)}</td>
                                                    <td className="p-6 text-right">
                                                        <div className={`flex items-center justify-end gap-1 text-[10px] font-black ${latestYoY > 0 ? "text-emerald-500" : latestYoY < 0 ? "text-rose-500" : "text-slate-500"}`}>
                                                            {latestYoY > 0 ? <ArrowUpRight size={14} /> : latestYoY < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                                                            {formatPercent(latestYoY)}
                                                        </div>
                                                    </td>
                                                </motion.tr>

                                                {/* ── Drill-Down Detail Row ── */}
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.tr
                                                            key={`detail-${item.account}`}
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                        >
                                                            <td colSpan={5} className="bg-black/40 border-b border-emerald-500/20 px-8 py-6">
                                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                                    {/* Year-by-year table */}
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                            <Calendar size={10} /> 연도별 세부 내역
                                                                        </p>
                                                                        <div className="space-y-2">
                                                                            {years.map(year => {
                                                                                const val = item.yearly_totals[year];
                                                                                const yoy = item.yoy[year] || 0;
                                                                                const isLatest = year === latestYear;
                                                                                return (
                                                                                    <div key={year} className={`flex items-center justify-between px-4 py-2.5 rounded-xl ${isLatest ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5'}`}>
                                                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isLatest ? 'text-emerald-400' : 'text-slate-400'}`}>
                                                                                            {year} {isLatest && '← 최신'}
                                                                                        </span>
                                                                                        <div className="flex items-center gap-6">
                                                                                            <span className="font-mono text-xs text-white">{formatCurrency(val)}</span>
                                                                                            <span className={`text-[10px] font-black flex items-center gap-1 ${yoy > 0 ? 'text-emerald-400' : yoy < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                                                                                                {yoy > 0 ? <ArrowUpRight size={12} /> : yoy < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
                                                                                                {formatPercent(yoy)}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>

                                                                    {/* Bar chart */}
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-3">연도별 금액 비교</p>
                                                                        <div className="h-40">
                                                                            <ResponsiveContainer width="100%" height="100%">
                                                                                <BarChart data={getChartData(item.yearly_totals)} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                                                                                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
                                                                                    <YAxis hide />
                                                                                    <Tooltip
                                                                                        contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 11 }}
                                                                                        formatter={(val: any) => [formatCurrency(val), '금액']}
                                                                                        labelStyle={{ color: '#94a3b8', fontWeight: 700 }}
                                                                                    />
                                                                                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                                                                        {getChartData(item.yearly_totals).map((entry, idx) => (
                                                                                            <Cell key={idx}
                                                                                                fill={entry.year === latestYear ? '#10b981' : '#1e293b'}
                                                                                            />
                                                                                        ))}
                                                                                    </Bar>
                                                                                </BarChart>
                                                                            </ResponsiveContainer>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </motion.tr>
                                                    )}
                                                </AnimatePresence>
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FinancialTrendPanel;
