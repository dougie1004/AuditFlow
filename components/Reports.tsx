
import React, { useState, useMemo, useEffect } from 'react';
import { CRITICAL_VIOLATIONS, AUDIT_AREAS } from '../data/mockData';
import { AlertOctagon, FileText, ArrowRight, Eye, Terminal, CheckCircle, XCircle, FileSearch } from 'lucide-react';
import { ViolationDetail, Scenario } from '../types';

// --- Simulated Evidence Components ---

const SimulatedEmail: React.FC<{ violation: ViolationDetail }> = ({ violation }) => (
  <div className="w-full h-full bg-white p-4 text-sm font-sans flex flex-col">
    <div className="border-b pb-2 mb-2">
      <h4 className="font-bold text-slate-800 text-base">긴급 분개 요청: Q3 마케팅 캠페인 비용 조정</h4>
      <div className="text-xs text-slate-500 mt-1">받은 편지함</div>
    </div>
    <div className="flex items-center gap-3 my-3">
      <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-base shrink-0">
        {violation.transactionInfo.entity.charAt(0)}
      </div>
      <div>
        <p className="font-semibold text-slate-700">{violation.transactionInfo.entity} &lt;chulsoo.kim@nexuscorp.com&gt;</p>
        <p className="text-xs text-slate-500">To: 재무승인팀</p>
      </div>
    </div>
    <div className="text-slate-800 space-y-3 text-sm leading-relaxed flex-1">
      <p>재무승인팀께,</p>
      <p>
        Q3 마케팅 캠페인 비용 정산 과정에서 누락된 에이전시 수수료가 발견되어, 긴급하게 아래와 같이 비표준 분개 처리를 요청드립니다.
      </p>
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 my-2">
        <p><strong>- 전표 ID:</strong> {violation.transactionInfo.id}</p>
        <p><strong>- 금액:</strong> {violation.transactionInfo.amount}</p>
        <p><strong>- 계정:</strong> 505001 - 광고선전비</p>
      </div>
      <p>월말 마감에 차질이 없도록 신속한 처리 부탁드립니다. 감사합니다.</p>
    </div>
    <div className="text-xs text-slate-400 mt-auto pt-2 border-t">
      {violation.transactionInfo.date} {new Date().toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute:'2-digit'})}
    </div>
  </div>
);

const SimulatedContract: React.FC<{ violation: ViolationDetail }> = () => (
  <div className="w-full h-full bg-white p-6 text-sm font-serif flex flex-col">
    <div className="text-center border-b-2 border-black pb-2 mb-4">
      <h3 className="text-xl font-bold">공급 계약서</h3>
      <p className="text-xs">Supply Agreement</p>
    </div>
    <div className="text-xs space-y-2 mb-4">
      <p><strong>갑 (Purchaser):</strong> Nexus Corp (넥서스 주식회사)</p>
      <p><strong>을 (Supplier):</strong> Alpha Components</p>
    </div>
    <div className="text-slate-800 space-y-3 text-xs leading-relaxed flex-1">
      <p>...</p>
      <h4 className="font-bold pt-2 text-sm">제 5조 (가격 및 대금 지급)</h4>
      <p>5.1 단가는 별첨 A에 따른다.</p>
      <div className="bg-yellow-100 border-l-4 border-yellow-400 p-3 my-2 text-yellow-900 shadow-inner">
        <p><strong>5.2 연간 총 구매액이 $1,000,000 (일백만 달러)를 초과하는 경우, 초과분에 대해 5%의 추가 할인을 적용한다.</strong></p>
      </div>
      <p>5.3 대금은 '을'의 청구일로부터 30일 이내에 '갑'이 지정한 계좌로 현금 지급한다.</p>
      <p>...</p>
    </div>
    <div className="text-right text-xs text-slate-400 mt-auto pt-2">
      Page 5 of 12
    </div>
  </div>
);

