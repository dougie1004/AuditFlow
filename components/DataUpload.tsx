
import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, FileSpreadsheet, File, Search, Filter, Trash2, Download, Eye, X, ZoomIn, ZoomOut, Printer, Grid, Terminal, Sparkles, Loader2, CheckCircle, ArrowRight, ChevronLeft, ChevronRight, AlertTriangle, Siren, Check } from 'lucide-react';
import { Scenario, ViolationDetail, MockUploadFile } from '../types';
import type { AuditAreaCode } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_UPLOAD_FILES } from '../data/mockUploadData'; // Import all mock files

interface DataUploadProps {
  setActiveView: (view: string) => void;
  onAddScenarioAndViolation: (scenario: Scenario, violation: ViolationDetail) => void;
  onAuditComplete: () => void;
  files: MockUploadFile[];
  setFiles: React.Dispatch<React.SetStateAction<MockUploadFile[]>>;
}

// File Viewer Modal
const FileViewerModal: React.FC<{ file: MockUploadFile; onClose: () => void }> = ({ file, onClose }) => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4 bg-slate-100 border-b flex justify-between items-center">
        <div className="flex items-center gap-2">
          {file.type === 'CSV' || file.type === 'Excel' ? <FileSpreadsheet className="w-5 h-5 text-green-600" /> : file.type === 'PDF' ? <FileText className="w-5 h-5 text-red-600" /> : <Terminal className="w-5 h-5 text-slate-600" />}
          <h3 className="font-bold text-slate-800 text-lg">{file.name}</h3>
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200"><X className="w-5 h-5 text-slate-600" /></button>
      </div>
      <div className="flex-1 p-4 font-mono text-xs overflow-y-auto bg-slate-50 text-slate-700">
        <pre className="whitespace-pre-wrap">{file.content}</pre>
      </div>
    </motion.div>
  </div>
);

