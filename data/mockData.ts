import { AuditArea, Scenario, ViolationDetail } from '../types';

export const AUDIT_AREAS: AuditArea[] = [
  { code: 'FSC', name: '재무 마감', description: '분개 및 결산 마감 통제', totalScenarios: 10, violationCount: 2 },
  { code: 'TRE', name: '자금 관리', description: '은행 계좌 및 송금 관리', totalScenarios: 10, violationCount: 1 },
  { code: 'EXP', name: '경비 지출', description: '법인카드 및 임직원 경비', totalScenarios: 10, violationCount: 3 },
  { code: 'OTC', name: '매출 채권', description: '매출 인식 및 신용 관리', totalScenarios: 10, violationCount: 1 },
  { code: 'STP', name: '구매 지급', description: '구매 발주 및 대금 지급', totalScenarios: 10, violationCount: 2 },
  { code: 'FXA', name: '유형 자산', description: '자산 취득 및 감가상각', totalScenarios: 10, violationCount: 1 },
  { code: 'INV', name: '재고 자산', description: '재고 수불 및 실사', totalScenarios: 10, violationCount: 0 },
  { code: 'HRE', name: '인사 급여', description: '입퇴사 및 급여 작업', totalScenarios: 10, violationCount: 1 },
  { code: 'SEC', name: '정보 보안', description: '접근 권한 및 정보 유출', totalScenarios: 10, violationCount: 2 },
];

// Helper to generate generic scenarios
const generateScenarios = (): Scenario[] => {
  const scenarios: Scenario[] = [];
  AUDIT_AREAS.forEach((area) => {
    for (let i = 1; i <= 10; i++) {
      const isFail = i <= area.violationCount;
      const isUnstructured = i % 2 === 0; 
      
      let title = `${area.name} 정기 통제 점검 #${i}`;
      let detailedDesc = `${area.name} 관련 정기적인 내부 통제 절차가 준수되었는지 확인하는 시나리오입니다.`;

      // Specific Scenarios
      if(area.code === 'FSC' && i===1) {
        title = "비표준 분개 전결 규정(DoA) 준수 여부";
        detailedDesc = "비정형 데이터 분석: $50K 이상 수기 분개에 대해 Controller 급 이상의 결재가 포함된 이메일 또는 전자결재 문서가 존재하는지 검증합니다.";
      }
      if(area.code === 'STP' && i===1) {
        title = "3-Way Match (계약서 vs PO vs 송장) 불일치";
        detailedDesc = "비정형 데이터 분석: PDF 계약서 내 특약 할인 조항이 구매발주서(PO) 단가에 올바르게 반영되었는지 대조합니다.";
      }
      if(area.code === 'SEC' && i===1) {
        title = "미승인 외부 저장매체(USB) 반출 점검";
        detailedDesc = "비정형 데이터 분석: DLP 로그상 대용량 전송 기록과 보안팀의 '반출 승인 신청서(PDF)' 매칭 여부를 확인합니다.";
      }

      scenarios.push({
        id: `${area.code}-${String(i).padStart(3, '0')}`,
        areaCode: area.code,
        title: title,
        status: isFail ? 'Fail' : 'Pass',
        description: isUnstructured 
          ? `AI 문서 분석: ${area.name} 관련 증빙 문서와 시스템 데이터 대조` 
          : `SQL 규칙 검증: ${area.name} 마스터 데이터 무결성 점검`,
        detailedDescription: detailedDesc,
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toISOString(),
        type: isUnstructured ? 'Unstructured' : 'Structured',
        evidenceUrl: `https://picsum.photos/seed/${area.code}${i}/800/1000` // Mock evidence
      });
    }
  });
  return scenarios;
};

export const MOCK_SCENARIOS = generateScenarios();

