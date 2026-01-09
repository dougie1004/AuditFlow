
import React, { useState, useEffect, useMemo } from 'react';
import { AUDIT_AREAS } from '../data/mockData';
import { Download, Printer, ShieldCheck, FileText, List, TrendingUp, Sparkles, Loader2, CheckCircle, AlertTriangle, ArrowRight, Lock } from 'lucide-react';
import { Scenario, ViolationDetail, MockUploadFile } from '../types';

type ReportTemplate = 'executive' | 'detailed' | 'improvement';

const TEMPLATES = [
  { id: 'executive', label: '경영진 요약 보고서', icon: FileText, desc: '핵심 지표 및 리스크 요약' },
  { id: 'detailed', label: '상세 감사 발견 사항', icon: List, desc: '전체 위반 사항 상세 분석' },
  { id: 'improvement', label: '프로세스 개선 제안', icon: TrendingUp, desc: 'AI 기반 근본 원인 분석' }
];

interface AuditReportProps {
  scenarios: Scenario[];
  violations: ViolationDetail[];
  isAuditComplete: boolean;
  uploadedFiles: MockUploadFile[]; // Added uploadedFiles prop
}

const AuditReport: React.FC<AuditReportProps> = ({ scenarios, violations, isAuditComplete, uploadedFiles }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate>('executive');
  const [isGenerating, setIsGenerating] = useState(false);
  const currentDate = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  
  // Dynamic Calculations based on props
  const totalScenarios = scenarios.length;
  const totalViolations = scenarios.filter(s => s.status === 'Fail').length;
  const complianceRate = totalScenarios > 0 
    ? ((totalScenarios - totalViolations) / totalScenarios * 100).toFixed(1)
    : '100.0';

  // Identify New High Risk Scenarios (Triggered by AI Chat or Upload)
  const newHighRiskScenarios = useMemo(() => 
    scenarios.filter(s => s.isNew && s.risk === 'High' && s.status === 'Fail'), 
  [scenarios]);

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
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isGenerating]);

  // --- Empty State View ---
  if (!isAuditComplete) {
    return (
        <div className="h-full flex flex-col items-center justify-center p-4 sm:p-8 text-center bg-slate-50">
            <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-xl border border-slate-200 max-w-sm sm:max-w-md md:max-w-xl w-full">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <Lock className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">보고서가 생성되지 않았습니다.</h2>
                <p className="text-sm sm:text-base text-slate-500 mb-6 sm:mb-8 leading-relaxed">
                    AI 감사 분석이 완료되어야 보고서를 열람할 수 있습니다.<br/>
                    데이터 업로드 메뉴에서 감사를 실행해주세요.
                </p>
                <div className="flex justify-center">
                    <span className="px-4 py-2 bg-slate-100 text-slate-500 rounded-lg text-sm font-medium border border-slate-200">
                        상태: 데이터 대기 중
                    </span>
                </div>
            </div>
        </div>
    );
  }

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
          <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
             <section>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 border-l-4 border-blue-600 pl-3">1. 상세 위반 사항 분석 (Detailed Findings)</h3>
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed mb-4 sm:mb-6">
                AuditFlow AI가 전체 트랜잭션과 증빙 문서를 전수 조정한 결과, 총 <strong>{totalViolations}건</strong>의 통제 위반 사항이 발견되었습니다.
              </p>

              <div className="space-y-4 sm:space-y-6">
                {[...violations]
                    .sort((a, b) => {
                        const aIsNew = scenarios.some(s => s.isNew && s.violationId === a.id);
                        const bIsNew = scenarios.some(s => s.isNew && s.violationId === b.id);

                        // Primary sort: new violations first
                        if (aIsNew && !bIsNew) return -1;
                        if (!aIsNew && bIsNew) return 1;

                        // Secondary sort: High risk first
                        const riskOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
                        if (riskOrder[a.riskLevel] > riskOrder[b.riskLevel]) return -1;
                        if (riskOrder[a.riskLevel] < riskOrder[b.riskLevel]) return 1;

                        // Tertiary sort: Most recent first
                        return new Date(b.transactionInfo.date).getTime() - new Date(a.transactionInfo.date).getTime();
                    })
                    .map((violation, idx) => {
                    const isNew = scenarios.some(s => s.isNew && s.violationId === violation.id);
                    return (
                      <div key={idx} className={`bg-white border rounded-xl p-4 sm:p-6 shadow-sm ${isNew ? 'border-red-300 ring-4 ring-red-50' : 'border-slate-200'}`}>
                         <div className="flex flex-col sm:flex-row justify-between items-start mb-3 sm:mb-4">
                            <div className="flex items-center gap-3">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${violation.riskLevel === 'High' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {violation.riskLevel} Risk
                                </span>
                                {isNew && <span className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded font-bold animate-pulse">NEW AI DETECTED</span>}
                                <h4 className="font-bold text-slate-900 text-base sm:text-lg">{violation.id}: {violation.controlPoint}</h4>
                            </div>
                            <span className="text-xs text-slate-500 font-mono mt-2 sm:mt-0">Ref: {violation.transactionInfo.id}</span>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4">
                            <div className="bg-slate-50 p-3 sm:p-4 rounded-lg">
                                <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Transaction Detail</h5>
                                <ul className="text-sm space-y-1 text-slate-700">
                                    <li><strong>Entity:</strong> {violation.transactionInfo.entity}</li>
                                    <li><strong>Date:</strong> {violation.transactionInfo.date}</li>
                                    <li><strong>Value:</strong> {violation.transactionInfo.amount}</li>
                                </ul>
                            </div>
                            <div className="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-100">
                                <h5 className="text-xs font-bold text-red-500 uppercase mb-2 flex items-center gap-1"><Sparkles className="w-3 h-3"/> AI Evidence Analysis</h5>
                                <p className="text-sm text-red-800 leading-relaxed">{violation.aiAnalysis}</p>
                            </div>
                         </div>
                         <div>
                            <h5 className="text-sm font-bold text-slate-900 mb-2">권고 조치 (Action Plan)</h5>
                            <p className="text-sm text-slate-700 bg-white border border-slate-200 p-3 rounded-lg">{violation.recommendation}</p>
                         </div>
                      </div>
                    );
                })}
              </div>
            </section>
          </div>
        );

      case 'improvement':
        return (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
                <section>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 border-l-4 border-blue-600 pl-3">1. 전략적 개선 제언</h3>
                    <div className="space-y-4">
                        <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl">
                            <div className="bg-blue-100 p-3 rounded-full text-blue-600 shrink-0"><Sparkles className="w-6 h-6" /></div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-base sm:text-lg">AI 기반 상시 모니터링 체계 도입</h4>
                                <p className="text-sm text-slate-600 mt-1">AuditFlow AI 감사 도구를 ERP 승인 워크플로우에 연동하여, 사후 적발이 아닌 사전 예방 체계로 전환해야 합니다.</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl">
                            <div className="bg-green-100 p-3 rounded-full text-green-600 shrink-0"><CheckCircle className="w-6 h-6" /></div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-base sm:text-lg">AI 기반 증빙 자동 검증 시스템 구축</h4>
                                <p className="text-sm text-slate-600 mt-1">업로드된 PDF 계약서, 이메일 로그, CSV 거래 내역 간의 불일치를 AI가 자동으로 검증하여 수동 리뷰에 소요되는 시간을 획기적으로 단축해야 합니다. (Document AI 및 Cloud Natural Language 연동)</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl">
                            <div className="bg-orange-100 p-3 rounded-full text-orange-600 shrink-0"><AlertTriangle className="w-6 h-6" /></div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-base sm:text-lg">MLOps 기반 자가 학습 감사 모델 운영</h4>
                                <p className="text-sm text-slate-600 mt-1">감사인의 피드백(True Positive/False Positive)을 Vertex AI Pipelines를 통해 모델 재학습에 반영하여, 시간이 지남에 따라 AI 탐지 정확도를 지속적으로 향상시켜야 합니다.</p>
                            </div>
                        </div>
                    </div>
                </section>
           </div>
        );

      case 'executive':
      default:
        return (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
            <section>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 border-l-4 border-blue-600 pl-3">1. 경영진 요약 (Executive Summary)</h3>
              
              {newHighRiskScenarios.length > 0 && (
                <div className="mb-4 sm:mb-6 bg-red-50 border-l-4 border-red-500 p-4 sm:p-5 rounded-r-xl shadow-sm">
                    <h4 className="flex items-center gap-2 text-red-800 font-bold mb-2 text-base sm:text-lg">
                        <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6"/> 신규 고위험 시나리오 탐지 (AI Urgent Findings)
                    </h4>
                    <p className="text-sm text-red-700 mb-3 sm:mb-4 leading-relaxed">AI 분석 결과 <strong>{newHighRiskScenarios.length}건</strong>의 심각한 통제 위반 징후가 추가 식별되었습니다.</p>
                    <ul className="space-y-3">
                        {newHighRiskScenarios.map(s => (
                            <li key={s.id} className="bg-white p-3 rounded-lg border border-red-100 shadow-sm">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-red-900 text-sm">{s.title}</span>
                                    <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded font-bold">HIGH RISK</span>
                                </div>
                                <span className="text-slate-600 text-xs block">{s.description}</span>
                            </li>
                        ))}
                    </ul>
                </div>
              )}

              <p className="text-sm sm:text-base text-slate-700 leading-relaxed text-justify">
                본 감사는 <strong>Nexus Corp (넥서스 주식회사)</strong>의 9개 핵심 재무 및 운영 영역에 대한 내부 통제 효과성을 평가하기 위해 수행되었습니다. 
                AuditFlow AI 엔진을 활용하여 총 <strong>{totalScenarios}개</strong>의 통제 시나리오를 점검하였으며, 이 중 <strong className="text-blue-600">{uploadedFiles.length}개</strong>의 업로드된 데이터 파일(ERP 원장, 계약서, 로그 등)을 AI가 심층 분석에 활용했습니다.
                <br/><br/>
                진단 결과, 전체적으로 <strong>{complianceRate}%</strong>의 통제 준수율을 보였으나, 
                <strong>{totalViolations}건</strong>의 주요 위반 사항이 발견되어 시정 조치가 요구됩니다.
              </p>
            </section>

            <section>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 border-l-4 border-blue-600 pl-3">2. 감사 범위 및 방법 (Scope & Methodology)</h3>
              <div className="bg-slate-50 p-4 sm:p-6 rounded-lg border border-slate-100">
                <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-slate-700">
                  <li><strong>감사 기간:</strong> 2024.01.01 ~ 2025.12.31 (최근 2년 전수)</li>
                  <li><strong>대상 영역:</strong> {AUDIT_AREAS.map(a => a.name).join(', ')}</li>
                  <li><strong>방법론:</strong> 정형 데이터 SQL 규칙 및 비정형 증빙 AI 교차 검증 (Gemini, Document AI 기반)</li>
                  <li><strong>분석 데이터:</strong> {uploadedFiles.length}개의 업로드된 파일 ({uploadedFiles.map(f => f.type).join(', ')}) 포함</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 border-l-4 border-blue-600 pl-3">3. 주요 발견 사항 요약 (Summary of Findings)</h3>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase">영역</th>
                      <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase">적발 건수</th>
                      <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-slate-500 uppercase">상태</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {areaStats.map((area) => (
                      <tr key={area.code}>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm font-medium text-slate-900">{area.name}</td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-slate-500">{area.violationCount}건</td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
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
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-100 overflow-hidden">
      <div className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 print:hidden shrink-0">
        <div>
           <h2 className="text-lg sm:text-xl font-bold text-slate-900">감사 보고서 (Final Audit Report)</h2>
           <p className="text-xs sm:text-sm text-slate-500">최종 감사 결과 승인 및 배포</p>
        </div>
        <div className="flex space-x-2 sm:space-x-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-sm shadow-sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> <span>인쇄</span>
          </button>
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-sm">
            <Download className="w-4 h-4" /> <span>PDF 다운로드</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
         <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 flex-col gap-3 hidden lg:flex print:hidden overflow-y-auto">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Report Templates</div>
            {TEMPLATES.map((template) => {
                const Icon = template.icon;
                const isSelected = selectedTemplate === template.id;
                return (
                    <button key={template.id} onClick={() => handleTemplateChange(template.id)} className={`text-left p-3 rounded-xl border transition-all duration-200 ${isSelected ? 'bg-white border-blue-600 shadow-md ring-1 ring-blue-600' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                        <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}><Icon className="w-5 h-5" /></div>
                            <div>
                                <h4 className={`font-bold text-sm ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{template.label}</h4>
                                <p className="text-xs text-slate-500 mt-1">{template.desc}</p>
                            </div>
                        </div>
                    </button>
                );
            })}
         </div>

        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-8 md:p-12 print:p-0 print:bg-white">
            <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-xl min-h-[800px] p-8 sm:p-12 border border-slate-200 print:shadow-none print:border-none print:min-h-0">
                <div className="border-b-2 border-slate-900 pb-6 sm:pb-8 mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start">
                    <div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Internal Audit Report</h1>
                        <p className="text-sm sm:text-base md:text-lg text-slate-600">내부 통제 및 컴플라이언스 진단 결과 보고서</p>
                    </div>
                    <div className="text-left sm:text-right mt-4 sm:mt-0">
                        <div className="flex items-center gap-2 justify-start sm:justify-end text-blue-600 mb-1">
                            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                            <span className="font-bold text-base sm:text-lg">AuditFlow</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500">Document No: AF-2025-Q4-001</p>
                        <p className="text-xs sm:text-sm text-slate-500">Date: {currentDate}</p>
                    </div>
                </div>
                {renderContent()}
                <div className="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-4 sm:gap-8">
                    <div>
                        <p className="text-sm font-bold text-slate-900">작성자 (Prepared by)</p>
                        <p className="text-base sm:text-lg mt-3 sm:mt-4 font-serif italic">AuditFlow AI Auditor</p>
                    </div>
                    <div className="w-full sm:w-64">
                        <p className="text-sm font-bold text-slate-900">승인자 (Approved by)</p>
                        <div className="border-b border-slate-300 mt-8 sm:mt-10"></div>
                        <p className="text-xs text-slate-500 mt-1 text-center">Chief Audit Executive</p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AuditReport;