import { useState, useRef, useEffect } from "react";
import { safeInvoke } from "../lib/tauri-bridge";
import {
    Bot, User, Sparkles, Wand2,
    MessageSquare, Zap, Target,
    ArrowRight, Loader2, ShieldCheck
} from "lucide-react";
import { useApp } from "../App";

interface Message {
    role: "bot" | "user";
    content: string;
    type?: "standard" | "management" | "search";
}

const SuggestionChip = ({ label, onClick, icon: Icon }: any) => (
    <button
        onClick={() => onClick(label)}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-slate-400 hover:border-blue-500/50 hover:text-white hover:bg-blue-600/10 transition-all shadow-sm"
    >
        {Icon && <Icon size={12} className="text-blue-500" />}
        {label}
    </button>
);

export default function AIAssistant() {
    const { activeProject } = useApp();
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "bot",
            content: "반갑습니다. AI 감사 분석관입니다. 대량의 데이터에서 리스크 패턴을 찾거나, 경영진 보고를 위한 핵심 요약이 필요하시면 언제든 말씀해 주세요."
        }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async (customText?: string) => {
        const text = customText || input;
        if (!text.trim()) return;

        const userMsg: Message = { role: "user", content: text };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        try {
            const response: string = await safeInvoke("ask_ai_assistant", {
                message: text,
                projectId: activeProject
            });

            // 시뮬레이션 지연 (AI 느낌)
            setTimeout(() => {
                setMessages(prev => [...prev, { role: "bot", content: response }]);
                setIsTyping(false);
            }, 800);
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: "bot", content: "죄송합니다. 요청을 처리하는 중에 오류가 발생했습니다." }]);
            setIsTyping(false);
        }
    };

    const suggestions = [
        { label: "경영진 보고용 핵심 요약 생성해줘", icon: Target },
        { label: "법인카드 사적 유용 의심 리스트 찾아줘", icon: ShieldCheck },
        { label: "최근 탐지된 고위험 이슈 현황 알려줘", icon: Zap },
        { label: "중복 결제 의심 거래 패턴 분석", icon: MessageSquare }
    ];

    return (
        <div className="h-screen flex flex-col bg-[#0B1221] relative overflow-hidden text-slate-300">
            {/* Background Decoration */}
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] opacity-30 z-0"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[100px] opacity-20 z-0"></div>

            {/* Header Content */}
            <div className="px-12 pt-12 pb-6 z-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                        <Sparkles className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">AI Audit Assistant</h1>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mt-1">Enterprise-Grade Forensic Engine</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {suggestions.map((s, i) => (
                        <SuggestionChip key={i} label={s.label} icon={s.icon} onClick={handleSend} />
                    ))}
                </div>
            </div>

            {/* Chat Container */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-12 py-6 space-y-8 z-10 scroll-smooth custom-scrollbar"
            >
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"} animate-in fade-in slide-in-from-bottom-4 duration-500`}
                    >
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${msg.role === "bot" ? "bg-slate-800 text-blue-400 border border-white/5" : "bg-blue-600 text-white shadow-blue-900/40"
                            }`}>
                            {msg.role === "bot" ? <Bot size={20} /> : <User size={20} />}
                        </div>

                        <div className={`max-w-[75%] group`}>
                            <div className={`px-6 py-4 rounded-[24px] shadow-sm border leading-relaxed ${msg.role === "bot"
                                ? "bg-white/5 border-white/10 text-slate-200"
                                : "bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-950/20"
                                }`}>
                                <div className="text-[14px] font-medium whitespace-pre-wrap">
                                    {msg.content}
                                </div>
                            </div>
                            <div className={`mt-2 flex items-center gap-2 px-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">
                                    {msg.role === "bot" ? "AI ANALYST • ACTIVE" : "AUDITOR • VERIFIED"}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex gap-4 animate-in fade-in duration-300">
                        <div className="w-10 h-10 rounded-2xl bg-slate-800 text-blue-400 border border-white/5 flex items-center justify-center flex-shrink-0">
                            <Bot size={20} className="animate-pulse" />
                        </div>
                        <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-[24px] flex items-center gap-3 shadow-sm">
                            <Loader2 size={16} className="text-blue-500 animate-spin" />
                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] antialiased">
                                Synthesizing insights...
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Wrapper */}
            <div className="px-12 pb-10 pt-4 z-10 bg-gradient-to-t from-[#0B1221] via-[#0B1221] to-transparent">
                <div className="max-w-[1000px] mx-auto relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[32px] blur opacity-10 group-focus-within:opacity-20 transition-opacity"></div>
                    <div className="relative flex items-center bg-slate-900 border border-white/10 rounded-[28px] shadow-2xl overflow-hidden focus-within:border-blue-500/50 transition-all">
                        <div className="pl-6 text-slate-600">
                            <Wand2 size={24} />
                        </div>
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="명령어를 입력하거나 궁금한 이상 데이터에 대해 질문하세요..."
                            className="flex-1 bg-transparent px-4 py-8 text-[15px] font-medium text-white outline-none placeholder:text-slate-600"
                        />
                        <div className="pr-4">
                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim()}
                                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${input.trim()
                                    ? "bg-blue-600 text-white shadow-xl shadow-blue-900/20 hover:scale-105 active:scale-95"
                                    : "bg-slate-800 text-slate-600"
                                    }`}
                            >
                                <ArrowRight size={24} />
                            </button>
                        </div>
                    </div>
                </div>
                <p className="text-center mt-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] opacity-50">
                    Proprietary Forensic engine v4.0.5 • Enterprise Secure
                </p>
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