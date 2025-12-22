
import { AuditArea, Scenario, ViolationDetail, CorpCardTransaction, ForecastDataPoint } from '../types';

export const AUDIT_AREAS: AuditArea[] = [
  { code: 'FSC', name: '재무 마감', description: '분개 및 결산 마감 통제', totalScenarios: 10, violationCount: 2 },
  { code: 'TRE', name: '자금 관리', description: '은행 계좌 및 송금 관리', totalScenarios: 10, violationCount: 1 },
  { code: 'EXP', name: '경비 지출', description: '법인카드 및 임직원 경비', totalScenarios: 10, violationCount: 4 },
  { code: 'OTC', name: '매출 채권', description: '매출 인식 및 신용 관리', totalScenarios: 10, violationCount: 1 },
  { code: 'STP', name: '구매 지급', description: '구매 발주 및 대금 지급', totalScenarios: 10, violationCount: 2 },
  { code: 'FXA', name: '유형 자산', description: '자산 취득 및 감가상각', totalScenarios: 10, violationCount: 1 },
  { code: 'INV', name: '재고 자산', description: '재고 수불 및 실사', totalScenarios: 10, violationCount: 0 },
  { code: 'HRE', name: '인사 급여', description: '입퇴사 및 급여 작업', totalScenarios: 10, violationCount: 1 },
  { code: 'SEC', name: '정보 보안', description: '접근 권한 및 정보 유출', totalScenarios: 10, violationCount: 2 },
];

