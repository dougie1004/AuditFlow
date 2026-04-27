import React, { useState, useEffect } from 'react';
import { safeInvoke } from '../../lib/tauri-bridge';
import { MessageSquare, Send, X, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface Clarification {
    id: string;
    question: string;
    answer: string | null;
    status: 'PENDING' | 'ANSWERED' | 'RESOLVED';
    created_at: string;
    answered_at: string | null;
    auditee_dept: string;
}

interface ClarificationModalProps {
    issueId: number;
    issueTitle: string;
    onClose: () => void;
}

export const ClarificationModal: React.FC<ClarificationModalProps> = ({ issueId, issueTitle, onClose }) => {
    const [clarifications, setClarifications] = useState<Clarification[]>([]);
    const [newQuestion, setNewQuestion] = useState('');
    const [dept, setDept] = useState('영업팀');
    const [isLoading, setIsLoading] = useState(false);

    const fetchClarifications = async () => {
        try {
            const data = await safeInvoke<Clarification[]>('get_clarifications_by_issue', { issueId });
            setClarifications(data);
        } catch (err) {
            console.error('Failed to fetch clarifications:', err);
        }
    };

    useEffect(() => {
        fetchClarifications();
    }, [issueId]);

    const handleSendRequest = async () => {
        if (!newQuestion.trim()) return;
        setIsLoading(true);
        try {
            await safeInvoke('create_clarification_request', { 
                issueId, 
                question: newQuestion, 
                auditeeDept: dept 
            });
            setNewQuestion('');
            fetchClarifications();
        } catch (err) {
            alert('요청 실패: ' + err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#1A2333] border border-white/10 w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex justify-between items-start bg-gradient-to-r from-blue-600/10 to-transparent">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <MessageSquare className="text-blue-400 w-5 h-5" />
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Clarification Loop</span>
                        </div>
                        <h2 className="text-xl font-black text-white tracking-tight leading-tight">
                            {issueTitle}
                        </h2>
                        <p className="text-slate-500 text-xs mt-1 font-medium">피감사 부서에 사실 관계 확인을 요청합니다.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content - Chat-like history */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    {clarifications.length === 0 ? (
                        <div className="py-12 text-center">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                                <Clock className="text-slate-600" />
                            </div>
                            <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">등록된 소명 요청이 없습니다.</p>
                        </div>
                    ) : (
                        clarifications.map((c) => (
                            <div key={c.id} className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
                                {/* Question (Auditor) */}
                                <div className="flex flex-col items-end">
                                    <div className="bg-blue-600 text-white p-5 rounded-3xl rounded-tr-none max-w-[85%] shadow-lg shadow-blue-900/20">
                                        <p className="text-sm font-bold leading-relaxed">{c.question}</p>
                                        <div className="mt-3 flex items-center gap-2 text-[10px] opacity-60 font-black">
                                            <span>{c.auditee_dept} 앞</span>
                                            <span>•</span>
                                            <span>{c.created_at}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Answer (Auditee) */}
                                {c.answer ? (
                                    <div className="flex flex-col items-start">
                                        <div className="bg-white/5 border border-white/10 text-slate-200 p-5 rounded-3xl rounded-tl-none max-w-[85%]">
                                            <div className="flex items-center gap-2 mb-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                                <CheckCircle size={12} /> 피감사 부서 답변 수신
                                            </div>
                                            <p className="text-sm font-medium leading-relaxed">{c.answer}</p>
                                            <div className="mt-3 text-[10px] text-slate-600 font-black">
                                                {c.answered_at}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-start">
                                        <div className="bg-amber-500/5 border border-amber-500/20 text-amber-500/60 p-4 rounded-2xl flex items-center gap-3 italic text-xs font-bold">
                                            <Clock size={14} className="animate-pulse" /> 답변 대기 중...
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer - Input */}
                <div className="p-8 bg-black/20 border-t border-white/5">
                    <div className="flex gap-4 mb-4">
                        <select 
                            value={dept} 
                            onChange={(e) => setDept(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-black text-slate-400 outline-none focus:border-blue-500/50 transition-all"
                        >
                            <option value="영업팀">영업팀</option>
                            <option value="재무팀">재무팀</option>
                            <option value="인사팀">인사팀</option>
                            <option value="IT운영팀">IT운영팀</option>
                        </select>
                        <span className="text-[10px] font-black text-slate-600 uppercase self-center tracking-widest">대상 부서 선택</span>
                    </div>
                    <div className="relative">
                        <textarea
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            placeholder="확인이 필요한 사항을 입력하세요..."
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 pr-16 text-sm text-white placeholder:text-slate-700 outline-none focus:border-blue-500/50 transition-all resize-none h-24 font-medium"
                        />
                        <button 
                            onClick={handleSendRequest}
                            disabled={isLoading || !newQuestion.trim()}
                            className="absolute right-4 bottom-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white p-3 rounded-xl transition-all shadow-xl shadow-blue-900/40 active:scale-95"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
            `}} />
        </div>
    );
};