export const CRITICAL_VIOLATIONS: ViolationDetail[] = [
  {
    id: 'FSC-001',
    areaCode: 'FSC',
    riskLevel: 'High',
    controlPoint: '전결 규정 (Global DoA Policy 4.2조)',
    violationType: '비정형 증빙(이메일) 불일치',
    transactionInfo: {
      id: 'JE-2023-9921',
      amount: '$62,500.00',
      date: '2023-10-14',
      entity: 'Nexus Corp 본사 (HQ)'
    },
    evidenceType: 'Approval Email',
    evidenceDocumentUrl: 'https://picsum.photos/seed/ev1/600/800',
    aiAnalysis: '첨부된 승인 이메일은 "Finance Manager"에 의해 서명되었습니다. 그러나 DoA 정책상 $50,000를 초과하는 수기 분개는 "Controller" 또는 "CFO"의 승인이 필수입니다. 문서 체인에서 상위 권한자의 서명이 발견되지 않았습니다.',
    recommendation: 'JE-2023-9921 분개를 즉시 역분개하고, 재무팀 대상 DoA 임계값 재교육을 실시하십시오. $50k 이상 분개 시 시스템 차단 기능을 도입할 것을 권고합니다.'
  },
  {
    id: 'STP-001',
    areaCode: 'STP',
    riskLevel: 'High',
    controlPoint: '구매 규정 (공급업체 계약 관리)',
    violationType: '계약서(비정형) vs PO(정형) 불일치',
    transactionInfo: {
      id: 'PO-8821-X',
      amount: '$12,000 / unit',
      date: '2023-11-02',
      entity: '공급사: TechParts'
    },
    evidenceType: 'Contract',
    evidenceDocumentUrl: 'https://picsum.photos/seed/ev2/601/800',
    aiAnalysis: '기본거래계약서(MSA) PDF 분석 결과, 100개 초과 물량에 대해 단가 $10,500가 적용되어야 합니다. 그러나 PO는 150개 발주임에도 불구하고 $12,000/unit으로 발행되었습니다. 계약서 14페이지의 "물량 할인 조항"이 무시되었습니다.',
    recommendation: 'TechParts 공급사로부터 $225,000의 과지급금을 회수하십시오. ERP 자재 마스터 가격 정보에 물량 할인 구간(Tier)이 자동 반영되도록 시스템을 개선하십시오.'
  },
  {
    id: 'SEC-001',
    areaCode: 'SEC',
    riskLevel: 'High',
    controlPoint: '정보보호 규정 (DLP 정책)',
    violationType: '승인 문서(Form) 누락',
    transactionInfo: {
      id: 'LOG-SEC-2911',
      amount: 'N/A',
      date: '2023-11-05',
      entity: '사용자: j.doe (R&D팀)'
    },
    evidenceType: 'Policy Doc',
    evidenceDocumentUrl: 'https://picsum.photos/seed/ev3/602/800',
    aiAnalysis: 'DLP 시스템 로그상 외부 USB 장치(SanDisk-X9)로 4.2GB 데이터 전송이 확인되었습니다. AI가 11월 "보안 승인 문서함"을 전수 조사했으나, 해당 사용자의 "외부 매체 반출 신청서"가 발견되지 않았습니다.',
    recommendation: '사용자 j.doe의 계정을 즉시 비활성화하고 전송된 데이터에 대한 포렌식 조사를 수행하십시오. R&D 부서장에게 보안 규정 위반 경고를 발송하십시오.'
  }
];

// Dynamically generate details for any scenario
export const getScenarioDetail = (scenario: Scenario): ViolationDetail => {
  // Check if it's a critical violation known
  const critical = CRITICAL_VIOLATIONS.find(v => v.id === scenario.id);
  if (critical) return critical;

  // Generate generic detail for regular scenarios
  const isPass = scenario.status === 'Pass';
  return {
    id: scenario.id,
    areaCode: scenario.areaCode,
    riskLevel: isPass ? 'Low' : 'Medium',
    controlPoint: scenario.title,
    violationType: isPass ? '준수 (Compliant)' : '일반 통제 미흡',
    transactionInfo: {
      id: `TRX-${scenario.id.split('-')[1]}-${Math.floor(Math.random()*10000)}`,
      amount: `$${(Math.random()*10000).toFixed(2)}`,
      date: scenario.timestamp.split('T')[0],
      entity: 'Nexus Corp 내부 부서'
    },
    aiAnalysis: isPass 
      ? `[정상] AI 분석 엔진이 첨부된 증빙 문서(${scenario.type === 'Unstructured' ? 'PDF/Image' : 'System Log'})를 분석한 결과, 회사의 내부 통제 정책과 일치함을 확인했습니다. 특이사항이 발견되지 않았습니다.`
      : `[주의] AI 분석 결과, 증빙 문서의 일부 내용이 시스템 데이터와 일치하지 않거나 필수 서명이 누락되었을 가능성이 있습니다. 수동 검토가 필요합니다.`,
    recommendation: isPass 
      ? '특이사항 없음. 현행 유지.' 
      : '담당 부서 소명 요청 및 증빙 문서 재검토 권고.',
    evidenceType: scenario.type === 'Unstructured' ? 'Policy Doc' : 'Log File',
    evidenceDocumentUrl: scenario.evidenceUrl
  };
};