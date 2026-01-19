import { useState, useEffect } from "react";
import { safeInvoke } from "../lib/tauri-bridge";
import { AlertCircle, User, Mic, Send, Bot, CheckCircle2, Zap, Terminal } from "lucide-react";

interface AuditIssue { id: number; source: string; title: string; description: string; date: string; status: string; risk: string; }

export default function IssueTracker() {
    const [issues, setIssues] = useState<AuditIssue[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data: AuditIssue[] = await safeInvoke("get_audit_issues");
                setIssues(data);
            } catch (err) { console.error(err); }
        };
        fetchData();
    }, []);

    return (
        <div className="p-10 bg-[#0B1221] min-h-screen text-slate-300 font-sans">
            <div className="max-w-[1400px] mx-auto space-y-12">
                <div className="animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-600 rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                            <Terminal className="text-white w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Command & Control</span>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">탐지 리스크 및 제보 <span className="text-blue-500">Compliance Feed</span></h1>
                    <p className="text-slate-500 font-medium mt-3 text-lg max-w-2xl">경영진 특별 실사 지시 수행 및 내부 제보 처리, 컴플라이언스 위험 현황을 모니터링합니다.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* 좌측: 경영진 지시사항 입력 패널 */}
                    <div className="lg:col-span-7 bg-white/5 border border-white/10 rounded-[40px] p-10 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12"><User size={200} /></div>
                        <h3 className="text-xl font-black mb-8 text-white flex items-center gap-4 relative z-10 uppercase italic">
                            <User size={20} className="text-blue-500" /> 경영진 특별 실사 지시 <span className="text-slate-600 font-medium">(Executive Directive)</span>
                        </h3>
                        <div className="relative z-10">
                            <textarea
                                placeholder="경영진의 특별 실사 지시사항을 입력하세요 (예: 최근 3월간 광고선전비 지출 내역 중 중복 지급된 건이 있는지 조사해 봐.)"
                                className="w-full h-48 bg-black/40 p-8 rounded-3xl border border-white/5 resize-none outline-none text-base text-slate-200 font-medium transition-all focus:border-blue-500/50 focus:ring-4 ring-blue-500/5 placeholder:text-slate-700"
                            />
                            <div className="absolute right-6 bottom-6 flex gap-3">
                                <button className="bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 p-4 rounded-2xl transition-all">
                                    <Mic size={18} />
                                </button>
                                <button className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-900/40 flex items-center gap-3 active:scale-95">
                                    <Send size={16} /> AI 실사 분석 요청
                                </button>
                            </div>
                        </div>
                        <div className="mt-8 p-5 bg-blue-600/5 border border-blue-600/10 rounded-2xl flex items-center gap-4 relative z-10 transition-all hover:bg-blue-600/10">
                            <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/20">
                                <Bot size={20} className="text-blue-400" />
                            </div>
                            <p className="text-[11px] font-black text-blue-400 uppercase tracking-widest leading-relaxed">
                                Forensic Core: 요청 시점 기준, AI가 전사 ERP 원장과 비정형 문서(전자결재, 메신저 로그)를 즉각 교차 실사 분석합니다.
                            </p>
                        </div>
                    </div>

                    {/* 우측: 실시간 이슈 피드 (Today's AI Briefing) */}
                    <div className="lg:col-span-5 bg-white/5 border border-white/10 rounded-[40px] p-10 shadow-2xl flex flex-col h-full">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-xl font-black text-white flex items-center gap-4 uppercase italic">
                                <Zap size={20} className="text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]" /> AI Live Briefing (리스크 브리핑)
                            </h3>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">초정밀 리스크 모니터링</span>
                            </div>
                        </div>
                        <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {issues.map(issue => (
                                <div key={issue.id} className="p-6 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-all group cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500">
                                    <div className="flex gap-5">
                                        <div className="shrink-0 mt-1">
                                            {issue.risk === "High" ? <AlertCircle size={22} className="text-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse" /> : <CheckCircleSmall status={issue.status} />}
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{issue.date.split(" ")[1]} • {issue.source}</span>
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${issue.risk === 'High' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-blue-500/10 text-blue-400'}`}>{issue.risk}</span>
                                            </div>
                                            <div className="text-base font-black text-white group-hover:text-blue-400 transition-colors tracking-tight">{issue.title}</div>
                                            <div className="text-xs text-slate-500 font-medium leading-relaxed bg-black/20 p-4 rounded-2xl border border-white/5">
                                                {issue.description}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {issues.length === 0 && (
                                <div className="py-24 text-center border-4 border-dashed border-white/5 rounded-[40px] text-slate-700 font-black uppercase tracking-widest">
                                    최근 탐지된 긴급 리스크가 <br />없습니다. (24h 기준)
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
            `}} />
        </div>
    );
}

function CheckCircleSmall({ status }: { status: string }) {
    const colorClass = status === "New" ? "text-blue-500" : "text-emerald-500";
    return (
        <CheckCircle2 size={22} className={colorClass} />
    );
}