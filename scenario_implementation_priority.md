# AuditFlow Scenario Implementation Priority & Roadmap

본 문서는 **164개 감사 시나리오**에 대한 데이터 획득 난이도, 비즈니스 중요도, 그리고 실제 백엔드 구현 난이도를 종합 고려하여 수립한 차세대 감사 엔진 개발 로드맵 및 우선순위 리포트입니다.

## 🎯 1. 우선순위 요약 (Priority Classification Summary)

현재 등록된 164개 시나리오의 로드맵 배치 및 우선순위 통계입니다.

* **P0 (Sprint 8 우선 구현 후보)**: 8개 (4.88%)
* **P1 (차순위 구현 대상 - 기존 연동 데이터 활용)**: 12개 (7.32%)
* **P2 (중기 로드맵 - 마스터 데이터 및 추가 원천 적재)**: 83개 (50.61%)
* **P3 (장기 로드맵 - ERP 연동 및 API 연계 필요)**: 19개 (11.59%)
* **HOLD (제품 범위 제외 또는 보류)**: 42개 (25.61%)

---

## 🚀 2. Sprint 8 우선 구현 대상 상세 분석 (P0 후보군)

Sprint 8에서 우선적으로 Rust 코어 엔진(`ledger_engine.rs`, `compliance_dd_flow.rs` 등)에 탐지 알고리즘을 설계하고 구현할 대상들입니다. 
데이터 획득 가능성 및 선행 작업 유무에 따라 **Sprint 8A (GL-only 즉시 구현)**와 **Sprint 8B (Master Data 선행 설계)** 두 그룹으로 분리하여 관리합니다.

### 2.1 Sprint 8A: GL-only 즉시 구현 후보 (7개)
이 시나리오들은 일반 전표(GL) 원장 데이터 구조 내에 존재하는 필드들(일자, 금액, 계정코드, 거래처, 적요 등)과 간단한 통계 계산 방식만으로 백엔드 판정 연산 루프를 추가하여 **즉시 구현이 가능**한 고부가가치 감사 항목들입니다.
법인카드 사용 상세 일시(주말/심야 실제 사용 시간대) 대조 데이터가 필수인 `EX-02` 등은 카드 승인 상세 데이터(Category C) 연동 필요로 인해 본 즉시 구현 대상에서 배제되었습니다.

#### 1. [FA-01] Inter-office Suspense
- **감사 영역 (Category)**: Finance/Accounting
- **데이터 요구 등급 (Data Class)**: A
- **등급 산정 근거**: GL 상의 임시 계정 코드, 일자, 적요, 수동 분개 구분값만으로 판단 가능
- **필수 데이터 필드**: `account_code, amount, event_date, clearance_status`
- **미구현 상세 사유**: 임시 계정(가지급금/가수금) 결산 연령 분석(90일 초과 방치) 탐지 로직 미구현
- **비즈니스 위험 및 징후**: Suspense accounts not cleared for > 90 days.
- **개발 권장 액션 (Recommended Action)**: 개발 계획 수립 및 Sprint 8 Rust 판정 로직 구현

---
#### 2. [FA-02] Manual Journal Abuse
- **감사 영역 (Category)**: Finance/Accounting
- **데이터 요구 등급 (Data Class)**: A
- **등급 산정 근거**: GL 상의 임시 계정 코드, 일자, 적요, 수동 분개 구분값만으로 판단 가능
- **필수 데이터 필드**: `account_code, amount, event_date, posting_time, is_manual_journal`
- **미구현 상세 사유**: 수동 분개 식별 필드 검증 및 비업무시간 수동 분개 탐지 로직 미구현
- **비즈니스 위험 및 징후**: Postings at 11 PM or by unauthorized users.
- **개발 권장 액션 (Recommended Action)**: 개발 계획 수립 및 Sprint 8 Rust 판정 로직 구현

---
#### 3. [FA-04] Expense Under-accrual
- **감사 영역 (Category)**: Finance/Accounting
- **데이터 요구 등급 (Data Class)**: A
- **등급 산정 근거**: GL 상의 임시 계정 코드, 일자, 적요, 수동 분개 구분값만으로 판단 가능
- **필수 데이터 필드**: `account_code, amount, event_date, description`
- **미구현 상세 사유**: 회계 기말 전후 전표 결산 컷오프(당기 비용 차기 이월) 검증 로직 미구현
- **비즈니스 위험 및 징후**: Delaying expense recognition to boost profit.
- **개발 권장 액션 (Recommended Action)**: 개발 계획 수립 및 Sprint 8 Rust 판정 로직 구현

