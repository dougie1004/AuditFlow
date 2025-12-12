import React from 'react';
import { AUDIT_AREAS, CRITICAL_VIOLATIONS } from '../data/mockData';
import { FileCheck2, Download, Printer, ShieldCheck } from 'lucide-react';

const AuditReport: React.FC = () => {
  const currentDate = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const totalScenarios = 90;
  const totalViolations = AUDIT_AREAS.reduce((acc, curr) => acc + curr.violationCount, 0);

  return (
    <div className="h-full flex flex-col bg-slate-100 p-4 sm:p-6 lg:p-8 overflow-hidden print:bg-white print:p-0">
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden">
          <div className="hidden lg:block">
            <h2 className="text-2xl font-bold text-slate-900">감사 보고서 (Final Audit Report)</h2>
            <p className="text-slate-500 text-sm">최종 감사 결과 요약 및 승인 대기</p>
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

        {/* Paper View */}
        <div className="flex-1 bg-white shadow-lg rounded-xl overflow-y-auto p-6 sm:p-8 md:p-12 border border-slate-200 print:shadow-none print:border-none print:p-0">
          
          {/* Report Header */}
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
              <p className="text-sm text-slate-500">Document No: AF-2023-Q4-001</p>
              <p className="text-sm text-slate-500">Date: {currentDate}</p>
            </div>
          </div>

          {/* Report Content */}
          <div className="space-y-8">
            
            {/* 1. Executive Summary */}
            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-blue-600 pl-3">1. 경영진 요약 (Executive Summary)</h3>
              <p className="text-slate-700 leading-relaxed text-justify">
                본 감사는 <strong>Nexus Corp (넥서스 주식회사)</strong>의 9개 핵심 재무 및 운영 영역에 대한 내부 통제 효과성을 평가하기 위해 수행되었습니다. 
                AuditFlow AI 엔진을 활용하여 총 90개의 통제 시나리오를 점검하였으며, 특히 비정형 데이터(계약서, 이메일 승인 등)와 시스템 트랜잭션 간의 정합성 검증에 주력하였습니다.
                <br/><br/>
                진단 결과, 전체적으로 <strong>{((totalScenarios - totalViolations) / totalScenarios * 100).toFixed(1)}%</strong>의 통제 준수율을 보였으나, 
                재무 마감, 구매 지급, 정보 보안 영역에서 <strong>{totalViolations}건</strong>의 주요 위반 사항이 발견되어 즉각적인 시정 조치가 요구됩니다.
              </p>
            </section>

            {/* 2. Audit Scope & Methodology */}
            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-blue-600 pl-3">2. 감사 범위 및 방법 (Scope & Methodology)</h3>
              <div className="bg-slate-50 p-4 sm:p-6 rounded-lg border border-slate-100">
                <ul className="list-disc list-inside space-y-2 text-slate-700">
                  <li><strong>감사 기간:</strong> 2023.01.01 ~ 2023.12.31</li>
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
                    {AUDIT_AREAS.map((area) => (
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

            {/* 4. Critical Observations Details */}
            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-blue-600 pl-3">4. 상세 위반 내역 (Critical Observations)</h3>
              <div className="space-y-4">
                {CRITICAL_VIOLATIONS.map((violation, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-lg p-5">
                     <h4 className="font-bold text-red-600 mb-2 flex items-start sm:items-center">
                        <span className="bg-red-100 px-2 py-0.5 rounded text-xs mr-2 mt-1 sm:mt-0 shrink-0">{violation.riskLevel}</span>
                        <span>{violation.controlPoint}</span>
                     </h4>
                     <p className="text-sm text-slate-700 mb-2"><strong>적발 내용:</strong> {violation.aiAnalysis}</p>
                     <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded"><strong>권고 사항:</strong> {violation.recommendation}</p>
                  </div>
                ))}
              </div>
            </section>

             {/* 5. Conclusion */}
            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-blue-600 pl-3">5. 종합 의견 (Conclusion)</h3>
              <p className="text-slate-700 leading-relaxed">
                비정형 데이터 분석을 통해 기존 샘플링 방식의 감사로는 발견하기 어려웠던 승인 절차 누락 및 계약 불일치 사례가 다수 발견되었습니다. 
                경영진은 위 보고된 상세 권고안을 바탕으로 프로세스 재설계 및 시스템적 통제 장치를 강화해야 합니다.
                차기 감사 시 본 지적 사항에 대한 이행 점검(Follow-up Audit)이 예정되어 있습니다.
              </p>
            </section>

             {/* Signatures */}
             <div className="mt-16 pt-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-8">
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