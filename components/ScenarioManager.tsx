import React, { useState } from 'react';
import { MOCK_SCENARIOS, AUDIT_AREAS } from '../data/mockData';
import { CheckCircle, XCircle, Search, Paperclip } from 'lucide-react';
import { AuditAreaCode } from '../types';

const ScenarioManager: React.FC = () => {
  const [filterArea, setFilterArea] = useState<AuditAreaCode | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredScenarios = MOCK_SCENARIOS.filter(scenario => {
    const matchesArea = filterArea === 'ALL' || scenario.areaCode === filterArea;
    const matchesSearch = scenario.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesArea && matchesSearch;
  });

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
      <div className="mb-6 hidden lg:block">
        <h2 className="text-2xl font-bold text-slate-900">시나리오 관리자 (Scenario Manager)</h2>
        <p className="text-slate-500 mt-1">AI가 생성하고 관리하는 90개의 자동화 감사 시나리오입니다.</p>
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