---
#### 4. [LDG-03] 동일 금액 반복 발생 (Short Interval)
- **감사 영역 (Category)**: Ledger-Only
- **데이터 요구 등급 (Data Class)**: A
- **등급 산정 근거**: GL의 일자, 금액, 계정코드, 거래처 정보만을 비교 분석하여 판단 가능
- **필수 데이터 필드**: `amount, event_date, entity_id (vendor)`
- **미구현 상세 사유**: 탐지 알고리즘(동일 거래처/금액 단기 반복 발생 탐지 루프) 미구현
- **비즈니스 위험 및 징후**: 동일 거래처에 대해 동일 금액이 수일 내 반복 발생.
- **개발 권장 액션 (Recommended Action)**: 개발 계획 수립 및 Sprint 8 Rust 판정 로직 구현

---
#### 5. [LDG-04] 주말 / 공휴일 고액 전표
- **감사 영역 (Category)**: Ledger-Only
- **데이터 요구 등급 (Data Class)**: A
- **등급 산정 근거**: GL의 일자, 금액, 계정코드, 거래처 정보만을 비교 분석하여 판단 가능
- **필수 데이터 필드**: `amount, event_date`
- **미구현 상세 사유**: 탐지 알고리즘(주말/공휴일 고액 전표 필터 및 달력 연동) 미구현
- **비즈니스 위험 및 징후**: 비업무 시간대에 발생한 고액(500만원 이상) 전표.
- **개발 권장 액션 (Recommended Action)**: 개발 계획 수립 및 Sprint 8 Rust 판정 로직 구현

---
#### 6. [LDG-08] 승인 한도 경계선 거래 (Threshold Pattern)
- **감사 영역 (Category)**: Ledger-Only
- **데이터 요구 등급 (Data Class)**: A
- **등급 산정 근거**: GL의 일자, 금액, 계정코드, 거래처 정보만을 비교 분석하여 판단 가능
- **필수 데이터 필드**: `amount, event_date, account_code`
- **미구현 상세 사유**: 탐지 알고리즘(전결 권한 한도 직전 금액 경계선 거래 패턴 감지) 미구현
- **비즈니스 위험 및 징후**: 전결 한도(예: 300만, 500만) 직전 금액(예: 299만)의 다수 발생.
- **개발 권장 액션 (Recommended Action)**: 개발 계획 수립 및 Sprint 8 Rust 판정 로직 구현

---
#### 7. [LDG-10] 벤더 노출도 분석 (Vendor Concentration)
- **감사 영역 (Category)**: Ledger-Only
- **데이터 요구 등급 (Data Class)**: A
- **등급 산정 근거**: GL의 일자, 금액, 계정코드, 거래처 정보만을 비교 분석하여 판단 가능
- **필수 데이터 필드**: `amount, entity_id (vendor)`
- **미구현 상세 사유**: 탐지 알고리즘(특정 벤더 매입 집중도 HHI/CR1 계산 로직) 미구현
- **비즈니스 위험 및 징후**: 전체 매입 중 특정 소수 벤더에 대한 의존도 급증.
- **개발 권장 액션 (Recommended Action)**: 개발 계획 수립 및 Sprint 8 Rust 판정 로직 구현

---

### 2.2 Sprint 8B: Master Data 선행 설계 후 구현 후보 (1개)
이 시나리오는 실질적 감사 통제를 위해 내부 승인 거래처 화이트리스트 마스터 정보가 대조군으로 선행 설계되어야 작동 가능합니다. Sprint 8에서는 실제 탐지 엔진 코딩 이전에 데이터 구조 정의와 스키마 설계 단계를 선행 완료합니다.

#### 1. [PR-09] Unauthorized Vendor
- **감사 영역 (Category)**: Procurement
- **데이터 요구 등급 (Data Class)**: B
- **등급 산정 근거**: GL의 거래처 정보와 승인된 거래처 화이트리스트(Vendor Master) 간의 비교 매핑 필요
- **필수 데이터 필드**: `amount, entity_id (vendor), approved_vendor_list`
- **미구현 상세 사유**: 보조 데이터 모델(승인 거래처 마스터 - Approved Vendor List) 부재
- **비즈니스 위험 및 징후**: Buying from vendors not in the Approved Vendor List (AVL).
- **개발 권장 액션 (Recommended Action)**: 승인 거래처 마스터 업로드 데이터 모델 설계 및 UI 파이프라인 구축
- **[Vendor Master 최소 스키마 설계 (Minimum Schema Design)]**
  거래처 신뢰도를 평가하고 미승인 거래를 방어하기 위한 필수 마스터 데이터 모델 규격입니다.
  
  | 필드명 (Field Name) | 데이터 타입 (Data Type) | 널 허용 (Nullable) | 설명 (Description) |
  | :--- | :--- | :---: | :--- |
  | **vendor_id** | VARCHAR(50) / PK | N | 거래처 고유 관리 식별 코드 |
  | **vendor_name** | VARCHAR(100) | N | 공식 법인명 / 사업자 상호명 |
  | **business_registration_no** | VARCHAR(20) | N | 사업자등록번호 (국세청 검증용 규격) |
  | **approval_status** | VARCHAR(20) | N | 거래 허가 상태 (Approved / Pending / Rejected) |
  | **approved_date** | TIMESTAMP | Y | 거래 승인 최종 일자 |
  | **approved_by** | VARCHAR(50) | Y | 결재 최종 승인자 ID |
  | **risk_level** | VARCHAR(10) | N | 신용/거래처 위험 등급 (Low / Medium / High) |
  | **related_party_flag** | INTEGER (BOOLEAN) | N | 내부 임직원 특수관계인 해당 여부 (0: False / 1: True) |
  | **restricted_vendor_flag** | INTEGER (BOOLEAN) | N | 제한 업종/불건전 가맹점 여부 (0: False / 1: True) |
  | **active_flag** | INTEGER (BOOLEAN) | N | 현재 거래 활성화 상태 여부 (0: Inactive / 1: Active) |

