
import React, { useState, useEffect, useMemo } from 'react';
import { AUDIT_AREAS } from '../data/mockData';
import { Download, Printer, ShieldCheck, FileText, List, TrendingUp, Sparkles, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Scenario, ViolationDetail } from '../types';

type ReportTemplate = 'executive' | 'detailed' | 'improvement';

const TEMPLATES = [
  { id: 'executive', label: '경영진 요약 보고서', icon: FileText, desc: '핵심 지표 및 리스크 요약' },
  { id: 'detailed', label: '상세 감사 발견 사항', icon: List, desc: '전체 위반 사항 상세 분석' },
  { id: 'improvement', label: '프로세스 개선 제안', icon: TrendingUp, desc: 'AI 기반 근본 원인 분석' }
];

interface AuditReportProps {
  scenarios: Scenario[];
  violations: ViolationDetail[];
}

const AuditReport: React.FC<AuditReportProps> = ({ scenarios, violations }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate>('executive');
  const [isGenerating, setIsGenerating] = useState(false);
  const currentDate = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  
  // Dynamic Calculations based on props
  const totalScenarios = scenarios.length;
  const totalViolations = scenarios.filter(s => s.status === 'Fail').length;
  const complianceRate = totalScenarios > 0 
    ? ((totalScenarios - totalViolations) / totalScenarios * 100).toFixed(1)
    : '100.0';

  // Calculate dynamic statistics per area
  const areaStats = useMemo(() => {
    return AUDIT_AREAS.map(area => ({
        ...area,
        violationCount: scenarios.filter(s => s.areaCode === area.code && s.status === 'Fail').length
    }));
  }, [scenarios]);

  // Simulate AI Generation when switching templates
  const handleTemplateChange = (templateId: string) => {
    if (templateId === selectedTemplate) return;
    setIsGenerating(true);
    setSelectedTemplate(templateId as ReportTemplate);
  };

  useEffect(() => {
    if (isGenerating) {
      const timer = setTimeout(() => {
        setIsGenerating(false);
      }, 500); // Reduced delay for better performance
      return () => clearTimeout(timer);
    }
  }, [isGenerating]);

  const renderContent = () => {
    if (isGenerating) {
      return (
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <div className="text-center">
            <h3 className="text-lg font-bold text-slate-900">AI가 보고서를 생성하고 있습니다...</h3>
            <p className="text-slate-500 text-sm mt-1">비정형 데이터 분석 결과와 통제 데이터를 결합 중</p>
          </div>
        </div>
      );
    }

    switch (selectedTemplate) {
      case 'detailed':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
             {/* Detailed Header */}
             <section>
              <h3 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-blue-600 pl-3">1. 상세 위반 사항 분석 (Detailed Findings)</h3>
              <p className="text-slate-700 leading-relaxed mb-6">
                AuditFlow AI가 전체 트랜잭션과 증빙 문서를 전수 조정한 결과, 총 <strong>{totalViolations}건</strong>의 통제 위반 사항이 발견되었습니다. 
                아래는 각 위반 사항에 대한 기술적 세부 내용과 증빙 분석 결과입니다.
              </p>

              <div className="space-y-6">
                {violations.map((violation, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm break-inside-avoid">
                     <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                violation.riskLevel === 'High' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                                {violation.riskLevel} Risk
                            </span>
                            <h4 className="font-bold text-slate-900 text-lg">
                                {violation.id}: {violation.controlPoint}
                            </h4>
                        </div>
                        <span className="text-xs text-slate-500 font-mono mt-1 sm:mt-0">Ref: {violation.transactionInfo.id}</span>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Transaction Detail</h5>
                            <ul className="text-sm space-y-1 text-slate-700">
                                <li><strong>Entity:</strong> {violation.transactionInfo.entity}</li>
                                <li><strong>Date:</strong> {violation.transactionInfo.date}</li>
                                <li><strong>Amount:</strong> {violation.transactionInfo.amount}</li>
                            </ul>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                            <h5 className="text-xs font-bold text-red-500 uppercase mb-2 flex items-center gap-1">
                                <Sparkles className="w-3 h-3"/> AI Evidence Analysis
                            </h5>
                            <p className="text-sm text-red-800 leading-relaxed">
                                {violation.aiAnalysis}
                            </p>
                        </div>
                     </div>

                     <div>
                        <h5 className="text-sm font-bold text-slate-900 mb-2">권고 조치 (Action Plan)</h5>
                        <p className="text-sm text-slate-700 bg-white border border-slate-200 p-3 rounded-lg">
                            {violation.recommendation}
                        </p>
                     </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        );

      case 'improvement':
        return (
            <div className="space-y-8 animate-in fade-in duration-500">
            {/* Strategic Header */}
            <section>
             <h3 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-blue-600 pl-3">1. 근본 원인 분석 (Root Cause Analysis)</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-orange-50 p-5 rounded-xl border border-orange-100">
                    <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5"/> 비정형 데이터 통제 미비
                    </h4>
                    <p className="text-sm text-orange-900 leading-relaxed">
                        대부분의 위반 사항(65%)이 ERP 데이터와 오프라인 증빙(PDF, 이메일) 간의 불일치에서 발생했습니다. 
                        현재의 시스템은 정형 데이터 검증에만 초점이 맞춰져 있어, 계약 조건 변경이나 수기 결재 승인 내역을 놓치고 있습니다.
                    </p>
                </div>
                <div className="bg-orange-50 p-5 rounded-xl border border-orange-100">
                    <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5"/> 사후 적발 중심의 프로세스
                    </h4>
                    <p className="text-sm text-orange-900 leading-relaxed">
                        재무 마감 및 법인카드 감사가 월말 또는 분기말에 일괄 수행되고 있어, 리스크 발생 시점과 조치 시점 간의 지체(Lag)가 평균 15일 이상 발생하고 있습니다.
                    </p>
                </div>
             </div>
           </section>

           <section>
             <h3 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-blue-600 pl-3">2. 전략적 개선 제언 (Strategic Recommendations)</h3>
             <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow">
                    <div className="bg-blue-100 p-3 rounded-full text-blue-600 shrink-0">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 text-lg">AI 기반 상시 모니터링 체계 도입</h4>
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                            AuditFlow와 같은 AI 감사 도구를 ERP 승인 워크플로우에 연동하여, 결재 단계에서 계약서 및 증빙을 실시간으로 분석해야 합니다. 
                            이를 통해 '사후 적발'에서 '사전 예방' 체계로 전환할 수 있습니다.
                        </p>
                        <div className="mt-3 flex gap-2">
                            <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded">예상 효과</span>
                            <span className="text-xs text-slate-700 py-1">위반율 90% 감소, 감사 리드타임 단축</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow">
                    <div className="bg-green-100 p-3 rounded-full text-green-600 shrink-0">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 text-lg">전사적 통합 데이터 파이프라인 구축</h4>
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                            부서별로 산재된 비정형 데이터(법무팀의 계약서, 총무팀의 영수증, 보안팀의 로그)를 중앙화된 Data Lake로 통합하여, 
                            교차 검증(Cross-validation)이 가능한 환경을 마련해야 합니다.
                        </p>
                    </div>
                </div>
             </div>
           </section>
           </div>
        );

      case 'executive':
      default:
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* 1. Executive Summary */}
            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-blue-600 pl-3">1. 경영진 요약 (Executive Summary)</h3>
              <p className="text-slate-700 leading-relaxed text-justify">
                본 감사는 <strong>Nexus Corp (넥서스 주식회사)</strong>의 9개 핵심 재무 및 운영 영역에 대한 내부 통제 효과성을 평가하기 위해 수행되었습니다. 
                AuditFlow AI 엔진을 활용하여 총 <strong>{totalScenarios}개</strong>의 통제 시나리오를 점검하였으며, 특히 비정형 데이터(계약서, 이메일 승인 등)와 시스템 트랜잭션 간의 정합성 검증에 주력하였습니다.
                <br/><br/>
                진단 결과, 전체적으로 <strong>{complianceRate}%</strong>의 통제 준수율을 보였으나, 
                <strong>{totalViolations}건</strong>의 주요 위반 사항이 발견되어 즉각적인 시정 조치가 요구됩니다.
              </p>
            </section>

            {/* 2. Audit Scope & Methodology */}
            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-blue-600 pl-3">2. 감사 범위 및 방법 (Scope & Methodology)</h3>
              <div className="bg-slate-50 p-4 sm:p-6 rounded-lg border border-slate-100">
                <ul className="list-disc list-inside space-y-2 text-slate-700">
                  <li><strong>감사 기간:</strong> 2025.01.01 ~ 2025.12.31</li>
                  <li><strong>대상 영역:</strong> {AUDIT_AREAS.map(a => a.name).join(', ')} 포함 9개 영역</li>
                  <li><strong>방법론:</strong> 
                    <ul className="list-circle list-inside ml-6 mt-1 text-slate-600">
                      <li>정형 데이터 분석 (SQL Rules): 마스터 데이터 및 원장 무결성 검증</li>
                      <li>비정형 데이터 분석 (AI): 계약서, 증빙, 정책 문서와 트랜잭션 대조</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </section>

            {/* 3. Key Findings Summary */}
            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-blue-600 pl-3">3. 주요 발견 사항 요약 (Summary of Findings)</h3>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">영역</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">적발 건수</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">상태</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {areaStats.map((area) => (
                      <tr key={area.code}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{area.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{area.violationCount}건</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {area.violationCount > 0 ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">개선 필요</span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">적정</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

             {/* 4. Conclusion */}
            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-blue-600 pl-3">4. 종합 의견 (Conclusion)</h3>
              <p className="text-slate-700 leading-relaxed">
                비정형 데이터 분석을 통해 기존 샘플링 방식의 감사로는 발견하기 어려웠던 승인 절차 누락 및 계약 불일치 사례가 다수 발견되었습니다. 
                경영진은 위 보고된 상세 권고안을 바탕으로 프로세스 재설계 및 시스템적 통제 장치를 강화해야 합니다.
                차기 감사 시 본 지적 사항에 대한 이행 점검(Follow-up Audit)이 예정되어 있습니다.
              </p>
            </section>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-100 overflow-hidden">
      
      {/* Actions Bar (Screen Only) */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden shrink-0">
        <div>
           <h2 className="text-xl font-bold text-slate-900">감사 보고서 (Final Audit Report)</h2>
           <p className="text-sm text-slate-500">최종 감사 결과 승인 및 배포</p>
        </div>
        <div className="flex space-x-3 w-full sm:w-auto">
          <button 
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-sm shadow-sm"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4" />
            <span>인쇄</span>
          </button>
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-sm">
            <Download className="w-4 h-4" />
            <span>PDF 다운로드</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
         {/* Template Sidebar (Screen Only) */}
         <div className="w-80 bg-slate-50 border-r border-slate-200 p-4 flex-col gap-4 hidden lg:flex print:hidden overflow-y-auto">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Report Templates</div>
            {TEMPLATES.map((template) => {
                const Icon = template.icon;
                const isSelected = selectedTemplate === template.id;
                return (
                    <button
                        key={template.id}
                        onClick={() => handleTemplateChange(template.id)}
                        className={`text-left p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden ${
                            isSelected 
                            ? 'bg-white border-blue-600 shadow-md ring-1 ring-blue-600' 
                            : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                        }`}
                    >
                        <div className="flex items-start gap-3 relative z-10">
                            <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className={`font-bold text-sm ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{template.label}</h4>
                                <p className="text-xs text-slate-500 mt-1">{template.desc}</p>
                            </div>
                        </div>
                        {isSelected && (
                            <div className="absolute top-2 right-2">
                                <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                    <CheckCircle className="w-3 h-3"/> Active
                                </span>
                            </div>
                        )}
                    </button>
                );
            })}

            <div className="mt-auto bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <div className="flex items-center gap-2 text-indigo-800 font-bold text-sm mb-2">
                    <Sparkles className="w-4 h-4" />
                    AI Insight
                </div>
                <p className="text-xs text-indigo-700 leading-relaxed">
                    선택하신 템플릿에 맞춰 AI가 {totalScenarios}개 시나리오 실행 결과와 비정형 데이터 분석 내용을 자동으로 요약 및 재구성합니다.
                </p>
            </div>
         </div>

        {/* Paper View Container */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-8 md:p-12 print:p-0 print:bg-white">
            <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-xl min-h-[800px] p-8 sm:p-12 border border-slate-200 print:shadow-none print:border-none print:min-h-0">
                
                {/* Report Header (Common) */}
                <div className="border-b-2 border-slate-900 pb-8 mb-8 flex flex-col sm:flex-row justify-between items-start">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Internal Audit Report</h1>
                        <p className="text-base sm:text-lg text-slate-600">내부 통제 및 컴플라이언스 진단 결과 보고서</p>
                    </div>
                    <div className="text-left sm:text-right mt-4 sm:mt-0">
                        <div className="flex items-center gap-2 justify-start sm:justify-end text-blue-600 mb-1">
                            <ShieldCheck className="w-6 h-6" />
                            <span className="font-bold text-lg">AuditFlow</span>
                        </div>
                        <p className="text-sm text-slate-500">Document No: AF-2025-Q4-001</p>
                        <p className="text-sm text-slate-500">Date: {currentDate}</p>
                        <p className="text-sm text-slate-500 font-medium mt-1 bg-slate-100 px-2 py-0.5 rounded inline-block">
                             Type: {TEMPLATES.find(t => t.id === selectedTemplate)?.label}
                        </p>
                    </div>
                </div>

                {/* Dynamic Body */}
                {renderContent()}

                {/* Signatures (Common) */}
                <div className="mt-16 pt-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-8 break-inside-avoid">
                    <div>
                    <p className="text-sm font-bold text-slate-900">작성자 (Prepared by)</p>
                    <p className="text-lg mt-4">AuditFlow AI System</p>
                    <p className="text-xs text-slate-500 mt-1">Lead AI Auditor</p>
                    </div>
                    <div className="w-full sm:w-64">
                    <p className="text-sm font-bold text-slate-900">승인자 (Approved by)</p>
                    <div className="border-b border-slate-300 mt-10"></div>
                    <p className="text-xs text-slate-500 mt-1">Chief Audit Executive (CAE)</p>
                    </div>
                </div>
            </div>
        </div>
      </div>

    </div>
  );
};

export default AuditReport;
