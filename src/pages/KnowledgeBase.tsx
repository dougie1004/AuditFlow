import React, { useState, useEffect } from 'react';
import { safeInvoke } from "../lib/tauri-bridge";
import { open } from '@tauri-apps/plugin-dialog';
import {
    Upload, Book, FileText, CheckCircle, RefreshCw, Globe,
    Shield, TrendingUp, Trash2, Info,
    Search, Lock
} from 'lucide-react';
import { useAutoAnimate } from '@formkit/auto-animate/react';

interface KnowledgeDoc {
    id: number;
    category: string;
    title: string;
    created_at: string;
}

interface GlobalPattern {
    signature: string;
    sector: string;
    frequency: number;
    impact: number;
    last_detected: string;
}

const KnowledgeBase: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'local' | 'global'>('local');
    const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
    const [patterns, setPatterns] = useState<GlobalPattern[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [parent] = useAutoAnimate();

    useEffect(() => {
        if (activeTab === 'local') fetchDocs();
        else fetchPatterns();
    }, [activeTab]);

    const fetchDocs = async () => {
        setLoading(true);
        try {
            const data = await safeInvoke<KnowledgeDoc[]>('get_knowledge_docs');
            setDocs(data);
        } catch (error) {
            console.error('Failed to fetch docs:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPatterns = async () => {
        if (!isAdmin) return;
        setLoading(true);
        try {
            const data = await safeInvoke<GlobalPattern[]>('get_global_patterns');
            setPatterns(data);
        } catch (error) {
            console.error('Failed to fetch patterns:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDoc = async (id: number) => {
        if (!confirm('정말로 이 지식 문서를 삭제하시겠습니까?')) return;
        try {
            await safeInvoke('delete_knowledge_doc', { id });
            await fetchDocs();
        } catch (error) {
            console.error('Failed to delete doc:', error);
        }
    };

    const handleUpload = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{ name: 'Documents', extensions: ['pdf', 'txt', 'md', 'docx', 'pptx', 'xlsx', 'csv', 'html'] }]
            });

            if (selected && typeof selected === 'string') {
                setUploading(true);
                await safeInvoke('upload_knowledge_doc', { filePath: selected, category: 'External Knowledge' });
                await fetchDocs();
                setUploading(false);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            setUploading(false);
        }
    };

    const toggleAdmin = () => {
        setIsAdmin(!isAdmin);
    };

    return (
        <div className="p-10 space-y-10 animate-fade-in text-slate-100 h-full flex flex-col bg-[#0B1221]">
            {/* Header Section */}
            <header className="flex justify-between items-end">
                <div className="space-y-4">
                    <div
                        onClick={toggleAdmin}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-400 cursor-pointer select-none"
                    >
                        <Shield className="w-3 h-3" />
                        Enterprise Intel Core v4
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter flex items-center gap-4 text-white">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                            <Book className="w-6 h-6 text-white" />
                        </div>
                        Audit Intelligence Center
                    </h1>
                    <p className="text-slate-400 max-w-2xl leading-relaxed text-sm">
                        기업 내부 규정 및 과거 감사 사례를 AI가 학습하여 정교한 이상징후 탐지를 지원합니다.
                        {isAdmin && <span className="text-blue-400 font-bold ml-1">(Admin Mode Active)</span>}
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black text-xs transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50"
                    >
                        {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        NEW KNOWLEDGE
                    </button>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex gap-2 p-1 bg-slate-900/50 border border-white/5 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('local')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'local'
                        ? 'bg-slate-800 text-white shadow-xl ring-1 ring-white/10'
                        : 'text-slate-500 hover:text-slate-300'
                        }`}
                >
                    <FileText className="w-4 h-4" />
                    MY REPOSITORY
                </button>

                {isAdmin && (
                    <button
                        onClick={() => setActiveTab('global')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'global'
                            ? 'bg-blue-600 text-white shadow-xl ring-1 ring-white/10'
                            : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <Globe className="w-4 h-4" />
                        GLOBAL INSIGHTS
                    </button>
                )}
            </div>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden flex flex-col" ref={parent}>
                {activeTab === 'local' ? (
                    <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                        {/* Stats Summary */}
                        <div className="grid grid-cols-4 gap-4">
                            <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl">
                                <div className="text-[10px] font-black text-slate-500 uppercase mb-2">Total Documents</div>
                                <div className="text-2xl font-black text-white">{docs.length}</div>
                            </div>
                            <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl">
                                <div className="text-[10px] font-black text-slate-500 uppercase mb-2">Last Updated</div>
                                <div className="text-2xl font-black text-white">{docs[0]?.created_at.split(' ')[0] || '-'}</div>
                            </div>
                            <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl">
                                <div className="text-[10px] font-black text-slate-500 uppercase mb-2">Sync Status</div>
                                <div className="text-2xl font-black text-emerald-400 flex items-center gap-2">
                                    <CheckCircle className="w-6 h-6" /> Optimized
                                </div>
                            </div>
                            <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl">
                                <div className="text-[10px] font-black text-slate-500 uppercase mb-2">AI Engine</div>
                                <div className="text-2xl font-black text-blue-400">RAG-v4</div>
                            </div>
                        </div>

                        {/* List Section */}
                        <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                                    <Search className="w-4 h-4 text-slate-500" /> Repository Explorer
                                </h3>
                                <div className="flex gap-2">
                                    <button onClick={fetchDocs} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 transition-all">
                                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-2">
                                {docs.length === 0 ? (
                                    <div className="p-20 text-center space-y-4">
                                        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-600">
                                            <Info className="w-8 h-8" />
                                        </div>
                                        <div className="text-slate-400 font-bold">학습 데이터가 없습니다.</div>
                                        <button onClick={handleUpload} className="text-blue-400 text-xs font-black underline underline-offset-4">첫 번째 문서 업로드하기</button>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/5">
                                        {docs.map((doc) => (
                                            <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-all group">
                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                    <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-blue-600/20 group-hover:text-blue-400 transition-all flex-shrink-0">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-sm font-black text-slate-200 group-hover:text-white transition-all truncate">{doc.title}</div>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className="text-[10px] font-black text-blue-500 uppercase px-1.5 py-0.5 bg-blue-500/10 rounded-md border border-blue-500/20">
                                                                {doc.category}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-600">{doc.created_at}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all">
                                                    <div className="text-[10px] font-black text-emerald-500 flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" /> READY
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteDoc(doc.id)}
                                                        className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                                        title="지식 삭제"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto space-y-6 animate-slide-in">
                        <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 p-8 rounded-[32px] border border-blue-500/20 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Globe size={120} />
                            </div>
                            <div className="relative z-10 max-w-2xl">
                                <div className="flex items-center gap-3 mb-6">
                                    <Globe className="text-blue-400" size={32} />
                                    <h3 className="text-2xl font-black text-white tracking-tight uppercase italic">SaaS Collective Intelligence</h3>
                                </div>
                                <p className="text-base text-slate-300 leading-relaxed mb-6 font-medium">
                                    모든 회원사에서 공통적으로 발견되는 최신 리스크 패턴을 분석합니다.
                                    <span className="text-blue-400 font-black"> 완전 익명화</span> 처리된 시그니처만을 제공하여 보안성을 유지합니다.
                                </p>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-xs font-black text-slate-400">
                                    <Lock className="w-3 h-3 text-emerald-400" /> SECURED BY AUDITFLOW AI
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-emerald-500" /> Global Fraud Signatures
                                </h3>
                                <button onClick={fetchPatterns} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 transition-all">
                                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            <div className="divide-y divide-white/5">
                                {patterns.length === 0 ? (
                                    <div className="p-20 text-center text-slate-500 font-bold">감지된 글로벌 패턴이 없습니다.</div>
                                ) : (
                                    patterns.map((pat, idx) => (
                                        <div key={idx} className="p-6 flex items-center justify-between hover:bg-white/[0.01] transition-all">
                                            <div className="flex items-center gap-6 flex-1">
                                                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                                    <Shield size={20} />
                                                </div>
                                                <div>
                                                    <div className="text-base font-black text-white">{pat.signature}</div>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[10px] font-black text-slate-500 uppercase">{pat.sector} SECTOR</span>
                                                        <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                                        <span className="text-[10px] font-bold text-slate-600">Detected: {pat.last_detected}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-xl font-black border border-red-500/20">
                                                    <TrendingUp className="w-4 h-4" />
                                                    {pat.frequency.toLocaleString()} DETECTIONS
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
            `}} />
        </div>
    );
};

export default KnowledgeBase;