---

## 📈 3. P1 (차순위 구현 대상 - 7개 기구현 룰 포함)
기구현 확인된 7개 룰과 함께, GL 기반으로 즉시 탐지가 가능하지만 우선순위가 차순위인 룰 목록입니다. 기구현 룰에 대해서는 지속적인 기능 고도화와 오탐율(False Positive) 제거 작업이 진행됩니다.

| Scenario ID | Scenario Name | Category | Status | Required Data Fields | Recommended Action |
| :--- | :--- | :--- | :---: | :--- | :--- |
| EX-04 | Luxury Item Purchase | EX Sector | Implemented | amount, event_date, vendor (entity_id), description | None (Monitor performance) |
| FA-06 | Asset Capitalization Bias | Finance/Accounting | Unimplemented | account_code, amount, description | 차기 스프린트 개발 대상 등록 및 탐지 알고리즘 설계 |
| FA-07 | Dividend Compliance | Finance/Accounting | Unimplemented | account_code, amount, event_date | 차기 스프린트 개발 대상 등록 및 탐지 알고리즘 설계 |
| FA-08 | Restricted Cash Leak | Finance/Accounting | Unimplemented | account_code, amount, event_date | 차기 스프린트 개발 대상 등록 및 탐지 알고리즘 설계 |
| FA-09 | Related Party Omission | Finance/Accounting | Unimplemented | account_code, amount, entity_id (vendor), description | 차기 스프린트 개발 대상 등록 및 탐지 알고리즘 설계 |
| FF-04 | Structured Threshold Monitor | Financial Integrity | Unimplemented | amount, event_date, entity_id (vendor) | 개발 계획 수립 및 Rust 판정 로직 구현 |
| LDG-01 | 고액 상위 1% 전표 리스트 | Ledger-Only | Implemented | amount, event_date, account_code, entity_id (vendor), description | None (Monitor performance) |
| LDG-02 | 라운드 금액 반복 패턴 | Ledger-Only | Implemented | amount, event_date, account_code, entity_id (vendor), description | None (Monitor performance) |
| LDG-05 | 계정 사용 액티비티 변동 (Account Volatility) | Ledger-Only | Implemented | amount, event_date, account_code, entity_id (vendor), description | None (Monitor performance) |
| LDG-06 | 특정 부서 집중 거래 (Departmental Outlier) | Ledger-Only | Implemented | amount, event_date, account_code, entity_id (vendor), dept | None (Monitor performance) |
| LDG-07 | 적요 키워드 위험 탐지 | Ledger-Only | Implemented | amount, event_date, account_code, entity_id (vendor), description | None (Monitor performance) |
| PR-02 | 품의 분할 (Split PO) | Procurement | Implemented | debit_amount, credit_amount, event_date, entity_id (vendor), description | None (Monitor performance) |

## 🛠️ 4. P2 (중기 로드맵 - 마스터 및 추가 원천 데이터 확보 대상)
보조 마스터 데이터(임직원 정보, Approved Vendor List 등)의 업로드 DDL 및 UI 인터페이스를 구축하거나, SCM 재고 수불부, 급여대장, 은행 원천 거래장 등 추가 원천 파일 업로드 기능이 선행되어야 작동 가능한 룰입니다.

| Scenario ID | Scenario Name | Category | Data Class | Required Data Fields | Recommended Action |
| :--- | :--- | :--- | :---: | :--- | :--- |
| AB-02 | Shadow Hiring | Anti-Bribery | B | consultant_agreements_text, pep_list_master, amount | 보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발 |
| AB-04 | Excessive Hospitality | Anti-Bribery | B | amount, attendees_count, travel_entertainment_policy_limits | 보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발 |
| AB-05 | Per Diem Abuse | Anti-Bribery | B | amount, employee_grade_travel_policy_limits | 보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발 |
| AB-06 | Third-Party High Commission | Anti-Bribery | B | amount, sales_agent_contract_commission_rate_master | 보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발 |
| AML-03 | Shell Company Invoice | AML | B | vendor_address_registry, company_website_whitelist | 보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발 |
| AML-07 | Jurisdiction High Risk | AML | B | entity_id (vendor), fatf_highrisk_country_blacklist | 보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발 |
| CC-01 | Merchant Category Fraud | Corp Card | C | amount, mcc_code_mapping_table, restricted_vendor_keywords | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| CC-02 | Personal Grocery Expense | Corp Card | C | amount, retailer_whitelist_blacklist, vendor_keywords | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| CC-03 | Cash Withdrawal | Corp Card | C | amount, event_date, description (cash_withdrawal_mcc) | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| CC-04 | Insurance/Tax Mix | Corp Card | C | amount, employee_personal_data, chart_of_accounts | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| CC-05 | Third-party Delivery | Corp Card | C | amount, employee_home_address_list, corporate_office_addresses | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| CC-06 | Recurring Unvouched | Corp Card | C | card_receipt_upload_logs, amount, event_date | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| CC-07 | Flight Class Violation | Corp Card | C | amount, employee_grade_master, travel_policy_limits | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| CC-08 | Hotel Spoilage | Corp Card | C | amount, hotel_invoice_detail_parser, card_itemization_rules | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| CC-09 | Gift Card Laundering | Corp Card | C | amount, vendor_classification_master, giftcard_vendor_keywords | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| CL-01 | FCPA - Success Fee | Compliance/Legal | B | amount, country_risk_master | 보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발 |
| CL-04 | Sanctions Hit | Compliance/Legal | B | entity_id (vendor), ofac_un_sanction_lists_master | 보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발 |
| CL-07 | Antitrust Meeting | Compliance/Legal | B | amount, competitor_name_list_master | 보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발 |
| EX-01 | Spilling Receipt | Expense/Travel | C | amount, event_timestamp, card_number, vendor | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| EX-02 | Weekend/Night Usage | Expense/Travel | C | amount, event_date, event_time | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| EX-03 | Remote Area Travel | Expense/Travel | C | amount, event_date, vendor_location, employee_office_location | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| EX-05 | Duplicate Airfare | EX Sector | C | flight_booking_details, reimbursement_claims_ledger, card_transactions | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| EX-06 | Mileage Personal Gain | EX Sector | C | airline_travel_logs, corporate_mileage_statements, employee_id | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| EX-07 | No-show Refund Fraud | EX Sector | C | travel_agency_refund_notices, card_refund_credits, booking_id | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| EX-08 | Hidden Entertainment | EX Sector | C | amount, account_code, description, department_budget_policy | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| EX-09 | Commuter Fuel Abuse | EX Sector | C | fuel_card_receipts, vehicle_gps_logs, odometer_readings | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| EX-10 | Subscription Shadow IT | EX Sector | C | amount, vendor (entity_id), approved_software_list | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| FA-03 | FX Gain Shifting | Finance/Accounting | B | amount, account_code, fx_rate_table, intercompany_policy | 보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발 |
| FA-05 | Tax Refund Leakage | Finance/Accounting | B | amount, account_code, vat_refund_mapping_table | 보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발 |
| FF-01 | Rapid Money Cycling (Ping-pong) | Financial Integrity | C | bank_transaction_logs, counterparty_account_owner_mapping, transfer_flow | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| FF-02 | Lapping & Ledger Delay | Financial Integrity | C | bank_inflow_outflow_logs, general_ledger_booking_dates, cash_receipt_logs | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| FF-03 | Registered Vendor Mismatch | Financial Integrity | C | bank_transaction_recipient_names, vendor_master_bank_details, employee_bank_accounts | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| FF-05 | Inactive Project Account Drain | Financial Integrity | C | project_accounting_ledger, bank_statements, amount | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| HR-01 | Ghost Payroll Entry | HR/Payroll | C | payroll_ledger, employee_master, time_attendance_badge_logs | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| HR-02 | Overtime Fraud | HR/Payroll | C | overtime_claims_ledger, time_attendance_badge_logs | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| HR-04 | Severance Manipulation | HR/Payroll | C | payroll_ledger, employment_contracts, severance_calc_sheets | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| HR-05 | Ghost Training | HR/Payroll | C | training_expense_ledger, training_attendance_lists, certificates_registry | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| HR-07 | Unauthorized Pay Raise | HR/Payroll | C | hr_salary_table_logs, system_update_logs, loa_approval_logs | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| IN-01 | Shrinkage Peak | Inventory | C | inventory_ledger, stock_movement_logs, physical_count_sheets | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| IN-02 | Phantom Inventory | Inventory | C | inventory_ledger, physical_count_sheets | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| IN-03 | Obsolete Stock Concealment | Inventory | C | inventory_aging_report, stock_movement_logs | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| IN-04 | Inventory Cycle Abuse | Inventory | C | inventory_cycle_count_logs, physical_count_sheets | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| IN-05 | Unauthorized Scrapping | Inventory | C | scrap_logs, physical_count_sheets, scrapped_items_specs | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| IN-06 | Valuation Skew | Inventory | C | inventory_valuation_ledger, unit_cost_calculation_sheets | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| IN-07 | Loading Dock Weakness | Inventory | C | scm_gate_pass_logs, scm_shipping_logs | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| IN-08 | Inter-company Transfer Loop | Inventory | C | inventory_stock_movement_transfer_logs | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| IN-09 | Sample Asset Leakage | Inventory | C | sample_asset_tracking_logs | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| IN-10 | BOM Discrepancy | Inventory | C | production_bom_master, scm_stock_movements, production_yield_reports | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| LDG-09 | 신규 원장/거래처 급증 (New Vendor Spike) | Ledger-Only | B | amount, event_date, entity_id (vendor), vendor_registration_date | 거래처 마스터 업로드 데이터 모델 설계 및 UI 파이프라인 구축 |
| PC-01 | 입찰 로테이션 (Bid Rotation) | Supply Chain | C | bid_logs_rfq_submissions_history | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| PC-02 | 유령 입찰 (Phantom Bids) | Supply Chain | C | bid_proposal_files, bid_logs_registry | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| PC-03 | 설계 변경 남용 (Change Order) | Supply Chain | C | change_order_logs, contract_variations_history | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| PC-05 | Inventory Parking | Supply Chain | C | supplier_inventory_reports, scm_stock_movement_logs | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| PC-06 | Product Substitution | Supply Chain | C | receiving_quality_control_logs, purchase_specifications | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| PC-08 | Emergency Purchase Loop | Supply Chain | C | rfq_logs, emergency_purchase_approvals_history | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| PQ-01 | Yield Manipulation | Production/Quality | C | production_yield_reports, scrap_records | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| PQ-02 | Defect Concealment | Production/Quality | C | shipping_records, qa_defect_logs | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| PQ-03 | Maintenance Log Fraud | Production/Quality | C | maintenance_logs, technician_badge_attendance_logs | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| PQ-04 | Energy Usage Spike | Production/Quality | C | utility_bills, smart_meter_logs, production_output_volume | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| PQ-05 | Non-spec Material Use | Production/Quality | C | production_spec_logs, bom_master | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| PQ-06 | Safety Incident Omission | Production/Quality | C | insurance_claims_records, internal_incident_logs | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| PQ-07 | QA Stamp Override | Production/Quality | C | lims_system_audit_logs, qa_result_db_updates | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| PQ-08 | Excessive Down-time | Production/Quality | C | machine_downtime_logs, production_run_logs | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| PQ-09 | Subcontractor Over-usage | Production/Quality | C | subcontractor_work_logs, outsourced_timesheets | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| PQ-10 | Storage Condition Breach | Production/Quality | C | warehouse_temperature_sensor_logs, humidity_sensor_logs | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| PR-01 | 담합 의심 (Bid-rigging) | Procurement | C | bid_proposal_hashes, rfq_portal_access_logs, vendor_ip_addresses | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| PR-03 | 시장가 격차 (Market Price Gap) | Procurement | C | purchase_items_catalog, external_market_benchmark_prices, amount | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| PR-04 | Conflict of Interest | Procurement | B | entity_id (vendor), vendor_address, employee_address_master, relatives_registry | 보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발 |
| PR-05 | Sole Source Overreliance | Procurement | B | entity_id (vendor), approved_vendor_list, sole_source_justification_log | 보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발 |
| PR-06 | Zombie Vendor Payments | Procurement | D | entity_id (vendor), nts_business_status_api, vendor_master | 국세청 사업자 등록 상태 조회 외부 API 연동 기능 개발 |
| PR-07 | Kickback Signal | Procurement | B | entity_id (vendor), approved_vendor_list, kickback_vendor_watch_list | 보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발 |
| PR-08 | Contract Variation Abuse | Procurement | C | purchase_order_history, contract_variation_agreement_docs | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| PR-10 | Advance Payment Non-performance | Procurement | C | project_milestone_reports, project_progress_logs, advance_payments_ledger | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| RV-10 | Related Party Pricing | Revenue/Accounting | B | amount, account_code, related_party_registry | 보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발 |
| SA-01 | Channel Stuffing | Sales/AR | C | shipping_documents_delivery_dates, sales_invoices, amount | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| SA-02 | Unusual Returns | Sales/AR | C | credit_notes_ledger, return_shipping_logs, amount | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| SA-03 | Credit Limit Override | Sales/AR | C | credit_approval_logs, credit_limit_master, sales_invoices | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| SA-04 | AR Aging Manipulation | Sales/AR | C | accounts_receivable_ledger_aging, cash_receipt_allocation_logs | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| SA-05 | Unauthorized Discounts | Sales/AR | C | billing_adjustment_logs, sales_orders_approval_history | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| SA-06 | Circular Trading | Sales/AR | D | sales_ledger, purchase_ledger, tax_invoice_registry_loops | 국세청 세금계산서 데이터 일괄 연동 모듈 설계 |
| SA-07 | Revenue Cut-off Error | Sales/AR | C | shipping_documents, sales_invoice_dates | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| SA-08 | Duplicate Sales Recognition | Sales/AR | C | shipping_documents, sales_invoice_sku_tracking | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| SA-10 | Rebate Overcalculation | Sales/AR | C | customer_sales_contracts, rebate_claims_logs, amount | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |

