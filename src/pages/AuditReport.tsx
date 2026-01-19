import { useState, useEffect } from "react";
import { safeInvoke } from '../lib/tauri-bridge';
import {
    Download, FileText, BrainCircuit, Printer,
    ShieldCheck, Share2, Loader2, AlertCircle,
    Siren
} from "lucide-react";
import { useApp } from "../App";
import insightrixLogo from "../assets/insightrix_logo.png";

export default function AuditReport() {
    const { activeProject } = useApp();
    const [report, setReport] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(activeProject);

    useEffect(() => {
        safeInvoke("get_audit_projects").then((res: any) => {
            setProjects(res);
            if (activeProject) setSelectedProjectId(activeProject);
            else if (res.length > 0) setSelectedProjectId(res[0].id);
        }).catch(err => console.error(err));
    }, [activeProject]);

    const generateReport = async () => {
        if (!selectedProjectId) {
            setError("프로젝트를 먼저 선택해 주세요.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setReport("");

        try {
            // [CRITICAL] Validate that there are accepted findings before generating report
            const issues: any[] = await safeInvoke("get_audit_issues", { projectType: selectedProjectId });
            const acceptedFindings = issues.filter(f => f.status === "Accepted");

            if (acceptedFindings.length === 0) {
                setError("채택된 감사 지적 사항이 없습니다. 실무 검토 후 '채택' 버튼을 눌러주세요.");
                setIsLoading(false);
                return;
            }

            // Generate report with validated data
            const res: string = await safeInvoke("generate_professional_report", { projectId: selectedProjectId });

            if (!res || res.trim().length === 0) {
                throw new Error("AI가 빈 보고서를 반환했습니다.");
            }

            setReport(res);
        } catch (err: any) {
            console.error("Report Generation Error:", err);
            const errorMsg = err?.toString() || "알 수 없는 오류";

            if (errorMsg.includes("채택된")) {
                setError(errorMsg);
            } else if (errorMsg.includes("API")) {
                setError("AI API 연결 오류가 발생했습니다. 네트워크 상태를 확인해 주세요.");
            } else {
                setError(`보고서 생성 중 오류가 발생했습니다: ${errorMsg}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-[#0B1221] min-h-screen p-10 flex flex-col items-center pb-32 text-slate-300">
            <div className="max-w-5xl w-full space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="text-blue-600 w-5 h-5" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Compliance DD Reporting</span>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tighter mb-2">
                            {selectedProjectId ? `${selectedProjectId} Compliance DD 실사 보고서` : "Due Diligence Executive Report"}
                        </h1>
                        <p className="text-slate-500 font-medium mt-2 text-sm italic">
                            {selectedProjectId
                                ? "현재 실사 대상 프로젝트의 거버넌스 및 리스크 발견 사항을 AI가 종합 분석한 보고서입니다."
                                : "실사 보고서를 생성할 프로젝트를 선택해 주세요."}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <select
                            value={selectedProjectId || ""}
                            onChange={(e) => {
                                setSelectedProjectId(e.target.value);
                                setReport("");
                            }}
                            className="bg-white/5 border border-white/10 text-white font-bold text-xs py-2 px-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 w-fit text-right appearance-none"
                        >
                            <option value="" disabled>프로젝트 선택...</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.id} ({p.audit_type})</option>
                            ))}
                        </select>
                        <div className="flex gap-3">
                            <button
                                onClick={() => window.print()}
                                className="bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm active:scale-95"
                            >
                                <Printer size={14} /> Print
                            </button>
                            <button
                                onClick={generateReport}
                                disabled={isLoading || !selectedProjectId}
                                className={`group px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center gap-2 ${isLoading ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 active:scale-95'}`}
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin w-4 h-4" />
                                ) : (
                                    <BrainCircuit className="group-hover:text-blue-300 w-4 h-4" />
                                )}
                                {report ? "보고서 다시 생성" : "AI 보고서 생성"}
                            </button>
                        </div>
                    </div>
                </div>

                {!selectedProjectId && !report && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl flex items-center gap-4 animate-in fade-in duration-500">
                        <AlertCircle className="text-amber-500 w-6 h-6 shrink-0" />
                        <div>
                            <p className="text-amber-500 font-black text-sm uppercase tracking-tight">Active Project Required</p>
                            <p className="text-amber-500/70 text-sm">상단 드롭다운에서 보고서를 생성할 감사 프로젝트를 선택하세요.</p>
                        </div>
                    </div>
                )}

                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-32 space-y-6">
                        <div className="relative">
                            <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center animate-pulse">
                                <BrainCircuit className="w-8 h-8 text-blue-600" />
                            </div>
                            <div className="absolute inset-0 border-2 border-blue-500/30 rounded-full animate-ping" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-black text-white">Advanced AI Synthesis...</h3>
                            <p className="text-sm text-slate-500">IIA 표준 및 내부 감사 기준에 맞춰 보고서를 작성 중입니다.</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-2xl text-center space-y-4">
                        <Siren className="text-red-500 w-12 h-12 mx-auto" />
                        <h3 className="text-red-500 font-black text-xl">보고서 작성 실패</h3>
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {!isLoading && !report && !error && activeProject && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-10 opacity-60">
                        <div className="border-2 border-dashed border-white/5 bg-white/5 rounded-3xl p-10 flex flex-col items-center text-center space-y-4">
                            <ShieldCheck className="w-12 h-12 text-blue-500/40" />
                            <h4 className="font-black text-slate-400 uppercase tracking-widest text-xs">Standardized Review</h4>
                            <p className="text-sm text-slate-500">IIA 글로벌 내부감사 표준 프레임워크를 적용하여 객관성을 보장합니다.</p>
                        </div>
                        <div className="border-2 border-dashed border-white/5 bg-white/5 rounded-3xl p-10 flex flex-col items-center text-center space-y-4">
                            <Download className="w-12 h-12 text-blue-500/40" />
                            <h4 className="font-black text-slate-400 uppercase tracking-widest text-xs">Executive Ready</h4>
                            <p className="text-sm text-slate-500">생성된 보고서는 PDF로 출력하거나 즉시 경영진에게 공유 가능합니다.</p>
                        </div>
                    </div>
                )}

                {/* Main Paper Display */}
                {report && !isLoading && (
                    <div className="animate-in slide-in-from-bottom-10 duration-1000">
                        <div className="bg-slate-900/40 backdrop-blur-xl p-16 md:p-24 shadow-[0_40px_100px_rgba(0,0,0,0.4)] border border-white/10 rounded-3xl relative paper-container overflow-hidden">
                            {/* Watermark/Logo */}
                            <div className="absolute top-10 right-10 opacity-20 grayscale invert">
                                <img src={insightrixLogo as any} alt="AuditFlow" className="h-10 w-auto" />
                            </div>

                            {/* Markdown-like Content Styling */}
                            <div className="prose prose-slate max-w-none">
                                <style>
                                    {`
                                        .report-content h1 { font-size: 2.25rem; font-weight: 900; color: #ffffff; border-bottom: 4px solid #3b82f6; padding-bottom: 0.75rem; margin-bottom: 2.5rem; margin-top: 3.5rem; letter-spacing: -0.05em; }
                                        .report-content h2 { font-size: 1.625rem; font-weight: 800; color: #ffffff; background: rgba(255,255,255,0.03); padding: 1rem 1.5rem; border-radius: 0.75rem; margin-top: 3rem; margin-bottom: 1.5rem; border-left: 6px solid #3b82f6; }
                                        .report-content h3 { font-size: 1.25rem; font-weight: 800; color: #60a5fa; margin-top: 2.5rem; margin-bottom: 1rem; }
                                        .report-content p { color: #94a3b8; line-height: 1.9; margin-bottom: 1.25rem; font-size: 1.05rem; }
                                        .report-content ul { list-style-type: none; padding-left: 0; margin-bottom: 2rem; }
                                        .report-content li { position: relative; padding-left: 1.75rem; margin-bottom: 0.75rem; color: #94a3b8; line-height: 1.7; }
                                        .report-content li::before { content: "•"; position: absolute; left: 0.5rem; color: #3b82f6; font-weight: bold; }
                                        .report-content table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 2rem 0; font-size: 0.95rem; border: 1px solid rgba(255,255,255,0.05); border-radius: 0.75rem; overflow: hidden; background: rgba(0,0,0,0.2); }
                                        .report-content th { background: rgba(255,255,255,0.02); text-align: left; padding: 14px 16px; border-bottom: 2px solid rgba(255,255,255,0.05); border-right: 1px solid rgba(255,255,255,0.05); font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; }
                                        .report-content td { padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.02); border-right: 1px solid rgba(255,255,255,0.05); color: #cbd5e1; vertical-align: top; }
                                        .report-content tr:last-child td { border-bottom: none; }
                                        .report-content th:last-child, .report-content td:last-child { border-right: none; }
                                        .report-content blockquote { border-left: 5px solid #3b82f6; padding: 1.5rem 2rem; font-style: italic; color: #bfdbfe; background: rgba(59,130,246,0.05); border-radius: 0 1rem 1rem 0; margin: 2rem 0; font-size: 1.1rem; }
                                        .report-content strong { color: #ffffff; font-weight: 800; }
                                        .report-content .finding-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 900; background: rgba(239,68,68,0.1); color: #f87171; margin-right: 0.5rem; text-transform: uppercase; }
                                    `}
                                </style>
                                <div
                                    className="report-content whitespace-pre-wrap leading-relaxed"
                                    dangerouslySetInnerHTML={{
                                        __html: report
                                            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                                            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                                            // Enhanced Finding Card Logic
                                            .replace(/^### \[FINDING\] (.*$)/gm, '<div class="finding-card"><h3><span class="finding-badge">Critical Finding</span> $1</h3>')
                                            .replace(/^### (?!\[FINDING\])(.*$)/gm, '<h3>$1</h3>')
                                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                            .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
                                            .replace(/^- (.*$)/gm, '<li>$1</li>')
                                            // Close finding-card if a new H2 or H1 starts, or at specific markers
                                            .replace(/(<div class="finding-card">.*?)(?=<h2>|<h1>|### \[FINDING\]|$)/gs, '$1</div>')
                                            // Basic table support
                                            .replace(/^\|(.*)\|$/gm, (match) => {
                                                if (match.includes('---')) return '';
                                                const cells = match.split('|').filter(c => c.trim().length > 0);
                                                const tag = match.includes('**') ? 'th' : 'td';
                                                return `<tr>${cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('')}</tr>`;
                                            })
                                            .replace(/(<tr>.*<\/tr>)+/gs, '<table>$&</table>')
                                    }}
                                />
                            </div>

                            {/* Footer Signature Area */}
                            <div className="mt-32 pt-10 border-t border-white/5 flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Generated by</p>
                                    <p className="text-sm font-black text-white">AUDITFLOW PRO CORE</p>
                                    <p className="text-[10px] text-slate-600">Secure Internal Audit System</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Official Validation</p>
                                    <div className="w-20 h-20 border-4 border-white/10 rounded-full flex items-center justify-center rotate-[-15deg] mx-auto opacity-30">
                                        <span className="text-[10px] font-black text-white/40 uppercase">CONFIDENTIAL<br />AUDIT</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Result Action Bar */}
                        <div className="mt-8 flex justify-center gap-4 no-print">
                            <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg active:scale-95">
                                <Download size={16} /> PDF 다운로드
                            </button>
                            <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm active:scale-95">
                                <Share2 size={16} /> 경영진 공유
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
