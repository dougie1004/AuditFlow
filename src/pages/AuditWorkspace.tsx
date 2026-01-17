import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { safeInvoke } from "../lib/tauri-bridge";
import {
    Upload, Zap, Loader2,
    FileText, EyeOff,
    BrainCircuit, BarChart3, Database, Lock, MoveRight,
    ShieldAlert, ShieldCheck, Search, ChevronDown, Terminal
} from 'lucide-react';
import { useApp } from '../App';

interface AnalysisResult {
    findings_count: number;
    risk_score: number;
    status: string;
}

interface Transaction {
    date: string;
    vendor: string;
    desc: string;
    amount: number;
    user: string;
    card: string;
}

export default function AuditWorkspace() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { activeProject, setActiveProject } = useApp();

    const [projects, setProjects] = useState<any[]>([]);
    const [step, setStep] = useState(1);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [isMasking, setIsMasking] = useState(false);
    const [isMasked, setIsMasked] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [thoughts, setThoughts] = useState<{ thought: string, type: string }[]>([]);
    const [isCertifiedMode, setIsCertifiedMode] = useState(false);
    const [certifiedLog, setCertifiedLog] = useState<any | null>(null);

    useEffect(() => {
        safeInvoke("get_audit_projects").then((res: any) => {
            setProjects(res);
            if (id) {
                setActiveProject(id);
            } else if (activeProject) {
                // Keep active project
            } else if (res.length > 0) {
                setActiveProject(res[0].id);
            }
        });
    }, [id, setActiveProject]);

    // Scenario Data: Marketing Agency Kickback
    const rawData: Transaction[] = [
        { date: "2026-01-15", vendor: "(주)크리에이티브웍스", desc: "마케팅 컨설팅 수수료", amount: 15400000, user: "김민수 과장", card: "1234-5678-9012-3456" },
        { date: "2026-01-16", vendor: "AD Digital", desc: "디지털 광고 집행비", amount: 8200000, user: "이영희 대리", card: "9876-5432-1098-7654" },
        { date: "2026-01-17", vendor: "(주)글로벌네트웍스", desc: "홍보 대행 용역비", amount: 22500000, user: "박지민 차장", card: "5544-3322-1100-9988" },
        { date: "2026-01-18", vendor: "미디어팩토리", desc: "SNS 캠페인 제작비", amount: 4500000, user: "최준호 사원", card: "4433-2211-0099-8877" },
        { date: "2026-01-19", vendor: "(주)디자인하우스", desc: "브랜딩 디자인 외주", amount: 12800000, user: "이영희 대리", card: "9876-5432-1098-7654" },
    ];

    const formatAmount = (amt: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amt);
    };

    const maskName = (name: string) => {
        if (name.length <= 2) return name.charAt(0) + "*";
        return name.charAt(0) + "**" + name.substring(3);
    };

    const maskCard = (card: string) => {
        return card.split('-').map((part, i) => (i === 1 || i === 2 ? "****" : part)).join('-');
    };

    const handleFileUploadSimulation = () => {
        if (!activeProject) {
            alert("먼저 상단 드롭다운에서 분석할 프로젝트를 선택해 주세요.");
            return;
        }
        if (isUploading) return;
        setIsUploading(true);
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            setUploadProgress(progress);
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    setIsUploading(false);
                    setStep(2);
                }, 500);
            }
        }, 75);
    };

    const handleMasking = () => {
        setIsMasking(true);
        setThoughts([{ thought: "🛡️ PII Shield Initializing: Core secure-masking logic loaded.", type: "security" }]);
        setTimeout(() => {
            setIsMasking(false);
            setIsMasked(true);
            setThoughts(prev => [...prev, { thought: "✅ Masking Complete: Local data de-identified for AI analysis.", type: "security" }]);
        }, 2000);
    };

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setThoughts(prev => [...prev, { thought: "🧠 Neural Core Activation: Establishing bridge to Gemini 3.0 Pro...", type: "ai" }]);
        try {
            if (isCertifiedMode) {
                const log = await safeInvoke('execute_certified_audit', { projectId: activeProject });
                setCertifiedLog(log);
            } else {
                const dept = activeProject?.includes("MKT") ? "Marketing" : activeProject?.includes("SAL") ? "Sales" : activeProject?.includes("FACT") ? "Vietnam Factory" : "General";
                const result: AnalysisResult = await safeInvoke('execute_project_analysis', {
                    projectId: activeProject,
                    department: dept
                });
                setAnalysisResult(result);
            }
            setTimeout(() => {
                setIsAnalyzing(false);
            }, 1000);
        } catch (err) {
            console.error(err);
            alert("Analysis failed: " + err);
            setIsAnalyzing(false);
        }
    };

    const CertifiedResultCards = () => (
        <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700">
            <div className="bg-emerald-500/10 border-2 border-emerald-500/30 p-12 rounded-[48px] space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 text-emerald-500/10"><ShieldCheck size={160} /></div>
                <div className="flex items-center gap-4 text-emerald-400">
                    <div className="bg-emerald-500/20 p-3 rounded-2xl"><ShieldCheck size={32} /></div>
                    <h3 className="text-4xl font-black tracking-tighter italic uppercase">Authenticated Forensic Set</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    {certifiedLog?.ai_output_cards.map((card: any, idx: number) => (
                        <div key={idx} className="bg-slate-900/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[32px] space-y-6 shadow-2xl hover:border-blue-500/30 transition-all">
                            <div className="flex justify-between items-start">
                                <h4 className="text-xl font-black text-white italic">{card.title}</h4>
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${card.risk_level === 'High' ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30' :
                                    card.risk_level === 'Medium' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                                        'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                                    }`}>
                                    {card.risk_level} Risk
                                </span>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest italic">Rationale (Why check?)</p>
                                <ul className="space-y-2">
                                    {card.rationale.map((r: string, i: number) => (
                                        <li key={i} className="flex gap-3 text-sm text-slate-300 font-medium leading-relaxed">
                                            <span className="text-blue-500 font-black">•</span> {r}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Legitimate Context (Rebuttal)</p>
                                <p className="text-xs text-slate-400 font-bold italic leading-relaxed">"{card.counter_argument}"</p>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest italic">Direct Next Action</p>
                                    <p className="text-xs text-white font-black">{card.next_action}</p>
                                </div>
                                <div className="bg-blue-600 p-2 rounded-xl text-white"><MoveRight size={18} /></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Audit Run Log Viewer */}
            <div className="bg-black/50 border border-white/5 rounded-[40px] p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileText className="text-slate-500" size={20} />
                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Reproducible Audit Run Log</h4>
                    </div>
                    <span className="font-mono text-[10px] text-slate-600 tracking-tighter">ID: {certifiedLog?.run_id}</span>
                </div>
                <div className="grid grid-cols-3 gap-6">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Total Rows Scanned</p>
                        <p className="text-xl font-black text-white">{certifiedLog?.scan_summary.total_rows}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Candidacy Compression</p>
                        <p className="text-xl font-black text-emerald-400">{certifiedLog?.scan_summary.candidate_rows}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Exec. Latency</p>
                        <p className="text-xl font-black text-blue-400">{certifiedLog?.execution_time}</p>
                    </div>
                </div>
                <div className="bg-black/80 rounded-2xl p-4 font-mono text-[10px] text-emerald-500/80 border border-emerald-500/10 h-32 overflow-y-auto">
                    <p className="text-white font-bold opacity-30 mb-2 uppercase tracking-widest">{">>>"} DETERMINISTIC RULE HITS</p>
                    {certifiedLog?.rule_hits.map((hit: string, i: number) => (
                        <p key={i} className="mb-1 leading-relaxed">[{i + 1}] {hit}</p>
                    ))}
                </div>
                <p className="text-center text-[10px] font-black text-slate-700 uppercase tracking-widest italic">{certifiedLog?.reproducibility_check}</p>
            </div>
        </div>
    );

    const ThinkingTerminal = () => (
        <div className="bg-black/80 backdrop-blur-3xl border-2 border-slate-800 rounded-3xl p-6 font-mono text-[11px] h-[300px] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-700">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                    </div>
                    <span className="text-slate-500 font-bold uppercase tracking-widest ml-2">Neural Thought Process / Thinking Stream</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-blue-500 font-black">LIVE-PRO</span>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                {thoughts.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 gap-3">
                        <Terminal size={32} />
                        <p className="font-black uppercase tracking-[0.3em] text-center">Awaiting System<br />Initialization</p>
                    </div>
                )}
                {thoughts.map((t, i) => (
                    <div key={i} className={`flex gap-3 animate-in slide-in-from-left-2 duration-300 ${t.type === 'insight' ? 'text-emerald-400 border-l-2 border-emerald-500/40 pl-3' : t.type === 'security' ? 'text-amber-400' : 'text-blue-400'}`}>
                        <span className="opacity-40 italic font-black">[{new Date().toLocaleTimeString('ko-KR', { hour12: false })}]</span>
                        <span className="leading-relaxed font-bold tracking-tight">{t.thought}</span>
                    </div>
                ))}
                {isAnalyzing && (
                    <div className="flex gap-3 text-blue-500/50 animate-pulse">
                        <span className="opacity-40 italic font-black">[{new Date().toLocaleTimeString('ko-KR', { hour12: false })}]</span>
                        <span className="leading-relaxed font-bold tracking-tight">{">>>"} Decoding data vectors... Cross-referencing 170+ scenarios...</span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#020617] text-slate-300 font-sans p-8 lg:p-12">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start mb-16 gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded-xl text-blue-500">
                            <BrainCircuit size={20} />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight italic uppercase">Audit Execution Workspace</h1>
                    </div>

                    {/* Mode Toggle & Project Selector */}
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <div className="relative group">
                            <select
                                value={activeProject || ""}
                                onChange={(e) => {
                                    setActiveProject(e.target.value);
                                    setStep(1);
                                    setAnalysisResult(null);
                                    setCertifiedLog(null);
                                    setIsMasked(false);
                                    setThoughts([]);
                                }}
                                className="appearance-none bg-slate-900/80 border border-white/10 text-white font-black text-xs py-3 px-6 pr-12 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/20 w-80 shadow-2xl transition-all cursor-pointer hover:border-blue-500/30"
                            >
                                <option value="" disabled>Select Target Project...</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.id} - {p.title}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-blue-500 transition-colors" size={16} />
                        </div>

                        <button
                            onClick={() => setIsCertifiedMode(!isCertifiedMode)}
                            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all flex items-center gap-3 ${isCertifiedMode
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                                : 'bg-slate-900/50 border-white/10 text-slate-500 hover:text-white'
                                }`}
                        >
                            {isCertifiedMode ? <ShieldCheck size={14} /> : <Zap size={14} />}
                            {isCertifiedMode ? "Certified Mode (Golden Case)" : "Insight Mode (Thinking Stream)"}
                        </button>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="flex bg-slate-900/50 border border-white/5 p-2 rounded-2xl shadow-inner">
                        {[1, 2, 3].map(s => (
                            <div
                                key={s}
                                className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${step === s ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'text-slate-600'}`}
                            >
                                Step {s}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto flex flex-col gap-10">
                {!activeProject && (
                    <div className="py-32 text-center space-y-6 animate-in fade-in zoom-in-95">
                        <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto grayscale opacity-30">
                            <Database size={40} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-500 uppercase tracking-widest">No Project Selected</h2>
                        <p className="text-slate-600 font-medium">Please select a target project from the dropdown to begin execution.</p>
                    </div>
                )}

                {activeProject && step === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div
                            onClick={handleFileUploadSimulation}
                            className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[48px] p-16 text-center space-y-10 relative overflow-hidden group cursor-pointer hover:border-blue-500/30 transition-all shadow-2xl h-full"
                        >
                            {!isUploading ? (
                                <>
                                    <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-all" />
                                    <div className="w-32 h-32 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10 text-blue-400">
                                        <Upload size={52} />
                                    </div>
                                    <div className="space-y-6 relative z-10">
                                        <h2 className="text-5xl font-black text-white tracking-tighter italic uppercase">Ingestion Engine</h2>
                                        <p className="text-slate-500 text-lg font-medium max-w-xl mx-auto leading-relaxed">
                                            Inject the raw ledger stream for <span className="text-blue-400 font-mono">{activeProject}</span>.
                                            AI-native parsing for forensic readiness.
                                        </p>
                                    </div>
                                    <div className="max-w-md mx-auto border-2 border-dashed border-white/10 rounded-[32px] p-20 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group/upload">
                                        <Database className="mx-auto text-slate-800 group-hover/upload:text-blue-400 mb-6 transition-colors" size={64} />
                                        <p className="text-base font-bold text-slate-500 uppercase tracking-widest">Click to <span className="text-blue-500">Upload Data Stream</span></p>
                                    </div>
                                </>
                            ) : (
                                <div className="max-w-2xl mx-auto py-20 space-y-12">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <div className="flex items-center gap-3">
                                                <Loader2 className="animate-spin text-blue-500" size={24} />
                                                <span className="text-sm font-black text-blue-500 uppercase tracking-[0.3em]">Neural Ingestion In Progress...</span>
                                            </div>
                                            <span className="text-5xl font-black text-white italic">{uploadProgress}%</span>
                                        </div>
                                        <div className="w-full h-6 bg-white/5 rounded-full overflow-hidden border border-white/10 p-1.5 shadow-inner">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 rounded-full shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all duration-300"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-lg text-slate-400 font-bold uppercase tracking-[0.4em] animate-pulse">
                                        Scanning for 15,420 transaction rows...
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeProject && step === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-700 space-y-10">
                        <div className="flex justify-between items-end">
                            <div className="space-y-2">
                                <h3 className="text-3xl font-black text-white tracking-tighter italic uppercase flex items-center gap-4">
                                    <Search className="text-amber-500" size={32} /> Data Verification Grid
                                </h3>
                                <p className="text-slate-500 font-medium text-lg">Confirm forensic stream integrity for <span className="text-blue-400">{activeProject}</span>.</p>
                            </div>

                            {!isMasked ? (
                                <button
                                    onClick={handleMasking}
                                    disabled={isMasking}
                                    className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 text-black px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center gap-4 shadow-[0_0_40px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95"
                                >
                                    {isMasking ? <Loader2 className="animate-spin" size={20} /> : <EyeOff size={20} />}
                                    {isMasking ? "Shielding PII..." : "Execute PII Masking"}
                                </button>
                            ) : (
                                <button
                                    onClick={() => setStep(3)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center gap-4 group shadow-[0_0_40px_rgba(37,99,235,0.4)] hover:scale-105 active:scale-95"
                                >
                                    <ShieldCheck size={20} />
                                    Ready for Audit Run
                                    <MoveRight size={20} className="group-hover:translate-x-3 transition-transform" />
                                </button>
                            )}
                        </div>

                        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[40px] overflow-hidden relative shadow-2xl">
                            {isMasking && (
                                <div className="absolute inset-0 z-50 bg-[#020617]/60 backdrop-blur-md flex items-center justify-center">
                                    <div className="text-center space-y-6">
                                        <div className="w-24 h-24 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto border border-amber-500/50 animate-pulse">
                                            <Lock className="text-amber-500" size={48} />
                                        </div>
                                        <p className="text-amber-500 font-black text-sm uppercase tracking-[0.3em]">Privacy Guard: Scrubbing sensitive data...</p>
                                    </div>
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-white/[0.05] border-b border-white/10">
                                            <th className="p-8 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Date</th>
                                            <th className="p-8 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Vendor (Merchant)</th>
                                            <th className="p-8 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Description</th>
                                            <th className="p-8 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Amount</th>
                                            <th className="p-8 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Requester</th>
                                            <th className="p-8 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Card Number</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {rawData.map((row, idx) => (
                                            <tr key={idx} className="group hover:bg-white/[0.03] transition-colors">
                                                <td className="p-8 font-mono text-xs text-slate-500">{row.date}</td>
                                                <td className="p-8 font-black text-white text-base">{row.vendor}</td>
                                                <td className="p-8 text-sm text-slate-400 font-medium">{row.desc}</td>
                                                <td className={`p-8 text-right font-black text-lg ${row.amount > 10000000 ? 'text-rose-500' : 'text-emerald-400'}`}>
                                                    {formatAmount(row.amount)}
                                                </td>
                                                <td className="p-8 text-sm font-bold text-white relative">
                                                    <span className={`transition-all duration-700 ${isMasked ? 'text-amber-400/80 font-black italic' : ''}`}>
                                                        {isMasked ? maskName(row.user) : row.user}
                                                    </span>
                                                </td>
                                                <td className="p-8 font-mono text-xs text-slate-500 relative">
                                                    <span className={`transition-all duration-700 ${isMasked ? 'text-amber-400/50 font-black italic' : ''}`}>
                                                        {isMasked ? maskCard(row.card) : row.card}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeProject && step === 3 && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 h-full">
                        {certifiedLog || analysisResult ? (
                            isCertifiedMode ? <CertifiedResultCards /> : (
                                <div className="max-w-5xl mx-auto bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[64px] p-24 text-center space-y-16 relative overflow-hidden shadow-[0_0_100px_rgba(37,99,235,0.1)] h-full flex flex-col justify-center">
                                    <div className="absolute top-0 right-0 p-12 text-emerald-500/10"><BrainCircuit size={160} /></div>
                                    <h3 className="text-5xl font-black text-white tracking-tighter italic uppercase">AI Forensic Scan Complete</h3>
                                    <div className="grid grid-cols-2 gap-12 mt-12 relative z-10">
                                        <div className="bg-white/5 p-12 rounded-[40px] border border-white/10 backdrop-blur-md shadow-2xl group hover:border-emerald-500/30 transition-all">
                                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Anomalies Detected</p>
                                            <p className="text-8xl font-black text-emerald-400 tracking-tighter">{analysisResult?.findings_count || 0}</p>
                                        </div>
                                        <div className="bg-white/5 p-12 rounded-[40px] border border-white/10 backdrop-blur-md shadow-2xl group hover:border-rose-500/30 transition-all">
                                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Final Risk Score</p>
                                            <p className="text-8xl font-black text-rose-500 tracking-tighter">{analysisResult?.risk_score || 0}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-8 justify-center mt-12">
                                        <button onClick={() => navigate('/')} className="bg-white text-black px-12 py-6 rounded-3xl font-black text-sm uppercase tracking-[0.3em] hover:bg-slate-100 transition-all flex items-center gap-4 shadow-xl hover:-translate-y-1"><BarChart3 size={20} /> Exit to Dashboard</button>
                                        <button onClick={() => navigate('/report')} className="bg-white/5 border border-white/10 text-white px-12 py-6 rounded-3xl font-black text-sm uppercase tracking-[0.3em] hover:bg-white/10 transition-all flex items-center gap-4 shadow-xl hover:-translate-y-1"><FileText size={20} /> View Forensic Report</button>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="max-w-5xl mx-auto bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[64px] p-24 text-center space-y-16 relative overflow-hidden shadow-[0_0_100px_rgba(37,99,235,0.1)] h-full flex flex-col justify-center">
                                <div className="space-y-8">
                                    <div className="w-48 h-48 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center mx-auto shadow-2xl relative">
                                        <div className="absolute inset-0 bg-blue-500 animate-ping opacity-20 rounded-full" />
                                        <BrainCircuit className="text-white relative z-10" size={96} />
                                    </div>
                                    <h2 className="text-6xl font-black text-white tracking-tighter italic uppercase">
                                        {isCertifiedMode ? "Certified Audit Run" : "Neural Core Execution"}
                                    </h2>
                                    <p className="text-slate-400 font-medium max-w-xl mx-auto leading-relaxed text-xl">
                                        Forensic integrity confirmed. Ready to execute
                                        {isCertifiedMode ? " Certified Rule-First Audit." : " Gemini 3.0 Pro audit engine."}
                                    </p>
                                </div>
                                <button onClick={handleAnalyze} disabled={isAnalyzing} className="bg-white text-black px-20 py-8 rounded-[40px] font-black text-2xl uppercase tracking-[0.2em] hover:bg-blue-50 transition-all flex items-center gap-6 mx-auto shadow-2xl hover:scale-105 active:scale-95">
                                    {isAnalyzing ? <Loader2 className="animate-spin" size={32} /> : (isCertifiedMode ? <ShieldCheck size={32} className="text-emerald-500" /> : <Zap size={32} className="text-blue-600" />)}
                                    {isAnalyzing ? "Processing Data..." : (isCertifiedMode ? "Execute Certified Scan" : "Run AI Audit Engine")}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
