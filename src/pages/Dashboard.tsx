import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { useAudit } from '../context/AuditContext';
import {
    ShieldAlert,
    BrainCircuit,
    Globe, TrendingUp, Terminal, Clock, ArrowUpRight
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Treemap, Tooltip as RechartsTooltip } from 'recharts';

interface DashboardSummary {
    total_risks: number;
    ai_signals: number;
    critical_coverage: string;
    open_findings: number;
    risk_exposure_score: number;
    trends: { day: string; value: number }[];
}

interface SystemEvent {
    id: string;
    timestamp: string;
    event_type: string;
    description: string;
    related_entity_id?: number | null;
}

interface RealAuditProject {
    id: string;
    title: string;
    status: string;
    progress_pct: number;
    start_date: string;
    end_date: string;
    lead_auditor: string;
    findings_count: number;
}

export default function Dashboard() {
    const { activeProject, setActiveProject } = useApp();
    const navigate = useNavigate();
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [events, setEvents] = useState<SystemEvent[]>([]);
    const [projects, setProjects] = useState<RealAuditProject[]>([]);
    const [universe, setUniverse] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { hydrateProject } = useAudit();

    const handleNewAudit = () => {
        navigate('/portfolio');
    };

    const handleLoadAudit = async (projectId: string) => {
        setLoading(true);
        const success = await hydrateProject(projectId);
        if (success) {
            setActiveProject(projectId);
            navigate('/ai-discovery');
        } else {
            alert("이전 세션을 불러오는데 실패했습니다.");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();

        // [LISTEN] Real-time topology sync when findings are accepted elsewhere
        const handleTopologySync = () => {
            console.log(">>> [Dashboard] Topology sync triggered by finding update.");
            fetchData();
        };

        window.addEventListener('topology-updated', handleTopologySync);
        return () => window.removeEventListener('topology-updated', handleTopologySync);
    }, [activeProject]);

    const fetchData = async () => {
        try {
            console.log(">>> [Dashboard] Fetching Command Center Data. Context:", activeProject);
            const [sum, evts, projs] = await Promise.all([
                invoke('get_dashboard_summary', { projectId: activeProject }),
                invoke('get_system_events', { projectId: activeProject }),
                invoke('get_audit_projects')
            ]) as [DashboardSummary, SystemEvent[], RealAuditProject[]];

            setSummary(sum);
            setEvents(evts);
            setProjects(projs);

            // [IMPROVED] Calculate weighted risk score for each project
            const calculateRiskScore = async (projectId: string): Promise<number> => {
                try {
                    const issues: any[] = await invoke('get_audit_issues', { projectType: projectId });
                    let score = 0;
                    issues.forEach(issue => {
                        switch (issue.severity) {
                            case 'High': score += 3; break;
                            case 'Medium': score += 2; break;
                            case 'Low': score += 1; break;
                        }
                    });
                    return score;
                } catch {
                    return 0;
                }
            };

            // Calculate risk scores for all projects
            const projectsWithScores = await Promise.all(
                projs.map(async (p: any) => ({
                    ...p,
                    weightedRiskScore: await calculateRiskScore(p.id)
                }))
            );

            const getRiskColor = (score: number) => {
                if (score >= 15) return '#FF4444'; // Bright Red (Critical)
                if (score >= 8) return '#FF8C00';  // Bright Orange (High)
                if (score >= 3) return '#FFD700';  // Gold (Medium)
                if (score > 0) return '#32CD32';   // Lime Green (Low)
                return '#4169E1';                  // Royal Blue (Clean)
            };

            const treemapNodes = projectsWithScores.map((p: any) => {
                const score = p.weightedRiskScore || 0;
                return {
                    name: p.title || "Unknown Department",
                    size: score * 10 + 20, // Scale by risk score
                    findingsCount: p.findings_count || 0,
                    riskScore: score,
                    riskLevel: score >= 15 ? 'Critical' : score >= 8 ? 'High' : score >= 3 ? 'Medium' : score > 0 ? 'Low' : 'Clean',
                    fill: getRiskColor(score)
                };
            });
            setUniverse(treemapNodes);
        } catch (err) {
            console.error("Dashboard Load Error:", err);
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await fetchData();
            setLoading(false);
        };
        init();
    }, [activeProject]);

    const handleAuditChange = async (id: string | null) => {
        setActiveProject(id);
    };


    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-[#0B1221]">
            <div className="flex flex-col items-center gap-6">
                <div className="relative">
                    <BrainCircuit className="w-16 h-16 text-blue-500 animate-pulse" />
                    <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-ping" />
                </div>
                <div className="space-y-2 text-center">
                    <p className="text-white font-black uppercase tracking-[0.3em] text-sm italic">Synchronizing Digital Fortress</p>
                    <p className="text-blue-400/60 text-[10px] font-bold animate-pulse">Consulting Gemini 3.0 Intelligence Core...</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0B1221] text-slate-300 font-sans p-6 overflow-x-hidden">
            <div className="max-w-[1600px] mx-auto space-y-8">

                {/* Header Section */}
                <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-white/5 pb-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-lg shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                                <ShieldAlert className="text-white w-6 h-6" />
                            </div>
                            <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-2">
                                AI COMMAND CENTER <span className="text-blue-500 text-sm font-black border border-blue-500/30 px-2 py-0.5 rounded italic">V4.5 PRO</span>
                            </h1>
                        </div>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Enterprise-Wide Strategic Risk Multi-Layer Grid
                        </p>
                    </div>
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-2 rounded-2xl flex items-center gap-3">
                            <Globe className="text-blue-400 w-4 h-4 ml-2" />
                            <select
                                value={activeProject || ''}
                                onChange={(e) => handleAuditChange(e.target.value || null)}
                                className="bg-transparent text-sm font-black text-white outline-none pr-8 cursor-pointer appearance-none uppercase tracking-tight"
                            >
                                <option value="" className="bg-slate-900 font-black">Global Consolidated View</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id} className="bg-slate-900 font-black">{p.title}</option>
                                ))}
                            </select>
                        </div>
                        <button onClick={handleNewAudit} className="px-6 py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-blue-500 transition-all shadow-[0_10px_30px_rgba(37,99,235,0.4)] active:scale-95 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4" />
                            새 감사 시작 (New Audit)
                        </button>
                    </div>
                </header>

                {/* Zone A: The Pulse (KPIs) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: "Total Risk Exposure", value: summary?.total_risks || 0, sub: (summary?.total_risks || 0) > 0 ? "+5.2%" : "0.0%", trend: "up", data: summary?.trends || [], color: "text-rose-500", areaColor: "#f43f5e", path: "/ai-discovery" },
                        { label: "AI Anomaly Signals", value: summary?.ai_signals || 0, sub: (summary?.ai_signals || 0) > 0 ? "Real-time Detect" : "No Signals", trend: "up", data: summary?.trends?.map(t => ({ ...t, value: t.value * 0.5 })) || [], color: "text-amber-500", areaColor: "#f59e0b", path: "/ai-discovery" },
                        { label: "Critical Coverage", value: summary?.critical_coverage || "0%", sub: (summary?.total_risks || 0) > 0 ? "High Risk Focused" : "Not Started", trend: "stable", data: summary?.trends || [], color: "text-blue-400", areaColor: "#3b82f6", path: "/universe" },
                        { label: "Global Open findings", value: summary?.open_findings || 0, sub: (summary?.open_findings || 0) > 0 ? "Pending Action" : "Clean State", trend: "down", data: summary?.trends?.map(t => ({ ...t, value: t.value * 1.2 })) || [], color: "text-emerald-400", areaColor: "#10b981", path: "/remediation" },
                    ].map((m, i) => (
                        <div
                            key={i}
                            onClick={() => navigate(m.path, { state: { projectFilter: activeProject, source: "dashboard_card", metric: m.label } })}
                            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 relative overflow-hidden group hover:border-white/30 hover:shadow-[0_20px_40px_rgba(37,99,235,0.15)] hover:-translate-y-1 transition-all duration-500 cursor-pointer"
                        >
                            {/* Background Sparkline */}
                            <div className="absolute inset-0 z-0 opacity-20 group-hover:opacity-40 transition-all pointer-events-none">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={m.data}>
                                        <Area type="monotone" dataKey="value" stroke={m.areaColor} fill={m.areaColor} strokeWidth={3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
                                <div className="flex justify-between items-start">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{m.label}</span>
                                    <div className={`p-1.5 rounded-lg bg-white/5 border border-white/10 ${m.color}`}>
                                        <TrendingUp size={14} />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <h2 className="text-4xl font-black text-white tracking-tighter group-hover:scale-105 transition-transform origin-left">{m.value}</h2>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded bg-white/5 border border-white/10 ${m.color}`}>
                                            {m.sub}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Active Pulse</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Zone: Recent Audit History - 카드 기반 UI */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-6 bg-blue-500 rounded-full" />
                            <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Recent Audit Continuity</h3>
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-60">Restore previous state instantly</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {projects.slice(0, 4).map((p: any) => (
                            <div
                                key={p.id}
                                onClick={() => handleLoadAudit(p.id)}
                                className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-500 cursor-pointer relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-blue-600/20 transition-all" />

                                <div className="relative z-10 flex flex-col h-full gap-4">
                                    <div className="flex justify-between items-start">
                                        <div className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                                            {p.status}
                                        </div>
                                        <ArrowUpRight className="text-slate-600 group-hover:text-blue-400 w-5 h-5 transition-colors" />
                                    </div>

                                    <div className="mt-2">
                                        <h4 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors line-clamp-1">{p.title}</h4>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-1">ID: {p.id}</p>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">지적사항</p>
                                            <p className="text-lg font-black text-rose-500">{p.findings_count || 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">진행률</p>
                                            <p className="text-lg font-black text-blue-400">{p.progress_pct}%</p>
                                        </div>
                                    </div>

                                    <div className="mt-2 text-[9px] font-black text-slate-700 uppercase tracking-tighter">
                                        시작일: {p.start_date}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-8 items-stretch">
                    {/* Zone B: 부서별 리스크 현황 (Heatmap) */}
                    <div className="col-span-12 lg:col-span-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 space-y-6 relative overflow-hidden">
                        <div className="flex justify-between items-center">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-white tracking-tight uppercase">부서별 리스크 현황 (Heatmap)</h3>
                                <p className="text-xs text-slate-500 font-bold tracking-widest uppercase opacity-60">Visual Risk Intensity by Finding Volume</p>
                            </div>
                            <div className="flex gap-2">
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-rose-500 uppercase bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" /> Critical Area
                                </span>
                            </div>
                        </div>

                        <div className="h-[400px] w-full rounded-3xl overflow-hidden border border-white/5 bg-gradient-to-br from-slate-900/60 to-slate-800/40">
                            <ResponsiveContainer width="100%" height="100%">
                                <Treemap
                                    data={universe || []}
                                    dataKey="size"
                                    aspectRatio={4 / 3}
                                    stroke="#0f172a"
                                    fill="#8884d8"
                                    isAnimationActive={false}
                                    animationDuration={0}
                                    content={(props: any) => {
                                        const { x, y, width, height, name, fill, findingsCount, riskScore } = props;
                                        if (width < 50 || height < 30) return <></>;

                                        return (
                                            <g>
                                                <defs>
                                                    <linearGradient id={`grad-${name}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                                        <stop offset="0%" stopColor={fill} stopOpacity="0.9" />
                                                        <stop offset="100%" stopColor={fill} stopOpacity="0.6" />
                                                    </linearGradient>
                                                </defs>
                                                <rect
                                                    x={x}
                                                    y={y}
                                                    width={width}
                                                    height={height}
                                                    fill={`url(#grad-${name})`}
                                                    stroke="#0f172a"
                                                    strokeWidth={2}
                                                    rx={8}
                                                />
                                                {width > 80 && height > 50 && (
                                                    <>
                                                        <text
                                                            x={x + width / 2}
                                                            y={y + height / 2 - 12}
                                                            textAnchor="middle"
                                                            fill="white"
                                                            fontSize="13"
                                                            fontWeight="900"
                                                            className="uppercase tracking-wider"
                                                            style={{
                                                                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                                                                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))'
                                                            }}
                                                        >
                                                            {name.length > 15 ? name.substring(0, 15) + '...' : name}
                                                        </text>
                                                        <text
                                                            x={x + width / 2}
                                                            y={y + height / 2 + 6}
                                                            textAnchor="middle"
                                                            fill="white"
                                                            fontSize="12"
                                                            fontWeight="800"
                                                            style={{
                                                                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                                                                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))'
                                                            }}
                                                        >
                                                            위험도: {riskScore || 0}
                                                        </text>
                                                        <text
                                                            x={x + width / 2}
                                                            y={y + height / 2 + 22}
                                                            textAnchor="middle"
                                                            fill="white"
                                                            fontSize="11"
                                                            fontWeight="700"
                                                            style={{
                                                                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                                                                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))'
                                                            }}
                                                        >
                                                            {findingsCount || 0}건
                                                        </text>
                                                    </>
                                                )}
                                            </g>
                                        );
                                    }}
                                >
                                    <RechartsTooltip
                                        isAnimationActive={false} // CRITICAL: Stop Flicker
                                        cursor={false}            // CRITICAL: Prevent Hover Conflicts
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-slate-900 border-2 border-slate-700/50 p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
                                                        <p className="text-xs font-black text-white uppercase tracking-widest mb-1">{data.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">STATUS: <span style={{ color: data.fill }}>{data.riskLevel}</span></p>
                                                        <p className="text-[10px] font-bold text-emerald-400 mt-2">FINDINGS detected: {data.findingsCount}</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                </Treemap>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Zone C: AI Feed */}
                    <div className="col-span-12 lg:col-span-4 bg-slate-900 border-border-white/10 rounded-[40px] flex flex-col h-full shadow-2xl relative overflow-hidden min-h-[500px]">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                <Terminal size={16} className="text-rose-500" /> Real-time Risk Alert
                            </h3>
                            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10">
                            {events.map((evt) => (
                                <div key={evt.id} className="space-y-2 group">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black text-emerald-500/60 uppercase tracking-tighter bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 font-mono italic">{evt.timestamp}</span>
                                        <Clock size={12} className="text-slate-700 group-hover:text-emerald-500 transition-colors" />
                                    </div>
                                    <p className="text-xs font-medium text-slate-400 leading-relaxed border-l-2 border-white/5 pl-4 group-hover:border-emerald-500/50 transition-all font-mono">
                                        <span className="text-emerald-500 mr-2">🤖</span>
                                        {evt.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Zone D: Audit Execution Status */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 space-y-8">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Active Audit Operations</h3>
                            <p className="text-xs text-slate-500 font-bold tracking-widest uppercase opacity-60">Real-time Project Execution Visibility</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest pl-4">Audit Assignment</th>
                                    <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Current Phase</th>
                                    <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Completion Index</th>
                                    <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest pr-4">Lead Auditor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {projects.map((proj) => (
                                    <tr key={proj.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => navigate(`/data-upload/${proj.id}`)}>
                                        <td className="py-6 pl-4">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-black text-white group-hover:text-blue-400 transition-colors">{proj.title}</span>
                                            </div>
                                        </td>
                                        <td className="py-6 px-4">
                                            <span className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border border-white/10 uppercase tracking-tighter ${proj.status === 'Fieldwork' ? 'text-blue-400 bg-blue-400/10' :
                                                proj.status === 'Reporting' ? 'text-purple-400 bg-purple-400/10' :
                                                    proj.status === 'Planning' ? 'text-amber-500 bg-amber-500/10' : 'text-slate-400'
                                                }`}>
                                                {proj.status}
                                            </span>
                                        </td>
                                        <td className="py-6 px-4 min-w-[200px]">
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-[9px] font-black text-slate-500">
                                                    <span>INDEX</span>
                                                    <span className="text-white">{proj.progress_pct}%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-1000 ease-out rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]`}
                                                        style={{ width: `${proj.progress_pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-6 pr-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[10px] font-black text-white uppercase">
                                                    {proj.lead_auditor.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <span className="text-xs font-bold text-slate-400">{proj.lead_auditor}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            <div className="flex justify-center pb-8">
                <div className="flex items-center gap-6 px-6 py-3 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-white/10 rounded-2xl backdrop-blur-xl">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Optimization Mode</span>
                        <span className="text-xs font-black text-emerald-400">Hybrid (Local+AI)</span>
                    </div>
                    <div className="w-px h-4 bg-white/10" />
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cost Savings</span>
                        <span className="text-xs font-black text-blue-400">$0.0000</span>
                    </div>
                    <div className="w-px h-4 bg-white/10" />
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Batch Size</span>
                        <span className="text-xs font-black text-white">2000 rows</span>
                    </div>
                </div>
            </div>

            {/* Global Background Glow */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10">
                <div className="absolute top-[10%] left-[10%] w-[400px] h-[400px] bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[20%] right-[5%] w-[300px] h-[300px] bg-rose-600/5 blur-[100px] rounded-full" />
                <div className="absolute top-[40%] right-[20%] w-[500px] h-[500px] bg-indigo-600/5 blur-[150px] rounded-full" />
            </div>
        </div>
    );
}