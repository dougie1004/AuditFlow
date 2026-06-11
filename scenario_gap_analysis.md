# AuditFlow Scenario Gap Analysis (미구현 시나리오 간극 및 Critical Top 20 분석 보고서)

## ⚖️ 1. 미구현 사유 분류 통계 (Gap Classification Summary)

전체 164개 시나리오 중 미구현된 157개 시나리오에 대한 귀책 사유 분류 통계입니다.

* **A. Logic Missing**: 101개 (61.59%)
* **B. Data Model Missing**: 15개 (9.15%)
* **C. Partial Implementation**: 7개 (4.27%)
* **D. UI Only**: 0개 (0.00%)
* **E. Not Required Yet**: 41개 (25.00%)

## 🚀 2. 미구현 시나리오 중 Critical Top 20 데이터 요구사항 및 격차 분석

비즈니스 치명도(횡령, 자금유출, 재고조작, 허위매출, 분식회계)가 가장 높으며 차세대 우선 개발 대상인 **Critical Top 20 시나리오**의 필수 데이터 모델 분석 결과입니다.

### 🎯 [FF-01] Rapid Money Cycling (Ping-pong)
- **감사 도메인**: 자금
- **구현 난이도**: `Hard`
- **위험 징후 (Risk Description)**: 자금이 당사 계좌에서 인출된 후 24시간 내에 특수관계인이나 벤더를 거쳐 다시 입금되는 자금 세탁 흐름.
- **필수 데이터 원장 (Required Data Model)**: `Bank Transactions (은행 거래 원장), Counterparty Account (상대 계좌 소유주 매핑), Transfer Flow (송금 흐름).`
- **미구현 상세 원인 및 Gap**: 현재 전표 원장으로는 자금의 실질 은행 이동 내역을 추적할 수 없어 B. Data Model Missing으로 분류.

---

### 🎯 [FF-02] Lapping & Ledger Delay
- **감사 도메인**: 자금
- **구현 난이도**: `Hard`
- **위험 징후 (Risk Description)**: 은행 입금일과 전표 기입일 간의 2일 이상의 시간 격차를 이용해 자금 유출/횡령 사실을 지연 은폐하는 기법.
- **필수 데이터 원장 (Required Data Model)**: `Bank Transactions (은행 입금 로그), General Ledger (일반 전표 원장), Cash Receipt Logs (수금 로그).`
- **미구현 상세 원인 및 Gap**: 실제 입금 시점과 전표 승인 시점 간의 크로스 매칭 데이터가 없어 B. Data Model Missing으로 분류.

---

### 🎯 [FF-03] Registered Vendor Mismatch
- **감사 도메인**: 자금
- **구현 난이도**: `Medium`
- **위험 징후 (Risk Description)**: 회계 전표 상으로는 법인 거래처로 기재되어 있으나, 실제 자금의 은행 송금 수취인은 특정 임직원 개인 계좌인 유형.
- **필수 데이터 원장 (Required Data Model)**: `Bank Transactions (송금 데이터 수취인 계좌명), Vendor Master (거래처 마스터 정보), Employee Bank Accounts (임직원 계좌 목록).`
- **미구현 상세 원인 및 Gap**: 은행 이체 상세 내역의 수취인과 전표 거래처를 비교할 수 있는 은행 데이터 부재로 B. Data Model Missing.

---

### 🎯 [IN-01] Shrinkage Peak
- **감사 도메인**: 재고
- **구현 난이도**: `Hard`
- **위험 징후 (Risk Description)**: 특정 물류 센터나 매장에서 재고 감모율이 내부 임계치(2.5%)를 초과하여 비정상적으로 자산이 소실되는 리스크.
- **필수 데이터 원장 (Required Data Model)**: `Inventory Ledger (재고원장), Stock Movement (재고 이동 기록), Physical Count (실사 수량 데이터).`
- **미구현 상세 원인 및 Gap**: 재고 흐름 테이블 및 실사 데이터 세트 부재로 B. Data Model Missing.

---