const generateScenarios = (): Scenario[] => {
  const scenarios: Scenario[] = [];
  const startDate = new Date('2024-01-01').getTime();
  const endDate = new Date('2025-12-31').getTime();

  AUDIT_AREAS.forEach((area) => {
    for (let i = 1; i <= 10; i++) {
      const isFail = i <= area.violationCount;
      let isUnstructured = i % 2 === 0;
      const isNew = false; 

      let title = `${area.name} 정기 통제 점검 #${i}`;
      let detailedDesc = `${area.name} 관련 정기적인 내부 통제 절차가 준수되었는지 확인하는 시나리오입니다. (기간: 2024-2025)`;
      let risk: 'High' | 'Medium' | 'Low' = isFail ? 'Medium' : 'Low';

      if(area.code === 'FSC' && i===1) {
        title = "비표준 분개 전결 규정(DoA) 준수 여부";
        detailedDesc = "비정형 데이터 분석: 2024-2025년 $50K 이상 수기 분개에 대해 Controller 급 이상의 결재가 포함된 이메일 또는 전자결재 문서가 존재하는지 검증합니다.";
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

      const randomDate = new Date(startDate + Math.random() * (endDate - startDate));

      scenarios.push({
        id: `${area.code}-${String(i).padStart(3, '0')}`,
        areaCode: area.code,
        title: title,
        status: isFail ? 'Fail' : 'Pass',
        description: isUnstructured 
          ? `AI 문서 분석: ${area.name} 관련 증빙 문서와 시스템 데이터 대조` 
          : `SQL 규칙 검증: ${area.name} 마스터 데이터 무결성 점검`,
        detailedDescription: detailedDesc,
        timestamp: randomDate.toISOString(),
        type: isUnstructured ? 'Unstructured' : 'Structured',
        evidenceUrl: '', 
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
    transactionInfo: { id: 'GL-JE-20251105-015', amount: '$75,200.00', date: '2025-11-05', entity: '김철수 팀장' },
    aiAnalysis: 'ERP 시스템에 기록된 $50K 초과 비표준 분개(JE# GL-JE-20251105-015)에 대해, 첨부된 이메일 증빙 자료에서 승인 권한자인 Controller(재무 담당 임원)의 서명 또는 명시적 승인 문구가 발견되지 않았습니다. 이는 DoA 규정 위반에 해당합니다.',
    recommendation: '해당 분개의 즉각적인 재검토 및 Controller의 사후 승인을 득하고, 향후 $50K 초과 분개 발생 시 ERP 시스템 내에서 Controller 승인 라인을 강제하는 워크플로우를 구축하십시오.',
    evidenceDocumentUrl: '',
    evidenceType: 'Approval Email'
  },
  {
    id: 'STP-V01',
    areaCode: 'STP',
    riskLevel: 'High',
    controlPoint: '3-Way Match (계약서-PO-송장) 불일치',
    violationType: '계약 조건과 구매 발주(PO) 데이터 불일치',
    transactionInfo: { id: 'PO-NEXUS-20251020-088', amount: '$120,000.00', date: '2025-10-20', entity: '공급업체: Alpha Components' },
    aiAnalysis: "공급업체 'Alpha Components'와의 구매 계약서(PDF) 5.2조에 '연간 구매액 $1M 초과 시 5% 추가 할인' 특약이 명시되어 있으나, 관련 구매발주서(PO# PO-NEXUS-20251020-088)의 단가에는 해당 할인이 적용되지 않았습니다. 이로 인해 약 $6,000의 손실이 발생했습니다.",
    recommendation: "즉시 해당 공급업체에 연락하여 차액($6,000)에 대한 Credit Note 발행을 요청하고, 향후 주요 공급업체 계약의 특약 조건을 ERP 공급업체 마스터에 등록하여 PO 생성 시 자동 반영되도록 시스템을 개선하십시오.",
    evidenceDocumentUrl: '',
    evidenceType: 'Contract'
  },
  {
    id: 'EXP-V01',
    areaCode: 'EXP',
    riskLevel: 'High',
    controlPoint: '법인카드 사용 규정 준수',
    violationType: '유흥업소 사용 및 쪼개기 결제',
    transactionInfo: { id: 'TXN007 & TXN008', amount: '450,000원 + 450,000원', date: '2025-11-20', entity: '박도현 (영업팀)' },
    aiAnalysis: "영업팀 박도현 사원의 법인카드에서 '락휴 노래타운' (업종코드: 유흥주점) 사용 내역이 발견되었습니다. 또한 50만원 이상 접대비 승인 회피 목적으로 10분 간격으로 45만원씩 두 차례에 걸쳐 결제한 '쪼개기 결제' 패턴이 탐지되었습니다. 이는 경비 규정 제 2조와 3조의 명백한 위반입니다.",
    recommendation: "해당 거래에 대한 즉각적인 소명을 요구하고, 비용을 환수 조치하십시오. 전사적으로 법인카드 사용 규정을 재공지하고, AI 모니터링을 통한 자동 탐지 규칙을 강화하여 재발을 방지하십시오.",
    evidenceDocumentUrl: '',
    evidenceType: 'Log File'
  },
  {
    id: 'SEC-V01',
    areaCode: 'SEC',
    riskLevel: 'High',
    controlPoint: '데이터 유출 방지(DLP) 정책 준수',
    violationType: '미승인 데이터 외부 반출',
    transactionInfo: { id: 'DLP-LOG-20251201-1530-01', amount: '2.5 GB', date: '2025-12-01', entity: '박지성 연구원' },
    aiAnalysis: "DLP 시스템 로그에서 '박지성 연구원'이 2.5GB의 '프로젝트_오로라_설계도' 폴더를 개인 USB 드라이브로 복사한 기록이 탐지되었습니다. 그러나 보안팀의 반출 승인 신청서 데이터베이스에서는 해당 반출에 대한 승인 기록을 찾을 수 없습니다. 이는 정보보안 정책 12조 위반입니다.",
    recommendation: "정보보호 위원회를 소집하여 해당 데이터 반출의 경위를 즉시 조사하고, 중요 데이터에 대한 접근 및 반출 통제를 강화하십시오. 승인 없는 USB 포트 사용을 기술적으로 차단하는 방안을 검토하십시오.",
    evidenceDocumentUrl: '',
    evidenceType: 'Log File'
  },
  // --- Additional Violations for dynamic simulation ---
  {
    id: 'EXP-V02-AI',
    areaCode: 'EXP',
    riskLevel: 'Medium',
    controlPoint: '법인카드 사용 규정 준수',
    violationType: '자택 인근 주말 사용',
    transactionInfo: { id: 'TXN-015', amount: '85,000원', date: '2025-11-23', entity: '최지아 (마케팅팀)' },
    aiAnalysis: "마케팅팀 최지아 사원의 법인카드에서 주말(토요일 오후 3시)에 자택 반경 500m 이내 음식점 '우리동네 맛집'에서 85,000원 결제 내역이 발견되었습니다. 이는 법인카드 사적 사용 금지 규정에 따른 소명이 필요합니다.",
    recommendation: "해당 임직원에게 소명 자료를 요청하고, 소명이 부적절할 경우 비용 환수 및 규정 위반 조치를 검토하십시오.",
    evidenceDocumentUrl: '',
    evidenceType: 'Log File'
  },
  {
    id: 'STP-V02-AI',
    areaCode: 'STP',
    riskLevel: 'High',
    controlPoint: '가공 거래처(Ghost Vendor) 생성 및 거래',
    violationType: '신규 거래처 의심 거래',
    transactionInfo: { id: 'INV-11223', amount: '15,000,000원', date: '2025-12-01', entity: '신규 거래처: KNL파트너스' },
    aiAnalysis: "Vendor Master에 신규 등록된 'KNL파트너스'(등록일: 2025.11.28)에 대해 등록 3일 만에 1,500만원 규모의 고액 용역비가 지급되었습니다. 또한, 해당 거래처의 주소가 기존 임직원(이대리)의 자택 주소와 매우 유사하게 확인되어 가공 거래처일 가능성이 높습니다.",
    recommendation: "KNL파트너스의 실재 여부 및 거래 정당성을 즉시 조사하고, 거래처 등록 및 지급 프로세스에 대한 통제를 강화하십시오. 필요 시 법적 조치를 검토합니다.",
    evidenceDocumentUrl: '',
    evidenceType: 'Approval Email'
  },
  {
    id: 'EXP-V03-AI',
    areaCode: 'EXP',
    riskLevel: 'High',
    controlPoint: '법인카드 한도 우회 결제',
    violationType: '50만원 이상 접대비 쪼개기 결제',
    transactionInfo: { id: 'TXN-030, TXN-031', amount: '490,000원 + 490,000원', date: '2025-12-05', entity: '김부장 (영업팀)' },
    aiAnalysis: "영업팀 김부장 사원의 법인카드에서 '고급 한정식' 음식점에서 10분 간격으로 490,000원씩 두 차례에 걸쳐 결제된 내역이 발견되었습니다. 이는 50만원 이상 접대비에 대한 추가 승인을 회피하기 위한 '쪼개기 결제' 패턴으로 판단됩니다.",
    recommendation: "해당 거래에 대한 소명을 요구하고, 영업팀의 접대비 지출 내역 전반에 대한 추가 조사를 수행하십시오. AI 기반의 '쪼개기 결제' 자동 탐지 규칙을 강화합니다.",
    evidenceDocumentUrl: '',
    evidenceType: 'Log File'
  },
  {
    id: 'FSC-V02-AI',
    areaCode: 'FSC',
    riskLevel: 'Medium',
    controlPoint: '회계 전표 수기 입력 관리',
    violationType: '설명 불충분한 수기 전표',
    transactionInfo: { id: 'JE-20251115-045', amount: '3,200,000원', date: '2025-11-15', entity: '재무팀' },
    aiAnalysis: "재무팀에서 수기 입력된 일반 전표(JE-20251115-045, 320만원)의 적요 내용이 '일반 용역비'로만 기재되어 있어 구체적인 거래 내용 파악이 어렵습니다. AI가 유사한 다른 전표들과 비교 분석한 결과, 비표준적인 설명 방식입니다.",
    recommendation: "회계 전표 입력 시 적요 상세화 가이드라인을 재공지하고, ERP 시스템에서 특정 금액 이상 수기 전표에 대한 적요 필수 입력 필드를 설정하도록 제안합니다.",
    evidenceDocumentUrl: '',
    evidenceType: 'Contract'
  },
  {
    id: 'SEC-V02-AI',
    areaCode: 'SEC',
    riskLevel: 'Medium',
    controlPoint: '정보 보안 정책 위반',
    violationType: '인사 정보 무단 열람 의심',
    transactionInfo: { id: 'LOG-HR-20251210-001', amount: 'N/A', date: '2025-12-10', entity: '최사원 (IT운영팀)' },
    aiAnalysis: "IT운영팀 최사원이 자신의 업무 권한 범위를 넘어서는 '전 직원 급여 정보 조회' 기능에 비정상적으로 5회 연속 접근 시도한 로그가 탐지되었습니다. 이는 정보 보안 정책 5조 '최소 권한의 원칙' 위반 의심 사례입니다.",
    recommendation: "해당 임직원에 대한 접근 로그를 심층 분석하고, 필요 시 소명을 요구하십시오. IT 시스템 접근 권한에 대한 정기적인 감사를 강화하고 이상 접근 시도에 대한 실시간 알림 기능을 고도화하십시오.",
    evidenceDocumentUrl: '',
    evidenceType: 'Log File'
  },
  {
    id: 'INV-V01-AI',
    areaCode: 'INV',
    riskLevel: 'Low',
    controlPoint: '재고 수불 불일치',
    violationType: '시스템 재고와 실물 재고 차이',
    transactionInfo: { id: 'INV_ADJ-20251025-001', amount: '20개', date: '2025-10-25', entity: '재고관리팀' },
    aiAnalysis: "2025년 10월 25일 재고 실사 결과, 제품 A-123의 시스템 재고와 실물 재고 간 20개(차이 금액 50만원)의 불일치가 발견되었습니다. 이는 단순 오류일 가능성이 높으나, 지속적인 모니터링이 필요합니다.",
    recommendation: "재고 실사 프로세스의 정확도를 높이고, 정기적인 원인 분석을 통해 재고 불일치 발생을 최소화하는 방안을 모색하십시오.",
    evidenceDocumentUrl: '',
    evidenceType: 'Log File'
  },
  {
    id: 'TRE-V01-AI',
    areaCode: 'TRE',
    riskLevel: 'Medium',
    controlPoint: '비정상적 자금 이체',
    violationType: '해외 계좌로 고액 송금',
    transactionInfo: { id: 'TRF-20251101-001', amount: 'USD 50,000', date: '2025-11-01', entity: '해외법인: Nexus EU' },
    aiAnalysis: "2025년 11월 1일, Nexus EU 법인으로 USD 50,000의 자금 이체가 발생했습니다. 이는 평소보다 2배 높은 금액이며, AI가 이전 거래 패턴과 비교 분석한 결과, 재무팀의 사전 승인 여부 확인이 필요합니다.",
    recommendation: "해당 해외 송금 건에 대한 재무팀의 공식 승인 문서를 확인하고, 고액 해외 송금 시 승인 프로세스 강화 방안을 검토하십시오.",
    evidenceDocumentUrl: '',
    evidenceType: 'Approval Email'
  },
  {
    id: 'EXP-V04-AI',
    areaCode: 'EXP',
    riskLevel: 'Low',
    controlPoint: '법인카드 사용 규정 준수',
    violationType: '늦은 심야시간 식대 결제',
    transactionInfo: { id: 'TXN-045', amount: '35,000원', date: '2025-11-28', entity: '박대리 (R&D팀)' },
    aiAnalysis: "R&D팀 박대리 사원의 법인카드에서 밤 11시 30분(심야 시간)에 '분식점'에서 35,000원 결제 내역이 확인되었습니다. 이는 야근 식대로 판단되나, 심야 시간 사용에 대한 사전 사규 고지가 필요합니다.",
    recommendation: "심야 시간 법인카드 사용에 대한 가이드라인을 명확히 하고, 야근 시 식대 처리 절차를 재고지하십시오.",
    evidenceDocumentUrl: '',
    evidenceType: 'Log File'
  },
  {
    id: 'STP-V03-AI',
    areaCode: 'STP',
    riskLevel: 'Medium',
    controlPoint: '공급망 실사 및 위험 평가',
    violationType: '특정 공급업체 과도한 의존',
    transactionInfo: { id: 'VENDOR-EVAL-2025-Q4', amount: 'N/A', date: '2025-12-15', entity: '구매팀' },
    aiAnalysis: "최근 1년간 구매 데이터 분석 결과, 'XYZ솔루션'에 대한 구매 의존도가 60%를 초과하는 것으로 나타났습니다. 이는 공급망 위험을 증가시키며, 유사 대체 공급업체 발굴이 시급합니다.",
    recommendation: "핵심 공급업체 다변화 전략을 수립하고, 정기적인 공급업체 위험 평가 및 실사를 의무화하십시오.",
    evidenceDocumentUrl: '',
    evidenceType: 'Log File'
  },
  {
    id: 'HRE-V01-AI',
    areaCode: 'HRE',
    riskLevel: 'High',
    controlPoint: '퇴직자 시스템 접근 권한 관리',
    violationType: '퇴직자 계정 지연 비활성화',
    transactionInfo: { id: 'HR-EXIT-2025-012', amount: 'N/A', date: '2025-11-01', entity: '퇴직자: 이사원 (IT팀)' },
    aiAnalysis: "퇴직자 '이사원' (퇴직일: 2025.11.01)의 IT 시스템(ERP, 그룹웨어) 계정이 퇴직 후 7일이 경과한 시점까지 활성화 상태로 유지되었음이 시스템 로그에서 확인되었습니다. 이는 정보 보안 규정 위반 및 데이터 유출 위험을 야기합니다.",
    recommendation: "퇴직자 계정 비활성화 프로세스를 즉시 점검하고, IT 시스템과 인사 시스템 간 연동을 강화하여 퇴직일 기준 자동 또는 즉시 계정 비활성화가 이루어지도록 시스템을 개선하십시오.",
    evidenceDocumentUrl: '',
    evidenceType: 'Log File'
  },
  {
    id: 'EXP-V05-AI',
    areaCode: 'EXP',
    riskLevel: 'High',
    controlPoint: '허위 경비 청구',
    violationType: '중복 청구 의심 (Duplicate Expense)',
    transactionInfo: { id: 'EXP-RPT-20251101-002', amount: '250,000원', date: '2025-11-01', entity: '김대리 (경영지원팀)' },
    aiAnalysis: "경영지원팀 김대리 사원의 경비 보고서(EXP-RPT-20251101-002)에서 25만원짜리 '거래처 식대' 영수증이 이미 지난달 다른 보고서에서 청구된 내역과 완벽하게 일치하는 것으로 AI가 탐지했습니다. 이는 중복 청구 또는 허위 경비일 가능성이 매우 높습니다.",
    recommendation: "김대리 사원에게 즉시 소명을 요구하고, 관련 경비는 환수 조치하십시오. 경비 시스템에 AI 기반의 중복 영수증 탐지 기능을 강화하여 사전에 차단하도록 합니다.",
    evidenceDocumentUrl: '',
    evidenceType: 'Approval Email'
  },
  {
    id: 'FSC-V03-AI',
    areaCode: 'FSC',
    riskLevel: 'High',
    controlPoint: '재무제표 계정 잔액 오류',
    violationType: '미확인 계정 잔액 이상',
    transactionInfo: { id: 'BS-20251231-001', amount: '1,500,000원', date: '2025-12-31', entity: '재무팀' },
    aiAnalysis: "2025년 기말 재무제표의 '선급비용' 계정 잔액에서 150만원의 미확인 이상 잔액이 AI에 의해 탐지되었습니다. 관련 상세 원장 분석 결과, 특정 프로젝트 종료 후 미반영된 금액일 가능성이 있습니다.",
    recommendation: "재무팀은 해당 계정의 상세 내역을 즉시 조사하여 잔액의 정당성을 확인하고, 필요한 경우 적절한 회계 처리를 수행하십시오.",
    evidenceDocumentUrl: '',
    evidenceType: 'Log File'
  },
  {
    id: 'SEC-V03-AI',
    areaCode: 'SEC',
    riskLevel: 'High',
    controlPoint: '클라우드 스토리지 접근 권한 관리',
    violationType: '미사용 계정의 민감 데이터 접근',
    transactionInfo: { id: 'CLOUD-LOG-20251120-001', amount: 'N/A', date: '2025-11-20', entity: '구.개발팀장 (퇴사자)' },
    aiAnalysis: "클라우드 스토리지(GCS) 로그 분석 결과, 퇴사한 구.개발팀장의 계정이 퇴사 후에도 '프로젝트_블루오션_최종' 버킷에 3회 접근 시도한 내역이 탐지되었습니다. 이는 정보 보안 정책 5조 및 12조 위반 가능성이 높습니다.",
    recommendation: "퇴사자 계정의 접근 권한을 즉시 비활성화하고, 클라우드 자원에 대한 접근 권한 정기 감사 프로세스를 강화하십시오. 이상 접근 시도에 대한 실시간 알림 시스템을 구축하십시오.",
    evidenceDocumentUrl: '',
    evidenceType: 'Log File'
  },
  {
    id: 'EXP-V06-AI',
    areaCode: 'EXP',
    riskLevel: 'Medium',
    controlPoint: '법인카드 사용 규정 준수 (주유비)',
    violationType: '자택 인근 주말 주유비 과다 사용',
    transactionInfo: { id: 'TXN-050', amount: '120,000원', date: '2025-12-02', entity: '김차장 (영업팀)' },
    aiAnalysis: "영업팀 김차장의 법인카드에서 주말(토요일)에 자택 인근 주유소에서 12만원 상당의 주유비 결제가 확인되었습니다. AI는 유사 직급의 주유 패턴과 비교하여 과다 사용으로 분류하였으며, 사적 사용 여부에 대한 소명이 필요합니다.",
    recommendation: "해당 임직원에게 소명 자료를 요청하고, 주유비 사용 규정을 명확히 안내하십시오.",
    evidenceDocumentUrl: '',
    evidenceType: 'Log File'
  },
  {
    id: 'OTC-V01-AI',
    areaCode: 'OTC',
    riskLevel: 'Medium',
    controlPoint: '매출채권 회수 지연',
    violationType: '장기 미회수 매출채권 발생',
    transactionInfo: { id: 'AR-2025-010', amount: '5,000,000원', date: '2025-07-01', entity: '거래처: A-Mart' },
    aiAnalysis: "거래처 'A-Mart'에 대한 매출채권 500만원이 회수 기일(2025.08.31)로부터 90일 이상 경과했습니다. AI는 과거 해당 거래처의 지불 패턴과 비교 분석한 결과, 재무팀의 사전 승인 여부 확인이 필요합니다.",
    recommendation: "영업팀 및 채권 관리팀은 해당 거래처에 대한 채권 회수 독려를 강화하고, 회수 불능 가능성에 대비하여 충당금 설정 여부를 검토하십시오.",
    evidenceDocumentUrl: '',
    evidenceType: 'Log File'
  },
  {
    id: 'EXP-V07-AI',
    areaCode: 'EXP',
    riskLevel: 'High',
    controlPoint: '법인카드 사적 사용 금지',
    violationType: '온라인 쇼핑몰 대량 구매 (사적 사용 의심)',
    transactionInfo: { id: 'TXN020', amount: '80,000원', date: '2025-12-03', entity: '김민준 (R&D팀)' },
    aiAnalysis: "R&D팀 김민준 사원의 법인카드에서 온라인 쇼핑몰 '쿠팡'에서 80,000원 결제 내역이 확인되었습니다. 이는 업무 관련성이 불명확하며, 법인카드 사적 사용 금지 규정(제3조 2항) 위반으로 판단됩니다. 특히, 과거 패턴과 비교 시 비정상적인 쇼핑몰 사용 이력이 탐지되었습니다.",
    recommendation: "해당 임직원에게 소명 자료를 즉시 요청하고, 소명이 부적절할 경우 비용 환수 및 징계 조치를 검토하십시오. 온라인 쇼핑몰에서의 법인카드 사용에 대한 전사적인 가이드라인을 강화해야 합니다.",
    evidenceDocumentUrl: '',
    evidenceType: 'Log File'
  }
];

export const COMPANY_LOCATION = { lat: 37.501, lng: 127.041, name: 'Nexus Corp HQ' };

export const MOCK_CORP_CARD_TRANSACTIONS: CorpCardTransaction[] = [
    { id: 'TXN001', employee: { name: '김민준', id: 'E1023', homeAddress: '서울시 강남구 테헤란로 427', department: 'R&D', homeLocation: { lat: 37.508, lng: 127.056 } }, merchant: '강남면옥', location: { lat: 37.506, lng: 127.054, name: '강남면옥', address: '서울시 강남구 삼성동 119-17' }, amount: 58000, timestamp: '2025-11-18T20:30:00Z', category: '음식점', anomaly: '자택 근처 사용' },
    { id: 'TXN002', employee: { name: '김민준', id: 'E1023', homeAddress: '서울시 강남구 테헤란로 427', department: 'R&D', homeLocation: { lat: 37.508, lng: 127.056 } }, merchant: 'CGV 강남', location: { lat: 37.500, lng: 127.027, name: 'CGV 강남', address: '서울시 강남구 역삼동 814-6' }, amount: 32000, timestamp: '2025-11-18T22:15:00Z', category: '여가', anomaly: '주말/심야 사용' },
    { id: 'TXN003', employee: { name: '이서연', id: 'E2045', homeAddress: '경기도 성남시 분당구 판교역로 1', department: '마케팅', homeLocation: { lat: 37.394, lng: 127.111 } }, merchant: '골프존파크 판교', location: { lat: 37.395, lng: 127.112, name: '골프존파크', address: '경기도 성남시 분당구 삼평동 678' }, amount: 150000, timestamp: '2025-11-19T14:00:00Z', category: '접대', anomaly: null },
    { id: 'TXN004', employee: { name: '박도현', id: 'E3001', homeAddress: '서울시 마포구 월드컵북로 396', department: '영업', homeLocation: { lat: 37.570, lng: 126.890 } }, merchant: '상암 주유소', location: { lat: 37.575, lng: 126.892, name: '상암 주유소', address: '서울시 마포구 상암동 1591' }, amount: 70000, timestamp: '2025-11-17T23:50:00Z', category: '교통', anomaly: '주말/심야 사용' },
    { id: 'TXN005', employee: { name: '김민준', id: 'E1023', homeAddress: '서울시 강남구 테헤란로 427', department: 'R&D', homeLocation: { lat: 37.508, lng: 127.056 } }, merchant: '선릉 스타벅스', location: { lat: 37.505, lng: 127.049, name: '선릉 스타벅스', address: '서울시 강남구 테헤란로 326' }, amount: 12500, timestamp: '2025-11-19T10:10:00Z', category: '음료', anomaly: '자택 근처 사용' },
    { id: 'TXN006', employee: { name: '최지아', id: 'E3002', homeAddress: '서울시 서초구 신반포로 176', department: '영업', homeLocation: { lat: 37.505, lng: 127.000 } }, merchant: '하나일식', location: { lat: 37.504, lng: 127.004, name: '하나일식', address: '서울시 서초구 반포동 19-3' }, amount: 280000, timestamp: '2025-11-20T19:45:00Z', category: '접대', anomaly: null },
    { id: 'TXN007', employee: { name: '박도현', id: 'E3001', homeAddress: '서울시 마포구 월드컵북로 396', department: '영업', homeLocation: { lat: 37.570, lng: 126.890 } }, merchant: '락휴 노래타운', location: { lat: 37.555, lng: 126.923, name: '락휴 노래타운', address: '서울시 마포구 서교동 363-1' }, amount: 450000, timestamp: '2025-11-20T21:10:00Z', category: '유흥', anomaly: '유흥업소 사용 의심' },
    { id: 'TXN008', employee: { name: '박도현', id: 'E3001', homeAddress: '서울시 마포구 월드컵북로 396', department: '영업', homeLocation: { lat: 37.570, lng: 126.890 } }, merchant: '락휴 노래타운', location: { lat: 37.555, lng: 126.923, name: '락휴 노래타운', address: '서울시 마포구 서교동 363-1' }, amount: 450000, timestamp: '2025-11-20T21:20:00Z', category: '유흥', anomaly: '쪼개기 결제 의심' },
    { id: 'TXN009', employee: { name: '이서연', id: 'E2045', homeAddress: '경기도 성남시 분당구 판교역로 1', department: '마케팅', homeLocation: { lat: 37.394, lng: 127.111 } }, merchant: '온라인광고-페이스북', location: { lat: 37.395, lng: 127.112, name: '온라인', address: 'N/A' }, amount: 480000, timestamp: '2025-11-21T11:00:00Z', category: '광고', anomaly: null },
    { id: 'TXN010', employee: { name: '김민준', id: 'E1023', homeAddress: '서울시 강남구 테헤란로 427', department: 'R&D', homeLocation: { lat: 37.508, lng: 127.056 } }, merchant: 'AWS-서비스이용료', location: { lat: 37.506, lng: 127.054, name: '온라인', address: 'N/A' }, amount: 350000, timestamp: '2025-11-22T15:30:00Z', category: 'IT', anomaly: null },
    // More transactions for diverse analysis simulation
    { id: 'TXN011', employee: { name: '이서연', id: 'E2045', homeAddress: '경기도 성남시 분당구 판교역로 1', department: '마케팅', homeLocation: { lat: 37.394, lng: 127.111 } }, merchant: '카카오 광고', location: { lat: 37.395, lng: 127.112, name: '온라인', address: 'N/A' }, amount: 300000, timestamp: '2025-11-23T10:00:00Z', category: '광고', anomaly: null },
    { id: 'TXN012', employee: { name: '박도현', id: 'E3001', homeAddress: '서울시 마포구 월드컵북로 396', department: '영업', homeLocation: { lat: 37.570, lng: 126.890 } }, merchant: '스타벅스 상암DMC', location: { lat: 37.579, lng: 126.887, name: '스타벅스', address: '서울시 마포구 월드컵북로 402' }, amount: 6500, timestamp: '2025-11-24T09:15:00Z', category: '음료', anomaly: null },
    { id: 'TXN013', employee: { name: '김민준', id: 'E1023', homeAddress: '서울시 강남구 테헤란로 427', department: 'R&D', homeLocation: { lat: 37.508, lng: 127.056 } }, merchant: '교보문고 강남점', location: { lat: 37.505, lng: 127.027, name: '교보문고', address: '서울시 강남구 역삼동 818' }, amount: 45000, timestamp: '2025-11-25T18:00:00Z', category: '도서', anomaly: null },
    { id: 'TXN014', employee: { name: '최지아', id: 'E3002', homeAddress: '서울시 서초구 신반포로 176', department: '영업', homeLocation: { lat: 37.505, lng: 127.000 } }, merchant: '골프존파크 서초', location: { lat: 37.497, lng: 127.017, name: '골프존파크', address: '서울시 서초구 서초동 1327' }, amount: 120000, timestamp: '2025-11-26T16:00:00Z', category: '접대', anomaly: null },
    { id: 'TXN015', employee: { name: '최지아', id: 'E3002', homeAddress: '서울시 서초구 신반포로 176', department: '마케팅', homeLocation: { lat: 37.505, lng: 127.000 } }, merchant: '우리동네 맛집', location: { lat: 37.502, lng: 127.001, name: '우리동네 맛집', address: '서울시 서초구 반포동 123-45' }, amount: 85000, timestamp: '2025-11-23T15:00:00Z', category: '음식점', anomaly: '자택 근처 사용' }, // AI detected
    { id: 'TXN016', employee: { name: '박도현', id: 'E3001', homeAddress: '서울시 마포구 월드컵북로 396', department: '영업', homeLocation: { lat: 37.570, lng: 126.890 } }, merchant: '고급 한정식', location: { lat: 37.560, lng: 126.980, name: '고급 한정식', address: '서울시 종로구 종로100' }, amount: 490000, timestamp: '2025-12-05T19:00:00Z', category: '접대', anomaly: '쪼개기 결제 의심' }, // AI detected
    { id: 'TXN017', employee: { name: '박도현', id: 'E3001', homeAddress: '서울시 마포구 월드컵북로 396', department: '영업', homeLocation: { lat: 37.570, lng: 126.890 } }, merchant: '고급 한정식', location: { lat: 37.560, lng: 126.980, name: '고급 한정식', address: '서울시 종로구 종로100' }, amount: 490000, timestamp: '2025-12-05T19:10:00Z', category: '접대', anomaly: '쪼개기 결제 의심' }, // AI detected
    { id: 'TXN018', employee: { name: '박대리', id: 'E1024', homeAddress: '서울시 강남구 테헤란로 427', department: 'R&D', homeLocation: { lat: 37.508, lng: 127.056 } }, merchant: '분식점', location: { lat: 37.507, lng: 127.055, name: '분식점', address: '서울시 강남구 삼성동 123-1' }, amount: 35000, timestamp: '2025-11-28T23:30:00Z', category: '음식점', anomaly: '주말/심야 사용' }, // AI detected
    { id: 'TXN019', employee: { name: '김차장', id: 'E3003', homeAddress: '서울시 강남구 역삼동 700', department: '영업', homeLocation: { lat: 37.500, lng: 127.040 } }, merchant: '역삼 주유소', location: { lat: 37.498, lng: 127.038, name: '역삼 주유소', address: '서울시 강남구 역삼동 701' }, amount: 120000, timestamp: '2025-12-02T10:00:00Z', category: '교통', anomaly: '자택 근처 사용' }, // AI detected
    { id: 'TXN020', employee: { name: '김민준', id: 'E1023', homeAddress: '서울시 강남구 테헤란로 427', department: 'R&D', homeLocation: { lat: 37.508, lng: 127.056 } }, merchant: '쿠팡', location: { lat: 37.506, lng: 127.054, name: '온라인', address: 'N/A' }, amount: 80000, timestamp: '2025-12-03T18:00:00Z', category: '쇼핑', anomaly: '사적 사용 의심' }, // New anomaly
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
  { week: '11월 3주', demand: 11000 }, 
  { week: '11월 4주', demand: 10500 },
  { week: '12월 1주', demand: 9800 },
  { week: '12월 2주', demand: 12500 }, 
  { week: '12월 3주', demand: 11500 },
  { week: '12월 4주', demand: 10200 },
];