## 🔗 5. P3 (장기 로드맵 - 외부 시스템 API 및 ERP 연동 대상)
실시간 국세청 휴폐업 조회 API, 은행 계좌 실시간 스크래핑 연동, ERP 변경 이력 감사 로그 연동 등 인프라 시스템 연계가 필수적인 장기 검토 대상입니다.

| Scenario ID | Scenario Name | Category | Data Class | Required Data Fields | Recommended Action |
| :--- | :--- | :--- | :---: | :--- | :--- |
| AB-03 | Charitable Conduit | Anti-Bribery | B | amount, related_parties_master, charity_representatives_registry | 보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발 |
| AB-07 | Political Contribution Masking | Anti-Bribery | B | amount, sponsorship_policy_master, political_contributions_rules | 보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발 |
| CC-10 | Ghost Merchant | Corp Card | D | vendor_business_license_registry, nts_business_status_api, amount | 국세청 사업자 상태 조회 외부 API 연동 기능 개발 |
| CL-10 | Permit Expiry | Compliance/Legal | D | business_license_expiry_dates, government_permit_registry_api | 인허가 관리 외부 시스템 연계 개발 |
| FA-10 | Audit Trail Deletion | Finance/Accounting | D | db_audit_logs, database_access_credentials_log | 시스템 감사 로그(Syslog/SIEM) API 연동 아키텍처 수립 및 연계 모듈 개발 |
| HR-03 | Benefit Scoping | HR/Payroll | C | payroll_ledger, benefit_eligibility_rules | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| HR-06 | Duplicate Benefit Payout | HR/Payroll | C | payroll_ledger, bonus_payment_register | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| HR-08 | Expat Housing Abuse | HR/Payroll | C | expat_housing_contracts, rental_payments_ledger | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| HR-09 | Family Hiring Proxy | HR/Payroll | C | employee_relatives_disclosure, payroll_ledger | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| IT-01 | Access Privilege Escalation | IT/Security | D | iam_privilege_logs, active_directory_api, system_audit_trails | IT/인프라 보안 시스템 API 연동 아키텍처 수립 및 연계 모듈 개발 |
| IT-04 | Ghost Access | IT/Security | D | iam_active_accounts, hr_employee_active_list_api | IT/인프라 보안 시스템 API 연동 아키텍처 수립 및 연계 모듈 개발 |
| IT-05 | VPN Access Anomaly | IT/Security | D | firewall_vpn_logs_api, ip_geolocation_database | IT/인프라 보안 시스템 API 연동 아키텍처 수립 및 연계 모듈 개발 |
| IT-07 | System Log Inactivity | IT/Security | D | siem_security_logs_api, critical_db_syslog_streams | IT/인프라 보안 시스템 API 연동 아키텍처 수립 및 연계 모듈 개발 |
| IT-10 | Dev/Ops SoD Violation | IT/Security | D | github_gitlab_repository_api, cicd_deployment_access_logs_api | IT/인프라 보안 시스템 API 연동 아키텍처 수립 및 연계 모듈 개발 |
| RV-01 | Bill and Hold Scheme | Revenue/Accounting | C | shipping_logs, sales_invoices | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| RV-04 | Percentage of Completion Abuse | Revenue/Accounting | C | project_milestone_completion_reports, engineering_specs | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| RV-06 | Consignment as Sales | Revenue/Accounting | C | consignment_inventories_ledger, distributor_sales_reports | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| RV-07 | Premature Recognition | Revenue/Accounting | C | installation_acceptance_certificates | 추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발 |
| SA-09 | Customer Master Fraud | Sales/AR | D | customer_master_change_logs, sales_ledger | ERP 변경 감사 로그(System Audit Log) 연동 |