### 🎯 [IN-05] Unauthorized Scrapping
- **감사 도메인**: 재고
- **구현 난이도**: `Hard`
- **위험 징후 (Risk Description)**: 정상적인 사용이 가능한 원자재나 부품을 결함이 없음에도 임의 폐기 처분(Scrap)하여 외부 유출 또는 횡령하는 유형.
- **필수 데이터 원장 (Required Data Model)**: `Physical Count, Scrap Log (폐기 이력 원장), BOM, SCM logs.`
- **미구현 상세 원인 및 Gap**: 폐기 이력 및 생산 연동 데이터 모델이 존재하지 않아 B. Data Model Missing.

---

### 🎯 [IN-10] BOM Discrepancy
- **감사 도메인**: 재고
- **구현 난이도**: `Very Hard`
- **위험 징후 (Risk Description)**: 생산 과정에서 투입된 원자재 수량이 표준 제품 구성비(BOM)와 불일치하며 원자재 재고가 고의 누출되는 현상.
- **필수 데이터 원장 (Required Data Model)**: `Production BOM (원자재 제품 매핑 정보), SCM Stock Movements (자재 투입 로그), Yield Reports (생산 실적 로그).`
- **미구현 상세 원인 및 Gap**: 생산 및 BOM 상세 데이터베이스 테이블 부재로 B. Data Model Missing.

---

### 🎯 [SA-01] Channel Stuffing
- **감사 도메인**: 매출
- **구현 난이도**: `Medium`
- **위험 징후 (Risk Description)**: 분기말 마지막 3일 동안 비정상적인 거래처 밀어내기 매출을 발생시켜 당기 실적을 조작하는 유형.
- **필수 데이터 원장 (Required Data Model)**: `Sales Invoice Ledger (매출 분개장), Shipping Documents (배송 증빙 로그), Tax Invoice Registry (국세청 세금계산서).`
- **미구현 상세 원인 및 Gap**: 배송 증빙 일자와 세금계산서 발행 시점을 크로스 매칭할 SCM 데이터 부족으로 D. UI Only.

---

### 🎯 [SA-02] Unusual Returns
- **감사 도메인**: 매출
- **구현 난이도**: `Medium`
- **위험 징후 (Risk Description)**: 분기말 매출 실적 조작 후 다음 분기초에 대규모로 매출 취소/반품 처리를 하여 매출을 취소하는 분식회계 기법.
- **필수 데이터 원장 (Required Data Model)**: `Sales Invoice Ledger, Credit Notes (반품 분개 원장), Return shipping logs (반품 입고 기록).`
- **미구현 상세 원인 및 Gap**: 반품 전표와 실제 물류 입고 데이터가 유기적으로 연계되지 않아 D. UI Only.

---

### 🎯 [SA-06] Circular Trading
- **감사 도메인**: 매출
- **구현 난이도**: `Hard`
- **위험 징후 (Risk Description)**: A-B-C-A 거래처 간 실질적인 경제적 가치 이동 없이 허위 거래 세금계산서만을 주고받아 매출 외형을 부풀리는 리스크.
- **필수 데이터 원장 (Required Data Model)**: `Sales Ledger (매출 분개 원장), Purchase Ledger (매입 분개 원장), Tax Invoice Loops (세금계산서 순환 체인).`
- **미구현 상세 원인 및 Gap**: 거래 네트워크를 그릴 수 있는 세금계산서 원장 데이터 모델 부재로 D. UI Only.

---

### 🎯 [PR-01] Bid-rigging
- **감사 도메인**: 구매
- **구현 난이도**: `Medium`
- **위험 징후 (Risk Description)**: 입찰 시 특정 업체들이 담합하여 유사한 제안서 패턴이나 동일한 IP/기기정보를 통해 허위 경쟁을 유발하고 부당 낙찰받는 행위.
- **필수 데이터 원장 (Required Data Model)**: `Bid Logs (입찰 제안 정보 로그), Supplier IP Addresses (입찰 제출 IP), Proposal Hashes (제안서 파일 해시).`
- **미구현 상세 원인 및 Gap**: 입찰 시스템 로그 연동 불가로 D. UI Only.

---