const SimulatedLog: React.FC<{ violation: ViolationDetail }> = ({ violation }) => (
  <div className="w-full h-full bg-slate-900 text-slate-300 p-4 text-xs font-mono flex flex-col">
    <div className="flex items-center gap-2 text-slate-500 border-b border-slate-700 pb-2 mb-2">
      <Terminal className="w-4 h-4" />
      <span>{violation.areaCode === 'SEC' ? 'DLP System Log' : 'Transaction Analysis Log'}</span>
    </div>
    <div className="flex-1 space-y-1 overflow-y-auto">
      {violation.areaCode === 'SEC' ? (
        <>
          <p><span className="text-cyan-400">[{violation.transactionInfo.date} 15:29:58]</span> <span className="text-green-400">INFO</span>: User {violation.transactionInfo.entity} authenticated.</p>
          <p className="bg-red-900/50 text-red-300 p-1 rounded my-1">
            <span className="text-cyan-400">[{violation.transactionInfo.date} 15:30:01]</span> <span className="text-red-400">ALERT</span>: [DLP-RULE-03] Large data transfer to removable media detected.
          </p>
          <p className="pl-4"> <span className="text-yellow-400">User:</span> {violation.transactionInfo.entity}</p>
          <p className="pl-4"> <span className="text-yellow-400">Action:</span> COPY</p>
          <p className="pl-4"> <span className="text-yellow-400">Source:</span> /project_aurora/</p>
          <p className="pl-4"> <span className="text-yellow-400">Destination:</span> /media/usb0</p>
          <p className="pl-4"> <span className="text-yellow-400">Size:</span> {violation.transactionInfo.amount}</p>
          <p className="pl-4"> <span className="text-yellow-400">ApprovalStatus:</span> <span className="font-bold text-red-400 animate-pulse">NOT_FOUND</span></p>
        </>
      ) : ( // For EXP-V01
        <>
          <p><span className="text-green-400">INFO</span>: Analyzing transactions for user {violation.transactionInfo.entity}</p>
          <p><span className="text-green-400">INFO</span>: Transaction TXN006... OK</p>
          <p className="bg-red-900/50 text-red-300 p-1 rounded my-1">
            <span className="text-red-400">ALERT</span>: [EXP-RULE-07] Prohibited merchant category detected.
          </p>
          <p className="pl-4"> <span className="text-yellow-400">TransactionID:</span> TXN007</p>
          <p className="pl-4"> <span className="text-yellow-400">Merchant:</span> 락휴 노래타운</p>
          <p className="pl-4"> <span className="text-yellow-400">MerchantCode:</span> 7992 (유흥주점)</p>
          <p className="bg-red-900/50 text-red-300 p-1 rounded mt-2">
            <span className="text-red-400">ALERT</span>: [EXP-RULE-11] Potential split payment detected.
          </p>
          <p className="pl-4"> <span className="text-yellow-400">CorrelatedID:</span> TXN008</p>
          <p className="pl-4"> <span className="text-yellow-400">TimeDelta:</span> 10 mins</p>
        </>
      )}
    </div>
  </div>
);

const SimulatedEvidenceViewer: React.FC<{violation: ViolationDetail}> = ({ violation }) => {
    switch (violation.evidenceType) {
        case 'Approval Email':
            return <SimulatedEmail violation={violation} />;
        case 'Contract':
            return <SimulatedContract violation={violation} />;
        case 'Log File':
            return <SimulatedLog violation={violation} />;
        default:
            return (
                <div className="w-full h-full object-cover flex items-center justify-center bg-slate-200">
                    <p className="text-slate-500">미리보기를 지원하지 않는 증빙입니다.</p>
                </div>
            );
    }
};

interface ReportsProps {
  scenarios: Scenario[];
}