// Mock File Selection Modal
const MockFileSelectionModal: React.FC<{
  onClose: () => void;
  onSelectFiles: (selected: MockUploadFile[]) => void;
  existingFiles: MockUploadFile[]; // Pass existing files to disable already uploaded ones
}> = ({ onClose, onSelectFiles, existingFiles }) => {
  const [selectedMockFileIds, setSelectedMockFileIds] = useState<Set<string>>(new Set());

  const handleToggleSelect = (file: MockUploadFile) => {
    setSelectedMockFileIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(file.id)) {
        newSet.delete(file.id);
      } else {
        newSet.add(file.id);
      }
      return newSet;
    });
  };

  const handleAddSelectedFiles = () => {
    const filesToAdd = MOCK_UPLOAD_FILES.filter(f => selectedMockFileIds.has(f.id));
    onSelectFiles(filesToAdd);
    onClose();
  };

  const isFileAlreadyUploaded = (fileId: string) => existingFiles.some(f => f.id === fileId);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'Excel': return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
      case 'CSV': return <FileSpreadsheet className="w-4 h-4 text-blue-600" />;
      case 'PDF': return <FileText className="w-4 h-4 text-red-600" />;
      case 'LOG': return <Terminal className="w-4 h-4 text-slate-600" />;
      default: return <File className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 bg-slate-100 border-b flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><UploadCloud className="w-5 h-5" /> 모의 감사 파일 선택</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200"><X className="w-5 h-5 text-slate-600" /></button>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <ul className="divide-y divide-slate-100">
            {MOCK_UPLOAD_FILES.map(file => {
              const alreadyUploaded = isFileAlreadyUploaded(file.id);
              const isSelected = selectedMockFileIds.has(file.id);
              return (
                <li
                  key={file.id}
                  className={`flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors ${alreadyUploaded ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  onClick={() => !alreadyUploaded && handleToggleSelect(file)}
                >
                  <input
                    type="checkbox"
                    checked={alreadyUploaded || isSelected}
                    disabled={alreadyUploaded}
                    onChange={() => !alreadyUploaded && handleToggleSelect(file)}
                    className="form-checkbox h-4 w-4 text-blue-600 rounded"
                  />
                  <div className="flex items-center gap-2">
                    {getFileIcon(file.type)}
                    <span className={`font-medium text-sm ${alreadyUploaded ? 'text-slate-500' : 'text-slate-800'}`}>{file.name}</span>
                  </div>
                  <span className="ml-auto text-xs text-slate-500">{file.size}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="p-4 bg-slate-50 border-t flex justify-end">
          <button
            onClick={handleAddSelectedFiles}
            disabled={selectedMockFileIds.size === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
          >
            선택된 모의 파일 업로드 ({selectedMockFileIds.size}개)
          </button>
        </div>
      </motion.div>
    </div>
  );
};


const DataUpload: React.FC<DataUploadProps> = ({ setActiveView, onAddScenarioAndViolation, onAuditComplete, files, setFiles }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AuditAreaCode | 'ALL'>('ALL');
  const [viewingFile, setViewingFile] = useState<MockUploadFile | null>(null);
  const [auditStatus, setAuditStatus] = useState<'idle' | 'running' | 'complete'>('idle');
  const [showMockFileModal, setShowMockFileModal] = useState(false);

  const auditCountRef = useRef(parseInt(localStorage.getItem('audit_count') || '0'));
  // const fileInputRef = useRef<HTMLInputElement>(null); // Removed direct file input for demo clarity

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'Excel': return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
      case 'CSV': return <FileSpreadsheet className="w-5 h-5 text-blue-600" />; // Differentiate CSV
      case 'PDF': return <FileText className="w-5 h-5 text-red-600" />;
      case 'LOG': return <Terminal className="w-5 h-5 text-slate-600" />;
      default: return <File className="w-5 h-5 text-slate-400" />;
    }
  };

  // const handleUploadClick = () => fileInputRef.current?.click(); // No longer needed for demo script

  const handleMockFilesSelected = (selected: MockUploadFile[]) => {
    // Filter out files that are already in the `files` state to prevent duplicates
    const newFiles = selected.filter(mockFile => !files.some(existingFile => existingFile.id === mockFile.id));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleRunAudit = () => {
    setAuditStatus('running');
    setTimeout(() => {
      onAuditComplete();
      auditCountRef.current += 1;
      localStorage.setItem('audit_count', auditCountRef.current.toString());

      setAuditStatus('complete');
      // Delay navigating to dashboard to allow user to see the "complete" status briefly
      setTimeout(() => setActiveView('dashboard'), 1500);
    }, 2500); // Increased duration for a more realistic feel
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col relative">
      <AnimatePresence>
        {/* RUNNING OVERLAY */}
        {auditStatus === 'running' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-md z-40 flex items-center justify-center p-4"
          >
            <div className="text-center text-white p-6 sm:p-8 md:p-10 rounded-2xl border border-blue-400 max-w-xl w-full shadow-lg">
              <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 animate-spin mx-auto mb-4 sm:mb-6 text-blue-300" />
              <h3 className="text-xl sm:text-2xl font-bold">AI 감사 데이터 파이프라인 가동 중...</h3>
              <p className="mt-2 text-slate-300 text-sm sm:text-base">업로드된 <strong>{files.length}개</strong>의 파일을 전처리하여 AI 분석에 적합한 형태로 변환 중입니다.</p>
              <div className="mt-6 sm:mt-8 space-y-2 text-xs font-mono text-left inline-block bg-black/30 p-4 sm:p-5 rounded-xl border border-white/10 w-full max-h-48 overflow-y-auto">
                <p className="text-blue-300 animate-pulse">&gt; 1/4 Data Ingestion (Raw Data Lake)... <Check className="w-3 h-3 inline-block ml-1" /></p>
                <p className="text-blue-300 animate-pulse">&gt; 2/4 AI Pre-processing (NLP, OCR, Entity Extraction)... In progress</p>
                <p className="text-yellow-400">&gt; 3/4 Data Linkage & Harmonization (PO-INV-PAY Cycle)... Pending</p>
                <p className="text-green-400 font-bold">&gt; 4/4 AI Forensic Pattern Matching (Gemini Models)... Initializing</p>
              </div>
              <p className="text-xs text-slate-400 mt-4">* 잠시만 기다려주시면 대시보드로 자동 이동합니다.</p>
            </div>
          </motion.div>
        )}

        {/* File Viewer Modal */}
        {viewingFile && <FileViewerModal file={viewingFile} onClose={() => setViewingFile(null)} />}

        {/* Mock File Selection Modal */}
        {showMockFileModal && <MockFileSelectionModal onClose={() => setShowMockFileModal(false)} onSelectFiles={handleMockFilesSelected} existingFiles={files} />}

      </AnimatePresence>

      {/* <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".csv,.xlsx,.xls,.pdf,.log,.txt" multiple /> */}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 sm:mb-6 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">감사 데이터 업로드 (Data Upload)</h2>
          <p className="text-sm sm:text-base text-slate-500 mt-1">감사 대상 기간(2024-2025)의 원장, 로그, 비정형 데이터를 분석하여 위험을 탐지합니다.</p>
        </div>
        <button onClick={() => setShowMockFileModal(true)} type="button" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md text-sm">
          <UploadCloud className="w-5 h-5" />
          <span>모의 파일 선택</span>
        </button>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">파일명</th>
                <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">유형</th>
                <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">크기</th>
                <th className="px-4 py-2 sm:px-6 sm:py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredFiles.map((file) => (
                <tr key={file.id} className="hover:bg-blue-50 transition-colors group">
                  <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center bg-slate-100 rounded-lg">
                        {getFileIcon(file.type)}
                      </div>
                      <div className="ml-3 sm:ml-4">
                        <div className="text-sm font-medium text-slate-900">{file.name}</div>
                        <div className="text-xs text-slate-500">{file.category} Data</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-slate-500">{file.type}</td>
                  <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{file.size}</td>
                  <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={() => setViewingFile(file)}
                      className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                      title="파일 내용 보기"
                    ><Eye className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {filteredFiles.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 sm:py-12 text-center text-slate-400">데이터가 없습니다. 파일을 업로드해주세요.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-50 border-t-2 border-dashed border-slate-200">
          <button
            onClick={handleRunAudit}
            type="button"
            disabled={files.length === 0 || auditStatus !== 'idle'}
            className="w-full py-3 sm:py-4 text-base sm:text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:from-slate-400 disabled:to-slate-500"
          >
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>AI 감사 데이터 준비 ({files.length}개 파일 처리)</span>
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <p className="text-center text-xs text-slate-400 mt-2">업로드된 전체 데이터를 분석하여 AI 어시스턴트에서 활용할 수 있도록 준비합니다.</p>
        </div>
      </div>
    </div>
  );
};

export default DataUpload;
