import React, { useState } from 'react';
import { MOCK_SCENARIOS, AUDIT_AREAS, getScenarioDetail } from '../data/mockData';
import { CheckCircle, XCircle, Search, Filter, Paperclip, Eye, AlertOctagon, ArrowRight, X } from 'lucide-react';
import { AuditAreaCode, ViolationDetail } from '../types';

const ScenarioList: React.FC = () => {
  const [filterArea, setFilterArea] = useState<AuditAreaCode | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScenario, setSelectedScenario] = useState<ViolationDetail | null>(null);

  const filteredScenarios = MOCK_SCENARIOS.filter(scenario => {
    const matchesArea = filterArea === 'ALL' || scenario.areaCode === filterArea;
    const matchesSearch = scenario.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          scenario.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesArea && matchesSearch;
  });

  const getAreaName = (code: AuditAreaCode) => {
    return AUDIT_AREAS.find(a => a.code === code)?.name || code;
  };

  return (
    <div className="p-8 h-full flex flex-col relative">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">테스트 시나리오 실행 결과</h2>
        <p className="text-slate-500 mt-1">9개 영역, 총 90개 통제 항목에 대한 AI 자동화 진단 결과입니다.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="시나리오 검색..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative min-w-[200px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <select 
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value as AuditAreaCode | 'ALL')}
          >
            <option value="ALL">전체 감사 영역</option>
            {AUDIT_AREAS.map(area => (
              <option key={area.code} value={area.code}>{area.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">ID</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">영역 (Area)</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-1/2">테스트 시나리오 및 설명</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">유형</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">증빙 (Evidence)</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredScenarios.map((scenario) => (
                <tr key={scenario.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4 text-sm font-mono text-slate-500">{scenario.id}</td>
                  <td className="p-4 text-sm font-medium text-slate-700">
                    <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-bold">{getAreaName(scenario.areaCode)}</span>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-semibold text-slate-900">{scenario.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{scenario.detailedDescription}</p>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      scenario.type === 'Unstructured' 
                        ? 'bg-purple-50 text-purple-700 border border-purple-100' 
                        : 'bg-blue-50 text-blue-700 border border-blue-100'
                    }`}>
                      {scenario.type === 'Unstructured' ? 'AI 문서 분석' : 'SQL 규칙'}
                    </span>
                  </td>
                  <td className="p-4">
                     <button
                       onClick={() => setSelectedScenario(getScenarioDetail(scenario))}
                       className="flex items-center gap-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors text-xs font-medium border border-slate-200 hover:border-blue-300 rounded px-2 py-1 bg-white w-fit shadow-sm"
                     >
                       <Paperclip className="w-3 h-3" />
                       증빙 상세 보기
                     </button>
                  </td>
                  <td className="p-4">
                    <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${
                      scenario.status === 'Pass' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : 'bg-red-50 text-red-700 border border-red-100'
                    }`}>
                      {scenario.status === 'Pass' ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      <span>{scenario.status === 'Pass' ? '적정' : '위반'}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedScenario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedScenario(null)} />
          <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/50">
              <div>
                 <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-xs font-bold font-mono">{selectedScenario.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedScenario.riskLevel === 'Low' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {selectedScenario.riskLevel} Risk
                    </span>
                 </div>
                 <h2 className="text-xl font-bold text-slate-900">{selectedScenario.controlPoint}</h2>
              </div>
              <button 
                onClick={() => setSelectedScenario(null)}
                className="p-2 rounded-full hover:bg-slate-200 transition-colors text-slate-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto bg-slate-50/30">
              
              {/* AI Analysis Box */}
              <div className={`border rounded-xl p-6 mb-8 relative overflow-hidden ${
                selectedScenario.riskLevel === 'Low' 
                  ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-100' 
                  : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-100'
              }`}>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Eye className={`w-24 h-24 ${selectedScenario.riskLevel === 'Low' ? 'text-emerald-600' : 'text-red-600'}`} />
                </div>
                <h3 className={`font-bold flex items-center gap-2 mb-3 ${selectedScenario.riskLevel === 'Low' ? 'text-emerald-900' : 'text-red-900'}`}>
                  {selectedScenario.riskLevel === 'Low' ? <CheckCircle className="w-5 h-5" /> : <AlertOctagon className="w-5 h-5" />}
                  AuditFlow AI 분석 결과
                </h3>
                <p className={`text-sm leading-relaxed mb-4 ${selectedScenario.riskLevel === 'Low' ? 'text-emerald-800' : 'text-red-800'}`}>
                  {selectedScenario.aiAnalysis}
                </p>
                <div className="bg-white/60 rounded-lg p-3 text-sm font-medium border border-white/50 text-slate-800">
                  <span className="font-bold">권고 조치:</span> {selectedScenario.recommendation}
                </div>
              </div>

              {/* Data Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Structured Data */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                    시스템 데이터 (ERP Transaction)
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Transaction ID</label>
                      <p className="text-lg font-mono font-medium text-slate-900">{selectedScenario.transactionInfo.id}</p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">일자</label>
                      <p className="text-sm font-medium text-slate-900">{selectedScenario.transactionInfo.date}</p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">금액 / 값</label>
                      <p className="text-sm font-medium text-slate-900">{selectedScenario.transactionInfo.amount}</p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">대상 / 사용자</label>
                      <p className="text-sm font-medium text-slate-900">{selectedScenario.transactionInfo.entity}</p>
                    </div>
                  </div>
                </div>

                {/* Unstructured Evidence */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex justify-between items-center">
                    <span>비정형 증빙 자료 ({selectedScenario.evidenceType})</span>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">AI Preview</span>
                  </h3>
                  
                  <div className="flex-1 bg-slate-100 rounded-lg border border-slate-200 relative group overflow-hidden min-h-[200px]">
                    <img 
                      src={selectedScenario.evidenceDocumentUrl} 
                      alt="Evidence" 
                      className="w-full h-full object-cover absolute inset-0 opacity-90" 
                    />
                    {selectedScenario.riskLevel !== 'Low' && (
                       <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                        <div className="bg-red-500/90 text-white text-xs px-3 py-1.5 rounded shadow-lg backdrop-blur-sm flex items-center gap-2 animate-pulse">
                          <AlertOctagon className="w-3 h-3" />
                          불일치 감지됨
                        </div>
                      </div>
                    )}
                     {selectedScenario.riskLevel === 'Low' && (
                       <div className="absolute bottom-4 right-4">
                        <div className="bg-emerald-500/90 text-white text-xs px-3 py-1.5 rounded shadow-lg backdrop-blur-sm flex items-center gap-2">
                          <CheckCircle className="w-3 h-3" />
                          Verified by AI
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>Source: Document Repository</span>
                    <a 
                      href={selectedScenario.evidenceDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      원본 문서 열기 <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioList;