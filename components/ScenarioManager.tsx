
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AUDIT_AREAS } from '../data/mockData';
import { CheckCircle, XCircle, Search, Paperclip, Plus, X } from 'lucide-react';
import type { AuditAreaCode, Scenario } from '../types';

// Modal component for adding a new scenario
const AddScenarioModal: React.FC<{
  onClose: () => void;
  onAdd: (data: Omit<Scenario, 'id' | 'status' | 'detailedDescription' | 'timestamp' | 'evidenceUrl' | 'isNew'>) => void;
}> = ({ onClose, onAdd }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [areaCode, setAreaCode] = useState<AuditAreaCode>('FSC');
    const [risk, setRisk] = useState<'High' | 'Medium' | 'Low'>('Medium');
    const [type, setType] = useState<'Structured' | 'Unstructured'>('Structured');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description) return;
        onAdd({ title, description, areaCode, risk, type });
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-xl shadow-lg w-full max-w-2xl"
            >
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-lg font-bold">새 감사 시나리오 추가</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100"><X className="w-5 h-5"/></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">시나리오 제목</label>
                            <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">설명 (Description)</label>
                            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="areaCode" className="block text-sm font-medium text-slate-700 mb-1">감사 영역</label>
                                <select id="areaCode" value={areaCode} onChange={(e) => setAreaCode(e.target.value as AuditAreaCode)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                                    {AUDIT_AREAS.map(area => <option key={area.code} value={area.code}>{area.name}</option>)}
                                </select>
                            </div>
                             <div>
                                <label htmlFor="risk" className="block text-sm font-medium text-slate-700 mb-1">위험 수준</label>
                                <select id="risk" value={risk} onChange={(e) => setRisk(e.target.value as any)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                                    <option value="High">High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                            </div>
                             <div>
                                <label htmlFor="type" className="block text-sm font-medium text-slate-700 mb-1">분석 유형</label>
                                <select id="type" value={type} onChange={(e) => setType(e.target.value as any)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                                    <option value="Structured">Structured (정형)</option>
                                    <option value="Unstructured">Unstructured (비정형)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium bg-white border border-slate-300 rounded-md hover:bg-slate-50">취소</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">추가</button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

interface ScenarioManagerProps {
  scenarios: Scenario[];
  onAddScenario: (scenario: Scenario) => void;
}

const ScenarioManager: React.FC<ScenarioManagerProps> = ({ scenarios, onAddScenario }) => {
  const [filterArea, setFilterArea] = useState<AuditAreaCode | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredScenarios = scenarios.filter(scenario => {
    const matchesArea = filterArea === 'ALL' || scenario.areaCode === filterArea;
    const matchesSearch = scenario.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesArea && matchesSearch;
  });

  const handleAddScenarioData = (data: { title: string, description: string, areaCode: AuditAreaCode, risk: 'High' | 'Medium' | 'Low', type: 'Structured' | 'Unstructured' }) => {
    const newScenario: Scenario = {
      id: `${data.areaCode}-${Date.now()}`,
      areaCode: data.areaCode,
      title: data.title,
      description: data.type === 'Structured' 
        ? `SQL 규칙 검증: ${AUDIT_AREAS.find(a=>a.code === data.areaCode)?.name} 마스터 데이터 무결성 점검`
        : `AI 문서 분석: ${AUDIT_AREAS.find(a=>a.code === data.areaCode)?.name} 관련 증빙 문서와 시스템 데이터 대조`,
      detailedDescription: data.description,
      status: 'Pass', // New scenarios are initially compliant
      risk: data.risk,
      type: data.type,
      isNew: true,
      timestamp: new Date().toISOString(),
      evidenceUrl: '', // No evidence for new scenarios yet
    };
    onAddScenario(newScenario);
    setIsModalOpen(false);
  };

  const RiskIndicator = ({ risk }: { risk: 'High' | 'Medium' | 'Low' }) => {
    const colors = {
      High: 'bg-red-500',
      Medium: 'bg-yellow-500',
      Low: 'bg-green-500',
    };
    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${colors[risk]}`} />
        <span className="text-xs font-medium text-slate-500">{risk}</span>
      </div>
    );
  };
  
  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
      <AnimatePresence>
        {isModalOpen && <AddScenarioModal onClose={() => setIsModalOpen(false)} onAdd={handleAddScenarioData} />}
      </AnimatePresence>

      <div className="mb-6 hidden lg:block">
        <h2 className="text-2xl font-bold text-slate-900">시나리오 관리자 (Scenario Manager)</h2>
        <p className="text-slate-500 mt-1">AI가 생성하고 관리하는 {scenarios.length}개의 자동화 감사 시나리오입니다.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="시나리오 검색..."
            className="w-full pl-11 pr-4 py-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>새 시나리오 추가</span>
        </button>
      </div>

      {/* Area Filter Tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex border-b border-slate-200">
          <button onClick={() => setFilterArea('ALL')} className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${filterArea === 'ALL' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}>
            전체
          </button>
          {AUDIT_AREAS.map(area => (
            <button key={area.code} onClick={() => setFilterArea(area.code)} className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${filterArea === area.code ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}>
              {area.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Scenario Cards Grid */}
      <div className="flex-1 overflow-y-auto pr-2 -mr-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScenarios.map((scenario) => (
            <div key={scenario.id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col relative overflow-hidden">
               {scenario.isNew && (
                <div className="absolute top-0 right-0">
                  <div className="px-3 py-1 bg-blue-600 text-white text-xs font-bold" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%, 20% 50%, 0 0)'}}>NEW</div>
                </div>
              )}
              <div className="flex justify-between items-start mb-3">
                <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-bold">{scenario.areaCode}</span>
                <RiskIndicator risk={scenario.risk} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2 flex-1">{scenario.title}</h3>
              <p className="text-xs text-slate-500 mb-4">{scenario.description}</p>
              <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-auto">
                <div className={`inline-flex items-center space-x-1.5 text-xs font-medium ${ scenario.status === 'Pass' ? 'text-emerald-700' : 'text-red-700' }`}>
                  {scenario.status === 'Pass' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  <span>{scenario.status === 'Pass' ? '적정' : '위반'}</span>
                </div>
                <button className="flex items-center gap-1 text-slate-600 hover:text-blue-600 text-xs font-medium">
                  <Paperclip className="w-3 h-3" />
                  상세 보기
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScenarioManager;
