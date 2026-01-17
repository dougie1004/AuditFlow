import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { safeInvoke } from '../lib/tauri-bridge';
import { pickFiles } from '../services/fileService';
import {
    Upload, Zap, Loader2,
    FileText,
    BrainCircuit, BarChart3, Database, MoveRight,
    ShieldCheck, Search, ChevronDown,
    XCircle, FileBox, Mail
} from 'lucide-react';
import { useApp } from '../App';

interface AuditFinding {
    id: string;
    category: string;
    severity: string;
    description: string;
    evidence: string;
    recommendation: string;
    status: string;
}

interface AnalysisResult {
    summary: string;
    risk_score: number;
    findings: AuditFinding[];
}

interface SheetPreview {
    name: string;
    data: string[][];
}

interface UploadedFile {
    path: string;
    name: string;
    ext: string;
    preview: string[][];
    isTable: boolean;
    fullContent?: string;
    multiSheets?: SheetPreview[];
    activeSheetIdx: number;
}

export default function DataUpload() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { activeProject, setActiveProject } = useApp();

    const [projects, setProjects] = useState<any[]>([]);
    const [step, setStep] = useState(1);
    const [isMasking, setIsMasking] = useState(false);
    const [isMasked, setIsMasked] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [selectedFileIdx, setSelectedFileIdx] = useState<number>(0);
    const [isProcessing, setIsProcessing] = useState(false);

    const setActiveSheet = (fileIdx: number, sheetIdx: number) => {
        setUploadedFiles(prev => {
            const next = [...prev];
            next[fileIdx] = { ...next[fileIdx], activeSheetIdx: sheetIdx };
            return next;
        });
    };

    useEffect(() => {
        safeInvoke("get_audit_projects").then((res: any) => {
            setProjects(res);
            if (id) {
                setActiveProject(id);
            }
        });
    }, [id, setActiveProject]);

    useEffect(() => {
        const syncPreviews = async () => {
            if (uploadedFiles.length === 0) return;

            const updatedFiles = await Promise.all(uploadedFiles.map(async (file) => {
                const preview: string[][] = await safeInvoke('get_file_preview', {
                    filePath: file.path,
                    limit: 100,
                    enable_masking: isMasked
                });

                let multiSheets = file.multiSheets;
                if (file.ext === 'xlsx') {
                    const sheetDetails: { name: string, data: string[][] }[] = await safeInvoke('get_workbook_details', {
                        filePath: file.path,
                        enable_masking: isMasked
                    });
                    multiSheets = sheetDetails.map(s => ({
                        name: s.name,
                        data: s.data.length > 0 ? s.data : [["Empty Sheet"]]
                    }));
                }

                return { ...file, preview, multiSheets };
            }));
            setUploadedFiles(updatedFiles);
        };

        syncPreviews();
    }, [isMasked]);

    const handlePickFiles = async () => {
        if (!activeProject) return;

        const selected = await pickFiles();

        if (selected) {
            setIsProcessing(true);
            const newFiles: UploadedFile[] = [];
            const fileList = selected instanceof FileList ? Array.from(selected) : selected;

            for (const item of fileList) {
                const filePath = typeof item === 'string' ? item : item.name; // Simple fallback for web
                const name = filePath.split(/[\\/]/).pop() || filePath;
                const ext = name.split('.').pop()?.toLowerCase() || '';

                try {
                    // Phase 1: Basic Preview (First sheet or text content)
                    const preview: string[][] = await safeInvoke('get_file_preview', { filePath, limit: 100, enableMasking: isMasked });
                    const isTable = ext === 'xlsx' || ext === 'csv' || ext === 'log';

                    let fullContent = "";
                    let multiSheets: SheetPreview[] = [];

                    // Phase 2: Authentic Multi-Sheet Deep Read (Backend)
                    if (ext === 'xlsx') {
                        try {
                            const sheetDetails: { name: string, data: string[][] }[] = await safeInvoke('get_workbook_details', { filePath, enableMasking: isMasked });
                            if (sheetDetails && sheetDetails.length > 0) {
                                sheetDetails.forEach(s => {
                                    fullContent += `\n\n[[ SOURCE SHEET: ${s.name} ]]\n`;
                                    const jsonRows = s.data.map((row, i) => {
                                        if (i === 0) return null;
                                        let obj: any = {};
                                        row.forEach((cell, ci) => {
                                            const key = s.data[0][ci] || `Col${ci}`;
                                            obj[key] = cell;
                                        });
                                        return obj;
                                    }).filter(r => r !== null);
                                    fullContent += JSON.stringify(jsonRows, null, 2);
                                });
                                multiSheets = sheetDetails.map(s => ({
                                    name: s.name,
                                    data: s.data.length > 0 ? s.data : [["Empty Sheet"]]
                                }));
                            }
                        } catch (err) {
                            console.error("XLSX deep read failed", err);
                        }
                    } else if (ext === 'csv' || ext === 'txt' || ext === 'log') {
                        try {
                            const rawPreview: string[][] = await safeInvoke('get_file_preview', { filePath, limit: 0, enableMasking: isMasked });
                            fullContent = rawPreview.map(row => row.join("\t")).join("\n");
                        } catch (err) {
                            console.error("Text content read failed", err);
                        }
                    }

                    newFiles.push({
                        path: filePath,
                        name,
                        ext,
                        preview,
                        isTable,
                        fullContent: fullContent || undefined,
                        multiSheets: multiSheets.length > 0 ? multiSheets : undefined,
                        activeSheetIdx: 0
                    });
                } catch (err) {
                    console.error("File process failed:", filePath, err);
                }
            }

            setUploadedFiles(prev => [...prev, ...newFiles]);
            setIsProcessing(false);
            if (newFiles.length > 0) setStep(2);
        }
    };

    const removeFile = (idx: number) => {
        const next = [...uploadedFiles];
        next.splice(idx, 1);
        setUploadedFiles(next);
        if (next.length === 0) setStep(1);
        if (selectedFileIdx >= next.length) setSelectedFileIdx(Math.max(0, next.length - 1));
    };

    const handleMasking = async () => {
        setIsMasking(true);
        try {
            // Re-fetch all file previews and full content with masking enabled
            const updatedFiles = await Promise.all(uploadedFiles.map(async (file) => {
                const previewRows: string[][] = await safeInvoke('get_file_preview', {
                    filePath: file.path,
                    limit: 10,
                    enableMasking: true
                });

                let multiSheets = file.multiSheets;
                let fullContent = "";

                if (file.isTable && (file.ext === 'xlsx' || file.ext === 'xls')) {
                    const sheetDetails: any[] = await safeInvoke('get_workbook_details', {
                        filePath: file.path,
                        enableMasking: true
                    });
                    multiSheets = sheetDetails.map(s => ({
                        name: s.name,
                        data: s.data.length > 0 ? s.data : [["Empty Sheet"]]
                    }));

                    // Update fullContent for analysis
                    sheetDetails.forEach((s: { name: string, data: string[][] }) => {
                        fullContent += `\n\n[[ SOURCE SHEET: ${s.name} ]]\n`;
                        const jsonRows = s.data.map((row: string[], i: number) => {
                            if (i === 0) return null;
                            const obj: any = {};
                            s.data[0].forEach((col: string, ci: number) => { obj[col] = row[ci]; });
                            return obj;
                        }).filter((r: any) => r !== null);
                        fullContent += JSON.stringify(jsonRows, null, 2);
                    });
                } else {
                    // For non-table files, re-fetch full content with masking
                    const rawPreview: string[][] = await safeInvoke('get_file_preview', {
                        filePath: file.path,
                        limit: 0,
                        enableMasking: true
                    });
                    fullContent = rawPreview.map((row: string[]) => row.join("\t")).join("\n");
                }

                return { ...file, preview: previewRows, multiSheets, fullContent: fullContent || file.fullContent };
            }));

            setUploadedFiles(updatedFiles);
            setIsMasked(true);
        } catch (err) {
            console.error("Masking refresh failed:", err);
            alert("비식별화 처리 중 오류가 발생했습니다.");
        } finally {
            setIsMasking(false);
        }
    };

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            const aggregatedContent = uploadedFiles
                .filter(f => f.fullContent)
                .map(f => `--- FILE: ${f.name} ---\n${f.fullContent}`)
                .join("\n\n");

            const dept = activeProject?.includes("MKT") ? "Marketing" : activeProject?.includes("SAL") ? "Sales" : activeProject?.includes("FACT") ? "Vietnam Factory" : "General";
            const result: AnalysisResult = await safeInvoke('execute_project_analysis', {
                projectId: activeProject,
                department: dept,
                fullContent: aggregatedContent || null
            });
            setAnalysisResult(result);
            setIsAnalyzing(false);
        } catch (err) {
            console.error(err);
            setIsAnalyzing(false);
        }
    };

    const renderPreview = (file: UploadedFile) => {
        if (file.isTable) {
            // Default to preview, but override if multiSheets exist
            let tableData = file.preview;
            if (file.multiSheets && file.multiSheets.length > 0) {
                const activeSheet = file.multiSheets[file.activeSheetIdx] || file.multiSheets[0];
                tableData = activeSheet.data;
            }

            return (
                <div className="flex flex-col h-full bg-[#080E1A]">
                    {/* Tab Bar - High Visibility */}
                    {file.multiSheets && file.multiSheets.length > 0 && (
                        <div className="flex items-center gap-0 bg-white/5 border-b border-white/10 px-4 pt-2 overflow-x-auto no-scrollbar">
                            <div className="mr-4 flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded text-[10px] font-black text-emerald-500 uppercase tracking-widest border border-emerald-500/20">
                                <Database size={12} />
                                {file.multiSheets.length} Sheets
                            </div>
                            {file.multiSheets.map((sheet, si) => (
                                <button
                                    key={si}
                                    onClick={() => setActiveSheet(selectedFileIdx, si)}
                                    className={`
                                        relative px-6 py-2.5 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap rounded-t-lg border-t border-x
                                        ${file.activeSheetIdx === si
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105 z-10'
                                            : 'bg-white/5 text-slate-500 border-transparent hover:bg-white/10 hover:text-slate-300'}
                                    `}
                                >
                                    {sheet.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Data Grid */}
                    <div className="overflow-auto flex-1 custom-scrollbar bg-transparent">
                        <table className="min-w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-[#0B1221] z-10 shadow-sm border-b border-white/10">
                                <tr>
                                    {tableData[0]?.map((col, i) => (
                                        <th key={i} className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap border-b border-white/10 bg-[#0B1221]">
                                            {col || `Col ${i + 1}`}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {tableData.slice(1, 150).map((row, ri) => (
                                    <tr key={ri} className="group hover:bg-blue-500/5 transition-colors">
                                        {row.map((cell, ci) => (
                                            <td key={ci} className="p-3 text-xs font-medium text-slate-400 border-r border-white/5 last:border-0 whitespace-nowrap max-w-[400px] truncate" title={cell}>
                                                <span className={isMasked && (cell.includes('*') || cell.includes('***')) ? "bg-blue-500/10 text-blue-400 font-bold px-1 rounded-sm border border-blue-500/20" : ""}>
                                                    {cell}
                                                </span>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {tableData.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                <FileBox size={48} className="text-slate-300 mb-4" />
                                <p className="text-sm font-bold text-slate-400">Empty Sheet</p>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // Textual content (PDF/Doc/EML)
        const content = file.preview.flat().join('\n');
        return (
            <div className="p-8 text-slate-400 font-mono text-sm leading-relaxed whitespace-pre-wrap max-h-[600px] overflow-y-auto custom-scrollbar bg-black/20">
                <div>
                    {content || "No content extracted."}
                </div>
            </div>
        );
    };

    const getFileIcon = (ext: string) => {
        if (ext === 'pdf') return <FileText className="text-rose-500" />;
        if (ext === 'eml' || ext === 'msg') return <Mail className="text-blue-400" />;
        if (ext === 'xlsx' || ext === 'csv') return <Database className="text-emerald-500" />;
        return <FileBox className="text-slate-400" />;
    };

    return (
        <div className="min-h-screen bg-[#020617] text-slate-300 font-sans p-8 lg:p-12">
            {/* Header: Fixed and Professional */}
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start mb-12 gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded-xl text-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                            <Zap size={20} />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight italic uppercase">Universal Auditor Workspace</h1>
                    </div>

                    <div className="relative group">
                        <select
                            value={activeProject || ""}
                            onChange={(e) => {
                                setActiveProject(e.target.value);
                                setStep(1);
                                setAnalysisResult(null);
                                setIsMasked(false);
                                setUploadedFiles([]);
                            }}
                            className="appearance-none bg-slate-900 border border-white/10 text-white font-black text-xs py-4 px-8 pr-16 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/20 w-[400px] shadow-2xl transition-all cursor-pointer hover:border-blue-500/30"
                        >
                            <option value="" disabled>--- SELECT PROJECT SCOPE ---</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.id} : {p.title}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-blue-500 transition-colors" size={20} />
                    </div>
                </div>

                <div className="flex bg-slate-900/50 border border-white/5 p-2 rounded-2xl">
                    {[1, 2, 3].map(s => (
                        <div
                            key={s}
                            className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${step === s ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'text-slate-600'}`}
                        >
                            PHASE 0{s}
                        </div>
                    ))}
                </div>
            </div>

            <div className="max-w-7xl mx-auto">
                {!activeProject ? (
                    <div className="py-32 flex flex-col items-center justify-center text-center space-y-10">
                        <div className="relative">
                            <div className="w-32 h-32 bg-blue-600/5 border border-blue-600/10 rounded-full flex items-center justify-center animate-pulse">
                                <Search className="w-12 h-12 text-blue-500/20" />
                            </div>
                            <div className="absolute inset-0 border-2 border-dashed border-blue-500/20 rounded-full animate-spin-slow" />
                        </div>
                        <h2 className="text-4xl font-black text-slate-500 uppercase tracking-widest italic opacity-40">System Idle: Identity Project Selection</h2>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {/* PHASE 1: Real File Selection */}
                        {step === 1 && (
                            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                                <div
                                    onClick={handlePickFiles}
                                    className="bg-white/[0.02] backdrop-blur-3xl border-2 border-dashed border-white/10 rounded-[64px] p-32 text-center space-y-12 relative overflow-hidden group cursor-pointer hover:border-blue-500/40 transition-all shadow-2xl active:scale-[0.99]"
                                >
                                    {isProcessing ? (
                                        <div className="py-12 space-y-8 flex flex-col items-center">
                                            <Loader2 className="animate-spin text-blue-500" size={80} />
                                            <p className="text-2xl font-black text-white italic animate-pulse tracking-widest">UPLOADING LOCAL DATA...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-32 h-32 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-8 text-blue-400 group-hover:scale-110 transition-transform">
                                                <Upload size={52} />
                                            </div>
                                            <div className="space-y-6">
                                                <h2 className="text-5xl font-black text-white tracking-tighter italic uppercase">Local Data Upload</h2>
                                                <p className="text-slate-500 text-lg font-medium max-w-xl mx-auto leading-relaxed">
                                                    Select <span className="text-blue-400 underline decoration-blue-500/40">Real Files</span> from your Local PC. <br />
                                                    Supports Excel, CSV, PDF, Docx, and Emails (EML/MSG).
                                                </p>
                                            </div>
                                            <div className="max-w-md mx-auto py-8">
                                                <div className="flex gap-4 justify-center">
                                                    <div className="p-4 bg-white/5 rounded-2xl text-rose-500"><FileText /></div>
                                                    <div className="p-4 bg-white/5 rounded-2xl text-emerald-500"><Database /></div>
                                                    <div className="p-4 bg-white/5 rounded-2xl text-blue-500"><Mail /></div>
                                                </div>
                                                <p className="mt-8 text-xs font-black text-slate-600 uppercase tracking-[0.3em]">Trigger OS File Picker</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* PHASE 2: Multi-File Context Preview */}
                        {step === 2 && (
                            <div className="animate-in fade-in slide-in-from-right-8 duration-700 space-y-8">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-2">
                                        <h3 className="text-3xl font-black text-white tracking-tighter italic uppercase flex items-center gap-4">
                                            <ShieldCheck className="text-blue-500" size={32} /> Asset Verification
                                        </h3>
                                        <p className="text-slate-500 font-medium">Real-time content extraction and verification pipeline.</p>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={handlePickFiles}
                                            className="bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-white/10 transition-all flex items-center gap-2"
                                        >
                                            <Plus size={16} /> Add More
                                        </button>
                                        <button
                                            onClick={handleMasking}
                                            className="bg-amber-500 hover:bg-amber-600 text-black px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-[0_0_30px_rgba(245,158,11,0.2)] disabled:opacity-50"
                                            disabled={isMasking || isMasked}
                                        >
                                            {isMasking ? "Neural Processing..." : isMasked ? "Masked & Secured" : "Activate PII Masking"}
                                        </button>
                                        <button
                                            onClick={() => setStep(3)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl flex items-center gap-2 group"
                                        >
                                            Continue Phase 03 <MoveRight size={16} className="group-hover:translate-x-2 transition-transform" />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 gap-8 h-[700px]">
                                    {/* Sidebar: File List */}
                                    <div className="col-span-3 bg-slate-900 border border-white/5 rounded-[32px] overflow-hidden flex flex-col p-4 space-y-2 shadow-2xl">
                                        <p className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 border-b border-white/5">Asset Manifest ({uploadedFiles.length})</p>
                                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                                            {uploadedFiles.map((file, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => setSelectedFileIdx(i)}
                                                    className={`p-4 rounded-2xl flex justify-between items-center cursor-pointer transition-all group ${selectedFileIdx === i ? 'bg-blue-600/10 border border-blue-500/20' : 'hover:bg-white/5 border border-transparent'}`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="p-2 bg-black/40 rounded-lg">{getFileIcon(file.ext)}</div>
                                                        <p className={`text-xs font-bold truncate ${selectedFileIdx === i ? 'text-white' : 'text-slate-400'}`}>{file.name}</p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                                        className="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                                    >
                                                        <XCircle size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Main: Contextual Content View */}
                                    <div className="col-span-9 bg-slate-900 border border-white/5 rounded-[40px] shadow-2xl flex flex-col overflow-hidden">
                                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                                            <div className="flex items-center gap-4">
                                                {getFileIcon(uploadedFiles[selectedFileIdx]?.ext)}
                                                <div>
                                                    <h4 className="text-sm font-black text-white">{uploadedFiles[selectedFileIdx]?.name}</h4>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                        {uploadedFiles[selectedFileIdx]?.multiSheets
                                                            ? `Parsed ${uploadedFiles[selectedFileIdx]?.multiSheets?.length} Sheets: ${uploadedFiles[selectedFileIdx]?.multiSheets?.map(s => `'${s.name}'`).join(', ')}`
                                                            : uploadedFiles[selectedFileIdx]?.path}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
                                                <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] italic">Real Asset Verification</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-auto bg-slate-950/40">
                                            {uploadedFiles[selectedFileIdx] && renderPreview(uploadedFiles[selectedFileIdx])}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PHASE 3: AI Activation */}
                        {step === 3 && (
                            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                                <div className="max-w-5xl mx-auto bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[64px] p-24 text-center space-y-16 relative overflow-hidden shadow-2xl">
                                    {!analysisResult ? (
                                        <div className="space-y-12">
                                            <div className="w-48 h-48 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center mx-auto shadow-2xl relative group">
                                                <div className="absolute inset-0 bg-blue-500 animate-ping opacity-20 rounded-full" />
                                                <BrainCircuit className="text-white relative z-10 group-hover:scale-110 transition-transform" size={96} />
                                            </div>
                                            <div className="space-y-4">
                                                <h2 className="text-6xl font-black text-white tracking-tighter italic uppercase">Activate Discovery Engine</h2>
                                                <p className="text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed text-xl">
                                                    Analysis payload: <span className="text-blue-400 font-mono">[{uploadedFiles.length}] Real PC Assets</span>. <br />
                                                    Ready to deploy Gemini 3.0 Pro for multi-modal risk triangulation.
                                                </p>
                                            </div>
                                            <button onClick={handleAnalyze} disabled={isAnalyzing} className="bg-white text-black px-24 py-8 rounded-[40px] font-black text-2xl uppercase tracking-[0.2em] hover:bg-blue-50 transition-all flex items-center gap-6 mx-auto shadow-2xl hover:scale-105 active:scale-95 disabled:opacity-50">
                                                {isAnalyzing ? <Loader2 className="animate-spin" size={32} /> : <Zap size={32} className="text-blue-600" />}
                                                {isAnalyzing ? "triangulating risks..." : "Activate AI Core"}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-16 animate-in zoom-in-95 duration-500">
                                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-20 rounded-[48px] space-y-12 relative overflow-hidden">
                                                <h3 className="text-5xl font-black text-white tracking-tighter italic uppercase">Discovery Phase Complete</h3>
                                                <div className="grid grid-cols-2 gap-12 mt-12 relative z-10">
                                                    <div className="bg-white/5 p-12 rounded-[40px] border border-white/10 backdrop-blur-md shadow-2xl">
                                                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Anomalies Detected</p>
                                                        <p className="text-8xl font-black text-emerald-400 tracking-tighter">{analysisResult.findings.length}</p>
                                                    </div>
                                                    <div className="bg-white/5 p-12 rounded-[40px] border border-white/10 backdrop-blur-md shadow-2xl">
                                                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Aggregated Risk</p>
                                                        <p className="text-8xl font-black text-rose-500 tracking-tighter">{analysisResult.risk_score}</p>
                                                    </div>
                                                </div>
                                                <p className="text-slate-400 text-lg italic mt-8">"Neural scan detected significant correlations across uploaded assets. Proceed to Management View."</p>
                                            </div>
                                            <div className="flex gap-8 justify-center">
                                                <button onClick={() => navigate('/ai-discovery')} className="bg-blue-600 text-white px-12 py-6 rounded-3xl font-black text-sm uppercase tracking-[0.3em] hover:bg-blue-700 transition-all flex items-center gap-4"><BrainCircuit size={20} /> Go to Discovery Report</button>
                                                <button onClick={() => navigate('/portfolio')} className="bg-white text-black px-12 py-6 rounded-3xl font-black text-sm uppercase tracking-[0.3em] hover:bg-slate-100 transition-all flex items-center gap-4"><BarChart3 size={20} /> View Portfolio</button>
                                                <button onClick={() => navigate('/report')} className="bg-white/5 border border-white/10 text-white px-12 py-6 rounded-3xl font-black text-sm uppercase tracking-[0.3em] hover:bg-white/10 transition-all flex items-center gap-4"><FileText size={20} /> Final AI Report</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style>{`
                .animate-spin-slow { animation: spin 8s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59,130,246,0.2); }
            `}</style>
        </div>
    );
}

const Plus = ({ size }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5v14" /></svg>
);
