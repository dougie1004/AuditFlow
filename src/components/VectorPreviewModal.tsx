import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { X, ShieldCheck, Eye, Database, ArrowRight } from 'lucide-react';

interface VectorPreviewProps {
    isOpen: boolean;
    onClose: () => void;
    rawText: string;
}

interface VectorPayload {
    evidence_hash: string;
    extracted_signals: string[];
    meta_dimension: Record<string, string>;
    masked_snippet: string | null;
}

const VectorPreviewModal: React.FC<VectorPreviewProps> = ({ isOpen, onClose, rawText }) => {
    const [vectorData, setVectorData] = useState<VectorPayload | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && rawText) {
            fetchVector();
        }
    }, [isOpen, rawText]);

    const fetchVector = async () => {
        setLoading(true);
        try {
            const data = await invoke<VectorPayload>('preview_vectorization', { rawText });
            setVectorData(data);
        } catch (error) {
            console.error("Vector preview failed:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        // Z-Index 9999 to cover sidebar, w-[95vw] to use full screen width
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-[#0f172a] border border-cyan-500/30 rounded-2xl w-[95vw] max-w-7xl shadow-2xl relative overflow-hidden flex flex-col h-[85vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="w-6 h-6 text-cyan-400" />
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-3">
                                AI 데이터 전송 시뮬레이션
                                <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30 tracking-widest uppercase">
                                    Level 2 Privacy
                                </span>
                            </h2>
                            <p className="text-sm text-slate-400 mt-1">
                                실제 AI 서버로 전송되는 것은 텍스트가 아닌 <strong>추상화된 신호(Signal Vector)</strong>뿐입니다.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 items-stretch overflow-hidden h-full">

                    {/* Left: Raw Data (User View) */}
                    <div className="flex flex-col gap-4 min-w-0 h-full overflow-hidden">
                        <div className="flex items-center gap-2 text-rose-400 font-semibold mb-2 shrink-0">
                            <Database className="w-4 h-4" />
                            <span>원본 데이터 (Local Only)</span>
                        </div>
                        <div className="bg-slate-900/80 p-6 rounded-xl border border-rose-500/20 shadow-inner h-full font-mono text-sm text-slate-300 leading-relaxed whitespace-pre-wrap break-all overflow-y-auto custom-scrollbar relative group">
                            {rawText}
                            <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
                        </div>
                        <div className="text-xs text-rose-500/70 text-center shrink-0">
                            * 이 데이터는 절대 외부 서버로 전송되지 않습니다.
                        </div>
                    </div>
                    {/* Center: Transformation Arrow */}
                    <div className="flex flex-col items-center justify-center gap-4 text-slate-500">
                        <div className="h-full w-px bg-gradient-to-b from-transparent via-white/10 to-transparent absolute left-1/2 -z-10" />
                        <div className="p-3 rounded-full bg-slate-800 border border-slate-700 shadow-xl z-10 animate-pulse">
                            <ArrowRight className="w-6 h-6 text-cyan-400" />
                        </div>
                        <span className="text-xs font-mono tracking-widest uppercase">Signal Vectorization</span>
                    </div>

                    {/* Right: Vector Data (AI View) */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-2">
                            <Eye className="w-4 h-4" />
                            <span>AI가 보는 신호 (Cloud Payload)</span>
                        </div>

                        {loading ? (
                            <div className="bg-slate-900/80 p-5 rounded-xl border border-cyan-500/20 h-full flex items-center justify-center">
                                <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
                            </div>
                        ) : vectorData ? (
                            <div className="bg-slate-900/80 p-5 rounded-xl border border-cyan-500/20 h-full flex flex-col gap-4 font-mono text-sm overflow-y-auto">
                                {/* 1. Signals */}
                                <div>
                                    <div className="text-xs text-slate-500 uppercase mb-2">Detected Signals</div>
                                    <div className="flex flex-wrap gap-2">
                                        {vectorData.extracted_signals.length > 0 ? (
                                            vectorData.extracted_signals.map((sig, idx) => {
                                                let style = "bg-cyan-500/10 text-cyan-300 border-cyan-500/30";
                                                if (sig.startsWith("TIME:")) style = "bg-amber-500/10 text-amber-400 border-amber-500/30";
                                                else if (sig.startsWith("CTX:")) style = "bg-purple-500/10 text-purple-400 border-purple-500/30";
                                                else if (sig.startsWith("LOCATION:")) style = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
                                                else if (sig.startsWith("PATTERN:")) style = "bg-rose-500/10 text-rose-400 border-rose-500/30";
                                                else if (sig.startsWith("AMOUNT_BUCKET:")) style = "bg-blue-500/10 text-blue-300 border-blue-500/30";

                                                return (
                                                    <span key={idx} className={`px-2 py-1 rounded border text-xs ${style}`}>
                                                        {sig}
                                                    </span>
                                                );
                                            })
                                        ) : (
                                            <span className="text-slate-600 italic">No significant signals detected.</span>
                                        )}
                                    </div>
                                </div>

                                {/* 2. Hash */}
                                <div>
                                    <div className="text-xs text-slate-500 uppercase mb-2">Evidence Hash (Zero-Knowledge)</div>
                                    <div className="break-all text-[10px] text-slate-400 bg-black/30 p-2 rounded">
                                        {vectorData.evidence_hash}
                                    </div>
                                </div>

                                {/* 3. Snippet Check */}
                                <div>
                                    <div className="text-xs text-slate-500 uppercase mb-2">Raw Text Snippet</div>
                                    <div className={`p-2 rounded text-xs border ${vectorData.masked_snippet === null ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                        {vectorData.masked_snippet === null ? "✅ NONE (Safe)" : "❌ LEAK DETECTED"}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-slate-500 text-center mt-10">데이터 로드 실패</div>
                        )}

                        <div className="text-xs text-cyan-500/70 text-center">
                            * AI는 오직 이 신호들만 보고 추론합니다.
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default VectorPreviewModal;
