
import React, { useState, useMemo, useEffect } from 'react';
import { AUDIT_AREAS } from '../data/mockData';
import { AlertOctagon, FileText, ArrowRight, Eye, Terminal, CheckCircle, XCircle, Table, Sparkles, FileSpreadsheet } from 'lucide-react';
import type { ViolationDetail, Scenario, MockUploadFile } from '../types';

// --- (Simulated Evidence Components: SimulatedEmail, SimulatedContract, SimulatedLog, GenericDocViewer, SimulatedEvidenceViewer remain same) ---
const SimulatedEmail: React.FC<{ violation: ViolationDetail }> = ({ violation }) => (
  <div className="w-full h-full bg-white p-4 text-sm font-sans flex flex-col">
    <div className="border-b pb-2 mb-2">
      <h4 className="font-bold text-slate-800 text-base">긴급 요청: {violation.transactionInfo.entity} 관련</h4>
      <div className="text-xs text-slate-500 mt-1">받은 편지함</div>
    </div>
    <div className="flex items-center gap-3 my-3">
      <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-base shrink-0">
        {violation.transactionInfo.entity.charAt(0)}
      </div>
      <div>
        <p className="font-semibold text-slate-700">{violation.transactionInfo.entity} &lt;user@nexuscorp.com&gt;</p>
        <p className="text-xs text-slate-500">To: 감사팀 / 재무팀</p>
      </div>
    </div>
    <div className="text-slate-800 space-y-3 text-sm leading-relaxed flex-1 overflow-y-auto">
      <p>담당자님,</p>
      <p>아래 거래에 대한 긴급 처리 및 승인을 요청드립니다. 특이사항이 있어 AI가 식별한 내용입니다.</p>
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 my-2">
        <p><strong>- 참조 ID:</strong> {violation.transactionInfo.id}</p>
        <p><strong>- 금액:</strong> {violation.transactionInfo.amount}</p>
      </div>
      <p>감사합니다.</p>
    </div>
    <div className="text-xs text-slate-400 mt-auto pt-2 border-t">{violation.transactionInfo.date}</div>
  </div>
);

const SimulatedContract: React.FC<{ violation: ViolationDetail }> = () => (
  <div className="w-full h-full bg-white p-6 text-sm font-serif flex flex-col">
    <div className="text-center border-b-2 border-black pb-2 mb-4">
      <h3 className="text-xl font-bold">계약서 (Contract)</h3>
    </div>
    <div className="text-xs space-y-2 mb-4">
      <p><strong>갑:</strong> Nexus Corp</p>
      <p><strong>을:</strong> Supplier Inc.</p>
    </div>
    <div className="text-slate-800 space-y-3 text-xs leading-relaxed flex-1 overflow-y-auto">
      <p>...</p>
      <h4 className="font-bold pt-2 text-sm">제 5조 (특약)</h4>
      <div className="bg-yellow-100 border-l-4 border-yellow-400 p-3 my-2 text-yellow-900 shadow-inner">
        <p><strong>본 계약의 단가는 별첨 A를 따르며, 추가 할인은 적용되지 않는다.</strong></p>
      </div>
      <p>...</p>
    </div>
  </div>
);

const SimulatedLog: React.FC<{ violation: ViolationDetail }> = ({ violation }) => (
  <div className="w-full h-full bg-slate-900 text-slate-300 p-4 text-xs font-mono flex flex-col">
    <div className="flex items-center gap-2 text-slate-500 border-b border-slate-700 pb-2 mb-2">
      <Terminal className="w-4 h-4" />
      <span>System Analysis Log</span>
    </div>
    <div className="flex-1 space-y-1 overflow-y-auto">
      <p><span className="text-cyan-400">[{violation.transactionInfo.date} 15:30:01]</span> <span className="text-red-400">ALERT</span>: Compliance Violation Detected.</p>
      <p className="pl-4"> <span className="text-yellow-400">ID:</span> {violation.transactionInfo.id}</p>
      <p className="pl-4"> <span className="text-yellow-400">User:</span> {violation.transactionInfo.entity}</p>
      <p className="pl-4"> <span className="text-yellow-400">Amount:</span> {violation.transactionInfo.amount}</p>
      <p className="bg-red-900/50 text-red-300 p-1 rounded mt-2">
        <span className="text-red-400">CRITICAL</span>: {violation.violationType}
      </p>
    </div>
  </div>
);

