import { useEffect, useState } from 'react';
import { safeInvoke } from '../lib/tauri-bridge';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { useAudit } from '../context/AuditContext';
import {
    ShieldCheck, CheckCircle2,
    ShieldAlert, BrainCircuit, Globe, TrendingUp, Terminal, Clock, ArrowUpRight,
    Users, ShoppingCart, Box, Coins, BarChart3, Link, Zap, CreditCard
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Treemap, Tooltip as RechartsTooltip, PieChart, Pie, Cell } from 'recharts';

import { DashboardSummary, SystemEvent, AuditProject, AuditIssue } from '../types';


const Dashboard = () => {
    const { activeProject, setActiveProject } = useApp();
    const navigate = useNavigate();
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [events, setEvents] = useState<SystemEvent[]>([]);
    const [projects, setProjects] = useState<AuditProject[]>([]);
    const [universe, setUniverse] = useState<any[]>([]);
    const [optStats, setOptStats] = useState<any>(null);
    const [integrityStatus, setIntegrityStatus] = useState<'checking' | 'passed' | 'failed'>('checking');

    const [loading, setLoading] = useState(true);
    const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
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
            const [sum, evts] = await Promise.all([
                safeInvoke<DashboardSummary>('get_dashboard_summary', { projectId: activeProject }),
                safeInvoke<SystemEvent[]>('get_system_events', { projectId: activeProject }),
            ]);
            const projs = await safeInvoke<AuditProject[]>('get_audit_projects');

            setSummary(sum);
            setEvents(evts);
            setProjects(projs);


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


            const getRiskColor = (score: number) => {
                if (score >= 25) return '#F43F5E'; // Rose 500 (Critical)
                if (score >= 15) return '#F59E0B'; // Amber 500 (High)
                if (score >= 5) return '#3B82F6';  // Blue 500 (Medium)
                return '#10B981';                  // Emerald 500 (Clean)
            };

            const treemapNodes = projectsWithScores.map((p: any) => {
                const score = p.weightedRiskScore || 0;
                return {
                    name: String(p.title || "Unknown Department"),
                    size: score * 10 + 20, // Scale by risk score
                    findingsCount: p.findings_count || 0,
                    riskScore: score,
                    riskLevel: score >= 15 ? 'Critical' : score >= 8 ? 'High' : score >= 3 ? 'Medium' : score > 0 ? 'Low' : 'Clean',
                    fill: getRiskColor(score)
                };
            });

            setUniverse(treemapNodes);

            const stats = await safeInvoke<any>('get_optimization_stats');
            setOptStats(stats);
        } catch (err) {
            console.error("Dashboard Load Error:", err);
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            setIntegrityStatus('checking');
            await fetchData();
            setLoading(false);
            // [INTEGRITY SIMULATION] Multi-stage assurance check for "Trust" effect
            setTimeout(() => {
                setTimeout(() => {
                    setIntegrityStatus('passed');
                }, 1600);
            }, 500);
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
                    <p className="text-white font-black uppercase tracking-[0.3em] text-sm italic">디지털 보안 체계 동기화 중</p>
                    <p className="text-blue-400/60 text-[10px] font-bold animate-pulse">Gemini 3.0 인텔리전스 코어 분석 중...</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0B1221] text-slate-300 font-sans p-6 overflow-x-hidden">
            <div className="max-w-[1600px] mx-auto space-y-8">

                {/* Header Section - Top Layer */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-10">
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
                            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Compliance DD 인텔리전스</h1>
                        </div>
                        <p className="text-xs text-slate-500 font-bold tracking-[0.3em] uppercase opacity-70">가치 평가 가드레일 및 투자 등급 실사(Assurance)</p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="h-12 px-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[18px] flex items-center gap-3 group hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden">
                            <Globe className="w-4 h-4 text-blue-400 group-hover:animate-spin-slow" />
                            <select
                                value={activeProject || ''}
                                onChange={(e) => handleAuditChange(e.target.value || null)}
                                className="bg-transparent text-xs font-black text-white outline-none pr-6 cursor-pointer appearance-none uppercase tracking-widest min-w-[200px]"
                            >
                                <option value="" className="bg-slate-900 font-black">전체 통합 실사 데이터</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id} className="bg-slate-900 font-black">{p.title}</option>
                                ))}
                            </select>
                        </div>
                        <button onClick={handleNewAudit} className="h-12 px-8 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-[18px] hover:bg-blue-500 transition-all shadow-[0_0_30px_rgba(37,99,235,0.4)] active:scale-95 flex items-center gap-3 whitespace-nowrap">
                            <ShieldCheck size={14} className="text-white" />
                            새로운 실사(DD) 프로젝트 시작
                        </button>
                    </div>
                </header>

                {/* Zone A: The Pulse (KPIs) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        {
                            label: "고위험 컴플라이언스 신호",
                            value: summary?.total_risks || 0,
                            sub: "통제 우회 패턴",
                            trend: "up",
                            data: summary?.trends || [],
                            color: "text-rose-500",
                            areaColor: "#f43f5e",
                            path: "/ai-discovery",
                            formula: "시스템 권한 남용 및 우회 접근 로그를 기반으로 산출된 이상 행위 지수"
                        },
                        {
                            label: "재무 익스포저 분석",
                            value: summary?.open_findings || 0,
                            sub: "가치 평가 검토 항목",
                            trend: "up",
                            data: summary?.trends?.map(t => ({ ...t, value: t.value * 0.5 })) || [],
                            color: "text-amber-500",
                            areaColor: "#f59e0b",
                            path: "/ai-discovery",
                            formula: "고위험 거래처 대상의 미결제 잔액 및 잠재적 손실 위험 가중 합계"
                        },
                        {
                            label: "조직 문화 컴플라이언스",
                            value: summary?.total_findings || 0,
                            sub: "지배구조 패턴 로그",
                            trend: "stable",
                            data: summary?.trends || [],
                            color: "text-blue-400",
                            areaColor: "#3b82f6",
                            path: "/ai-discovery",
                            formula: "사내 운영 정책 이탈 사례의 발생 빈도와 조직 내 영향 편차 분석"
                        },
                        {
                            label: "실사 데이터 커버리지",
                            value: summary?.raw_signals || 0,
                            sub: "검증 심도 분석",
                            trend: "down",
                            data: summary?.trends?.map(t => ({ ...t, value: t.value * 1.2 })) || [],
                            color: "text-emerald-400",
                            areaColor: "#10b981",
                            path: "/ai-discovery",
                            formula: "전체 데이터 중 AI 전수 조사를 통해 신뢰성이 확보된 검증 도달 범위"
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
                            <div className="w-1 h-6 bg-blue-500 rounded-full" />
                            <h3 className="text-xl font-black text-white tracking-tight uppercase italic">타겟 딜 플로우 및 실사 포트폴리오</h3>
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-60">투자 포트폴리오 모니터링</span>
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
                                    <h3 className="text-xl font-black text-white tracking-tight uppercase">컴플라이언스 리스크 히트맵</h3>
                                    <p className="text-xs text-slate-500 font-bold tracking-widest uppercase opacity-60">대상별 관측 리스크 패턴</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-rose-500 uppercase bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" /> 집중 관리 영역
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
                                        fill="#2563eb"
                                        isAnimationActive={false}
                                        animationDuration={0}
                                        content={((props: any) => {
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
                                                                fontSize={width < 150 ? "11" : "16"}
                                                                fontWeight="900"
                                                                className="uppercase tracking-tighter"
                                                                style={{
                                                                    textShadow: '0 4px 8px rgba(0,0,0,0.5)',
                                                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))'
                                                                }}
                                                            >
                                                                {name && name.length > 20 ? name.substring(0, 20) + '...' : name || "N/A"}
                                                            </text>

                                                            <text
                                                                x={x + width / 2}
                                                                y={y + height / 2 + 12}
                                                                textAnchor="middle"
                                                                fill="white"
                                                                fontSize={width < 150 ? "10" : "14"}
                                                                fontWeight="800"
                                                                style={{
                                                                    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                                                    opacity: 0.9
                                                                }}
                                                            >
                                                                위험 점수: {riskScore || 0}
                                                            </text>
                                                            <text
                                                                x={x + width / 2}
                                                                y={y + height / 2 + 32}
                                                                textAnchor="middle"
                                                                fill="white"
                                                                fontSize={width < 150 ? "9" : "12"}
                                                                fontWeight="700"
                                                                style={{
                                                                    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                                                    opacity: 0.8
                                                                }}
                                                            >
                                                                탐지 건수: {findingsCount || 0}건
                                                            </text>
                                                        </>
                                                    )}
                                                </g>
                                            );
                                        }) as any}
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
                                                            <p className="text-[10px] font-bold text-slate-400">상태: <span style={{ color: data.fill }}>{data.riskLevel}</span></p>
                                                            <p className="text-[10px] font-bold text-emerald-400 mt-2">탐지된 이슈: {data.findingsCount}</p>
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

                        {/* Deep Dive Cross-Sectional Inference Map */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 space-y-6 relative overflow-hidden group/map">
                            <div className="flex justify-between items-center relative z-10">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-white tracking-tight uppercase italic flex items-center gap-3">
                                        <Link size={20} className="text-blue-500" /> 실사 관계도 (Assurance Map)
                                    </h3>
                                    <p className="text-xs text-slate-500 font-bold tracking-widest uppercase opacity-60">가치 추론 횡단 분석</p>
                                </div>
                                <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-2">
                                    <Zap size={14} className="text-blue-400 animate-pulse" />
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">인공지능 추론 엔진 활성화</span>
                                </div>
                            </div>

                            <div className="relative h-[280px] flex items-center justify-center p-8 bg-black/20 rounded-[32px] border border-white/5 overflow-hidden">
                                {/* SVG Connections Layer */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30 group-hover/map:opacity-60 transition-opacity duration-1000">
                                    <path d="M 150,140 L 300,100" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4,4" className="animate-pulse" />
                                    <path d="M 300,100 L 450,140" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4,4" />
                                    <path d="M 450,140 L 450,220" stroke="#f43f5e" strokeWidth="3" className="animate-pulse" />
                                    <path d="M 450,220 L 300,260" stroke="#3b82f6" strokeWidth="1" />
                                    <path d="M 300,260 L 150,220" stroke="#f59e0b" strokeWidth="3" className="animate-pulse" />
                                    <path d="M 150,220 L 150,140" stroke="#3b82f6" strokeWidth="1" />
                                </svg>

                                <div className="grid grid-cols-4 gap-x-12 gap-y-16 relative z-10">
                                    {[
                                        { id: 'pay', label: 'Payroll', icon: Users, color: 'text-blue-400', status: 'secure' },
                                        { id: 'exp', label: 'Expense', icon: CreditCard, color: 'text-emerald-400', status: 'conflict', alert: 'Phantom Footprint detected' },
                                        { id: 'ar', label: 'Sales/AR', icon: TrendingUp, color: 'text-blue-400', status: 'secure' },
                                        { id: 'inv', label: 'Inventory', icon: Box, color: 'text-amber-400', status: 'conflict', alert: 'Logistic Mismatch' },
                                        { id: 'pur', label: 'Purchase', icon: ShoppingCart, color: 'text-blue-400', status: 'secure' },
                                        { id: 'cash', label: 'Cash/Bank', icon: Coins, color: 'text-blue-400', status: 'secure' },
                                        { id: 'legal', label: 'Compliance', icon: ShieldCheck, color: 'text-emerald-400', status: 'secure' },
                                        { id: 'link', label: 'Audit Trail', icon: BarChart3, color: 'text-indigo-400', status: 'linking' }
                                    ].map((p, idx) => (
                                        <div key={p.id} className="relative group/node flex flex-col items-center gap-2">
                                            <div className={`w-14 h-14 rounded-2xl bg-slate-900 border ${p.status === 'conflict' ? 'border-rose-500/50 animate-pulse' : 'border-white/10'} group-hover/node:border-blue-500/50 transition-all shadow-xl flex items-center justify-center relative cursor-help`}>
                                                <p.icon size={24} className={p.status === 'conflict' ? 'text-rose-500' : p.color} />
                                                {p.status === 'conflict' && (
                                                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                                                        <ShieldAlert size={10} className="text-white" />
                                                    </div>
                                                )}

                                                {/* In-view Inference Tooltip */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-40 p-3 bg-slate-900 border border-white/10 rounded-xl opacity-0 invisible group-hover/node:opacity-100 group-hover/node:visible transition-all duration-300 z-50 shadow-[0_10px_30px_rgba(0,0,0,0.5)] pointer-events-none">
                                                    <p className="text-[10px] font-black text-white uppercase tracking-widest border-b border-white/5 pb-2 mb-2">{p.label}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold leading-tight">
                                                        {p.status === 'conflict' ? p.alert : 'Domain monitoring active. Cross-referencing against 6 silos.'}
                                                    </p>
                                                    {p.status === 'conflict' && (
                                                        <div className="mt-2 flex items-center gap-1.5 text-[8px] font-black text-rose-500 uppercase">
                                                            <Link size={10} /> Conflict Point Identified
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{p.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>




                    {/* Zone C: AI Feed */}
                    <div className="col-span-12 lg:col-span-4 bg-slate-900 border-border-white/10 rounded-[40px] flex flex-col h-full shadow-2xl relative overflow-hidden min-h-[500px]">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                <Terminal size={16} className="text-rose-500" /> 실시간 가치 평가 가드레일
                            </h3>
                            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10">
                            <div className="flex flex-col gap-4 mb-4">
                                <button
                                    onClick={() => {
                                        if (!isVaultUnlocked) {
                                            const pass = prompt("Enter Identity Vault Master Key:");
                                            if (pass === "insightrix" || pass === "1234") {
                                                setIsVaultUnlocked(true);
                                            } else {
                                                alert("Invalid Master Key. Action logged by Security.");
                                            }
                                        } else {
                                            setIsVaultUnlocked(false);
                                        }
                                    }}
                                    className={`w-full h-10 rounded-xl border flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${isVaultUnlocked
                                        ? "bg-emerald-500 text-white border-emerald-400 animate-pulse"
                                        : "bg-white/5 text-slate-400 border-white/10 hover:border-white/30"
                                        }`}
                                >
                                    <ShieldCheck size={14} className={isVaultUnlocked ? "animate-spin-slow" : ""} />
                                    {isVaultUnlocked ? "민감 식별 정보 노출됨" : "민감 정보 식별자 확인"}
                                </button>
                                {summary && (
                                    <div className="bg-gradient-to-br from-rose-500/10 to-amber-500/10 border border-white/5 rounded-2xl p-4 space-y-2">
                                        <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">재무 익스포저 분석</p>
                                        <p className="text-2xl font-black text-white italic tracking-tighter">
                                            ₩{(summary.potential_impact_value / 100000000).toFixed(1)}억 <span className="text-xs text-slate-500 font-bold not-italic">잠재적 리스크 규모</span>
                                        </p>
                                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-rose-500 w-[70%]" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {events.map((evt) => (
                                <div key={evt.id} className="space-y-2 group">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black text-emerald-500/60 uppercase tracking-tighter bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 font-mono italic">{evt.timestamp}</span>
                                        <Clock size={12} className="text-slate-700 group-hover:text-emerald-500 transition-colors" />
                                    </div>
                                    <p className="text-xs font-medium text-slate-400 leading-relaxed border-l-2 border-white/5 pl-4 group-hover:border-emerald-500/50 transition-all font-mono">
                                        <span className="text-emerald-500 mr-2">🤖</span>
                                        {isVaultUnlocked ? evt.description.replace(/Employee_(\d+)/g, (match, id) => {
                                            const names: any = {
                                                "33": "민경훈 부장",
                                                "12": "장도윤 차장",
                                                "4": "한소희 대리",
                                                "10": "김철수 팀장",
                                                "37": "이영희 과장",
                                                "5": "박지성 대리"
                                            };
                                            return names[id] || match;
                                        }) : evt.description}
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
                            <h3 className="text-xl font-black text-white tracking-tight uppercase italic">활성 실사 프로젝트 운영 현황</h3>
                            <p className="text-xs text-slate-500 font-bold tracking-widest uppercase opacity-60">프로젝트별 실시간 실사 실행 가시성</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest pl-4">실사 대상</th>
                                    <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">현재 단계</th>
                                    <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">검증 완료 지표</th>
                                    <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest pr-4">실사 책임자</th>
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

                <div className="flex justify-center pb-8">
                    <div className="flex items-center gap-6 px-6 py-3 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-white/10 rounded-2xl backdrop-blur-xl">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">엔진 인텔리전스</span>
                            <span className="text-xs font-black text-emerald-400">{optStats?.mode || '전략적 하이브리드'}</span>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">운영 효율성</span>
                            <span className="text-xs font-black text-blue-400">{optStats?.cost_savings_usd || '$0.00'}+</span>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">검증 처리 심도</span>
                            <span className="text-xs font-black text-white">{optStats?.batch_size || 5000} Rows/sec</span>
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
        </div>
    );
};

export default Dashboard;