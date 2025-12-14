import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, File, X, CheckCircle, Loader, Shield, BrainCircuit, Search, BookOpen, Database, Eye } from 'lucide-react';
import { MOCK_DOCUMENTS } from '../data/documents';
import { MOCK_UPLOAD_FILES } from '../data/mockUploadData';
import { MockDocument, MockUploadFile } from '../types';

const STEPS = [
  { text: '데이터 암호화 및 가명화 중...', icon: Shield },
  { text: 'AI 에이전트로 전송 중...', icon: BrainCircuit },
  { text: '취약점 분석 및 시나리오 매칭 중...', icon: Search },
];

const DocumentViewerModal: React.FC<{ doc: MockDocument, onClose: () => void }> = ({ doc, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl overflow-hidden"
        >
            <div className="p-6 border-b">
                <h3 className="text-lg font-bold">{doc.title}</h3>
                <p className="text-sm text-slate-500">{doc.category}</p>
            </div>
            <pre className="p-6 text-sm whitespace-pre-wrap overflow-y-auto max-h-[60vh] bg-slate-50 font-mono text-slate-700">{doc.content}</pre>
            <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
            </button>
        </motion.div>
    </div>
);

// --- File Preview Components ---
const ExcelPreview: React.FC<{ content: string }> = ({ content }) => {
  const rows = content.trim().split('\n').map(row => row.split(','));
  const header = rows.length > 0 ? rows[0] : [];
  const body = rows.length > 1 ? rows.slice(1) : [];

  return (
    <div className="p-2 sm:p-4 bg-slate-100 overflow-auto flex-1">
      <table className="min-w-full text-sm border-collapse bg-white shadow-md">
        <thead>
          <tr className="bg-slate-200">
            {header.map((cell, i) => (
              <th key={i} className="p-2 border border-slate-300 font-semibold text-slate-700 text-left sticky top-0 bg-slate-200 z-10">{cell.replace(/"/g, '')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, i) => (
            <tr key={i} className="even:bg-slate-50">
              {row.map((cell, j) => (
                <td key={j} className="p-2 border border-slate-300 text-slate-800">{cell.replace(/"/g, '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const PdfPreview: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="p-4 sm:p-8 bg-slate-200 overflow-y-auto flex-1">
        <div className="bg-white p-8 sm:p-12 shadow-lg max-w-3xl mx-auto min-h-full">
            <pre className="text-sm whitespace-pre-wrap font-sans text-slate-800 leading-relaxed">
                {content}
            </pre>
        </div>
    </div>
  );
};

const TextPreview: React.FC<{ content: string }> = ({ content }) => (
    <pre className="p-6 text-xs whitespace-pre-wrap overflow-y-auto flex-1 bg-slate-900 font-mono text-slate-200">
        {content}
    </pre>
);

const FileContentModal: React.FC<{ file: MockUploadFile, onClose: () => void }> = ({ file, onClose }) => {
    const renderContent = () => {
        const content = file.content || '콘텐츠 미리보기를 사용할 수 없습니다.';
        switch(file.type) {
            case 'Excel': return <ExcelPreview content={content} />;
            case 'PDF': return <PdfPreview content={content} />;
            case 'CSV':
            case 'LOG':
            default: return <TextPreview content={content} />;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-6xl bg-white rounded-lg shadow-xl overflow-hidden flex flex-col h-[90vh]"
            >
                <div className="p-4 border-b flex items-center justify-between bg-slate-50 shrink-0">
                    <h3 className="text-base font-bold text-slate-800">{file.name}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200">
                        <X className="w-5 h-5 text-slate-600" />
                    </button>
                </div>
                {renderContent()}
            </motion.div>
        </div>
    );
};


const DataUpload: React.FC<{ setActiveView: (view: string) => void }> = ({ setActiveView }) => {
  const [files, setFiles] = useState<MockUploadFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [viewingDoc, setViewingDoc] = useState<MockDocument | null>(null);
  const [viewingFile, setViewingFile] = useState<MockUploadFile | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setTimeout>;
    if (isProcessing && currentStep < STEPS.length) {
      interval = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 2000);
    } else if (currentStep === STEPS.length) {
      setTimeout(() => {
        setActiveView('dashboard');
      }, 1500);
    }
    return () => clearTimeout(interval);
  }, [isProcessing, currentStep, setActiveView]);

  const loadDemoData = () => {
    setFiles(MOCK_UPLOAD_FILES);
  };
  
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRunAudit = () => {
    setIsProcessing(true);
  };
  
  const FileIcon = ({ type }: { type: MockUploadFile['type'] }) => {
    switch (type) {
      case 'Excel': return <div className="w-5 h-5 bg-green-500 text-white text-[10px] font-bold flex items-center justify-center rounded-sm shrink-0">XLSX</div>;
      case 'CSV': return <div className="w-5 h-5 bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center rounded-sm shrink-0">CSV</div>;
      case 'PDF': return <div className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-sm shrink-0">PDF</div>;
      case 'LOG': return <div className="w-5 h-5 bg-gray-500 text-white text-[10px] font-bold flex items-center justify-center rounded-sm shrink-0">LOG</div>;
      default: return <File className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <AnimatePresence>
        {viewingDoc && <DocumentViewerModal doc={viewingDoc} onClose={() => setViewingDoc(null)} />}
        {viewingFile && <FileContentModal file={viewingFile} onClose={() => setViewingFile(null)} />}
      </AnimatePresence>

      {!isProcessing ? (
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900">데이터 업로드 및 감사 실행</h2>
            <p className="text-slate-500 mt-1">감사에 필요한 데이터를 업로드하고 AI 분석을 시작합니다.</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
                 <h3 className="font-bold text-lg mb-4">1. 감사 데이터 업로드</h3>
                 <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50 min-h-[200px] flex flex-col justify-center">
                    {files.length === 0 ? (
                      <div>
                        <UploadCloud className="mx-auto h-12 w-12 text-slate-400" />
                        <p className="mt-4 text-sm text-slate-600">아래 버튼을 눌러 데모 데이터를 불러오세요.</p>
                        <button onClick={loadDemoData} className="mt-4 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2 mx-auto">
                            <Database className="w-4 h-4" />
                            데모 데이터 세트 불러오기
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto text-left">
                        {files.map((file, i) => (
                           <div key={i} className="flex items-center justify-between p-2 bg-white border rounded-lg group">
                            <button onClick={() => setViewingFile(file)} className="flex items-center gap-3 flex-1 min-w-0">
                                <FileIcon type={file.type} />
                                <div className="min-w-0">
                                  <span className="text-sm font-medium truncate block group-hover:text-blue-600">{file.name}</span>
                                  <p className="text-xs text-slate-500">{file.size} | {file.category}</p>
                                </div>
                            </button>
                            <div className="flex items-center ml-2">
                                <Eye className="w-4 h-4 text-slate-400 mr-2 group-hover:text-blue-600 hidden sm:block" />
                                <button onClick={() => removeFile(i)} className="p-1 hover:bg-red-100 rounded-full">
                                    <X className="w-4 h-4 text-red-500" />
                                </button>
                            </div>
                           </div>
                        ))}
                      </div>
                    )}
                 </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4">2. 참고 자료 (규정집)</h3>
              <div className="space-y-2">
                {MOCK_DOCUMENTS.map(doc => (
                  <button key={doc.id} onClick={() => setViewingDoc(doc)} className="w-full text-left flex items-center gap-3 p-3 bg-white border rounded-lg hover:bg-slate-50 transition-colors">
                    <BookOpen className="w-5 h-5 text-indigo-500" />
                    <div>
                        <p className="text-sm font-medium">{doc.title}</p>
                        <p className="text-xs text-slate-500">{doc.category}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>

          <div className="mt-8 text-center">
            <button
              onClick={handleRunAudit}
              disabled={files.length === 0}
              className="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed transition-all text-lg"
            >
              감사 실행 (Run Audit)
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <div className="w-full max-w-md">
            {STEPS.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: index <= currentStep ? 1 : 0.3, y: index <= currentStep ? 0 : 20 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="flex items-center gap-4 p-4 mb-4"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 border">
                  {currentStep > index ? <CheckCircle className="w-6 h-6 text-green-500" /> : 
                   currentStep === index ? <Loader className="w-6 h-6 text-blue-500 animate-spin" /> : 
                   <step.icon className="w-6 h-6 text-slate-400" />}
                </div>
                <h3 className={`text-lg font-medium ${currentStep >= index ? 'text-slate-900' : 'text-slate-400'}`}>{step.text}</h3>
              </motion.div>
            ))}
          </div>
            {currentStep === STEPS.length && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                    <p className="mt-4 text-xl font-bold">분석 완료!</p>
                    <p className="text-slate-500">대시보드로 이동합니다...</p>
                </motion.div>
            )}
        </div>
      )}
    </div>
  );
};

export default DataUpload;