### 🎯 [PR-03] Market Price Gap
- **감사 도메인**: 구매
- **구현 난이도**: `Medium`
- **위험 징후 (Risk Description)**: 시장 표준 단가보다 현저히 높은 가격으로 특정 벤더로부터 구매하여 구매 담당자의 리베이트/배임을 유발하는 리스크.
- **필수 데이터 원장 (Required Data Model)**: `Purchase Ledger (매입 원장), Market Benchmark Prices (시장 기준 단가표), Related Party Registry (특수관계인 여부).`
- **미구현 상세 원인 및 Gap**: 벤더 단가 비교 및 외부 표준 마켓 벤치마크 데이터베이스 모델 부족으로 D. UI Only.

---

### 🎯 [PR-06] Zombie Vendor Payments
- **감사 도메인**: 구매
- **구현 난이도**: `Medium`
- **위험 징후 (Risk Description)**: 국세청에 등록되지 않았거나 이미 폐업/휴업 상태인 유령 거래처(Ghost/Zombie)로 허위 외주 용역비를 송금하는 리스크.
- **필수 데이터 원장 (Required Data Model)**: `Purchase Ledger (매입 원장), NTS Business Status (국세청 휴폐업 상태 API 연동 데이터), Vendor Master.`
- **미구현 상세 원인 및 Gap**: 국세청 사업자 상태 마스터 테이블 부재로 D. UI Only.

---

### 🎯 [HR-01] Ghost Payroll Entry
- **감사 도메인**: 인사
- **구현 난이도**: `Medium`
- **위험 징후 (Risk Description)**: 퇴사한 직원이나 실제 근무하지 않는 허위 가공 인물(Ghost)을 인사 데이터에 등록해 급여를 불법 횡령하는 유형.
- **필수 데이터 원장 (Required Data Model)**: `Payroll Ledger (급여 대장), Employee Master (인사 마스터 원장), Badge Access Logs (출퇴근 태깅 기록).`
- **미구현 상세 원인 및 Gap**: 출퇴근 태깅 로그 및 실질 근무 증빙 데이터 모델 부재로 D. UI Only.

---

### 🎯 [HR-04] Severance Manipulation
- **감사 도메인**: 인사
- **구현 난이도**: `Medium`
- **위험 징후 (Risk Description)**: 임의로 입사 일자를 소급하여 적용하거나 평균 급여를 왜곡 조작하여 과도한 퇴직금을 편법으로 수령/배임하는 행위.
- **필수 데이터 원장 (Required Data Model)**: `Payroll Ledger, HR Employment Contracts (근로 계약 정보), Severance Logs (퇴직금 계산 대장).`
- **미구현 상세 원인 및 Gap**: 근로 계약 기간 검증 및 퇴직 계산 대장 부재로 D. UI Only.

---

### 🎯 [HR-07] Unauthorized Pay Raise
- **감사 도메인**: 인사
- **구현 난이도**: `Hard`
- **위험 징후 (Risk Description)**: 인사 담당자가 결재 프로세스를 우회하여 승인 없이 직원의 기본급이나 수당 테이블을 임의로 상향 조정하는 리스크.
- **필수 데이터 원장 (Required Data Model)**: `HR Salary Table (급여 급호표), System Update Logs (인사 시스템 변경 로그), LOA Approval Logs (전결 권한 로그).`
- **미구현 상세 원인 및 Gap**: 전결 결재 로그 및 인사 시스템 감사 로그 테이블 부재로 D. UI Only.

---

### 🎯 [FA-01] Inter-office Suspense
- **감사 도메인**: 재무
- **구현 난이도**: `Medium`
- **위험 징후 (Risk Description)**: 정산되지 않은 가지급금이나 가수금 등 임시 대기 계정을 90일 이상 미결산 상태로 방치하여 자금 유출/횡령 사실을 은폐하는 행위.
- **필수 데이터 원장 (Required Data Model)**: `General Ledger (일반 전표 원장), Chart of Accounts (계정과목 코드 테이블), Suspense Aging Report (가지급금 연령분석표).`
- **미구현 상세 원인 및 Gap**: 임시 계정 결산 관리 및 연령분석 테이블 미보유로 A. Logic Missing.

---

