import { AuditArea, Scenario, ViolationDetail, CorpCardTransaction, ForecastDataPoint } from '../types';

export const AUDIT_AREAS: AuditArea[] = [
  { code: 'FSC', name: '재무 마감', description: '분개 및 결산 마감 통제', totalScenarios: 10, violationCount: 2 },
  { code: 'TRE', name: '자금 관리', description: '은행 계좌 및 송금 관리', totalScenarios: 10, violationCount: 1 },
  { code: 'EXP', name: '경비 지출', description: '법인카드 및 임직원 경비', totalScenarios: 10, violationCount: 4 }, // Increased count
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
      // FIX: Cannot assign to 'isUnstructured' because it is a constant. Changed to let.
      let isUnstructured = i % 2 === 0;
      const isNew = (area.code === 'EXP' && i <= 2) || (area.code === 'FSC' && i === 2) || (area.code === 'SEC' && i === 3);

      let title = `${area.name} 정기 통제 점검 #${i}`;
      let detailedDesc = `${area.name} 관련 정기적인 내부 통제 절차가 준수되었는지 확인하는 시나리오입니다.`;
      let risk: 'High' | 'Medium' | 'Low' = isFail ? 'Medium' : 'Low';

      // Specific Scenarios
      if(area.code === 'FSC' && i===1) {
        title = "비표준 분개 전결 규정(DoA) 준수 여부";
        detailedDesc = "비정형 데이터 분석: $50K 이상 수기 분개에 대해 Controller 급 이상의 결재가 포함된 이메일 또는 전자결재 문서가 존재하는지 검증합니다.";
        risk = 'High';
      }
      if(area.code === 'STP' && i===1) {
        title = "3-Way Match (계약서 vs PO vs 송장) 불일치";
        detailedDesc = "비정형 데이터 분석: PDF 계약서 내 특약 할인 조항이 구매발주서(PO) 단가에 올바르게 반영되었는지 대조합니다.";
        risk = 'High';
      }
       if(area.code === 'SEC' && i===1) {
        title = "미승인 외부 저장매체(USB) 반출 점검";
        detailedDesc = "비정형 데이터 분석: DLP 로그상 대용량 전송 기록과 보안팀의 '반출 승인 신청서(PDF)' 매칭 여부를 확인합니다.";
        risk = 'High';
      }
      if(area.code === 'EXP' && i === 1) {
        title = "법인카드 자택 인근 주말 사용 분석";
        detailedDesc = "AI가 인사DB의 주소지와 카드 승인 가맹점 주소를 비교하여 자택 500m 반경 내 주말 사용 내역을 자동 식별합니다.";
        risk = 'Medium';
      }
      if(area.code === 'EXP' && i === 2) {
        title = "유흥업소 사용 및 쪼개기 결제 의심";
        detailedDesc = "AI가 가맹점 업종 코드를 분석하여 유흥업소 사용을 식별하고, 동일 가맹점 연속 결제를 통해 한도 회피 목적의 '쪼개기 결제'를 탐지합니다.";
        risk = 'High';
        isUnstructured = false;
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
        evidenceUrl: `https://picsum.photos/seed/${area.code}${i}/800/1000`, // Mock evidence
        isNew: isNew,
        risk: risk
      });
    }
  });
  return scenarios;
};

export const MOCK_SCENARIOS = generateScenarios();