## 🛑 6. HOLD (현재 제품 범위 외 - 보류 대상)
데이터 확보 난이도가 매우 높거나(예: 다크웹 모니터링, Ransomware Beacons, Rootkit 탐지 등 보안 도메인), 노동법/세무법/ESG 감사 등 정성적 컴플라이언스 및 법적 판단이 수반되는 영역으로, 현 AuditFlow의 GL 기반 비즈니스 감사 엔진 범위에서 제외됩니다.

| Scenario ID | Scenario Name | Category | Data Class | Required Data Fields | Reason for Hold |
| :--- | :--- | :--- | :---: | :--- | :--- |
| AB-01 | Facilitation Payment | Anti-Bribery | E | expedite_service_invoices_text, customs_broker_contracts | 해외 공무원 대상 소액 급행료(Facilitation Payment) 판별을 위한 주관적 법률 검토 영역 |
| AB-08 | Off-book Account | Anti-Bribery | E | petty_cash_receipts, cash_box_reconciliations | 소액 현금 금고 장부 실물 대조 및 현장 부조리 감사를 위한 오프라인 실사 영역 |
| AB-09 | Success Fee Anomaly | Anti-Bribery | E | contract_compliance_performance_reports | 계약 즉시 지급된 수수료의 비즈니스 타당성에 대한 정성적 법률 검증 영역 |
| AB-10 | Training Trip Junket | Anti-Bribery | E | travel_itinerary_details_text, official_meeting_agendas | 공무원 출장 지원 비용의 비즈니스 연관성에 대한 컴플라이언스 정성 판단 영역 |
| AML-01 | Structuring (Smurfing) | AML | E | cash_deposit_records, atm_transaction_logs | 자금세탁 쪼개기(Structuring) 탐지를 위한 금융권 수준의 창구 거래 및 현금 집행 추적 범위 이탈 |
| AML-02 | Trade-Based Laundering | AML | E | international_customs_cargo_invoices, shipping_freight_docs | 무역 기반 자금세탁(TBML) 검증을 위한 해외 세관 인보이스 및 선하증권 실물 대조 불가 |
| AML-04 | Flow-Through Account | AML | E | bank_remittance_flows_realtime | 통과 계좌(Pass-through) 실시간 잔액 감시 및 송수금 홀딩을 위한 은행 코어 시스템 연동 불가 |
| AML-05 | Early Repayment Anomaly | AML | E | loan_ledger, creditor_relationship_profiles | 사채/차입금 상환 자금의 실질 원천 추적을 위한 금융 정보 접근 불가 및 정성 분석 영역 |
| AML-06 | Third-Party Payer | AML | E | customer_vendor_bank_remittance_names | 제3자 대위변제 식별을 위한 송금 수취 대행사 계약 실물 정보 부재 |
| AML-08 | Integration Signal | AML | E | luxury_asset_valuation_records, real_estate_escrow_flows | 부동산/미술품 등 실물 자산 통합을 통한 자금세탁 감지 범위 이탈 |
| AML-09 | Layering Pattern | AML | E | subsidiary_intercompany_transfers_forensic | 계열사 간 복잡한 다단계 자금 세탁 구조에 대한 정밀 포렌식 감사 영역 |
| AML-10 | Dark Web Interaction | AML | E | cryptocurrency_wallet_addresses, threat_intelligence_feeds | 다크웹 거래 및 가상자산 지갑 주소 추적을 위한 외부 블록체인 인텔리전스 인프라 부재 |
| CL-02 | GDPR PII Leak | Compliance/Legal | E | shared_drives_dlp_scan_logs | 비정형 데이터 드라이브 내 개인정보 누출(DLP) 검색 범위 이탈 |
| CL-03 | AML - Round-tripping | Compliance/Legal | E | general_ledger_remittance_loops_forensic | 비즈니스 타당성 없는 자금 순환 거래에 대한 정성적 포렌식 감사 영역 |
| CL-05 | Whistleblower Retaliation | Compliance/Legal | E | hr_performance_reviews_qualitative, whistleblower_reports | 내부 고발자에 대한 인사 불이익 조치 판별을 위한 주관적 인사/노무 판단 영역 |
| CL-06 | Export Control Breach | Compliance/Legal | E | customs_declaration_logs, export_control_classification_numbers | 수출 규제 품목 분류 및 국가별 세관 통관 내역 대조 범위 이탈 |
| CL-08 | Insider Trading Signal | Compliance/Legal | E | executives_personal_stock_trades, inside_information_timelines | 임직원 개인 주식 거래 내역 및 미공개 정보 취급 대장 연동 불가능 |
| CL-09 | SOX Control Failure | Compliance/Legal | E | sox_control_testing_sheets_qualitative | SOX 내부통제 설계/운영 효과성 평가에 대한 외부 회계사의 정성 테스트 영역 |
| ES-01 | Greenwashing - Carbon | ESG | E | carbon_offset_certificate_metadata | 탄소배출권 인증서 진위 여부 및 이중 사용 방지 정성 평가 범위 이탈 |
| ES-02 | Conflict Minerals | ESG | E | conflict_minerals_supply_chain_tracing_records | 분쟁 광물(3TG) 공급망 추적 보고서 분석 및 현지 실사 감사 영역 |
| ES-03 | Child Labor Indicator | ESG | E | factory_labor_audit_reports | 공장 근로 아동 실태 조사 보고서 정성 분석 범위 이탈 |
| ES-04 | Toxic Waste Dumping | ESG | E | toxic_waste_disposal_invoices, production_mass_balance_reports | 환경 오염 물질 배출량 실측 및 폐기 명세 대조 정성 감사 범위 이탈 |
| ES-05 | Diversity Quota Fraud | ESG | E | contractor_labor_status_audit_sheets | 도급 인력의 상근 상태 및 인사 분류 정성 감사 범위 이탈 |
| ES-06 | Safety Accident Cover-up | ESG | E | petty_cash_receipts_medical_expense, lost_time_injury_logs | 사고 은폐 방지를 위한 오프라인 재해 현장 대조 및 사내 소액현금 수기 검토 영역 |
| HR-10 | Dossier Access Abuse | HR/Payroll | E | iam_dossier_access_logs, employee_id | 인사 시스템의 개인 정보 접근 상세 감사 로그 수집 범위 이탈 |
| IT-02 | Shadow IT Usage | IT/Security | E | network_casb_logs, dns_queries_log | 사내 비승인 SaaS 사용량 모니터링을 위한 CASB/DNS 로그 수집 불가 |
| IT-03 | Data Exfiltration Signal | IT/Security | E | dlp_agent_logs, usb_storage_logs, email_attachment_logs | 임직원 대량 다운로드 감지를 위한 정보유출방지(DLP) 시스템 로그 수집 불가 |
| IT-06 | Backup Non-compliance | IT/Security | E | backup_system_restore_logs, backup_agent_configs | 백업 복구 테스트 주기 통제를 위한 백업 솔루션 데이터 획득 불가 |
| IT-08 | Unpatched Vulnerability | IT/Security | E | security_vulnerability_scanner_logs, patch_management_logs | 취약점 스캐너 및 패치 관리 솔루션 데이터 수집 불가 |
| IT-09 | Shared Account Usage | IT/Security | E | identity_monitoring_logs, multi_factor_authentication_logs | 계정 동시 다발 접속 감지를 위한 인증 관리자 상세 데이터 획득 불가 |
| ITX-01 | Rootkit Signal | IT Security | E | system_binary_file_metadata, endpoint_file_integrity_logs | OS 시스템 실행 파일 변조 여부(Rootkit) 감지를 위한 보안 로그 데이터 획득 불가능 |
| ITX-02 | Unauthorized Port Forwarding | IT Security | E | network_traffic_analysis_logs, packet_capture_files | 네트워크 프록시 및 비인가 포트 포워딩 감지를 위한 원천 네트워크 로그 수집 불가 |
| ITX-03 | API Key Leakage | IT Security | E | source_code_repository_logs, git_commit_diffs | 코드 리포지토리(GitHub 등) 소스코드 스캐닝 및 API 키 누출 탐지 데이터 범위 이탈 |
| ITX-04 | Log Wiping | IT Security | E | system_event_logs_1102, security_event_log_cleared_events | 윈도우 이벤트 로그 삭제(EventID 1102) 감지를 위한 OS 감사 로그 수집 불가 |
| ITX-05 | Ransomware Precursor | IT Security | E | edr_agent_logs, endpoint_process_monitoring_logs, network_beacon_signals | 랜섬웨어 침투 전조(PsExec/CobaltStrike) 감지를 위한 호스트 보안 프로세스 로그 획득 불가 |
| PC-04 | Exclusive Distributor Mockery | Supply Chain | E | sole_source_justification_letters_text | 단일 수의계약 정당성 평가 서신에 대한 비정형 텍스트 유사도 정성 평가 영역 |
| PC-07 | Kickback - Consultant | Supply Chain | E | procurement_employee_relatives_master, consulting_company_ownership_registry | 구매 담당자와 사외 자문 업체 간의 리베이트를 추적하기 위한 정밀 법률 조사/forensic 영역 |
| RV-02 | Side Letter Agreement | Revenue/Accounting | E | sales_contracts_text, side_letter_agreements_database | 계약 서신 내 수기로 작성된 이면 합의 조항(반품권 등)에 대한 정성적 비정형 법률 검증 영역 |
| RV-03 | Round Tripping | Revenue/Accounting | E | sales_ledger, purchase_ledger, remittance_loops_forensic | 특수관계자 간 실질적 경제 가치 없는 세금계산서 순환 흐름에 대한 정밀 포렌식 감사 영역 |
| RV-05 | Cookie Jar Reserves | Revenue/Accounting | E | cookie_jar_provisions_analysis, historical_accruals_judgment | 충당부채 설정액의 과대/과소 계상에 대한 회계 법인 수준의 회계 추정 적정성 정성 판단 영역 |
| RV-08 | Gross vs Net Presentation | Revenue/Accounting | E | principal_vs_agent_contracts_review | 총액 매출 vs 순액 매출 표시에 대한 실질 지배력 판단(회계 기준 검토) 정성 분석 영역 |
| RV-09 | Barter Transaction | Revenue/Accounting | E | non_monetary_barter_agreements_valuation | 이종 자산 간 교환 거래의 공정가치 평가에 대한 세무/감정평가 영역 |
