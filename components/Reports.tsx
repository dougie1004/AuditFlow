import React, { useState } from 'react';
import { CRITICAL_VIOLATIONS, AUDIT_AREAS } from '../data/mockData';
import { AlertOctagon, FileText, ArrowRight, Eye } from 'lucide-react';

const Reports: React.FC = () => {
  const [selectedViolation, setSelectedViolation] = useState(CRITICAL_VIOLATIONS[0]);

  const getAreaName = (code: string) => {
    return AUDIT_AREAS.find(a => a.code === code)?.name || code;
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-slate-50">
      {/* Left List Pane */}
      <div className="w-full md:w-1/3 md:h-full flex flex-col border-r border-slate-200 bg-white">
        <div className="p-4 sm:p-6 border-b border-slate-100 hidden md:block">
          <h2 className="text-xl font-bold text-slate-900">주요 위반 사례</h2>
          <p className="text-sm text-slate-500 mt-1">고위험 이상징후 목록</p>
        </div>
        <div className="md:flex-1 md:overflow-y-auto">
          {CRITICAL_VIOLATIONS.map(violation => (
            <button
              key={violation.id}
              onClick={() => setSelectedViolation(violation)}
              className={`w-full text-left p-4 border-b border-slate-100 transition-all hover:bg-slate-50 ${
                selectedViolation.id === violation.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500">{violation.id}</span>
                <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                  {violation.riskLevel}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1 line-clamp-1">{violation.controlPoint}</h4>
              <p className="text-xs text-slate-500 line-clamp-2">{violation.aiAnalysis}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Right Detail Pane */}
      <div className="w-full md:w-2/3 h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between mb-6">
            <div className="mb-4 sm:mb-0">
              <div className="flex items-center flex-wrap space-x-2 text-slate-500 text-sm mb-1">
                <span className="font-medium text-blue-600">{getAreaName(selectedViolation.areaCode)}</span>
                <span>/</span>
                <span>위반 사례</span>
                <span>/</span>
                <span className="font-semibold text-slate-900">{selectedViolation.id}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{selectedViolation.controlPoint}</h1>
            </div>
            <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center">
              <FileText className="w-4 h-4" />
              PDF 내보내기
            </button>
          </div>

          {/* AI Analysis Box */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-4 sm:p-6 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Eye className="w-16 h-16 sm:w-24 sm:h-24 text-indigo-600" />
            </div>
            <h3 className="text-indigo-900 font-bold flex items-center gap-2 mb-3">
              <AlertOctagon className="w-5 h-5 text-indigo-600" />
              AuditFlow AI 분석 결과
            </h3>
            <p className="text-indigo-800 text-sm leading-relaxed mb-4">
              {selectedViolation.aiAnalysis}
            </p>
            <div className="bg-white/60 rounded-lg p-3 text-sm text-indigo-900 font-medium border border-indigo-100/50">
              <span className="font-bold">권고 조치 (Recommendation):</span> {selectedViolation.recommendation}
            </div>
          </div>

          {/* Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Structured Data */}
            <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                시스템 데이터 (ERP Data)
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Transaction ID</label>
                  <p className="text-base sm:text-lg font-mono font-medium text-slate-900 break-all">{selectedViolation.transactionInfo.id}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">일자</label>
                  <p className="text-sm font-medium text-slate-900">{selectedViolation.transactionInfo.date}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">금액 / 값</label>
                  <p className="text-sm font-medium text-slate-900">{selectedViolation.transactionInfo.amount}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">대상 / 사용자</label>
                  <p className="text-sm font-medium text-slate-900">{selectedViolation.transactionInfo.entity}</p>
                </div>
              </div>
            </div>

            {/* Unstructured Evidence */}
            <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
               <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex justify-between items-center">
                <span>비정형 증빙 자료 ({selectedViolation.evidenceType})</span>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">Simulated View</span>
              </h3>
              
              <div className="flex-1 bg-slate-100 rounded-lg border border-slate-200 relative group overflow-hidden min-h-[200px]">
                {/* Simulated Document Preview */}
                <img 
                  src={selectedViolation.evidenceDocumentUrl} 
                  alt="Evidence" 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                />
                
                {/* Highlight Overlay - Simulated AI Finding */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                  <div className="bg-red-500/90 text-white text-xs px-3 py-1.5 rounded shadow-lg backdrop-blur-sm flex items-center gap-2">
                    <AlertOctagon className="w-3 h-3" />
                    불일치(Mismatch) 감지
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>Source: SharePoint / Legal_Repos</span>
                <a 
                  href={selectedViolation.evidenceDocumentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  원본 보기 <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;