const Reports: React.FC<ReportsProps> = ({ scenarios }) => {
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(scenarios.length > 0 ? scenarios[0] : {} as Scenario);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FAIL' | 'PASS'>('ALL');

  // Update selected scenario if scenarios change and current selection is invalid
  useEffect(() => {
    if (!scenarios.find(s => s.id === selectedScenario.id) && scenarios.length > 0) {
      setSelectedScenario(scenarios[0]);
    }
  }, [scenarios, selectedScenario.id]);

  const getAreaName = (code: string) => {
    return AUDIT_AREAS.find(a => a.code === code)?.name || code;
  };
  
  const filteredScenarios = useMemo(() => {
    return scenarios.filter(s => {
        if (statusFilter === 'ALL') return true;
        return s.status.toUpperCase() === statusFilter;
    });
  }, [statusFilter, scenarios]);

  const violationMap = useMemo(() => ({
    'FSC-001': 'FSC-V01',
    'STP-001': 'STP-V01',
    'EXP-002': 'EXP-V01',
    'SEC-001': 'SEC-V01'
  }), []);

  const violationDetail = useMemo(() => {
    if (selectedScenario.status === 'Fail') {
        const violationId = violationMap[selectedScenario.id as keyof typeof violationMap];
        return CRITICAL_VIOLATIONS.find(v => v.id === violationId);
    }
    return null;
  }, [selectedScenario, violationMap]);


  const RiskIndicator = ({ risk }: { risk: Scenario['risk'] }) => {
    const colors = {
      High: 'bg-red-500',
      Medium: 'bg-orange-500',
      Low: 'bg-emerald-500',
    };
    return <div className={`w-2 h-2 rounded-full ${colors[risk]}`} />;
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-slate-50">
      {/* Left List Pane */}
      <div className="w-full md:w-1/3 md:h-full flex flex-col border-r border-slate-200 bg-white">
        <div className="p-4 sm:p-6 border-b border-slate-100 hidden md:block">
          <h2 className="text-xl font-bold text-slate-900">전체 감사 시나리오</h2>
          <p className="text-sm text-slate-500 mt-1">{scenarios.length}개 시나리오 실행 결과</p>
        </div>
         <div className="p-3 border-b border-slate-100">
            <div className="flex bg-slate-100 rounded-lg p-1">
                <button onClick={() => setStatusFilter('ALL')} className={`flex-1 text-sm p-2 rounded-md ${statusFilter === 'ALL' ? 'bg-white shadow' : ''}`}>전체</button>
                <button onClick={() => setStatusFilter('FAIL')} className={`flex-1 text-sm p-2 rounded-md ${statusFilter === 'FAIL' ? 'bg-white shadow' : ''}`}>위반</button>
                <button onClick={() => setStatusFilter('PASS')} className={`flex-1 text-sm p-2 rounded-md ${statusFilter === 'PASS' ? 'bg-white shadow' : ''}`}>적정</button>
            </div>
        </div>
        <div className="md:flex-1 md:overflow-y-auto">
          {filteredScenarios.map(scenario => (
            <button
              key={scenario.id}
              onClick={() => setSelectedScenario(scenario)}
              className={`w-full text-left p-4 border-b border-slate-100 transition-all hover:bg-slate-50 ${
                selectedScenario.id === scenario.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                 <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-bold">{scenario.areaCode}</span>
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

      {/* Right Detail Pane */}
      <div className="w-full md:w-2/3 h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between mb-6">
            <div className="mb-4 sm:mb-0">
              <div className="flex items-center flex-wrap space-x-2 text-slate-500 text-sm mb-1">
                <span className="font-medium text-blue-600">{getAreaName(selectedScenario.areaCode)}</span>
                <span>/</span>
                <span>시나리오</span>
                <span>/</span>
                <span className="font-semibold text-slate-900">{selectedScenario.id}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{selectedScenario.title}</h1>
            </div>
            <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center">
              <FileText className="w-4 h-4" />
              PDF 내보내기
            </button>
          </div>
          
          {/* DYNAMIC CONTENT AREA */}
          {violationDetail ? (
            <>
              {/* AI Analysis Box for Violation */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-xl p-4 sm:p-6 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Eye className="w-16 h-16 sm:w-24 sm:h-24 text-red-600" />
                </div>
                <h3 className="text-red-900 font-bold flex items-center gap-2 mb-3">
                  <AlertOctagon className="w-5 h-5 text-red-600" />
                  AuditFlow AI 분석 결과: 위반
                </h3>
                <p className="text-red-800 text-sm leading-relaxed mb-4">
                  {violationDetail.aiAnalysis}
                </p>
                <div className="bg-white/60 rounded-lg p-3 text-sm text-red-900 font-medium border border-red-100/50">
                  <span className="font-bold">권고 조치 (Recommendation):</span> {violationDetail.recommendation}
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
                      <p className="text-base sm:text-lg font-mono font-medium text-slate-900 break-all">{violationDetail.transactionInfo.id}</p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">일자</label>
                      <p className="text-sm font-medium text-slate-900">{violationDetail.transactionInfo.date}</p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">금액 / 값</label>
                      <p className="text-sm font-medium text-slate-900">{violationDetail.transactionInfo.amount}</p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">대상 / 사용자</label>
                      <p className="text-sm font-medium text-slate-900">{violationDetail.transactionInfo.entity}</p>
                    </div>
                  </div>
                </div>

                {/* Unstructured Evidence */}
                <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex justify-between items-center">
                    <span>비정형 증빙 자료 ({violationDetail.evidenceType})</span>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">Simulated View</span>
                  </h3>
                  
                  <div className="flex-1 bg-slate-100 rounded-lg border border-slate-200 relative group overflow-hidden min-h-[300px]">
                    <SimulatedEvidenceViewer violation={violationDetail} />
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>Source: SharePoint / Legal_Repos</span>
                    <a 
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      원본 문서 열기 <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </>
          ) : (
             <div className="space-y-8">
               <div className={`bg-gradient-to-r ${selectedScenario.status === 'Pass' ? 'from-emerald-50 to-green-50 border-emerald-100' : 'from-red-50 to-orange-50 border-red-100'} rounded-xl p-6`}>
                 <h3 className={`font-bold flex items-center gap-2 mb-3 ${selectedScenario.status === 'Pass' ? 'text-emerald-900' : 'text-red-900'}`}>
                    {selectedScenario.status === 'Pass' 
                        ? <CheckCircle className="w-5 h-5 text-emerald-600" /> 
                        : <XCircle className="w-5 h-5 text-red-600" />}
                    AuditFlow AI 분석 결과: {selectedScenario.status === 'Pass' ? '적정' : '위반'}
                 </h3>
                 <p className={`text-sm leading-relaxed ${selectedScenario.status === 'Pass' ? 'text-emerald-800' : 'text-red-800'}`}>
                    {selectedScenario.status === 'Pass' 
                        ? 'AI가 증빙 자료와 시스템 데이터를 분석한 결과, 해당 통제는 정책에 따라 효과적으로 운영되고 있으며 위반 사항이 발견되지 않았습니다.'
                        : 'AI가 증빙 자료와 시스템 데이터를 분석한 결과, 통제 미흡 또는 정책 위반 가능성이 발견되었습니다.'}
                 </p>
               </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                        테스트 상세 내용
                    </h3>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedScenario.detailedDescription}</p>
                </div>
               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                        분석된 증빙 자료 (샘플)
                    </h3>
                    <div className="bg-slate-100 rounded-lg border border-slate-200 p-2">
                        {selectedScenario.evidenceUrl ? (
                             <img src={selectedScenario.evidenceUrl} alt="Evidence" className="rounded-md w-full h-auto object-cover" />
                        ) : (
                            <div className="h-48 flex items-center justify-center text-slate-500">
                                <FileSearch className="w-8 h-8 mr-2"/>
                                <span>표시할 증빙 자료가 없습니다.</span>
                            </div>
                        )}
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