export const CRITICAL_VIOLATIONS: ViolationDetail[] = [
  {
    id: 'FSC-V01',
    areaCode: 'FSC',
    riskLevel: 'High',
    controlPoint: '비표준 분개 전결 규정(DoA) 준수',
    violationType: '비정형 데이터(결재 문서) 분석 위반',
    transactionInfo: { id: 'GL-JE-20231105-015', amount: '$75,200.00', date: '2023-11-05', entity: '김철수 팀장' },
    aiAnalysis: 'ERP 시스템에 기록된 $50K 초과 비표준 분개(JE# GL-JE-20231105-015)에 대해, 첨부된 이메일 증빙 자료에서 승인 권한자인 Controller(재무 담당 임원)의 서명 또는 명시적 승인 문구가 발견되지 않았습니다. 이는 DoA 규정 위반에 해당합니다.',
    recommendation: '해당 분개의 즉각적인 재검토 및 Controller의 사후 승인을 득하고, 향후 $50K 초과 분개 발생 시 ERP 시스템 내에서 Controller 승인 라인을 강제하는 워크플로우를 구축하십시오.',
    evidenceDocumentUrl: 'https://picsum.photos/seed/FSC-EVIDENCE/800/1000',
    evidenceType: 'Approval Email'
  },
  {
    id: 'STP-V01',
    areaCode: 'STP',
    riskLevel: 'High',
    controlPoint: '3-Way Match (계약서-PO-송장)',
    violationType: '계약 조건과 구매 발주(PO) 데이터 불일치',
    transactionInfo: { id: 'PO-NEXUS-20231020-088', amount: '$120,000.00', date: '2023-10-20', entity: '공급업체: Alpha Components' },
    aiAnalysis: "공급업체 'Alpha Components'와의 구매 계약서(PDF) 5.2조에 '연간 구매액 $1M 초과 시 5% 추가 할인' 특약이 명시되어 있으나, 관련 구매발주서(PO# PO-NEXUS-20231020-088)의 단가에는 해당 할인이 적용되지 않았습니다. 이로 인해 약 $6,000의 손실이 발생했습니다.",
    recommendation: "즉시 해당 공급업체에 연락하여 차액($6,000)에 대한 Credit Note 발행을 요청하고, 향후 주요 공급업체 계약의 특약 조건을 ERP 공급업체 마스터에 등록하여 PO 생성 시 자동 반영되도록 시스템을 개선하십시오.",
    evidenceDocumentUrl: 'https://picsum.photos/seed/STP-EVIDENCE/800/1000',
    evidenceType: 'Contract'
  },
   {
    id: 'EXP-V01',
    areaCode: 'EXP',
    riskLevel: 'High',
    controlPoint: '법인카드 사용 규정 준수',
    violationType: '유흥업소 사용 및 쪼개기 결제',
    transactionInfo: { id: 'TXN007 & TXN008', amount: '450,000원 + 450,000원', date: '2023-11-20', entity: '박도현 (영업팀)' },
    aiAnalysis: "영업팀 박도현 사원의 법인카드에서 '락휴 노래타운' (업종코드: 유흥주점) 사용 내역이 발견되었습니다. 또한 50만원 이상 접대비 승인 회피 목적으로 10분 간격으로 45만원씩 두 차례에 걸쳐 결제한 '쪼개기 결제' 패턴이 탐지되었습니다. 이는 경비 규정 제 2조와 3조의 명백한 위반입니다.",
    recommendation: "해당 거래에 대한 즉각적인 소명을 요구하고, 비용을 환수 조치하십시오. 전사적으로 법인카드 사용 규정을 재공지하고, AI 모니터링을 통한 자동 탐지 규칙을 강화하여 재발을 방지하십시오.",
    evidenceDocumentUrl: 'https://picsum.photos/seed/EXP-EVIDENCE/800/1000',
    evidenceType: 'Log File'
  },
  {
    id: 'SEC-V01',
    areaCode: 'SEC',
    riskLevel: 'High',
    controlPoint: '데이터 유출 방지(DLP) 정책 준수',
    violationType: '미승인 데이터 외부 반출',
    transactionInfo: { id: 'DLP-LOG-20231201-1530-01', amount: '2.5 GB', date: '2023-12-01', entity: '박지성 연구원' },
    aiAnalysis: "DLP 시스템 로그에서 '박지성 연구원'이 2.5GB의 '프로젝트_오로라_설계도' 폴더를 개인 USB 드라이브로 복사한 기록이 탐지되었습니다. 그러나 보안팀의 반출 승인 신청서 데이터베이스에서는 해당 반출에 대한 승인 기록을 찾을 수 없습니다. 이는 정보보안 정책 12조 위반입니다.",
    recommendation: "정보보호 위원회를 소집하여 해당 데이터 반출의 경위를 즉시 조사하고, 중요 데이터에 대한 접근 및 반출 통제를 강화하십시오. 승인 없는 USB 포트 사용을 기술적으로 차단하는 방안을 검토하십시오.",
    evidenceDocumentUrl: 'https://picsum.photos/seed/SEC-EVIDENCE/800/1000',
    evidenceType: 'Log File'
  }
];

