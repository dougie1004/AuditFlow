
import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, FileSpreadsheet, File, Search, Filter, Trash2, Download, Eye, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Printer, Grid, Terminal } from 'lucide-react';
import { MOCK_UPLOAD_FILES } from '../data/mockUploadData';
import { MockUploadFile } from '../types';
import type { AuditAreaCode } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

// --- File Content Renderers ---

const SpreadsheetViewer: React.FC<{ content: string }> = ({ content }) => {
  // Simple CSV parser
  const rows = content.trim().split('\n').map(row => {
    // Handle quoted CSV format simply for demo
    if (row.includes('"')) {
       return row.split('","').map(cell => cell.replace(/^"|"$/g, '').replace(/""/g, '"'));
    }
    return row.split(',');
  });

  if (rows.length === 0) return <div className="p-8 text-center text-slate-500">데이터가 없습니다.</div>;

  const headers = rows[0];
  const data = rows.slice(1);

  return (
    <div className="flex flex-col h-full bg-slate-50">
        {/* Fake Toolbar */}
        <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-slate-200 text-sm text-slate-600">
            <div className="flex items-center gap-1 font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                <Grid className="w-3 h-3" /> Sheet1
            </div>
            <div className="h-4 w-px bg-slate-300"></div>
            <div className="font-mono text-xs">A1: {headers[0]}</div>
            <div className="flex-1"></div>
            <div className="flex items-center gap-2">
                 <button className="p-1 hover:bg-slate-100 rounded"><ZoomOut className="w-4 h-4" /></button>
                 <span className="text-xs">100%</span>
                 <button className="p-1 hover:bg-slate-100 rounded"><ZoomIn className="w-4 h-4" /></button>
            </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto">
            <table className="min-w-full border-collapse text-xs">
                <thead className="bg-slate-100 sticky top-0 z-10">
                    <tr>
                        <th className="w-10 border border-slate-300 bg-slate-100 text-center text-slate-500 font-normal"></th>
                        {headers.map((header, i) => (
                            <th key={i} className="border border-slate-300 px-2 py-1 text-center font-bold text-slate-700 min-w-[100px] whitespace-nowrap overflow-hidden text-ellipsis">
                                {String.fromCharCode(65 + i)} <span className="block text-[10px] text-slate-400 font-normal">{header}</span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white">
                    {data.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-blue-50/30">
                            <td className="border border-slate-300 bg-slate-50 text-center text-slate-500 font-mono">{rowIndex + 1}</td>
                            {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className="border border-slate-300 px-2 py-1 whitespace-nowrap text-slate-800">
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="bg-slate-100 border-t border-slate-200 px-4 py-1 text-xs text-slate-500 flex justify-between">
            <span>Ready</span>
            <span>Count: {data.length} rows</span>
        </div>
    </div>
  );
};

const PDFViewer: React.FC<{ content: string }> = ({ content }) => {
    return (
        <div className="flex flex-col h-full bg-slate-500">
             {/* Fake Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-white shadow-md z-10">
                <div className="flex items-center gap-4">
                     <span className="font-bold text-sm">PDF Viewer</span>
                     <div className="h-4 w-px bg-slate-600"></div>
                     <div className="flex items-center gap-2 text-xs bg-slate-700 px-2 py-1 rounded">
                         <button className="hover:text-blue-300"><ChevronLeft className="w-4 h-4"/></button>
                         <span>1 / 3</span>
                         <button className="hover:text-blue-300"><ChevronRight className="w-4 h-4"/></button>
                     </div>
                </div>
                <div className="flex items-center gap-3">
                     <button className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"><ZoomOut className="w-4 h-4" /></button>
                     <button className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"><ZoomIn className="w-4 h-4" /></button>
                     <button className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"><Printer className="w-4 h-4" /></button>
                </div>
            </div>

            {/* Document Canvas */}
            <div className="flex-1 overflow-auto p-8 flex justify-center items-start">
                <div className="bg-white w-full max-w-[800px] min-h-[1100px] shadow-2xl p-12 relative text-slate-800">
                    {/* Simulated Page Content */}
                    <pre className="font-serif whitespace-pre-wrap text-sm leading-relaxed text-justify">
                        {content}
                    </pre>
                    
                    {/* Simulated Watermark */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 pointer-events-none select-none">
                        <span className="text-9xl font-bold text-slate-100 uppercase tracking-widest opacity-50">Confidential</span>
                    </div>

                     {/* Footer */}
                     <div className="absolute bottom-8 left-0 w-full text-center text-xs text-slate-400 font-serif">
                        Nexus Corp Internal Audit Document • Page 1 of 3
                    </div>
                </div>
            </div>
        </div>
    );
};

const LogViewer: React.FC<{ content: string }> = ({ content }) => {
    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] text-slate-300 font-mono text-sm">
             <div className="flex items-center px-4 py-2 bg-[#2d2d2d] border-b border-[#3e3e3e] text-xs select-none">
                 <Terminal className="w-3 h-3 mr-2 text-blue-400" />
                 <span className="text-slate-400">System Log Viewer</span>
                 <div className="flex-1"></div>
                 <span className="text-slate-500">UTF-8</span>
             </div>
             <div className="flex-1 overflow-auto p-4">
                 {content.split('\n').map((line, i) => (
                     <div key={i} className="flex hover:bg-[#2a2d2e]">
                         <span className="w-12 text-right mr-4 text-slate-600 select-none shrink-0">{i + 1}</span>
                         <span className="whitespace-pre-wrap break-all">
                             {/* Simple highlighting for log levels */}
                             {line.includes('ERROR') || line.includes('FAILED') ? <span className="text-red-400">{line}</span> :
                              line.includes('WARN') || line.includes('ALERT') ? <span className="text-yellow-400">{line}</span> :
                              line.includes('INFO') ? <span className="text-blue-300">{line}</span> :
                              line}
                         </span>
                     </div>
                 ))}
                 <div className="h-8 flex items-center gap-2 text-green-500 animate-pulse mt-2">
                     <span>_</span>
                 </div>
             </div>
        </div>
    );
};


const FileViewerModal: React.FC<{ file: MockUploadFile; onClose: () => void }> = ({ file, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-6xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-slate-900/5"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
                file.type === 'Excel' || file.type === 'CSV' ? 'bg-green-100 text-green-700' :
                file.type === 'PDF' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
            }`}>
              {file.type === 'Excel' || file.type === 'CSV' ? <FileSpreadsheet className="w-5 h-5"/> : 
               file.type === 'PDF' ? <FileText className="w-5 h-5"/> :
               <Terminal className="w-5 h-5"/>}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg leading-tight">{file.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{file.size} • {file.category} Audit Evidence</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500"/>
          </button>
        </div>
        
        {/* Content Viewer Body */}
        <div className="flex-1 overflow-hidden relative">
             {(file.type === 'Excel' || file.type === 'CSV') ? (
                 <SpreadsheetViewer content={file.content || ''} />
             ) : file.type === 'PDF' ? (
                 <PDFViewer content={file.content || ''} />
             ) : (
                 <LogViewer content={file.content || ''} />
             )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex justify-between items-center z-20">
          <div className="text-xs text-slate-400 flex gap-4">
              <span>Last Modified: {new Date().toLocaleDateString()}</span>
              <span>Permissions: Read-Only</span>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">닫기</button>
            <button 
                onClick={() => alert('다운로드 기능은 데모 버전에서 시뮬레이션만 가능합니다.')}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2"
            >
                <Download className="w-4 h-4"/> 다운로드
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const DataUpload: React.FC<{ setActiveView: (view: string) => void }> = () => {
  const [files, setFiles] = useState<MockUploadFile[]>(MOCK_UPLOAD_FILES);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AuditAreaCode | 'ALL'>('ALL');
  const [viewingFile, setViewingFile] = useState<MockUploadFile | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'Excel': return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
      case 'CSV': return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
      case 'PDF': return <FileText className="w-5 h-5 text-red-600" />;
      case 'LOG': return <Terminal className="w-5 h-5 text-slate-600" />;
      default: return <File className="w-5 h-5 text-slate-400" />;
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        
        // Determine type based on extension
        let type: 'Excel' | 'CSV' | 'PDF' | 'LOG' = 'LOG'; // Default
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) type = 'Excel';
        else if (lowerName.endsWith('.csv')) type = 'CSV';
        else if (lowerName.endsWith('.pdf')) type = 'PDF';
        
        // Format Size
        const size = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

        // Read Content
        let content = "";
        try {
            if (type === 'CSV' || type === 'LOG' || file.type.startsWith('text/')) {
                content = await file.text();
            } else {
                content = `[File Metadata]\nName: ${file.name}\nSize: ${file.size} bytes\nType: ${file.type}\nLast Modified: ${new Date(file.lastModified).toLocaleString()}\n\n[System Message]\n이 파일은 바이너리 형식이므로 텍스트 미리보기를 제공하지 않습니다.\nAI 분석 엔진이 백그라운드에서 데이터 추출을 진행 중입니다...`;
            }
        } catch (err) {
            content = "Error reading file content.";
        }

        const newFile: MockUploadFile = {
            name: file.name,
            type,
            size,
            category: 'FSC', // Defaulting to FSC for demo purposes
            content
        };

        setFiles(prev => [newFile, ...prev]);
        
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  };

  const handleDelete = (e: React.MouseEvent, fileName: string) => {
    e.stopPropagation();
    if (confirm('정말 이 파일을 삭제하시겠습니까?')) {
        setFiles(prev => prev.filter(f => f.name !== fileName));
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col relative">
      <AnimatePresence>
        {viewingFile && <FileViewerModal file={viewingFile} onClose={() => setViewingFile(null)} />}
      </AnimatePresence>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".csv,.xlsx,.xls,.pdf,.log,.txt"
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">감사 데이터 업로드 (Data Upload)</h2>
          <p className="text-slate-500 mt-1">감사 증빙 자료, 시스템 로그, 원장 데이터를 중앙 관리합니다.</p>
        </div>
        <button 
          onClick={handleUploadClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm transition-colors active:scale-95 transform"
        >
          <UploadCloud className="w-5 h-5" />
          <span>새 파일 업로드</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="파일명 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter className="w-5 h-5 text-slate-500 shrink-0" />
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="ALL">모든 카테고리</option>
            <option value="FSC">재무 마감 (FSC)</option>
            <option value="EXP">경비 지출 (EXP)</option>
            <option value="STP">구매 지급 (STP)</option>
            <option value="SEC">정보 보안 (SEC)</option>
          </select>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">파일명</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">유형</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">카테고리</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">크기</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredFiles.map((file, idx) => (
                <tr 
                    key={idx} 
                    onClick={() => setViewingFile(file)}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-slate-100 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">
                        {getFileIcon(file.type)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900 group-hover:text-blue-700 transition-colors">{file.name}</div>
                        <div className="text-xs text-slate-500">Uploaded recently</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {file.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                     <span className="text-sm text-slate-600 font-medium bg-blue-50 px-2 py-1 rounded text-blue-700 border border-blue-100">
                        {file.category}
                     </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                    {file.size}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setViewingFile(file); }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                        title="미리보기"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); alert('다운로드 시뮬레이션'); }}
                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-all"
                         title="다운로드"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(e, file.name)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredFiles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                        <Search className="w-12 h-12 mb-4 text-slate-300"/>
                        <p>검색 결과가 없습니다.</p>
                        <p className="text-xs mt-1">다른 검색어를 입력하거나 필터를 조정해보세요.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataUpload;
