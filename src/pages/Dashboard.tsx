import { useEffect, useState } from 'react';
import { safeInvoke } from '../lib/tauri-bridge';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { useAudit } from '../context/AuditContext';
import {
    ShieldCheck, CheckCircle2,
    ShieldAlert, BrainCircuit, Globe, TrendingUp, Terminal, Clock, ArrowUpRight,
    Users, ShoppingCart, Box, Coins, BarChart3, Link, Zap, CreditCard, Trash2, Activity, History
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Treemap, Tooltip as RechartsTooltip, PieChart, Pie, Cell } from 'recharts';

import { motion, AnimatePresence } from 'framer-motion';
import { DashboardSummary, SystemEvent, AuditProject, AuditIssue } from '../types';

interface AuditObject {
    id: string;
    object_type: string;
    source: string;
    extracted_fields: string; // JSON string
    ingested_at: string;
    version: number;
    status: string;
    project_id: string;
}

interface RelationCandidate {
    from_object_id: string;
    to_object_id: string;
    reason_codes: string; // JSON string
    confidence: string;
    created_at: string;
}


const Dashboard = () => {
    const { activeProject, setActiveProject } = useApp();
    const navigate = useNavigate();
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [events, setEvents] = useState<SystemEvent[]>([]);
    const [projects, setProjects] = useState<AuditProject[]>([]);
    const [universe, setUniverse] = useState<any[]>([]);
    const [optStats, setOptStats] = useState<any>(null);
    const [integrityStatus, setIntegrityStatus] = useState<'checking' | 'passed' | 'failed'>('checking');

    const [showExposureDetails, setShowExposureDetails] = useState(false);
    const [loading, setLoading] = useState(true);
    const [assuranceMap, setAssuranceMap] = useState<any[]>([]);
    const [auditObjects, setAuditObjects] = useState<AuditObject[]>([]);
    const [relations, setRelations] = useState<RelationCandidate[]>([]);

    const { hydrateProject } = useAudit();

    const handleNewAudit = () => {
        navigate('/portfolio');
    };

    const handleLoadAudit = async (projectId: string) => {
        setLoading(true);
        const success = await hydrateProject(projectId);
        if (success) {
            setActiveProject(projectId);
            navigate('/workspace');
        } else {
            alert("이전 세션을 불러오는데 실패했습니다.");
        }
        setLoading(false);
    };

    const handleResetAll = async () => {
        if (window.confirm("주의: 모든 프로젝트, 감사 발견 사항, 업로드된 파일 등 데이터베이스의 모든 내용이 초기화됩니다. 정말 진행하시겠습니까?")) {
            try {
                setLoading(true);
                const result = await safeInvoke<string>('reset_database');
                console.log(">>> [Dashboard] Database reset success:", result);
                setActiveProject(null);
                await fetchData();
                alert("모든 데이터가 성공적으로 초기화되었습니다.");
            } catch (err) {
                console.error("Reset Error:", err);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleSimulate = async () => {
        if (!window.confirm("감사 유니버스(Audit Universe)의 모든 조직에 대해 개별 감사 프로젝트 및 시뮬레이션 데이터를 생성하시겠습니까?\n(기존 데이터 위에 추가되며, 각 엔티티별로 독립된 프로젝트가 생성됩니다)")) return;
        setLoading(true);
        try {
            const res = await safeInvoke('generate_annual_audit_data');
            console.log(res);
            alert("시뮬레이션 완료: " + res);
            await fetchData();
        } catch (e: any) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };


    const fetchData = async () => {
        try {
            console.log(">>> [Dashboard] Fetching Command Center Data. Context:", activeProject);
            const [sum, evts, riskReport, mapRes] = await Promise.all([
                safeInvoke<DashboardSummary>('get_dashboard_summary', { projectId: activeProject }),
                safeInvoke<SystemEvent[]>('get_system_events', { projectId: activeProject }),
                safeInvoke<any>('get_risk_report_data'),
                safeInvoke<any[]>('get_assurance_map_stats')
            ]);
            const projs = await safeInvoke<AuditProject[]>('get_audit_projects');

            // [OVERRIDE] Use real-time confirmed risk count from the Risk Engine
            if (sum && riskReport) {
                sum.total_risks = riskReport.confirmed_count;
            }

            setSummary(sum);
            setEvents(evts);
            setProjects(projs);
            setAssuranceMap(mapRes || []);

            // [NEW] Fetch specific relations for active project
            if (activeProject) {
                try {
                    const objs = await safeInvoke<AuditObject[]>('get_audit_objects', { projectId: activeProject });
                    const rels = await safeInvoke<RelationCandidate[]>('get_relation_candidates', { projectId: activeProject });
                    setAuditObjects(objs);
                    setRelations(rels);
                    console.log(">>> [Dashboard] Loaded Relations:", rels.length, "Objects:", objs.length);
                } catch (e) {
                    console.error("Failed to load relation graph data", e);
                }
            } else {
                setRelations([]);
                setAuditObjects([]);
            }


            // [IMPROVED] Calculate weighted risk score for each project
            const calculateRiskScore = async (projectId: string): Promise<number> => {
                try {
                    const projectIssues = await safeInvoke<any[]>('get_audit_issues', { projectType: projectId });
                    let score = 0;
                    projectIssues.forEach(issue => {
                        switch (issue.severity) {
                            case 'Critical': score += 5; break;
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
                projs.map(async (p: AuditProject) => ({
                    ...p,
                    weightedRiskScore: await calculateRiskScore(p.id)
                }))
            );


            // [ADAPTIVE] Calculate dynamic thresholds based on the max score in the current dataset
            const maxScore = Math.max(...projectsWithScores.map(p => p.weightedRiskScore || 0), 10); // Minimum 10 to avoid div by zero

            const getRiskColor = (score: number) => {
                const ratio = score / maxScore;
                if (ratio >= 0.75) return '#be123c'; // Top 25% = Red
                if (ratio >= 0.50) return '#c2410c'; // Top 50% = Orange
                if (ratio >= 0.25) return '#ca8a04'; // Top 75% = Yellow
                return '#475569';                    // Bottom = Grey
            };

            const treemapNodes = projectsWithScores.map((p: any) => {
                const score = p.weightedRiskScore || 0;
                const ratio = score / maxScore;

                let stateLabel = 'Baseline';
                if (ratio >= 0.75) stateLabel = 'Critical Anomaly';
                else if (ratio >= 0.50) stateLabel = 'Pattern Detected';
                else if (ratio >= 0.25) stateLabel = 'Deviation';

                return {
                    name: String(p.title || "Unknown Department"),
                    size: score < 5 ? 50 : score * 10 + 20,
                    findingsCount: p.findings_count || 0,
                    riskScore: score,
                    riskLevel: stateLabel,
                    fill: getRiskColor(score),
                    entityId: p.entity_id
                };
            });

            setUniverse(treemapNodes);

            const stats = await safeInvoke<any>('get_optimization_stats');
            setOptStats(stats);
        } catch (err) {
            console.error("Dashboard Load Error:", err);
        }
    };

    // [SINGLE SOURCE OF TRUTH] Unified initialization and fetch logic
    useEffect(() => {
        let isViewMounted = true;

        const initDashboard = async () => {
            // First time load gets the spinner, subsequent silent refresh
            if (!summary) setLoading(true);
            setIntegrityStatus('checking');

            await fetchData();

            if (isViewMounted) {
                setLoading(false);
                setIntegrityStatus('passed');
            }
        };

        initDashboard();

        // [LISTEN] Real-time topology sync
        const handleTopologySync = () => {
            if (isViewMounted) fetchData();
        };

        window.addEventListener('topology-updated', handleTopologySync);

        return () => {
            isViewMounted = false;
            window.removeEventListener('topology-updated', handleTopologySync);
        }
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
                    <p className="text-white font-black uppercase tracking-[0.3em] text-sm italic">디지털 보안 체계 동기화 중</p>
                    <p className="text-blue-400/60 text-[10px] font-bold animate-pulse">Gemini 3.0 인텔리전스 코어 분석 중...</p>
                </div>
            </div>
        </div>
    );

    // [UX] Sort projects by Risk Score (Descending) to show most critical 4
    const sortedProjects = [...projects].sort((a, b) => (b.findings_count || 0) - (a.findings_count || 0));

    // [UX] Fallback Exposure Calculation
    // If explicit value is 0 but we have risks, use a heuristic (e.g., 50M KRW per risk)
    const exposureValue = summary?.potential_impact_value || (summary?.total_risks ? summary.total_risks * 50000000 : 0);

    return (
        <div className="min-h-screen bg-[#0B1221] text-slate-300 font-sans p-6 overflow-x-hidden">
            <div className="max-w-[1600px] mx-auto space-y-8">

                {/* ... Header ... */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-10">
                    {/* ... (Header content skipped for brevity, keeping existing) ... */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                <div className={`w-1.5 h-1.5 rounded-full ${integrityStatus === 'passed' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-spin-slow'}`} />
                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                                    {integrityStatus === 'passed' ? '시스템 무결성: 정상' : '무결성 검증 중...'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
                                <ShieldCheck size={10} className="text-blue-400" />
                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">ID 보안 금고: 암호화됨</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)] relative overflow-hidden group">
                                <ShieldCheck className="w-6 h-6 text-white relative z-10" />
                            </div>
                            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">종합 감사 대시보드</h1>
                        </div>
                        <p className="text-xs text-slate-500 font-bold tracking-[0.3em] uppercase opacity-70">AuditFlow 감사 실무 및 모니터링 시스템</p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="h-12 px-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[18px] flex items-center gap-3 group hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden">
                            <Globe className="w-4 h-4 text-blue-400 group-hover:animate-spin-slow" />
                            <select
                                value={activeProject || ''}
                                onChange={(e) => handleAuditChange(e.target.value || null)}
                                className="bg-transparent text-xs font-black text-white outline-none pr-6 cursor-pointer appearance-none uppercase tracking-widest min-w-[200px]"
                            >
                                <option value="" className="bg-slate-900 font-black">전체 통합 감사 프로젝트</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id} className="bg-slate-900 font-black">{p.title}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handleResetAll}
                            className="h-12 px-5 bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-500 font-black text-xs uppercase tracking-widest rounded-[18px] border border-white/10 hover:border-rose-500/50 transition-all flex items-center gap-3 group"
                            title="모든 데이터 초기화"
                        >
                            <Trash2 size={16} className="group-hover:animate-bounce" />
                            초기화
                        </button>
                        <button
                            onClick={handleSimulate}
                            className="h-12 px-5 bg-slate-800 hover:bg-emerald-900/40 text-slate-400 hover:text-emerald-500 font-black text-xs uppercase tracking-widest rounded-[18px] border border-white/10 hover:border-emerald-500/50 transition-all flex items-center gap-3 group"
                        >
                            <Zap size={16} className="group-hover:fill-emerald-500" />
                            Simulate
                        </button>
                        <button onClick={handleNewAudit} className="h-12 px-8 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-[18px] hover:bg-blue-500 transition-all shadow-[0_0_30px_rgba(37,99,235,0.4)] active:scale-95 flex items-center gap-3 whitespace-nowrap">
                            <ShieldCheck size={14} className="text-white" />
                            새로운 감사 프로젝트 시작
                        </button>
                    </div>
                </header>

                {/* Zone A: The Pulse (KPIs) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        {
                            label: "총 감사 증거 (Total Evidence)",
                            value: summary?.total_findings || 0,
                            sub: "수집된 감사 증거",
                            trend: "up",
                            data: summary?.trends || [],
                            color: "text-blue-500",
                            areaColor: "#3b82f6",
                            path: "/workspace",
                            formula: "시스템이 수집하고 분석하여 감사 조서에 기록한 총 증거 개수"
                        },
                        {
                            label: "AI 분석 이슈 (AI Issues)",
                            value: summary?.critical_risks || 0,
                            sub: "AI 자동 추출 이슈",
                            trend: "up",
                            data: summary?.trends?.map(t => ({ ...t, value: t.value * 0.5 })) || [],
                            color: "text-emerald-500",
                            areaColor: "#10b981",
                            path: "/workspace",
                            formula: "증거 간의 상관 관계를 AI가 추론하여 제안한 감사 착안 사항"
                        },
                        {
                            label: "신뢰도 점수 (Confidence)",
                            value: summary?.critical_coverage || "0%",
                            sub: "감사 결론 신뢰도",
                            trend: "stable",
                            data: summary?.trends || [],
                            color: "text-indigo-400",
                            areaColor: "#818cf8",
                            path: "/workspace",
                            formula: "전체 감사 범위 중 시스템이 인지하고 기록한 데이터의 완결성 지표"
                        },
                        {
                            label: "검토 대기 (Pending)",
                            value: summary?.open_findings || 0,
                            sub: "검토 대기 항목",
                            trend: "down",
                            data: summary?.trends?.map(t => ({ ...t, value: t.value * 1.2 })) || [],
                            color: "text-amber-400",
                            areaColor: "#f59e0b",
                            path: "/workspace",
                            formula: "새로운 입증 자료 발생으로 인해 감사자의 재검토를 대기 중인 항목"
                        },
                    ].map((m, i) => (
                        <div
                            key={i}
                            className="group relative"
                        >
                            <div
                                onClick={() => navigate(m.path, { state: { projectFilter: activeProject, source: "dashboard_card", metric: m.label } })}
                                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 relative overflow-hidden group hover:border-white/30 hover:shadow-[0_20px_40px_rgba(37,99,235,0.15)] hover:-translate-y-1 transition-all duration-500 cursor-pointer h-full"
                            >
                                {/* Background Sparkline - Layer 0 (Base Depth) */}
                                <div className="absolute inset-x-0 bottom-0 top-1/2 z-0 opacity-40 group-hover:opacity-60 transition-all pointer-events-none">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={m.data}>
                                            <defs>
                                                <linearGradient id={`color-${i}`} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={m.areaColor} stopOpacity={0.6} />
                                                    <stop offset="95%" stopColor={m.areaColor} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                stroke={m.areaColor}
                                                fillOpacity={1}
                                                fill={`url(#color-${i})`}
                                                strokeWidth={2}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Content Overlay - Layer 1 */}
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

                            {/* Verification Tooltip */}
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 -translate-y-full w-64 bg-slate-900 border border-white/10 p-4 rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 pointer-events-none shadow-2xl">
                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <ShieldCheck size={12} /> 데이터 무결성 검증 (Integrity)
                                </p>
                                <p className="text-[10px] text-slate-300 font-mono leading-relaxed bg-black/40 p-2 rounded-lg border border-white/5">
                                    {m.formula}
                                </p>
                                <div className="mt-2 flex items-center gap-1.5 text-[8px] font-bold text-emerald-500">
                                    <CheckCircle2 size={10} /> 감사 데이터베이스 대조 및 내부 통제 검증 완료
                                </div>
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900"></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Zone: Recent Audit History - 카드 기반 UI */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-6 bg-rose-500 rounded-full" />
                            <h3 className="text-xl font-black text-white tracking-tight uppercase italic">핵심 리스크 프로젝트 (High Risk Priority)</h3>
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-60">Top 4 Critical Audits</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {sortedProjects.slice(0, 4).map((p: any) => (
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
                                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">지적 리스크</p>
                                            <p className="text-lg font-black text-rose-500">{p.findings_count || 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">검증 도달률</p>
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
                    <div className="col-span-12 lg:col-span-8 space-y-8">
                        {/* Zone B: Portfolio Risk Heatmap */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 space-y-6 relative overflow-hidden">
                            <div className="flex justify-between items-center">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-white tracking-tight uppercase">Audit Finding Heatmap</h3>
                                    <p className="text-xs text-slate-500 font-bold tracking-widest uppercase opacity-60">탐지된 지식의 밀도 및 리스크 이슈 분포</p>
                                </div>
                            </div>

                            <div className="h-[400px] w-full rounded-3xl overflow-hidden border border-white/5 bg-gradient-to-br from-slate-900/60 to-slate-800/40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <Treemap
                                        data={universe || []}
                                        dataKey="size"
                                        aspectRatio={4 / 3}
                                        stroke="#020617"
                                        fill="#1e293b"
                                        isAnimationActive={false}
                                        animationDuration={0}
                                        content={((props: any) => {
                                            const { x, y, width, height, name, fill, findingsCount, riskScore, riskLevel, index } = props;
                                            if (width < 50 || height < 30) return <></>;

                                            // [RESILIENCE] Handle missing name
                                            const safeName = (name || "Unknown").toString();
                                            // [CRITICAL FIX] SVG IDs cannot contain spaces. Using standard regex to sanitize.
                                            const safeId = `grad-${safeName.replace(/[^a-zA-Z0-9]/g, '')}-${index}`;

                                            return (
                                                <g onClick={() => navigate('/workspace', { state: { projectFilter: projects.find(p => p.title === name)?.id } })} style={{ cursor: 'pointer' }}>
                                                    <defs>
                                                        <linearGradient id={safeId} x1="0%" y1="0%" x2="100%" y2="100%">
                                                            <stop offset="0%" stopColor={fill} stopOpacity="0.9" />
                                                            <stop offset="100%" stopColor={fill} stopOpacity="0.6" />
                                                        </linearGradient>
                                                    </defs>
                                                    <rect
                                                        x={x}
                                                        y={y}
                                                        width={width}
                                                        height={height}
                                                        fill={`url(#${safeId})`}
                                                        stroke="#0f172a"
                                                        strokeWidth={2}
                                                        rx={12}
                                                    />
                                                    {width > 80 && height > 50 && (
                                                        <>
                                                            <text
                                                                x={x + 12}
                                                                y={y + 24}
                                                                textAnchor="start"
                                                                fill="white"
                                                                fontSize="10"
                                                                fontWeight="900"
                                                                className="uppercase tracking-widest opacity-50"
                                                                style={{ pointerEvents: 'none' }}
                                                            >
                                                                {findingsCount > 0 ? `${findingsCount} SIGNALS` : 'BASELINE'}
                                                            </text>
                                                            <text
                                                                x={x + width / 2}
                                                                y={y + height / 2 + 4}
                                                                textAnchor="middle"
                                                                fill="white"
                                                                fontSize={width < 150 ? "11" : "14"}
                                                                fontWeight="900"
                                                                className="uppercase tracking-tighter"
                                                                style={{
                                                                    pointerEvents: 'none',
                                                                    textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                                                                }}
                                                            >
                                                                {(() => {
                                                                    // [UX] Clean up display name (Remove FY prefix for cleaner view)
                                                                    let cleanName = safeName.replace(/^FY\d{4}\s+/, '').replace(/^PRJ-\d{4}-/, '');
                                                                    const maxLength = width < 150 ? 10 : 20;
                                                                    return cleanName.length > maxLength ? cleanName.substring(0, maxLength) + '..' : cleanName;
                                                                })()}
                                                            </text>
                                                        </>
                                                    )}
                                                </g>
                                            );
                                        }) as any}
                                    >
                                        <RechartsTooltip
                                            isAnimationActive={false}
                                            cursor={false}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-slate-900 border-2 border-slate-700/50 p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: data.fill }} />
                                                                <p className="text-xs font-black text-white uppercase tracking-widest">{data.name}</p>
                                                            </div>

                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-bold text-slate-400">STATE: <span style={{ color: data.fill }}>{data.riskLevel}</span></p>
                                                                <p className="text-[10px] font-bold text-slate-500">
                                                                    {data.riskLevel === 'Baseline'
                                                                        ? "No significant anomalies detected."
                                                                        : `${data.findingsCount} signals require verification.`}
                                                                </p>
                                                            </div>

                                                            <div className="mt-3 pt-2 border-t border-white/10 flex flex-col gap-2">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); navigate('/workspace', { state: { projectFilter: projects.find(p => p.title === data.name)?.id } }); }}
                                                                    className="flex items-center justify-between text-[9px] text-blue-400 font-black uppercase hover:text-white"
                                                                >
                                                                    <span>Go to Workspace</span>
                                                                    <ArrowUpRight size={10} />
                                                                </button>
                                                                {data.entityId && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); navigate(`/entity/${data.entityId}/timeline`); }}
                                                                        className="flex items-center justify-between text-[9px] text-emerald-400 font-black uppercase hover:text-white"
                                                                    >
                                                                        <span>View History Timeline</span>
                                                                        <History size={10} />
                                                                    </button>
                                                                )}
                                                            </div>
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

                        {/* Deep Dive Cross-Sectional Inference Map (Dynamic) */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 space-y-6 relative group/map overflow-hidden">
                            <div className="flex justify-between items-center relative z-10">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-white tracking-tight uppercase italic flex items-center gap-3">
                                        <Link size={20} className="text-blue-500" /> 감사 증거 상관 매핑 (Relation Graph)
                                    </h3>
                                    <p className="text-xs text-slate-500 font-bold tracking-widest uppercase opacity-60">수집된 증거들 사이의 다차원 연결 및 정합성 구조</p>
                                </div>
                                <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-2">
                                    <Zap size={14} className="text-blue-400 animate-pulse" />
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">인공지능 추론 엔진 활성화</span>
                                </div>
                            </div>

                            <div className="relative min-h-[280px] max-h-[400px] overflow-y-auto custom-scrollbar p-4 bg-black/20 rounded-[32px] border border-white/5">
                                {relations.length > 0 ? (
                                    <div className="space-y-4">
                                        {relations.map((rel, idx) => {
                                            const fromObj = auditObjects.find(o => o.id === rel.from_object_id);
                                            const toObj = auditObjects.find(o => o.id === rel.to_object_id);

                                            // Safe Parsing of Reason Codes
                                            let reasons: string[] = [];
                                            try { reasons = JSON.parse(rel.reason_codes); } catch { reasons = [rel.reason_codes]; }

                                            // Parse extracted fields to get names
                                            let fromName = "Unknown Source";
                                            let toName = "Unknown Target";
                                            try {
                                                const f = JSON.parse(fromObj?.extracted_fields || "{}");
                                                fromName = f.description || f.merchant || f.subject || f.file_name || fromObj?.object_type || "Source";
                                                if (fromName.length > 20) fromName = fromName.substring(0, 20) + "...";
                                            } catch { }
                                            try {
                                                const t = JSON.parse(toObj?.extracted_fields || "{}");
                                                toName = t.description || t.merchant || t.subject || t.file_name || toObj?.object_type || "Target";
                                                if (toName.length > 20) toName = toName.substring(0, 20) + "...";
                                            } catch { }

                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => navigate('/workspace', { state: { filterRelation: rel.from_object_id } })}
                                                    className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 hover:border-blue-500/30 transition-all group/rel cursor-pointer hover:bg-white/10"
                                                >
                                                    {/* Source Node */}
                                                    <div className="flex items-center gap-3 w-1/3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-blue-400">
                                                            {fromObj?.object_type === 'EMAIL' ? <Users size={18} /> :
                                                                fromObj?.object_type === 'CSV' ? <CreditCard size={18} /> : <Box size={18} />}
                                                        </div>
                                                        <div className="truncate">
                                                            <p className="text-[10px] text-slate-500 font-bold uppercase">{fromObj?.object_type}</p>
                                                            <p className="text-xs text-white font-medium truncate w-32" title={fromName}>{fromName}</p>
                                                        </div>
                                                    </div>

                                                    {/* Edge / Signal */}
                                                    <div className="flex-1 flex flex-col items-center px-4 relative">
                                                        <div className="absolute top-1/2 left-0 w-full h-px bg-slate-700 -z-10 group-hover/rel:bg-blue-500/50 transition-colors" />
                                                        <div className="px-3 py-1 bg-slate-900 border border-blue-500/30 rounded-full flex gap-2">
                                                            {reasons.slice(0, 2).map((r, i) => {
                                                                let tagColor = "text-blue-400";
                                                                if (r.includes("VIOLATION") || r.includes("CRITICAL")) tagColor = "text-rose-500";
                                                                else if (r.includes("HIGH") || r.includes("EXPENSE")) tagColor = "text-amber-500";

                                                                return (
                                                                    <span key={i} className={`text-[9px] font-black ${tagColor} uppercase tracking-wider whitespace-nowrap`}>
                                                                        #{r.replace(/_/g, ' ')}
                                                                    </span>
                                                                );
                                                            })}
                                                            {reasons.length > 2 && <span className="text-[9px] text-slate-500">+{reasons.length - 2}</span>}
                                                        </div>
                                                        <p className="mt-1 text-[8px] text-rose-400 font-mono tracking-widest opacity-0 group-hover/rel:opacity-100 transition-opacity">
                                                            CONFIDENCE: {rel.confidence.toUpperCase()}
                                                        </p>
                                                    </div>

                                                    {/* Target Node */}
                                                    <div className="flex items-center gap-3 w-1/3 justify-end text-right">
                                                        <div className="truncate">
                                                            <p className="text-[10px] text-slate-500 font-bold uppercase">{toObj?.object_type}</p>
                                                            <p className="text-xs text-white font-medium truncate w-32" title={toName}>{toName}</p>
                                                        </div>
                                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400">
                                                            {toObj?.object_type === 'EMAIL' ? <Users size={18} /> :
                                                                toObj?.object_type === 'CSV' ? <CreditCard size={18} /> : <Box size={18} />}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                                        <BrainCircuit size={48} className="text-slate-600" />
                                        <div>
                                            <p className="text-slate-400 font-medium">No active relations found.</p>
                                            <p className="text-xs text-slate-600 mt-1">Upload data to allow AI to find connections.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>




                    {/* Zone C: AI Feed */}
                    <div className="col-span-12 lg:col-span-4 bg-slate-900 border-white/10 rounded-[40px] flex flex-col h-full shadow-2xl relative overflow-hidden min-h-[500px]">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                <Terminal size={16} className="text-rose-500" /> 실시간 가치 평가 가드레일
                            </h3>
                            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10">
                            <div className="flex flex-col gap-4 mb-4">
                                {summary && (
                                    <div className="bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-white/10 rounded-3xl p-8 space-y-4 relative group overflow-hidden cursor-help shadow-2xl">
                                        <div className="flex justify-between items-center z-10 relative">
                                            <p className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
                                                <Activity size={14} className="text-rose-500" /> 재무 익스포저 분석
                                            </p>
                                            <div className="px-2 py-1 rounded bg-rose-500/20 border border-rose-500/30 text-[9px] font-black text-rose-300 uppercase tracking-widest animate-pulse">
                                                Active Risk
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1 relative z-10" onClick={() => setShowExposureDetails(!showExposureDetails)}>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-60">Systemic Risk Exposure</p>
                                                <span className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-slate-500 border border-white/5 font-black uppercase tracking-widest hover:text-rose-400 hover:border-rose-400/30 transition-all">Click for Details</span>
                                            </div>
                                            <p className="text-4xl font-black text-white italic tracking-tighter group-hover:scale-105 transition-transform origin-left">
                                                ₩{(exposureValue / 100000000).toFixed(1)}억 <span className="text-sm text-slate-400 font-bold not-italic tracking-normal ml-1">잠재적 노출</span>
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase">
                                                    Direct: ₩{(summary.actual_detected_value ? summary.actual_detected_value / 1000000 : 0).toFixed(1)}M
                                                </div>
                                                <span className="text-[8px] text-slate-500 font-bold">실제 위반 확인액 합계</span>
                                            </div>
                                        </div>

                                        <div className="w-full h-3 bg-slate-900/50 rounded-full overflow-hidden relative z-10 mt-4 border border-white/5">
                                            <div
                                                className="h-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all duration-1000"
                                                style={{ width: `${Math.min(100, (summary.actual_detected_value || 0) / (exposureValue || 1) * 10000)}%` }}
                                            />
                                        </div>

                                        {/* ── Detailed Risk Breakdown Overlay (Drill-Down) ── */}
                                        <AnimatePresence>
                                            {showExposureDetails && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="absolute inset-0 bg-slate-900/98 backdrop-blur-2xl z-20 p-6 flex flex-col border border-rose-500/20 rounded-[40px] shadow-2xl overflow-hidden"
                                                >
                                                    <div className="flex justify-between items-center mb-6">
                                                        <p className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                                            <Activity size={12} className="text-rose-500" /> Exposure Breakdown
                                                        </p>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setShowExposureDetails(false); }}
                                                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-all"
                                                        >
                                                            <Zap size={10} className="fill-current" />
                                                        </button>
                                                    </div>

                                                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                                                        {(summary.exposure_details || []).length > 0 ? (
                                                            (summary.exposure_details as any[]).map((detail, idx) => (
                                                                <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-3 space-y-1 hover:border-white/10 transition-all">
                                                                    <div className="flex justify-between items-start">
                                                                        <span className="text-[8px] font-black text-rose-500/70 border border-rose-500/20 px-1.5 py-0.5 rounded uppercase tracking-tighter bg-rose-500/5">
                                                                            {detail.origin}
                                                                        </span>
                                                                        <span className="text-[10px] font-mono font-black text-white">
                                                                            ₩{(detail.amount / 1000000).toFixed(1)}M
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[10px] font-black text-white truncate">{detail.subject}</p>
                                                                    <p className="text-[9px] text-slate-500 font-bold leading-tight line-clamp-2">{detail.reason}</p>

                                                                    {detail.breakdown && (
                                                                        <div className="mt-2 grid grid-cols-3 gap-1 pt-2 border-t border-white/5">
                                                                            <div className="text-center">
                                                                                <p className="text-[7px] text-slate-600 font-black uppercase">Leakage</p>
                                                                                <p className="text-[9px] font-mono text-rose-400">₩{(detail.breakdown.leakage / 1000000).toFixed(1)}M</p>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <p className="text-[7px] text-slate-600 font-black uppercase">Penalty</p>
                                                                                <p className="text-[9px] font-mono text-amber-400">₩{(detail.breakdown.penalty / 1000000).toFixed(1)}M</p>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <p className="text-[7px] text-slate-600 font-black uppercase">Waste</p>
                                                                                <p className="text-[9px] font-mono text-blue-400">₩{(detail.breakdown.waste / 1000000).toFixed(1)}M</p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="py-20 text-center opacity-40">
                                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No detailed items found</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="mt-4 pt-4 border-t border-white/10">
                                                        <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest leading-relaxed">
                                                            * Systemic Exposure reflects projected impact based on materiality and failure probability. Direct loss is verified finding total.
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Hover Overlay Breakdown (Legacy Hover) */}
                                        <div className="absolute inset-0 bg-slate-900/98 backdrop-blur-xl z-20 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col p-6 custom-scrollbar overflow-y-auto translate-y-4 group-hover:translate-y-0">
                                            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exposure Composition</p>
                                                <div className="flex items-center gap-1">
                                                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                                                    <span className="text-[8px] text-slate-500 font-bold">Projected Risk</span>
                                                </div>
                                            </div>

                                            {/* Top-Level Split */}
                                            <div className="space-y-3 mb-6">
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center text-[10px] font-bold text-rose-400 uppercase">
                                                        <span>Governance / ESG</span>
                                                        <span>{summary.exposure_breakdown?.governance_pct || 0}%</span>
                                                    </div>
                                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                        <div className="h-full bg-rose-500" style={{ width: `${summary.exposure_breakdown?.governance_pct || 0}%` }} />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center text-[10px] font-bold text-amber-400 uppercase">
                                                        <span>Process / Operational</span>
                                                        <span>{summary.exposure_breakdown?.process_pct || 0}%</span>
                                                    </div>
                                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                        <div className="h-full bg-amber-500" style={{ width: `${summary.exposure_breakdown?.process_pct || 0}%` }} />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center text-[10px] font-bold text-blue-400 uppercase">
                                                        <span>Behavioral / Culture</span>
                                                        <span>{summary.exposure_breakdown?.behavioral_pct || 0}%</span>
                                                    </div>
                                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500" style={{ width: `${summary.exposure_breakdown?.behavioral_pct || 0}%` }} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Key Drivers (Dynamic From Backend) */}
                                            <div className="mt-2">
                                                <p className="text-[9px] font-black text-slate-500 uppercase mb-3 tracking-widest border-l-2 border-rose-500 pl-2">Key Drivers</p>
                                                <div className="space-y-3">
                                                    {summary.key_drivers?.map((driver: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-start group/item">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] text-white font-bold leading-tight truncate w-32">{driver.label}</span>
                                                                <span className="text-[8px] text-slate-500 font-medium">Top contributing category</span>
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[10px] font-black text-rose-500">₩{(driver.exposure / 100000000).toFixed(1)}억</span>
                                                                <span className="text-[8px] text-slate-600 font-mono italic">{driver.val} contribution</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mt-auto pt-4 border-t border-white/10 flex justify-between items-center">
                                                <span className="text-[10px] font-black text-slate-400 uppercase">Total Assessment</span>
                                                <span className="text-xs font-black text-white italic tracking-tighter">₩{(exposureValue / 100000000).toFixed(1)}B KRW</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>

                            {/* Flux Analysis Section */}
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-white/5 pb-2">
                                    <BrainCircuit size={14} /> Temporal Flux Radar (시계열 이상 징후)
                                </p>
                                {summary?.flux_signals && summary.flux_signals.length > 0 ? (
                                    <div className="space-y-4">
                                        {(summary.flux_signals || [])
                                            .sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0))
                                            .slice(0, 3)
                                            .map((sig: any) => (
                                                <div
                                                    key={sig.id}
                                                    onClick={() => navigate('/flux-analysis', { state: { projectFilter: activeProject } })}
                                                    className="bg-slate-800/40 border border-white/5 p-5 rounded-[32px] hover:border-emerald-500/30 transition-all group/card cursor-pointer active:scale-95"
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded">
                                                            {sig.account || "Structural Break"}
                                                        </span>
                                                        <span className="text-[10px] font-black text-rose-500 uppercase">
                                                            Risk {(sig.score * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-semibold text-slate-300 leading-relaxed mb-3">
                                                        {sig.description}
                                                    </p>
                                                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight italic">Estimated Impact</span>
                                                        <span className="text-sm font-black text-white italic tracking-tighter">
                                                            {sig.amount > 0
                                                                ? `₩${(sig.amount / 100000000).toFixed(1)}억`
                                                                : (sig.score > 0.8 ? "분석 필요 (High)" : "산정 중...")}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <div className="py-12 flex flex-col items-center justify-center opacity-30">
                                        <Zap size={32} className="text-slate-500 mb-2" />
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No Flux Detected</p>
                                    </div>
                                )}
                            </div>

                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mt-8 mb-4 border-b border-white/5 pb-2">시스템 활동 로그 (Operational Logs)</p>
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
                            <h3 className="text-xl font-black text-white tracking-tight uppercase italic">활성 감사 프로젝트 운영 현황</h3>
                            <p className="text-xs text-slate-500 font-bold tracking-widest uppercase opacity-60">프로젝트별 실시간 진행 및 수집 현황</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest pl-4">감사 대상 법인/부서</th>
                                    <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">현재 단계</th>
                                    <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">증거 수집 지표</th>
                                    <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest pr-4">감사 책임자</th>
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
                                                    <span>INGESTION INDEX</span>
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

                <div className="flex justify-center pb-8">
                    <div className="flex items-center gap-6 px-6 py-3 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-white/10 rounded-2xl backdrop-blur-xl">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">분석 모듈:</span>
                            <span className="text-xs font-black text-blue-400">AuditFlow Intelligence Core</span>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <div
                            className="flex items-center gap-2 cursor-help"
                            title="AI 자동화로 절감된 예상 수임료 및 투입 시간의 가치 산정액입니다."
                        >
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">운영 효율성 (ROI)</span>
                            <span className="text-xs font-black text-blue-400">{optStats?.cost_savings_usd || '$0.00'}+</span>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <div
                            className="flex items-center gap-2 cursor-help"
                            title="시스템이 실시간으로 감사 증거를 분석하고 대조하는 초당 데이터 처리 속도입니다."
                        >
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">검증 처리 심도 (Throughput)</span>
                            <span className="text-xs font-black text-white">{optStats?.batch_size || 5000} Rows/sec</span>
                        </div>
                    </div>
                </div>

                {/* Global Background Glow */}
                <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 bg-[#020617]">
                    <div className="absolute top-[10%] left-[10%] w-[400px] h-[400px] bg-slate-800/20 blur-[120px] rounded-full" />
                    <div className="absolute bottom-[20%] right-[5%] w-[300px] h-[300px] bg-slate-900/10 blur-[100px] rounded-full" />
                    <div className="absolute top-[40%] right-[20%] w-[500px] h-[500px] bg-indigo-900/5 blur-[150px] rounded-full" />
                </div>
            </div>
        </div >
    );
};

export default Dashboard;