export const MOCK_CORP_CARD_TRANSACTIONS: CorpCardTransaction[] = [
    { id: 'TXN001', employee: { name: '김민준', id: 'E1023', homeAddress: '서울시 강남구 테헤란로 427', department: 'R&D' }, merchant: '강남면옥', location: { lat: 37.506, lng: 127.054, name: '강남면옥' }, amount: 58000, timestamp: '2023-11-18T20:30:00Z', category: '음식점', anomaly: '자택 근처 사용' },
    { id: 'TXN002', employee: { name: '김민준', id: 'E1023', homeAddress: '서울시 강남구 테헤란로 427', department: 'R&D' }, merchant: 'CGV 강남', location: { lat: 37.500, lng: 127.027, name: 'CGV 강남' }, amount: 32000, timestamp: '2023-11-18T22:15:00Z', category: '여가', anomaly: '주말/심야 사용' },
    { id: 'TXN003', employee: { name: '이서연', id: 'E2045', homeAddress: '경기도 성남시 분당구 판교역로 1', department: '마케팅' }, merchant: '골프존파크 판교', location: { lat: 37.395, lng: 127.112, name: '골프존파크' }, amount: 150000, timestamp: '2023-11-19T14:00:00Z', category: '접대', anomaly: null },
    { id: 'TXN004', employee: { name: '박도현', id: 'E3001', homeAddress: '서울시 마포구 월드컵북로 396', department: '영업' }, merchant: '상암 주유소', location: { lat: 37.575, lng: 126.892, name: '상암 주유소' }, amount: 70000, timestamp: '2023-11-17T23:50:00Z', category: '교통', anomaly: '주말/심야 사용' },
    { id: 'TXN005', employee: { name: '김민준', id: 'E1023', homeAddress: '서울시 강남구 테헤란로 427', department: 'R&D' }, merchant: '선릉 스타벅스', location: { lat: 37.505, lng: 127.049, name: '선릉 스타벅스' }, amount: 12500, timestamp: '2023-11-19T10:10:00Z', category: '음료', anomaly: '자택 근처 사용' },
    { id: 'TXN006', employee: { name: '최지아', id: 'E3002', homeAddress: '서울시 서초구 신반포로 176', department: '영업' }, merchant: '하나일식', location: { lat: 37.504, lng: 127.004, name: '하나일식' }, amount: 280000, timestamp: '2023-11-20T19:45:00Z', category: '접대', anomaly: null },
    { id: 'TXN007', employee: { name: '박도현', id: 'E3001', homeAddress: '서울시 마포구 월드컵북로 396', department: '영업' }, merchant: '락휴 노래타운', location: { lat: 37.555, lng: 126.923, name: '락휴 노래타운' }, amount: 450000, timestamp: '2023-11-20T21:10:00Z', category: '유흥', anomaly: '유흥업소 사용 의심' },
    { id: 'TXN008', employee: { name: '박도현', id: 'E3001', homeAddress: '서울시 마포구 월드컵북로 396', department: '영업' }, merchant: '락휴 노래타운', location: { lat: 37.555, lng: 126.923, name: '락휴 노래타운' }, amount: 450000, timestamp: '2023-11-20T21:20:00Z', category: '유흥', anomaly: '쪼개기 결제 의심' },
    { id: 'TXN009', employee: { name: '이서연', id: 'E2045', homeAddress: '경기도 성남시 분당구 판교역로 1', department: '마케팅' }, merchant: '온라인광고-페이스북', location: { lat: 37.395, lng: 127.112, name: '온라인' }, amount: 480000, timestamp: '2023-11-21T11:00:00Z', category: '광고', anomaly: null },
    { id: 'TXN010', employee: { name: '김민준', id: 'E1023', homeAddress: '서울시 강남구 테헤란로 427', department: 'R&D' }, merchant: 'AWS-서비스이용료', location: { lat: 37.506, lng: 127.054, name: '온라인' }, amount: 350000, timestamp: '2023-11-22T15:30:00Z', category: 'IT', anomaly: null },
];

export const INITIAL_INVENTORY = 25000;
export const MOCK_FORECAST_DATA: Omit<ForecastDataPoint, 'production' | 'inventory'>[] = [
  // 4 weeks of historical data
  { week: '10월 1주', sales: 7500 },
  { week: '10월 2주', sales: 8200 },
  { week: '10월 3주', sales: 7800 },
  { week: '10월 4주', sales: 8500 },
  // 8 weeks of forecast data
  { week: '11월 1주', demand: 9200 },
  { week: '11월 2주', demand: 9500 },
  { week: '11월 3주', demand: 11000 }, // Peak
  { week: '11월 4주', demand: 10500 },
  { week: '12월 1주', demand: 9800 },
  { week: '12월 2주', demand: 12500 }, // Holiday peak
  { week: '12월 3주', demand: 11500 },
  { week: '12월 4주', demand: 10200 },
];