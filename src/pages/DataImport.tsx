import React, { useState, useEffect, useCallback, useRef } from 'react';
import { safeInvoke, safeListen } from '../lib/tauri-bridge';
import { pickFiles, uploadFile } from '../services/fileService';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import {
    Upload, Trash2, CheckCircle, FileText,
    FileSpreadsheet, Loader2, Eye, File, BrainCircuit, X, Terminal,
    ShieldAlert, ShieldCheck, Lock, Unlock, Shield
} from 'lucide-react';
import { useAudit } from '../context/AuditContext';

// --- 디자인 컴포넌트 ---
const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl ${className}`}>{children}</div>
);

const Badge = ({ children, variant }: { children: React.ReactNode; variant: 'success' | 'warning' | 'blue' | 'default' }) => {
    const styles = {
        success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        default: "bg-slate-800 text-slate-400 border-white/5"
    };
    return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight border whitespace-nowrap ${styles[variant]}`}>{children}</span>;
};

const Checkbox = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <div onClick={onChange} className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors flex-shrink-0 ${checked ? 'bg-blue-600 border-blue-600' : 'border-white/10 bg-black/20 hover:border-blue-500'}`}>
        {checked && <CheckCircle className="w-3.5 h-3.5 text-white" />}
    </div>
);

// --- AI 분석 시뮬레이션 오버레이 ---
const AnalysisOverlay = ({ isOpen, onClose, selectedFileIds, onComplete, projectType, enableMasking }: { isOpen: boolean; onClose: () => void; selectedFileIds: number[]; onComplete: () => void; projectType: string; enableMasking: boolean }) => {
    const [logs, setLogs] = useState<string[]>([]);
    const [riskyFindings, setRiskyFindings] = useState<any[]>([]);
    const [progress, setProgress] = useState(0);
    const [step, setStep] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    const steps = [
        "데이터 무결성 검증 및 포맷 확인",
        "비정형 텍스트 추출 (OCR/Parsing)",
        "Google Gemini 3.0 Pro AI 파이프라인 연결",
        "감사 시나리오 매핑 중...",
        "부정 징후 패턴 매칭 및 스코어링",
        "최종 리포트 생성 중"
    ];

    useEffect(() => {
        if (!isOpen) {
            setLogs([]);
            setProgress(0);
            setStep(0);
            return;
        }

        let unlisten: (() => void) | undefined;

        const setupListener = async () => {
            unlisten = await safeListen<any>('analysis-progress', (event: any) => {
                const { progress, message, step: currentStep } = event.payload;
                setProgress(progress);
                setLogs(prev => [...prev, message]);
                setStep(currentStep);
            });
        };

        let unlistenRisk: (() => void) | undefined;
        const setupRiskListener = async () => {
            unlistenRisk = await safeListen<any>('risk-detected', (event: any) => {
                setRiskyFindings(prev => [...prev, event.payload]);
            });
        };

        setupRiskListener();

        const runAnalysis = async () => {
            try {
                // Pass selectedFileIds to enable incremental analysis (backend will skip deleting existing issues)
                const res: any = await safeInvoke('run_audit_analysis', {
                    projectType,
                    enableMasking,
                    targetFileIds: selectedFileIds.length > 0 ? selectedFileIds : undefined
                });

                setLogs(prev => [...prev, `✅ Analysis Complete. Files: ${res.analyzed_files}, Detections: ${res.findings_count || 0}`]);
                if (res.status === "Success") {
                    setTimeout(() => {
                        onComplete();
                    }, 1000);
                }
            } catch (err) {
                setLogs(prev => [...prev, `[ERROR] 분석 중 치명적 오류: ${err}`]);
                console.error("Analysis Error:", err);
                setTimeout(() => onClose(), 3000);
            }
        };

        setupListener();
        runAnalysis();

        return () => {
            if (unlisten) unlisten();
            if (unlistenRisk) unlistenRisk();
        };
    }, [isOpen]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 md:p-10">
            <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] relative">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500 blur-lg opacity-20 animate-pulse"></div>
                            <BrainCircuit className="w-8 h-8 text-blue-400 relative z-10 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">AI 정밀 실사 엔진 가동 중</h2>
                            <p className="text-slate-400 text-sm">
                                {selectedFileIds.length > 0 ? `선택된 ${selectedFileIds.length}개 파일 증분 분석 중` : `총 ${selectedFileIds.length}개 파일 전체 분석 중`}
                                : {progress.toFixed(0)}%
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Process Steps</h3>
                            {steps.map((s, idx) => (
                                <div key={idx} className={`flex items-center gap-3 text-sm ${idx <= step ? 'text-blue-400' : 'text-slate-600'}`}>
                                    {idx < step ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : idx === step ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="w-4 h-4 rounded-full border border-slate-700" />}
                                    <span className={idx === step ? "font-bold animate-pulse" : ""}>{s}</span>
                                </div>
                            ))}
                        </div>

                        <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs border border-slate-800 h-48 flex flex-col relative">
                            <div className="flex items-center gap-2 text-slate-500 border-b border-slate-800 pb-2 mb-2">
                                <Terminal className="w-3 h-3" />
                                <span>ComplianceFlow 분석 로그</span>
                            </div>
                            <div ref={scrollRef} className="overflow-y-auto flex-1 space-y-1 text-slate-300">
                                {riskyFindings.length > 0 && (
                                    <div className="mb-4 space-y-2">
                                        <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest border-b border-rose-500/20 pb-1">⚠️ High Risk Alerts Detected</p>
                                        {riskyFindings.map((rf, idx) => (
                                            <div key={idx} className="bg-rose-500/10 border border-rose-500/20 p-2 rounded text-[10px] text-rose-400 font-bold">
                                                [{rf.file_name}] {rf.title}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {logs.map((log, i) => (
                                    <div key={i} className="opacity-80 font-mono text-[10px]">&gt; {log}</div>
                                ))}
                                <div className="animate-pulse text-blue-500">&gt; _</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 미리보기 모달 ---
const PreviewModal = ({ isOpen, onClose, fileName, data, onViewAll, isFullData, isMasked, onToggleMasking, piiCount }: {
    isOpen: boolean;
    onClose: () => void;
    fileName: string;
    data: string[][];
    onViewAll?: () => void;
    isFullData?: boolean;
    isMasked: boolean;
    onToggleMasking: (masked: boolean) => void;
    piiCount: number;
}) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[2000] flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-100">
            <div className="bg-[#0B1221] rounded-3xl shadow-[0_30px_100px_rgba(0,0,0,0.6)] w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-white/10">
                <div className="p-5 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/20">
                    <div className="flex flex-col">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            {fileName.toLowerCase().endsWith('.pdf') ? <FileText className="w-5 h-5 text-rose-500" /> :
                                fileName.toLowerCase().endsWith('.docx') ? <FileText className="w-5 h-5 text-blue-500" /> :
                                    <FileSpreadsheet className="w-5 h-5 text-green-600" />} {fileName}
                        </h3>
                        {piiCount > 0 && (
                            <div className="flex items-center gap-1.5 mt-1">
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-[11px] text-amber-600 font-bold uppercase tracking-tight">민감 정보 {piiCount}건 탐지됨</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/5">
                        <button
                            onClick={() => onToggleMasking(false)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!isMasked ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            원본 데이터 (Original)
                        </button>
                        <button
                            onClick={() => onToggleMasking(true)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${isMasked ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <Lock className={`w-3 h-3 ${isMasked ? 'text-white' : 'text-slate-400'}`} />
                            비식별화 데이터 (Anonymized)
                        </button>
                    </div>

                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors hidden md:block"><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="overflow-auto p-0 flex-1 bg-transparent">
                    <table className="w-full text-left border-collapse text-sm">
                        <tbody className="divide-y divide-white/5">
                            {Array.isArray(data) && data.map((row, rowIndex) => (
                                <tr key={rowIndex} className="border-b border-white/5 hover:bg-white/5">
                                    <td className="bg-black/20 text-slate-500 p-3 text-[10px] w-12 text-center font-mono border-r border-white/5">{rowIndex + 1}</td>
                                    {row.map((cell, cellIndex) => (
                                        <td key={cellIndex}
                                            className={`p-3 text-slate-300 border-r border-white/5 last:border-0 ${row.length === 1 ? 'whitespace-pre-wrap break-all leading-relaxed' : 'whitespace-nowrap truncate max-w-[300px]'}`}
                                            title={cell}>
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(!data || data.length === 0) && <div className="p-10 text-center text-slate-400">데이터를 불러올 수 없거나 비어있습니다.</div>}
                </div>
                <div className="p-4 border-t border-white/5 bg-black/20 flex justify-between items-center">
                    <div className="text-xs text-slate-500 font-medium">
                        총 {data.length}개 행 표시 중
                    </div>
                    <div className="flex gap-2">
                        {!isFullData && data.length >= 50 && (
                            <button
                                onClick={onViewAll}
                                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-900/40"
                            >
                                전수 데이터 보기 (모두 로드)
                            </button>
                        )}
                        <button onClick={onClose} className="px-5 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 font-bold text-xs uppercase tracking-widest transition-colors">닫기</button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- 메인 컴포넌트 ---
interface AuditFile { id: number; file_name: string; file_type: string; file_path: string; upload_date: string; }

export default function DataImport() {
    const { activeProject } = useApp();
    const { setState } = useAudit();
    const [files, setFiles] = useState<AuditFile[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewData, setPreviewData] = useState<string[][]>([]);
    const [previewFileName, setPreviewFileName] = useState("");
    const [previewFilePath, setPreviewFilePath] = useState("");
    const [isFullPreview, setIsFullPreview] = useState(false);
    const [analysisOpen, setAnalysisOpen] = useState(false);
    const [enableMasking, setEnableMasking] = useState(true);
    const [piiNotifications, setPiiNotifications] = useState<{ name: string, count: number, id: number }[]>([]);
    const [isPreviewMasked, setIsPreviewMasked] = useState(false);
    const [previewPiiCount, setPreviewPiiCount] = useState(0);

    const navigate = useNavigate();
    const projectType = activeProject || "Unknown";

    const fetchFiles = useCallback(async () => {
        if (!activeProject) return;
        try {
            const res = await safeInvoke('get_files_by_type', { projectType });
            if (Array.isArray(res)) {
                setFiles(res as AuditFile[]);
                setState((prev: any) => ({ ...prev, files: res }));
            }
            else setFiles([]);
            setSelectedIds(new Set());
        } catch (err) {
            console.error("목록 로드 실패:", err);
            setFiles([]);
        }
    }, [activeProject, projectType]);

    useEffect(() => { fetchFiles(); }, [fetchFiles]);

    const handleUpload = async () => {
        setIsLoading(true);
        try {
            const selected = await pickFiles();
            if (selected) {
                const fileList = selected instanceof FileList ? Array.from(selected) : selected;
                for (const item of fileList) {
                    try {
                        const res: any = await uploadFile(projectType, item);
                        if (res.pii_count > 0) {
                            const newNoti = { name: res.file_name, count: res.pii_count, id: Date.now() + Math.random() };
                            setPiiNotifications(prev => [...prev, newNoti]);

                            // [UX] Auto-dismiss after 3 seconds
                            setTimeout(() => {
                                setPiiNotifications(prev => prev.filter(n => n.id !== newNoti.id));
                            }, 3000);
                        }
                    } catch (e) { console.error(e); }
                }
                const updatedFiles = await safeInvoke('get_files_by_type', { projectType }) as AuditFile[];
                setFiles(updatedFiles);
                setState((prev: any) => ({ ...prev, files: updatedFiles }));
                setSelectedIds(new Set(updatedFiles.map(f => f.id)));
            }
        } catch (err) { alert("오류: " + JSON.stringify(err)); } finally { setIsLoading(false); }
    };

    const toggleSelectAll = () => { setSelectedIds(selectedIds.size === files.length ? new Set() : new Set(files.map(f => f.id))); };
    const toggleSelect = (id: number) => { const newSet = new Set(selectedIds); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedIds(newSet); };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        if (confirm(`선택한 ${selectedIds.size}개를 삭제하시겠습니까?`)) {
            for (const id of selectedIds) await safeInvoke('delete_audit_file', { id });
            fetchFiles();
        }
    };

    const handlePreview = async (filePath: string, fileName: string, limit?: number, masked?: boolean) => {
        try {
            const command = masked ? 'get_masked_preview' : 'get_file_preview';
            const data: string[][] = await safeInvoke(command, { filePath: filePath, limit: limit });

            // Find PII count for this file to show in modal
            // This is a bit simplified, ideally we'd get PII count from the DB or command
            // For now we use the notification count if it exists
            const piiMatch = piiNotifications.find(n => n.name === fileName);
            setPreviewPiiCount(piiMatch ? piiMatch.count : 0);

            setPreviewData(data);
            setPreviewFileName(fileName);
            setPreviewFilePath(filePath);
            setIsFullPreview(limit === 0);
            setIsPreviewMasked(masked || false);
            setPreviewOpen(true);
        } catch (err) { alert("미리보기 실패: " + err); }
    };

    const handleTogglePreviewMasking = (masked: boolean) => {
        handlePreview(previewFilePath, previewFileName, isFullPreview ? 0 : 50, masked);
    };

    const handleViewAll = () => {
        handlePreview(previewFilePath, previewFileName, 0);
    };

    const getFileIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (['xlsx', 'csv'].includes(ext || '')) return <FileSpreadsheet className="w-5 h-5" />;
        return <File className="w-5 h-5" />;
    };

    return (
        <div className="p-4 md:p-8 w-full max-w-7xl mx-auto space-y-12 pb-48 min-h-screen bg-[#0B1221] relative text-slate-200">

            {/* PII Detection Notifications */}
            <div className="fixed top-24 right-8 z-[3000] flex flex-col gap-3 max-w-sm">
                {piiNotifications.map((noti) => (
                    <div key={noti.id} className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 animate-in slide-in-from-right-full duration-200 relative flex gap-3 overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                        <ShieldAlert className="w-10 h-10 text-amber-500 flex-shrink-0" />
                        <div>
                            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest leading-none mb-1">Security Alert</p>
                            <h4 className="font-bold text-sm mb-0.5 truncate">{noti.name}</h4>
                            <p className="text-xs text-slate-400">
                                <span className="text-white font-bold">{noti.count}개</span>의 민감 정보(카드/성명/조합형 등)가 탐지되었습니다. <span className="text-blue-400 font-bold underline">비식별화 모드</span>가 권장됩니다.
                            </p>
                        </div>
                        <button onClick={() => setPiiNotifications(prev => prev.filter(n => n.id !== noti.id))} className="absolute top-2 right-2 p-1 hover:bg-slate-800 rounded-lg text-slate-500">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            <PreviewModal
                isOpen={previewOpen}
                onClose={() => setPreviewOpen(false)}
                fileName={previewFileName}
                data={previewData}
                onViewAll={handleViewAll}
                isFullData={isFullPreview}
                isMasked={isPreviewMasked}
                onToggleMasking={handleTogglePreviewMasking}
                piiCount={previewPiiCount}
            />

            <AnalysisOverlay
                isOpen={analysisOpen}
                onClose={() => setAnalysisOpen(false)}
                selectedFileIds={Array.from(selectedIds)}
                projectType={projectType}
                enableMasking={enableMasking}
                onComplete={() => {
                    setAnalysisOpen(false);
                    navigate('/ai-discovery');
                }}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 md:p-10 bg-white/5 rounded-[40px] shadow-2xl border border-white/10">
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase italic">실사 데이터 업로드 <span className="text-blue-500">.</span></h1>
                    <p className="text-sm md:text-base text-slate-400 font-medium">데이터 무결성 검증 및 Google Gemini 3.0 Pro AI 파이프라인 연결</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 md:gap-4 w-full md:w-auto">
                    <button onClick={handleUpload} disabled={isLoading} className="flex items-center justify-center gap-3 bg-white text-black px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-100 transition-all shadow-2xl disabled:opacity-70 active:scale-95 w-full md:w-auto cursor-pointer">
                        {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Upload className="w-5 h-5" />}
                        <span className="whitespace-nowrap">{isLoading ? "업로드 중..." : "데이터 업로드"}</span>
                    </button>
                </div>
            </div>

            <Card className="overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-black/20 flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-3">
                        <Checkbox checked={files.length > 0 && selectedIds.size === files.length} onChange={toggleSelectAll} />
                        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            현황: {files.length} 자산 / {selectedIds.size} 선택됨
                        </h2>
                    </div>
                    {selectedIds.size > 0 && (
                        <button onClick={handleDeleteSelected} className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ml-auto">
                            <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">선택 삭제</span>
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-[#0B1221] text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-white/5">
                                <th className="p-4 pl-8 w-12 text-center">ID</th>
                                <th className="p-4">FILE IDENTIFIER</th>
                                <th className="p-4">EXT</th>
                                <th className="p-4">PII SCAN</th>
                                <th className="p-4 text-right pr-12">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {files.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-32 text-center">
                                        <div className="flex flex-col items-center gap-6 text-slate-600">
                                            <div className="w-24 h-24 bg-white/5 border border-white/5 rounded-full flex items-center justify-center animate-pulse">
                                                <Upload className="w-10 h-10 opacity-20" />
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-xl font-black text-white italic uppercase tracking-wider">Storage is Empty</p>
                                                <p className="text-sm font-medium opacity-60">No assets detected in the current audit scope.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                files.map((file) => (
                                    <tr key={file.id} className={`hover:bg-blue-500/5 transition-colors border-b border-white/5 ${selectedIds.has(file.id) ? 'bg-blue-600/5' : ''}`}>
                                        <td className="p-4 pl-8">
                                            <Checkbox checked={selectedIds.has(file.id)} onChange={() => toggleSelect(file.id)} />
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/5 flex-shrink-0 flex items-center justify-center text-slate-500 hidden sm:flex">
                                                    {getFileIcon(file.file_name)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-black text-sm text-white tracking-tight truncate max-w-[200px] md:max-w-[400px]">{file.file_name}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{file.upload_date}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{file.file_name.split('.').pop()}</td>
                                        <td className="p-4">
                                            <Badge variant={file.file_type.includes('비정형') ? 'warning' : 'blue'}>
                                                {file.file_type}
                                            </Badge>
                                        </td>
                                        <td className="p-4 text-right pr-12">
                                            <div className="flex justify-end gap-3 text-slate-500 scale-90">
                                                <button onClick={() => handlePreview(file.file_path, file.file_name)} className="p-2 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all" title="Review">
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => handleDeleteSelected()} className="p-2 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all" title="Delete">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="fixed bottom-0 left-0 right-0 p-8 pt-10 bg-[#0B1221]/80 backdrop-blur-3xl border-t border-white/5 flex flex-col items-center gap-6 z-10 shadow-[0_-20px_100px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-10 p-6 bg-white/5 rounded-[32px] border border-white/10 w-full max-w-4xl shadow-2xl">
                    <div className={`p-4 rounded-2xl ${enableMasking ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-slate-800 text-slate-600'} transition-all duration-500`}>
                        {enableMasking ? <ShieldCheck className="w-8 h-8" /> : <Shield className="w-8 h-8" />}
                    </div>
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-3">
                            <span className="font-black text-white uppercase tracking-tight text-lg italic">신신경망 보안 비식별화 파이프라인</span>
                            {enableMasking ? <Badge variant="blue">Secured</Badge> : <Badge variant="default">Exposed</Badge>}
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">GCP Vertex AI 전송 전 PII(주민번호/연락처) 물리적 치환 프로세스 가동</p>
                    </div>
                    <button
                        onClick={() => setEnableMasking(!enableMasking)}
                        className={`w-16 h-10 rounded-full relative transition-all duration-500 shadow-2xl border ${enableMasking ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-white/5'}`}
                    >
                        <div className={`absolute top-1 w-8 h-8 bg-white rounded-full shadow-lg transition-all duration-500 flex items-center justify-center ${enableMasking ? 'left-7' : 'left-1'}`}>
                            {enableMasking ? <Lock className="w-4 h-4 text-blue-600" /> : <Unlock className="w-4 h-4 text-slate-400" />}
                        </div>
                    </button>
                </div>

                <button
                    onClick={() => selectedIds.size > 0 && setAnalysisOpen(true)}
                    disabled={selectedIds.size === 0}
                    className="flex items-center justify-center gap-4 bg-white text-black text-2xl font-black italic uppercase px-16 py-8 rounded-[40px] shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:shadow-[0_30px_80px_rgba(255,255,255,0.15)] hover:scale-[1.03] transition-all disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed active:scale-95 w-full md:max-w-4xl cursor-pointer"
                >
                    <BrainCircuit className="w-8 h-8 text-blue-600" />
                    <span>AI 실사 분석 코어 활성화 ({selectedIds.size})</span>
                </button>
            </div>
        </div>
    );
}