### 🎯 [FA-02] Manual Journal Abuse
- **감사 도메인**: 재무
- **구현 난이도**: `Medium`
- **위험 징후 (Risk Description)**: 정규 업무 시간 외(심야, 주말) 또는 접근 권한이 없는 비인가자가 수동으로 일반 전표 분개를 입력하는 행위.
- **필수 데이터 원장 (Required Data Model)**: `General Ledger, System Audit Trails (시스템 접속 로그), User Access Logs (사용자 분개 권한 테이블).`
- **미구현 상세 원인 및 Gap**: 시스템 수동 분개 여부 필드 및 권한 통제 모델 부재로 A. Logic Missing.

---

### 🎯 [FA-04] Expense Under-accrual
- **감사 도메인**: 재무
- **구현 난이도**: `Medium`
- **위험 징후 (Risk Description)**: 영업이익을 인위적으로 증가시키기 위해 실제 발생한 비용의 일반 전표 입력을 다음 회계연도로 고의 지연시키는 분식회계.
- **필수 데이터 원장 (Required Data Model)**: `Purchase Ledger (매입 원장), Receiving Logs (GR - 자재 입고 로그), Accrued Expenses Ledger (미지급비용 대장).`
- **미구현 상세 원인 및 Gap**: 자재 입고 및 미지급 매칭 원장 부재로 D. UI Only.

---

### 🎯 [FA-10] Audit Trail Deletion
- **감사 도메인**: 재무
- **구현 난이도**: `Hard`
- **위험 징후 (Risk Description)**: 핵심 재무 테이블 및 전표 마스터 테이블의 이력 로그를 임의로 삭제하여 비인가 전표 변경 사실을 은폐하려는 행위.
- **필수 데이터 원장 (Required Data Model)**: `DB Audit Logs (데이터베이스 감사 로그), Database Access Credentials Log (DB 접근 자격 증명 로그).`
- **미구현 상세 원인 및 Gap**: DBMS 감사 로그 연동 아키텍처 부재로 D. UI Only.

---

### 🎯 [AB-02] PEP Shadow Hiring
- **감사 도메인**: 부패
- **구현 난이도**: `Medium`
- **위험 징후 (Risk Description)**: 정부 공직자나 주요 이해관계자의 친인척을 실체 없는 사외이사나 외부 자문위원으로 등록하고 고액의 허위 자문료를 지급하는 행위.
- **필수 데이터 원장 (Required Data Model)**: `PEP List (정치적 노출 인물 데이터베이스), Consultant Agreements (자문 계약 대장), General Ledger Expense Logs (자문료 지출 원장).`
- **미구현 상세 원인 및 Gap**: PEP 블랙리스트 및 외부 용역 계약 정보 원장 데이터 모델 부재로 D. UI Only.

---

## 🚧 3. 미구현 사유 정의 및 극복 방안 (Step 3)

### A. Logic Missing (탐지 알고리즘 부재)
- **기술적 해법**: 데이터는 전표 원장 등을 통해 이미 로드되어 있으므로, 백엔드 Rust 코드(`src-tauri/src/ledger_engine.rs`) 내부에 해당 전표의 임계치를 정밀 계산 및 비교하는 필터링 연산 루프를 추가 작성하여 즉시 탐지 가능 상태로 전환할 수 있습니다.

### B. Data Model Missing (필요 데이터 모델 부재)
- **기술적 해법**: 일반 전표(GL) 정보만으로는 자금 이동 관계와 재고 실물 흐름을 파악하기 불가능하므로, `audit_data_v4.db`에 은행 이체 거래 테이블(`bank_transactions`) 및 재고수불 테이블(`inventory_ledger`) DDL을 정의하고 이를 업로드할 수 있는 파이프라인 개발이 필수적으로 수반되어야 합니다.

### C. Partial Implementation (일부만 구현)
- **기술적 해법**: 7개 구현 완료 시나리오의 판정 정확성을 고도화하고, 감도 조율 매개변수와 어댑터 모듈의 코어 엔진 결합을 완료하여 성능을 안정화합니다.

### D. UI Only (시나리오 등록만 존재) & E. Not Required Yet (우선순위 보류)
- **기술적 해법**: 향후 프로젝트 로드맵 상에서 우선순위를 분류하여 가용한 영역(매출, 인사 등)부터 단계적으로 백엔드 엔진에 연산 모듈을 개발 및 추가합니다.
