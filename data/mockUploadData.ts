
import { MockUploadFile } from '../types';

export const MOCK_UPLOAD_FILES: MockUploadFile[] = [
  // --- Regulations & Policies (Unstructured) ---
  { 
    id: 'doc-ethics',
    name: 'Code_of_Ethics_2024.pdf', 
    type: 'PDF', 
    size: '1.2MB', 
    category: 'SEC',
    content: `[NEXUS CORP 윤리 강령 전문]\n\n제1장 총칙\n제1조 (목적): 본 윤리 강령은 넥서스 주식회사의 임직원들이 공정하고 투명하며 윤리적인 기업 활동을 수행하기 위한 기본적인 원칙과 기준을 제시한다.\n\n제2조 (적용 대상): 본 강령은 넥서스 주식회사 및 모든 계열사의 임원 및 직원에 적용된다.\n\n제2장 공정한 직무 수행\n제3조 (이해 상충 회피): 임직원은 직무와 관련하여 회사와 개인 또는 제3자 간의 이해 상충이 발생하는 상황을 회피해야 하며, 그러한 상황 발생 시 즉시 회사에 보고하고 적절한 조치를 취해야 한다.\n\n제4조 (금품 등 수수 금지): 임직원은 직무와 관련하여 이해관계자로부터 금품, 향응, 편의, 접대 등을 직/간접적으로 수수하거나 요구해서는 안 된다.\n\n제3장 정보 보호 및 활용\n제5조 (회사 정보 보호): 임직원은 회사의 영업 비밀, 기술 정보, 고객 정보 등 모든 기밀 정보를 철저히 보호하고, 회사의 사전 승인 없이 외부에 유출하거나 사적인 목적으로 사용해서는 안 된다.\n\n제6조 (정보 시스템 보안): 임직원은 회사 정보 시스템의 보안 정책을 준수하고, 인가되지 않은 접근 시도나 정보 유출 행위를 즉시 신고해야 한다.\n\n--- 파일 내용 끝 ---`
  },
  { 
    id: 'doc-purchase',
    name: 'Procurement_Policy_v3.pdf', 
    type: 'PDF', 
    size: '850KB', 
    category: 'STP',
    content: `[NEXUS CORP. 구매 및 조달 규정 (Procurement Policy) v3.2]\n\n제1장 총칙\n제1조 (목적): 본 규정은 회사의 모든 물품 및 용역 구매 활동을 투명하고 효율적으로 수행하기 위한 절차와 기준을 정함을 목적으로 한다.\n\n제2장 구매 절차\n제3조 (구매 요청): 각 부서는 필요한 물품/용역 발생 시 ERP 시스템을 통해 구매 요청서를 제출해야 한다.\n\n제4조 (업체 선정): 1천만원 이상의 구매 계약은 반드시 3개 이상의 업체 견적을 비교하여 경쟁 입찰로 진행함을 원칙으로 한다. 예외 사항 발생 시 구매팀장 및 유관 부서장의 사전 승인을 득해야 한다.\n\n제5조 (계약 체결): 선정된 업체와는 표준 계약서 양식을 사용하여 계약을 체결하며, 특약 사항 발생 시 법무팀의 검토를 필수적으로 거쳐야 한다.\n\n제3장 구매 대금 지급\n제6조 (대금 지급 조건): 모든 대금은 적격한 세금계산서 및 검수보고서 확인 후 30일 이내에 지급하는 것을 원칙으로 한다.\n\n--- 파일 내용 끝 ---`
  },
  { 
    id: 'doc-sales',
    name: 'Sales_Recognition_Policy.pdf', 
    type: 'PDF', 
    size: '620KB', 
    category: 'OTC',
    content: `[NEXUS CORP. 매출 인식 규정 (Revenue Recognition Policy)]\n\n제1조 (목적): 본 규정은 회계 기준에 따라 매출을 정확하게 인식하고 보고하기 위한 원칙과 절차를 명확히 함을 목적으로 한다.\n\n제2조 (매출 인식 시점): 매출은 다음의 조건을 모두 충족할 때 인식한다.\n1. 재화 또는 용역의 인도가 완료되었을 때\n2. 수익 금액을 신뢰성 있게 측정할 수 있을 때\n3. 경제적 효익의 유입 가능성이 높을 때\n4. 판매와 관련된 주요 위험과 보상이 고객에게 이전되었을 때\n\n제3조 (반품 및 환불): 반품 및 환불 정책은 고객과의 계약 조건에 따라 명시하며, 관련 충당금은 합리적으로 추정하여 설정한다.\n\n--- 파일 내용 끝 ---`
  },
  { 
    id: 'doc-accounting',
    name: 'Accounting_Standard_Manual.pdf', 
    type: 'PDF', 
    size: '2.5MB', 
    category: 'FSC',
    content: `[NEXUS CORP. 회계 처리 기준 매뉴얼]\n\n제1장 총칙\n제1조 (목적): 본 매뉴얼은 넥서스 주식회사의 모든 회계 거래를 일관되고 정확하게 처리하기 위한 기준을 제시한다. 이는 한국채택국제국제회계기준(K-IFRS)을 기반으로 작성되었다.\n\n제2장 자산 계정\n제3조 (현금 및 현금성 자산): 통화, 당좌예금, 보통예금 및 큰 거래비용 없이 현금으로 전환이 용이하고 이자율 변동에 따른 가치 변동 위험이 중요하지 않은 금융상품으로서 취득 당시 만기일이 3개월 이내인 것을 말한다.\n\n제4조 (매출 채권): 고객에게 재화나 용역을 제공하고 받을 대금으로서 통상적인 영업활동 과정에서 발생하는 채권을 말한다. 대손충당금은 과거 경험률과 미래 예측 정보를 기반으로 합리적으로 추정하여 설정한다.\n\n제3장 부채 계정\n제5조 (매입 채무): 일반적인 상거래에서 발생한 외상매입금 및 지급어음 등을 말한다.\n\n--- 파일 내용 끝 ---`
  },
  { 
    id: 'doc-entertainment',
    name: 'Entertainment_Expense_Policy.pdf', 
    type: 'PDF', 
    size: '450KB', 
    category: 'EXP',
    content: `[NEXUS CORP. 접대비 및 회의비 규정]\n\n제1조 (목적): 건전한 접대 문화 정착 및 효율적인 경비 집행을 목적으로 한다.\n\n제2조 (접대비 기준):\n1. 건당 10만원을 초과하는 접대비는 사전에 품의 및 승인을 득해야 한다.\n2. 1인당 5만원을 초과하는 식대 집행 시에는 참석자 명단을 반드시 첨부해야 한다.\n3. 주점, 노래방 등 유흥업소에서의 사용은 어떠한 경우에도 허용되지 않는다.\n\n제3조 (회의비 기준):\n1. 회의 목적과 관련성이 명확해야 한다.\n2. 회의록 및 참석자 명단을 증빙으로 첨부해야 한다.\n\n--- 파일 내용 끝 ---`
  },
  { 
    id: 'doc-travel',
    name: 'Travel_Expense_Policy.pdf', 
    type: 'PDF', 
    size: '520KB', 
    category: 'EXP',
    content: `[NEXUS CORP. 여비 교통비 규정]\n\n제1조 (목적): 임직원의 출장 경비 처리에 대한 기준을 명확히 하고 투명성을 확보한다.\n\n제2조 (항공료 및 숙박비)\n1. 국내 출장 시 숙박비는 1박당 15만원을 초과할 수 없다.\n2. 해외 출장 시 숙박비는 1박당 $200(아시아), $250(미주/유럽)을 초과할 수 없다. 단, 부득이한 사유로 초과 시에는 사전 CFO 승인을 득해야 한다.\n3. 항공권은 이코노미 클래스를 이용함을 원칙으로 하며, 8시간 이상 장거리 비행 시 임원급에 한하여 비즈니스 클래스 이용을 허용한다.\n\n제3조 (식대 및 기타 경비)\n1. 일비는 국내 5만원, 해외 $50으로 지급한다.\n2. 출장 중 발생한 업무 관련 식대는 건당 5만원을 초과할 수 없으며, 영수증을 첨부해야 한다.\n\n--- 파일 내용 끝 ---`
  },

  // --- Financial Data (Structured - 2 Years) ---
  { 
    id: 'file-bank-24-25',
    name: 'Bank_Transaction_2024_2025.csv', 
    type: 'CSV', 
    size: '15.4MB', 
    category: 'TRE',
    content: `Date,Bank,Account,Amount,Beneficiary,Description,Category
2024-01-02,Shinhan,110-xxx-123,5000000,Alpha Corp,"용역비 지급, 프로젝트 A",Payment
2024-01-05,Kookmin,220-yyy-456,1200000,Beta Solutions,"소모품 구매",Purchase
2024-01-10,Shinhan,110-xxx-123,-3000000,Nexus Corp,"급여 이체",Payroll
2025-03-15,Woori,330-zzz-789,800000,"직원복지회",체육대회 지원금,Welfare
2025-03-16,Woori,330-zzz-789,900000,"직원복지회",체육대회 추가 지원금,Welfare
2025-05-01,Shinhan,110-xxx-123,7500000,KNL파트너스,"컨설팅 비용, 신규 프로젝트",Consulting
2025-05-02,Shinhan,110-xxx-123,7500000,KNL파트너스,"컨설팅 비용, 신규 프로젝트",Consulting
2025-11-20,Shinhan,110-xxx-123,450000,락휴 노래타운,"영업 접대",Entertainment
2025-11-20,Shinhan,110-xxx-123,450000,락휴 노래타운,"영업 접대",Entertainment
2025-12-01,Hana,440-aaa-111,15000000,KNL파트너스,"용역비 지급",Consulting
--- 파일 내용 끝 ---`
  },
  { 
    id: 'file-je-24-25',
    name: 'Journal_Entry_2024_2025.csv', 
    type: 'CSV', 
    size: '48.2MB', 
    category: 'FSC',
    content: `Journal_ID,Date,Account,Debit,Credit,Description,Approval_Status,Approved_By
JE-20240101-001,2024-01-01,Cash,10000000,0,Opening Balance,Approved,CEO
JE-20240105-002,2024-01-05,Office Supplies,500000,Cash,펜,용지 구매,Approved,TeamLead
JE-20251105-015,2025-11-05,Consulting Exp,75200000,Cash,프로젝트 컨설팅 비용,Pending,Manager
JE-20251115-045,2025-11-15,Misc Expense,3200000,Cash,"일반 용역비",Approved,TeamLead
JE-20251201-005,2025-12-01,Marketing Exp,480000,Cash,온라인 광고 집행,Approved,Manager
JE-20251210-008,2025-12-10,Prepaid Expenses,1500000,Cash,미확인 선급비용,Approved,Manager
--- 파일 내용 끝 ---`
  },
  { 
    id: 'file-ap-24-25',
    name: 'AP_Invoice_2024_2025.csv', 
    type: 'CSV', 
    size: '12.5MB', 
    category: 'STP',
    content: `InvoiceID,VendorID,VendorName,Date,Amount,Status,PONumber,GRNNumber
INV-001,V-01,Alpha Corp,2024-01-05,5000000,Paid,PO-001,GRN-001
INV-002,V-02,Beta Solutions,2024-01-10,1200000,Paid,PO-002,GRN-002
INV-11223,V-0078,KNL파트너스,2025-12-01,15000000,Paid,PO-NEXUS-20251128-001,GRN-KNL-001
INV-003,V-03,XYZ솔루션,2025-10-20,8000000,Paid,PO-003,GRN-003
--- 파일 내용 끝 ---`
  },
  
  // --- Master Data ---
  { 
    id: 'file-vendor',
    name: 'Vendor_Master.csv', 
    type: 'CSV', 
    size: '14KB', 
    category: 'STP',
    content: `"VendorID","Name","TaxID","Address","BankAccount","RegistrationDate"
"V-0078","KNL파트너스","123-45-67890","서울시 강남구 역삼동 123-1, 101호","110-123-456789","2025-11-28"
"V-0079","Alpha Supply","222-33-44444","경기도 판교로 55","220-456-789012","2020-01-01"
"V-0880","XYZ솔루션","333-44-55555","서울시 서초구 서초대로 300","330-789-012345","2021-03-15"
"V-0077","NewBiz Partner","444-55-66666","서울시 강남구 테헤란로 427, 101호","110-123-456789","2025-10-06"
--- 파일 내용 끝 ---`
  },
  { 
    id: 'file-employee',
    name: 'Employee_Master.csv', 
    type: 'CSV', 
    size: '2KB', 
    category: 'HRE',
    content: `"EmployeeID","Name","Dept","Position","Address","JoinDate","TerminationDate"
"E1002","김철수","Finance","Manager","서울시 강남구 테헤란로 427, 101호","2019-05-10",""
"E1023","김민준","R&D","Researcher","서울시 강남구 테헤란로 427","2021-03-01",""
"E3001","박도현","Sales","Team Lead","서울시 마포구 월드컵북로 396","2020-08-15",""
"E3002","최지아","Marketing","Specialist","서울시 서초구 신반포로 176","2022-01-20",""
"E1024","박대리","R&D","Associate","서울시 강남구 테헤란로 427","2023-07-01",""
"E2045","이서연","Marketing","Manager","경기도 성남시 분당구 판교역로 1","2018-11-01",""
"E5001","이사원","IT","Engineer","서울시 구로구 디지털로 300","2023-01-01","2025-11-01"
--- 파일 내용 끝 ---`
  },
  
  // --- Unstructured Communications ---
  { 
    id: 'file-email',
    name: 'Email_Archive_Finance_2024_2025.log', 
    type: 'LOG', 
    size: '2.1GB', 
    category: 'SEC',
    content: `[2025-11-05 10:15:00] From: manager.kim@nexuscorp.com To: controller.lee@nexuscorp.com Subject: Re: Urgent JE Approval Request\nContent: 이 차변 분개는 중요하지 않으니 팀장 전결로 진행하시죠. 다음 분기에 반영될 예정입니다.\n\n[2025-12-01 15:30:00] From: park.joo@nexuscorp.com To: security.team@nexuscorp.com Subject: Data Exfiltration Alert\nContent: 박지성 연구원이 '프로젝트_오로라_설계도' 폴더 2.5GB를 외부 USB로 복사하는 것을 DLP 시스템이 감지했습니다. 승인 기록은 없습니다. 긴급 조치 바랍니다.\n\n[2025-11-01 11:00:00] From: hr.lee@nexuscorp.com To: it.helpdesk@nexuscorp.com Subject: Ex-employee Account Deactivation (E5001)\nContent: 이사원(E5001)이 2025년 11월 1일자로 퇴사하였습니다. 모든 시스템 접근 권한 비활성화 요청드립니다.
--- 파일 내용 끝 ---`
  },
  // --- NEW MOCK FILES FOR DEMO ---
  {
    id: 'new-exp-2026-q1',
    name: 'New_Expense_Claims_2026_Q1.csv',
    type: 'CSV',
    size: '3.5MB',
    category: 'EXP',
    content: `TransactionID,EmployeeID,Date,Merchant,Category,Amount,Description,AnomalyFlag
TXN-2026-001,E1023,2026-01-05,Coffee Shop A,음료,5000,팀 회의 음료,
TXN-2026-002,E2045,2026-01-06,Restaurant B,식대,80000,거래처 미팅,
TXN-2026-003,E3001,2026-01-07,Luxury Gift Store,선물,150000,VIP 고객 선물,사적 사용 의심
TXN-2026-004,E1023,2026-01-08,Coffee Shop A,음료,5000,팀 회의 음료,
TXN-2026-005,E3002,2026-01-10,Spa & Massage,복지,200000,직원 복지 프로그램,유흥업소 사용 의심
TXN-2026-006,E3001,2026-01-15,Electronics Mart,전자제품,350000,업무용 태블릿 구매,
TXN-2026-007,E2045,2026-01-20,Online Shop X,쇼핑,120000,개인 물품 구매,사적 사용 의심
TXN-2026-008,E1024,2026-01-22,Hotel C,숙박,180000,출장 숙박,
TXN-2026-009,E3003,2026-01-25,Karaoke Bar,유흥,300000,팀 회식 후 2차,유흥업소 사용 의심
TXN-2026-010,E3003,2026-01-25,Karaoke Bar,유흥,250000,팀 회식 후 2차,쪼개기 결제 의심
--- 파일 내용 끝 ---`
  },
  {
    id: 'new-vendor-agree-2026',
    name: 'New_Vendor_Agreement_Alpha_2026.pdf',
    type: 'PDF',
    size: '1.5MB',
    category: 'STP',
    content: `[NEXUS CORP. 공급업체 계약서 - 알파 솔루션 (2026)]\n\n계약 번호: NAS-2026-001\n발효일: 2026년 1월 1일\n\n본 계약은 넥서스 주식회사(이하 "갑")와 알파 솔루션 주식회사(이하 "을") 간의 소프트웨어 공급 및 유지보수에 관한 약정을 명시한다.\n\n제1조 (계약 목적 및 범위): 을은 갑에게 [AI 기반 데이터 분석 솔루션]을 공급하고 관련 유지보수 서비스를 제공한다.\n\n제2조 (계약 기간): 본 계약은 발효일로부터 1년간 유효하며, 만료 30일 전까지 서면 통보가 없을 시 자동으로 1년 연장된다. (자동 갱신 조항)\n\n제3조 (지급 조건): 갑은 을에게 월별 청구서에 따라 익월 25일까지 대금을 지급한다. 연체 시 연 12%의 지연 이자가 부과된다.\n\n제4조 (해지): 다음 각 호의 사유 발생 시 본 계약을 해지할 수 있다.\n1. 일방 당사자의 중대한 계약 위반.\n2. 해지 시, 상대방에게 60일 전 서면 통보해야 하며, 잔여 계약 기간에 대한 총 계약 금액의 50%를 위약금으로 지급한다. (높은 해지 위약금)\n\n제5조 (비밀 유지): 양 당사자는 본 계약과 관련하여 알게 된 일체의 정보를 외부에 누설해서는 안 된다.\n\n--- 파일 내용 끝 ---`
  },
  {
    id: 'latest-server-log',
    name: 'Latest_Server_Security_Logs.log',
    type: 'LOG',
    size: '8.1MB',
    category: 'SEC',
    content: `[2026-03-01 08:00:00] INFO: User 'sysadmin' logged in from 192.168.1.100 (Internal VPN).
[2026-03-01 09:15:23] WARNING: Multiple failed login attempts for 'guest' from 203.0.113.1 (External IP).
[2026-03-01 09:15:24] WARNING: Multiple failed login attempts for 'guest' from 203.0.113.1 (External IP).
[2026-03-01 09:15:25] ALERT: Failed login attempts threshold exceeded for 'guest'. IP 203.0.113.1 blocked for 1 hour.
[2026-03-01 10:00:00] INFO: User 'E1023 (김민준)' accessed 'Project_X_Documents.zip'.
[2026-03-01 10:05:30] WARNING: Large data transfer (500MB) from internal server to 'E1023 (김민준)' desktop.
[2026-03-01 11:30:00] INFO: Daily backup initiated.
[2026-03-02 03:00:00] ERROR: Unauthorized access attempt to /etc/passwd from 172.16.0.50 (Internal Server).
[2026-03-02 03:00:01] CRITICAL: Security breach detected on Internal Server. Investigate user 'unknown_root'.
--- 파일 내용 끝 ---`
  }
];