// New Generic Viewer that can display raw text content from uploaded files
const GenericTextFileViewer: React.FC<{ file: MockUploadFile }> = ({ file }) => (
  <div className="w-full h-full bg-white p-4 text-sm font-mono flex flex-col overflow-hidden">
    <div className="flex items-center gap-2 text-slate-500 border-b pb-2 mb-2">
      {file.type === 'CSV' ? <FileSpreadsheet className="w-4 h-4" /> : file.type === 'LOG' ? <Terminal className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
      <span>{file.name} (Preview)</span>
    </div>
    <pre className="flex-1 overflow-y-auto text-slate-800 text-xs leading-relaxed">
      {file.content || "파일 내용을 불러올 수 없습니다."}
    </pre>
  </div>
);


const SimulatedEvidenceViewer: React.FC<{violation: ViolationDetail; uploadedFiles: MockUploadFile[]}> = ({ violation, uploadedFiles }) => {
    // Attempt to find an uploaded file that matches the violation's transaction ID
    const matchingFile = uploadedFiles.find(f => 
      f.content.includes(violation.transactionInfo.id) || 
      f.name.toLowerCase().includes(violation.transactionInfo.id.toLowerCase().split('-')[0]) // Simplified match for demo
    );

    if (matchingFile) {
      return <GenericTextFileViewer file={matchingFile} />;
    }

    // Fallback to hardcoded simulated viewers if no matching uploaded file
    switch (violation.evidenceType) {
        case 'Approval Email': return <SimulatedEmail violation={violation} />;
        case 'Contract': return <SimulatedContract violation={violation} />;
        case 'Log File': return <SimulatedLog violation={violation} />;
        default: return <div className="w-full h-full flex items-center justify-center bg-slate-200"><p className="text-slate-500">No Preview Available</p></div>;
    }
};

const GenericScenarioDocViewer: React.FC<{ scenario: Scenario }> = ({ scenario }) => {
  const { title } = scenario;
  const isFail = scenario.status === 'Fail';
  return (
    <div className="w-full h-full bg-slate-200 p-4 overflow-hidden flex items-center justify-center">
         <div className="w-full max-w-md sm:max-w-2xl bg-white shadow-xl h-full max-h-[600px] overflow-auto flex flex-col transform transition-transform hover:scale-[1.01] duration-300">
            <div className="p-4 sm:p-8 bg-white h-full flex flex-col">
                <div className="border-b-2 border-slate-800 pb-2 sm:pb-4 mb-3 sm:mb-6">
                    <div className="flex justify-between items-start">
                        <h1 className="text-base sm:text-xl font-bold uppercase text-slate-800">{title}</h1>
                        <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300" />
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2">Ref: {scenario.id}</p>
                </div>
                <div className="space-y-3 sm:space-y-4 text-sm text-slate-800 leading-relaxed text-justify flex-1">
                    <p>Evidence document for <strong>{title}</strong>.</p>
                    <div className="bg-slate-50 p-3 sm:p-4 border border-slate-200 rounded my-3 sm:my-4">
                        <h4 className="font-bold mb-2 flex items-center gap-2 text-sm">
                            <Table className="w-4 h-4 text-slate-500"/> Data Extract
                        </h4>
                        <div className="space-y-2 text-xs font-mono text-slate-600">
                             <div className="flex justify-between font-bold"><span>Result</span><span>{isFail ? "FAIL" : "PASS"}</span></div>
                        </div>
                    </div>
                </div>
            </div>
         </div>
    </div>
  );
};


interface ReportsProps {
  scenarios: Scenario[];
  violations: ViolationDetail[];
  uploadedFiles: MockUploadFile[]; // Added uploadedFiles prop
}

const Reports: React.FC<ReportsProps> = ({ scenarios, violations, uploadedFiles }) => {
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(scenarios.length > 0 ? scenarios[0] : {} as Scenario);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FAIL' | 'PASS'>('ALL');

  useEffect(() => {
    // If current selected is not in current list (e.g. filtered out), select the first one available
    if (!scenarios.find(s => s.id === selectedScenario.id) && scenarios.length > 0) {
      setSelectedScenario(scenarios[0]);
    }
  }, [scenarios, selectedScenario.id]);

  const getAreaName = (code: string) => AUDIT_AREAS.find(a => a.code === code)?.name || code;
  
  const filteredScenarios = useMemo(() => {
    return scenarios.filter(s => {
        if (statusFilter === 'ALL') return true;
        return s.status.toUpperCase() === statusFilter;
    }).sort((a, b) => { // Sort to show new/high risk scenarios first
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      const riskOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
      if (riskOrder[a.risk] > riskOrder[b.risk]) return -1;
      if (riskOrder[a.risk] < riskOrder[b.risk]) return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [statusFilter, scenarios]);

  // FIXED: Dynamically find violation details using the violationId on the scenario object
  // This ensures that AI-discovered violations are found within the current session's violations state.
  const violationDetail = useMemo(() => {
    if (selectedScenario.status === 'Fail' && selectedScenario.violationId) {
        return violations.find(v => v.id === selectedScenario.violationId);
    }
    return null;
  }, [selectedScenario, violations]);

  const RiskIndicator = ({ risk }: { risk: Scenario['risk'] }) => {
    const colors = { High: 'bg-red-500', Medium: 'bg-orange-500', Low: 'bg-emerald-500' };
    return <div className={`w-2 h-2 rounded-full ${colors[risk]}`} />;
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-slate-50">
      <div className="w-full md:w-1/3 md:h-full flex flex-col border-r border-slate-200 bg-white">
        <div className="p-4 sm:p-6 border-b border-slate-100 hidden md:block">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">전체 감사 시나리오</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">{scenarios.length}개 시나리오 실행 결과</p>
        </div>
         <div className="p-3 border-b border-slate-100">
            <div className="flex bg-slate-100 rounded-lg p-1">
                <button onClick={() => setStatusFilter('ALL')} className={`flex-1 text-sm p-2 rounded-md ${statusFilter === 'ALL' ? 'bg-white shadow' : ''}`}>전체</button>
                <button onClick={() => setStatusFilter('FAIL')} className={`flex-1 text-sm p-2 rounded-md ${statusFilter === 'FAIL' ? 'bg-white shadow' : ''}`}>위반</button>
                <button onClick={() => setStatusFilter('PASS')} className={`flex-1 text-sm p-2 rounded-md ${statusFilter === 'PASS' ? 'bg-white shadow' : ''}`}>적정</button>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredScenarios.map(scenario => (
            <button
              key={scenario.id}
              onClick={() => setSelectedScenario(scenario)}
              className={`w-full text-left p-3 sm:p-4 border-b border-slate-100 transition-all hover:bg-slate-50 ${
                selectedScenario.id === scenario.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                 <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-bold">{scenario.areaCode}</span>
                    {scenario.isNew && <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold animate-pulse">NEW AI</span>}
                 </div>
                 <div className="flex items-center gap-2">
                    <RiskIndicator risk={scenario.risk} />
                    <span className="text-xs font-medium text-slate-500">{scenario.risk}</span>
                 </div>
              </div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1 line-clamp-1">{scenario.title}</h4>
               <div className={`mt-2 inline-flex items-center space-x-1.5 text-xs font-medium ${ scenario.status === 'Pass' ? 'text-emerald-700' : 'text-red-700' }`}>
                  {scenario.status === 'Pass' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  <span>{scenario.status === 'Pass' ? '적정' : '위반'}</span>
                </div>
            </button>
          ))}
        </div>
      </div>

      <div className="w-full md:w-2/3 h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between mb-4 sm:mb-6">
            <div className="mb-4 sm:mb-0">
              <div className="flex items-center flex-wrap space-x-2 text-slate-500 text-sm mb-1">
                <span className="font-medium text-blue-600">{getAreaName(selectedScenario.areaCode)}</span>
                <span>/</span>
                <span className="font-semibold text-slate-900">{selectedScenario.id}</span>
                {selectedScenario.isNew && <span className="flex items-center gap-1 text-blue-600 font-bold ml-2"><Sparkles className="w-3 h-3"/> AI 실시간 발굴</span>}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{selectedScenario.title}</h1>
            </div>
            <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center">
              <FileText className="w-4 h-4" /> PDF 내보내기
            </button>
          </div>
          
          {violationDetail ? (
            <>
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Eye className="w-16 h-16 sm:w-24 sm:h-24 text-red-600" />
                </div>
                <h3 className="text-red-900 font-bold flex items-center gap-2 mb-3 text-lg">
                  <AlertOctagon className="w-5 h-5 text-red-600" /> AuditFlow AI 분석 결과: 위반 (Violation)
                </h3>
                <p className="text-red-800 text-sm leading-relaxed mb-4">{violationDetail.aiAnalysis}</p>
                <div className="bg-white/60 rounded-lg p-3 text-sm text-red-900 font-medium border border-red-100/50">
                  <span className="font-bold">권고 조치 (Recommendation):</span> {violationDetail.recommendation}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 sm:mb-4 border-b border-slate-100 pb-2">시스템 데이터 (Audit Evidence)</h3>
                  <div className="space-y-4">
                    <div><label className="text-xs text-slate-500 block mb-1">Transaction ID / Log ID</label><p className="text-sm sm:text-base font-mono font-medium text-slate-900 break-all">{violationDetail.transactionInfo.id}</p></div>
                    <div><label className="text-xs text-slate-500 block mb-1">식별 일자</label><p className="text-sm font-medium text-slate-900">{violationDetail.transactionInfo.date}</p></div>
                    <div><label className="text-xs text-slate-500 block mb-1">관련 금액 / 크기</label><p className="text-sm font-medium text-slate-900">{violationDetail.transactionInfo.amount}</p></div>
                    <div><label className="text-xs text-slate-500 block mb-1">대상 엔티티 / 담당자</label><p className="text-sm font-medium text-slate-900">{violationDetail.transactionInfo.entity}</p></div>
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 sm:mb-4 border-b border-slate-100 pb-2 flex justify-between items-center">
                    <span>비정형 증빙 자료 ({violationDetail.evidenceType})</span>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">AI SCANNER</span>
                  </h3>
                  <div className="flex-1 bg-slate-100 rounded-lg border border-slate-200 relative group overflow-hidden min-h-[200px] sm:min-h-[300px]">
                    <SimulatedEvidenceViewer violation={violationDetail} uploadedFiles={uploadedFiles} />
                  </div>
                </div>
              </div>
            </>
          ) : (
             <div className="space-y-6 sm:space-y-8">
               <div className={`bg-gradient-to-r ${selectedScenario.status === 'Pass' ? 'from-emerald-50 to-green-50 border-emerald-100' : 'from-red-50 to-orange-50 border-red-100'} rounded-xl p-4 sm:p-6`}>
                 <h3 className={`font-bold flex items-center gap-2 mb-3 text-lg ${selectedScenario.status === 'Pass' ? 'text-emerald-900' : 'text-red-900'}`}>
                    {selectedScenario.status === 'Pass' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                    AuditFlow AI 분석 결과: {selectedScenario.status === 'Pass' ? '적정' : '위반'}
                 </h3>
                 <p className={`text-sm leading-relaxed ${selectedScenario.status === 'Pass' ? 'text-emerald-800' : 'text-red-800'}`}>
                    {selectedScenario.status === 'Pass' 
                        ? 'AI가 증빙 자료와 시스템 데이터를 분석한 결과, 해당 통제는 정책에 따라 효과적으로 운영되고 있으며 위반 사항이 발견되지 않았습니다.'
                        : 'AI가 증빙 자료와 시스템 데이터를 분석한 결과, 통제 미흡 또는 정책 위반 가능성이 발견되었습니다.'}
                 </p>
               </div>
                <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 sm:mb-4 border-b border-slate-100 pb-2">테스트 상세 내용</h3>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedScenario.detailedDescription}</p>
                </div>
               <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 sm:mb-4 border-b border-slate-100 pb-2 flex justify-between items-center">
                        분석된 증빙 자료 (샘플)
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">Generated by AuditFlow AI</span>
                    </h3>
                    <div className="bg-slate-100 rounded-lg border border-slate-200 p-2 min-h-[200px] sm:min-h-[400px]">
                        <GenericScenarioDocViewer scenario={selectedScenario} />
                    </div>
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;