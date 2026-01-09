import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
    ArrowRight, ShieldAlert, Cpu, Database,
    Server, Monitor, LayoutDashboard, AlertCircle,
    CheckCircle2, Share2, GitBranch, Terminal, X
} from "lucide-react";

interface Violation {
    type: string;
    desc: string;
    risk: string;
}

interface MiningResult {
    official_flow?: string[];
    shadow_flow?: string[];
    violations?: Violation[];
    normalization_rate?: number;
}

interface MockFile {
    name: string;
    content: string;
}

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white/5 rounded-[32px] border border-white/10 shadow-sm overflow-hidden ${className}`}>{children}</div>
);

const Badge = ({ variant, children }: { variant: string; children: React.ReactNode }) => {
    const colors: Record<string, string> = {
        High: "bg-red-500/10 text-red-500 border-red-500/20",
        Medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        Low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        Done: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
    };
    return <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${colors[variant] || colors.Low}`}>{children}</span>;
}

import { useApp } from "../App";

export default function ProcessMonitoring() {
    const { activeProject } = useApp();
    const [result, setResult] = useState<MiningResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState({ progress: 0, msg: "대기 중...", status: "Idle" });
    const [mockFiles, setMockFiles] = useState<MockFile[]>([]);
    const [selectedMock, setSelectedMock] = useState<MockFile | null>(null);

    useEffect(() => {
        const unlisten = listen("process-mining-progress", (e: any) => {
            setProgress(e.payload);
        });
        return () => { unlisten.then(f => f()); };
    }, []);

    const runAnalysis = async () => {
        setIsAnalyzing(true);
        setResult(null);
        try {
            const res: MiningResult = await invoke("analyze_process_mining", { projectType: activeProject || "Default" });
            setResult(res);
        } catch (err) {
            alert(err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const generateMock = async () => {
        try {
            const res: MockFile[] = await invoke("generate_mining_mock_data");
            setMockFiles(res);
            if (res.length > 0) setSelectedMock(res[0]);
        } catch (err) {
            alert(err);
        }
    };

    return (
        <div className="p-10 bg-[#0B1221] min-h-screen text-slate-300">
            <div className="max-w-[1600px] mx-auto space-y-12">
                {/* Header Area */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/20">
                                <Share2 className="text-white w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Process Reality Analysis</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tighter">우회 경로 및 비공식 프로세스 분석 <span className="text-slate-600 font-medium">(Shadow Process)</span></h1>
                        <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-3xl">
                            시스템 외부에서 일어나는 비공식 '그림자 프로세스'와 담당자 로컬 PC의 은닉 데이터를 ERP 로그 데이터와 대조하여 절차 준수 여부를 검증합니다.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={generateMock}
                            className={`px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all active:scale-95 ${mockFiles.length > 0 ? 'bg-blue-600/10 text-blue-400 border-blue-600/20 shadow-sm' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}
                        >
                            {mockFiles.length > 0 ? "데이터 탐지됨 (2)" : "모의 데이터 생성"}
                        </button>
                        <button
                            onClick={runAnalysis}
                            disabled={isAnalyzing}
                            className={`group px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center gap-3 ${isAnalyzing ? 'bg-white/5 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/40 active:scale-95'}`}
                        >
                            {isAnalyzing ? (
                                <Cpu className="animate-spin w-4 h-4" />
                            ) : (
                                <Terminal className="group-hover:text-blue-300 w-4 h-4" />
                            )}
                            {isAnalyzing ? "Analyzing Ecosystem..." : "실태 분석 시작"}
                        </button>
                    </div>
                </div>

                {/* Mock Data Preview Section */}
                {mockFiles.length > 0 && !isAnalyzing && (
                    <Card className="animate-in slide-in-from-top-4 duration-500 bg-slate-900/40">
                        <div className="flex bg-white/5 border-b border-white/10">
                            {mockFiles.map(file => (
                                <button
                                    key={file.name}
                                    onClick={() => setSelectedMock(file)}
                                    className={`px-8 py-4 text-xs font-black uppercase tracking-tight flex items-center gap-2 border-r border-white/10 transition-colors ${selectedMock?.name === file.name ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                                >
                                    {file.name.endsWith('.csv') ? <Database size={14} /> : <Monitor size={14} />}
                                    {file.name}
                                </button>
                            ))}
                            <div className="flex-1 flex justify-end items-center px-6">
                                <button onClick={() => setMockFiles([])} className="text-slate-600 hover:text-rose-500 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        {selectedMock && (
                            <div className="p-8 bg-black font-mono text-[11px] leading-relaxed text-emerald-500 overflow-x-auto whitespace-pre">
                                <div className="mb-4 text-slate-600 border-b border-white/5 pb-2 uppercase text-[9px] font-black tracking-widest flex items-center gap-2">
                                    <Terminal size={12} /> Buffer Content Preview
                                </div>
                                {selectedMock.content}
                            </div>
                        )}
                        <div className="px-8 py-4 bg-blue-600/5 border-t border-blue-600/10 flex items-center gap-3">
                            <Cpu size={14} className="text-blue-500" />
                            <p className="text-[10px] font-bold text-blue-400 leading-relaxed uppercase tracking-tighter">
                                AI Ecosystem: 위 데이터는 담당자 로컬 환경과 ERP 시스템에서 동시 추출된 모의 데이터셋입니다. 우측 상단 '실태 분석 시작'을 누르세요.
                            </p>
                        </div>
                    </Card>
                )}

                {/* Analysis Progress Overlay (when analyzing) */}
                {isAnalyzing && (
                    <Card className="p-16 bg-slate-900 text-white relative overflow-hidden animate-in fade-in duration-500">
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="relative z-10 flex flex-col items-center text-center space-y-8">
                            <div className="relative">
                                <div className="p-8 bg-blue-600/10 rounded-full animate-pulse">
                                    <Cpu className="w-12 h-12 text-blue-500" />
                                </div>
                                <div className="absolute inset-0 border-2 border-blue-500/30 rounded-full animate-[spin_4s_linear_infinite]" />
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-2xl font-black tracking-tight text-white uppercase italic">{progress.msg}</h3>
                                <div className="flex items-center gap-6 w-80">
                                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-600 transition-all duration-500 shadow-[0_0_15px_rgba(37,99,235,0.6)]"
                                            style={{ width: `${progress.progress}%` }}
                                        />
                                    </div>
                                    <span className="text-[12px] font-black font-mono text-blue-400 tracking-tighter">{progress.progress}%</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {!isAnalyzing && !result && mockFiles.length === 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { icon: <Monitor className="text-blue-400" />, label: "PC Local Extraction", desc: "개별 담당자 PC에 잠자고 있는 엑셀, 메신저, 로그 및 임시 파일을 수집하여 비정형 데이터를 추출합니다." },
                            { icon: <Server className="text-emerald-400" />, label: "ERP/Legacy Sync", desc: "회사의 공식 ERP 시스템 및 데이터베이스와 연동하여 공식 경영 로그를 대조군으로 확보합니다." },
                            { icon: <Cpu className="text-indigo-400" />, label: "AI Normalization", desc: "분산된 비정형 데이터를 LLM이 실시간으로 표준 감사 스키마로 정규화하여 교차 분석이 가능한 상태로 만듭니다." }
                        ].map((f, i) => (
                            <Card key={i} className="p-10 border-dashed border-2 bg-transparent hover:border-blue-500/50 hover:bg-blue-600/5 transition-all group">
                                <div className="w-16 h-16 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform">
                                    {f.icon}
                                </div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">{f.label}</p>
                                <p className="text-base text-slate-400 font-medium leading-relaxed">{f.desc}</p>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Analysis Results */}
                {result && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in slide-in-from-bottom-6 duration-700">
                        {/* Process Flow Comparison */}
                        <Card className="lg:col-span-2 p-12 flex flex-col space-y-16 bg-slate-900/40">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                        <GitBranch className="text-blue-500" /> Official vs Actual Process Trace
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">Comparison of System Logs and Shadow Activities</p>
                                </div>
                                <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-xl border border-emerald-500/20 shadow-lg shadow-emerald-950/20">
                                    <CheckCircle2 size={16} />
                                    <span className="text-[11px] font-black uppercase tracking-widest">AI Normalization: {result.normalization_rate || 0}%</span>
                                </div>
                            </div>

                            <div className="space-y-16">
                                {/* Official Flow */}
                                <div className="space-y-6">
                                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                        <Server size={14} className="text-blue-400" /> Official ERP Path <span className="text-[9px] font-medium text-slate-600">(Controlled)</span>
                                    </p>
                                    <div className="flex items-center gap-4 overflow-x-auto pb-6 custom-scrollbar">
                                        {(result.official_flow || []).map((step, i) => (
                                            <div key={i} className="flex items-center gap-4 shrink-0">
                                                <div className="bg-slate-800 border border-white/5 px-8 py-5 rounded-2xl text-[13px] font-black text-slate-300 shadow-sm shadow-black/40">
                                                    {step}
                                                </div>
                                                {i < (result.official_flow?.length || 0) - 1 && <ArrowRight size={16} className="text-slate-800" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Shadow Flow */}
                                <div className="space-y-6">
                                    <p className="text-[11px] font-black text-rose-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                        <Monitor size={14} /> Detected Actual Path <span className="text-[9px] font-medium text-rose-500/40">(Shadow Process)</span>
                                    </p>
                                    <div className="flex items-center gap-4 overflow-x-auto pb-6 custom-scrollbar">
                                        {(result.shadow_flow || []).map((step, i) => (
                                            <div key={i} className="flex items-center gap-4 shrink-0">
                                                <div className="bg-rose-500/10 border border-rose-500/20 px-8 py-5 rounded-2xl text-[13px] font-black text-rose-400 shadow-xl shadow-rose-950/20 relative">
                                                    {step}
                                                    {i === 0 && <div className="absolute -top-2 -right-2 w-4 h-4 bg-rose-500 rounded-full ring-4 ring-rose-950/50 animate-pulse shadow-lg" />}
                                                </div>
                                                {i < (result.shadow_flow?.length || 0) - 1 && <ArrowRight size={16} className="text-rose-900" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Violation Intelligence */}
                        <div className="space-y-10">
                            <Card className="bg-slate-900 border-white/10 p-10 text-white relative h-full flex flex-col shadow-2xl">
                                <div className="absolute top-0 right-0 p-10 opacity-5">
                                    <ShieldAlert size={120} className="text-rose-500" />
                                </div>
                                <h3 className="text-xl font-black uppercase tracking-tight mb-10 flex items-center gap-3 relative z-10 italic">
                                    <LayoutDashboard className="text-blue-500" /> Violation Intel
                                </h3>
                                <div className="space-y-8 flex-1 relative z-10">
                                    {(result.violations || []).map((v, i) => (
                                        <div key={i} className="p-8 bg-white/5 rounded-[24px] border border-white/10 hover:bg-white/10 transition-all group">
                                            <div className="flex justify-between items-start mb-4">
                                                <Badge variant={v.risk}>{v.risk} Level</Badge>
                                                <AlertCircle size={18} className={v.risk === 'High' ? 'text-rose-500' : 'text-amber-500 animate-pulse'} />
                                            </div>
                                            <h4 className="text-base font-black text-white mb-3 uppercase tracking-tight group-hover:text-blue-400 transition-colors">{v.type}</h4>
                                            <p className="text-xs text-slate-500 font-medium leading-relaxed">{v.desc}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-12 p-6 rounded-2xl bg-blue-600/5 border border-blue-600/10">
                                    <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic">
                                        * 분석 결과는 AI에 의해 정규화된 비공식 로그 데이터(PC Local, Messenger 등)를 근거로 도출되었습니다. 본 문서는 대외비입니다.
                                    </p>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
            `}} />
        </div>
    );
}