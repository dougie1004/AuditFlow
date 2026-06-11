# AuditFlow 164개 시나리오 전수 실사 및 테스트 가능성 평가 보고서 (2차 검증)

> [!IMPORTANT]
> **실사 성격 규정 및 승인용 증적 공시 (Disclaimer & Evidence)**
> 본 실사 결과는 실제 백엔드 소스코드 분석(`src-tauri/src/`) 및 애플리케이션 데이터베이스 조회를 바탕으로 도출되었습니다. AuditFlow의 시나리오 등록 데이터(164개)와 실제 판정 엔진에 탑재되어 실행/검증되는 로직(7개) 간의 격차를 공식 증적하고, 7개 활성 시나리오에 대해 구체적인 파일 및 함수 수준의 증적을 제시합니다.

## 🛠️ 1. 구현 완료 7개 시나리오 코드 및 실행 증적 (Evidence)

### [PR-02] src-tauri/src/flux_engine.rs
- **시나리오 ID**: PR-02
- **파일명 (File)**: `src-tauri/src/flux_engine.rs`
- **함수명 (Function)**: `FluxEngine::run_correlations()`
- **입력 데이터 (Input)**: `deers_procurement.csv (EUC-KR)`
- **출력 결과 (Output)**: 2 relations (SPLIT_PAYMENT, strength: 0.85)
- **회귀테스트 여부 (Regression)**: `PASS (regression_baseline_v2.json)`

---

### [EX-04] src-tauri/src/compliance_dd_flow.rs
- **시나리오 ID**: EX-04
- **파일명 (File)**: `src-tauri/src/compliance_dd_flow.rs`
- **함수명 (Function)**: `run_compliance_check_flow()`
- **입력 데이터 (Input)**: `golden_expense.csv (UTF-8)`
- **출력 결과 (Output)**: 2 findings (제한 업종 직접 감지, Critical)
- **회귀테스트 여부 (Regression)**: `PASS (regression_baseline_v2.json)`

---

### [LDG-01] src-tauri/src/ledger_engine.rs
- **시나리오 ID**: LDG-01
- **파일명 (File)**: `src-tauri/src/ledger_engine.rs`
- **함수명 (Function)**: `run_ledger_only_scan()`
- **입력 데이터 (Input)**: `deers_ledger.csv (EUC-KR)`
- **출력 결과 (Output)**: 2 findings ([LDG-01] 고액 상위 1% 전표, High)
- **회귀테스트 여부 (Regression)**: `PASS (regression_baseline_v2.json)`

---

### [LDG-02] src-tauri/src/ledger_engine.rs
- **시나리오 ID**: LDG-02
- **파일명 (File)**: `src-tauri/src/ledger_engine.rs`
- **함수명 (Function)**: `run_ledger_only_scan()`
- **입력 데이터 (Input)**: `deers_ledger.csv (EUC-KR)`
- **출력 결과 (Output)**: 2 findings ([LDG-02] 라운드 금액 반복 패턴, Medium)
- **회귀테스트 여부 (Regression)**: `PASS (regression_baseline_v2.json)`

---

### [LDG-05] src-tauri/src/ledger_engine.rs
- **시나리오 ID**: LDG-05
- **파일명 (File)**: `src-tauri/src/ledger_engine.rs`
- **함수명 (Function)**: `run_ledger_only_scan()`
- **입력 데이터 (Input)**: `deers_ledger.csv (EUC-KR)`
- **출력 결과 (Output)**: 2 findings ([LDG-05] 계정 사용 액티비티 변동, Medium)
- **회귀테스트 여부 (Regression)**: `PASS (regression_baseline_v2.json)`

---

### [LDG-06] src-tauri/src/ledger_engine.rs
- **시나리오 ID**: LDG-06
- **파일명 (File)**: `src-tauri/src/ledger_engine.rs`
- **함수명 (Function)**: `run_ledger_only_scan()`
- **입력 데이터 (Input)**: `deers_ledger.csv (EUC-KR)`
- **출력 결과 (Output)**: 2 findings ([LDG-06] 특정 부서 집중 거래, Medium)
- **회귀테스트 여부 (Regression)**: `PASS (regression_baseline_v2.json)`

---

### [LDG-07] src-tauri/src/ledger_engine.rs
- **시나리오 ID**: LDG-07
- **파일명 (File)**: `src-tauri/src/ledger_engine.rs`
- **함수명 (Function)**: `run_ledger_only_scan()`
- **입력 데이터 (Input)**: `deers_ledger.csv (EUC-KR)`
- **출력 결과 (Output)**: 26 findings ([LDG-07] 적요 키워드 위험 탐지, High)
- **회귀테스트 여부 (Regression)**: `PASS (regression_baseline_v2.json)`

---

## 📊 2. 전체 164개 시나리오 전수 실사 매핑 테이블 (Step 1)

| Scenario ID | Scenario Name | Registered | Rust Logic Exists | Executable | Tested | Current Status | Evidence / Logic Location |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| **AB-01** | Facilitation Payment | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **AB-02** | Shadow Hiring | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **AB-03** | Charitable Conduit | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **AB-04** | Excessive Hospitality | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **AB-05** | Per Diem Abuse | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **AB-06** | Third-Party High Commission | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **AB-07** | Political Contribution Masking | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **AB-08** | Off-book Account | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **AB-09** | Success Fee Anomaly | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **AB-10** | Training Trip Junket | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **AML-01** | Structuring (Smurfing) | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **AML-02** | Trade-Based Laundering | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **AML-03** | Shell Company Invoice | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **AML-04** | Flow-Through Account | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **AML-05** | Early Repayment Anomaly | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **AML-06** | Third-Party Payer | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **AML-07** | Jurisdiction High Risk | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **AML-08** | Integration Signal | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **AML-09** | Layering Pattern | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **AML-10** | Dark Web Interaction | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **CC-01** | Merchant Category Fraud | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **CC-02** | Personal Grocery Expense | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **CC-03** | Cash Withdrawal | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **CC-04** | Insurance/Tax Mix | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **CC-05** | Third-party Delivery | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **CC-06** | Recurring Unvouched | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **CC-07** | Flight Class Violation | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **CC-08** | Hotel Spoilage | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **CC-09** | Gift Card Laundering | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **CC-10** | Ghost Merchant | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **CL-01** | FCPA - Success Fee | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **CL-02** | GDPR PII Leak | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **CL-03** | AML - Round-tripping | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **CL-04** | Sanctions Hit | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **CL-05** | Whistleblower Retaliation | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **CL-06** | Export Control Breach | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **CL-07** | Antitrust Meeting | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **CL-08** | Insider Trading Signal | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **CL-09** | SOX Control Failure | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **CL-10** | Permit Expiry | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **ES-01** | Greenwashing - Carbon | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **ES-02** | Conflict Minerals | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **ES-03** | Child Labor Indicator | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **ES-04** | Toxic Waste Dumping | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **ES-05** | Diversity Quota Fraud | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **ES-06** | Safety Accident Cover-up | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **EX-01** | Spilling Receipt | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **EX-02** | Weekend/Night Usage | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **EX-03** | Remote Area Travel | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **EX-04** | Luxury Item Purchase | Y | Y | Y | Y | `Implemented` | src-tauri/src/compliance_dd_flow.rs (run_compliance_check_flow()) |
| **EX-05** | Duplicate Airfare | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **EX-06** | Mileage Personal Gain | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **EX-07** | No-show Refund Fraud | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **EX-08** | Hidden Entertainment | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **EX-09** | Commuter Fuel Abuse | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **EX-10** | Subscription Shadow IT | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **FA-01** | Inter-office Suspense | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **FA-02** | Manual Journal Abuse | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **FA-03** | FX Gain Shifting | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **FA-04** | Expense Under-accrual | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **FA-05** | Tax Refund Leakage | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **FA-06** | Asset Capitalization Bias | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **FA-07** | Dividend Compliance | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **FA-08** | Restricted Cash Leak | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **FA-09** | Related Party Omission | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **FA-10** | Audit Trail Deletion | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **FF-01** | Rapid Money Cycling (Ping-pong) | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **FF-02** | Lapping & Ledger Delay | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **FF-03** | Registered Vendor Mismatch | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **FF-04** | Structured Threshold Monitor | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **FF-05** | Inactive Project Account Drain | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **HR-01** | Ghost Payroll Entry | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **HR-02** | Overtime Fraud | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **HR-03** | Benefit Scoping | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **HR-04** | Severance Manipulation | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **HR-05** | Ghost Training | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **HR-06** | Duplicate Benefit Payout | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **HR-07** | Unauthorized Pay Raise | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **HR-08** | Expat Housing Abuse | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **HR-09** | Family Hiring Proxy | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **HR-10** | Dossier Access Abuse | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **IN-01** | Shrinkage Peak | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **IN-02** | Phantom Inventory | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **IN-03** | Obsolete Stock Concealment | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **IN-04** | Inventory Cycle Abuse | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **IN-05** | Unauthorized Scrapping | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **IN-06** | Valuation Skew | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **IN-07** | Loading Dock Weakness | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **IN-08** | Inter-company Transfer Loop | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **IN-09** | Sample Asset Leakage | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **IN-10** | BOM Discrepancy | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **IT-01** | Access Privilege Escalation | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **IT-02** | Shadow IT Usage | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **IT-03** | Data Exfiltration Signal | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **IT-04** | Ghost Access | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **IT-05** | VPN Access Anomaly | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **IT-06** | Backup Non-compliance | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **IT-07** | System Log Inactivity | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **IT-08** | Unpatched Vulnerability | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **IT-09** | Shared Account Usage | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **IT-10** | Dev/Ops SoD Violation | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **ITX-01** | Rootkit Signal | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **ITX-02** | Unauthorized Port Forwarding | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **ITX-03** | API Key Leakage | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **ITX-04** | Log Wiping | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **ITX-05** | Ransomware Precursor | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **LDG-01** | 고액 상위 1% 전표 리스트 | Y | Y | Y | Y | `Implemented` | src-tauri/src/ledger_engine.rs (run_ledger_only_scan()) |
| **LDG-02** | 라운드 금액 반복 패턴 | Y | Y | Y | Y | `Implemented` | src-tauri/src/ledger_engine.rs (run_ledger_only_scan()) |
| **LDG-03** | 동일 금액 반복 발생 (Short Interval) | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **LDG-04** | 주말 / 공휴일 고액 전표 | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **LDG-05** | 계정 사용 액티비티 변동 (Account Volatility) | Y | Y | Y | Y | `Implemented` | src-tauri/src/ledger_engine.rs (run_ledger_only_scan()) |
| **LDG-06** | 특정 부서 집중 거래 (Departmental Outlier) | Y | Y | Y | Y | `Implemented` | src-tauri/src/ledger_engine.rs (run_ledger_only_scan()) |
| **LDG-07** | 적요 키워드 위험 탐지 | Y | Y | Y | Y | `Implemented` | src-tauri/src/ledger_engine.rs (run_ledger_only_scan()) |
| **LDG-08** | 승인 한도 경계선 거래 (Threshold Pattern) | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **LDG-09** | 신규 원장/거래처 급증 (New Vendor Spike) | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **LDG-10** | 벤더 노출도 분석 (Vendor Concentration) | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PC-01** | 입찰 로테이션 (Bid Rotation) | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PC-02** | 유령 입찰 (Phantom Bids) | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PC-03** | 설계 변경 남용 (Change Order) | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PC-04** | Exclusive Distributor Mockery | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PC-05** | Inventory Parking | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PC-06** | Product Substitution | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PC-07** | Kickback - Consultant | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PC-08** | Emergency Purchase Loop | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PQ-01** | Yield Manipulation | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PQ-02** | Defect Concealment | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PQ-03** | Maintenance Log Fraud | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PQ-04** | Energy Usage Spike | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PQ-05** | Non-spec Material Use | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PQ-06** | Safety Incident Omission | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PQ-07** | QA Stamp Override | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PQ-08** | Excessive Down-time | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PQ-09** | Subcontractor Over-usage | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PQ-10** | Storage Condition Breach | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PR-01** | 담합 의심 (Bid-rigging) | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PR-02** | 품의 분할 (Split PO) | Y | Y | Y | Y | `Implemented` | src-tauri/src/flux_engine.rs (FluxEngine::run_correlations()) |
| **PR-03** | 시장가 격차 (Market Price Gap) | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PR-04** | Conflict of Interest | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PR-05** | Sole Source Overreliance | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PR-06** | Zombie Vendor Payments | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PR-07** | Kickback Signal | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PR-08** | Contract Variation Abuse | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PR-09** | Unauthorized Vendor | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **PR-10** | Advance Payment Non-performance | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **RV-01** | Bill and Hold Scheme | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **RV-02** | Side Letter Agreement | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **RV-03** | Round Tripping | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **RV-04** | Percentage of Completion Abuse | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **RV-05** | Cookie Jar Reserves | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **RV-06** | Consignment as Sales | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **RV-07** | Premature Recognition | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **RV-08** | Gross vs Net Presentation | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **RV-09** | Barter Transaction | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **RV-10** | Related Party Pricing | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **SA-01** | Channel Stuffing | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **SA-02** | Unusual Returns | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **SA-03** | Credit Limit Override | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **SA-04** | AR Aging Manipulation | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **SA-05** | Unauthorized Discounts | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **SA-06** | Circular Trading | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **SA-07** | Revenue Cut-off Error | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **SA-08** | Duplicate Sales Recognition | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **SA-09** | Customer Master Fraud | Y | N | N | N | `Not Implemented` | None (D. UI Only) |
| **SA-10** | Rebate Overcalculation | Y | N | N | N | `Not Implemented` | None (D. UI Only) |

## 🔍 3. 데이터 소스 및 보유 여부 대조 (Step 2)

현재 AuditFlow 플랫폼이 보유하여 주입할 수 있는 데이터 구조는 **일반 전표(General Ledger) 규격의 단일 CSV 및 기본적인 법인카드 내역**에 국한되어 있습니다. 반면 미구현된 시나리오들은 구매 품의 이력, 은행 자금 거래 흐름, SCM 재고 수불부, 생산 BOM 등 다차원 원장 데이터셋을 필수로 요구합니다.

| 감사 영역 | 필요 데이터 (Required Data) | 현재 AuditFlow 보유 여부 | 대조 검증 결과 및 Gap |
| :--- | :--- | :---: | :--- |
| **Ledger** (전표) | 일반 전표 분개장 (계정코드, 적요, 차/대변) | **보유 (EUC-KR CSV)** | LDG-01~07 탐지 구동 완료 (완전 매핑) |
| **Expense** (경비) | 법인카드 승인 내역 (가맹점, 금액, 승인일시) | **보유 (CSV)** | EX-04 키워드 직접 감지 구동 완료 |
| **Procurement** (구매) | 구매품의서(PO), 입찰 이력, 거래처 마스터 | **일부 보유 (전표 매핑)** | PR-02 분할 PO 탐지 구동 완료 (단가/IP 매뉴얼 등 누락) |
| **Inventory** (재고) | SCM 재고수불부, 이동 이력, 생산 BOM, 폐기 대장 | **미보유** | 데이터 구조 부재로 IN-01, IN-05 등 전수 작동 불가 |
| **Finance** (자금) | 은행 계좌 거래 내역, 송금 승인 체인, 예치계좌 마스터 | **미보유** | 은행 이체 흐름 추적 불가로 자금세탁/순환거래(FF) 탐지 불가 |
| **Sales** (매출) | 세금계산서 국세청 데이터, 반품 이력, 여신 한도 | **미보유** | 매출 컷오프(SA-01) 및 가짜매출 반품(SA-02) 탐지 불가 |
| **HR** (인사) | 급여 대장, 출퇴근 카드 태깅 로그, 인사 마스터 | **미보유** | 유령 직원(HR-01) 및 초과 근무 조작(HR-02) 탐지 불가 |

## 🎯 4. 비즈니스 중요도 및 구현 난이도 매핑 (Step 4 & 5)

| Scenario ID | Scenario Name | Business Criticality | Implementation Complexity | Priority (Step 6) |
| :--- | :--- | :---: | :---: | :--- |
| **AB-01** | Facilitation Payment | Low | Medium | **Priority 3 (보류)** |
| **AB-02** | Shadow Hiring | Critical | Medium | **Priority 2 (Sprint 후보 - 즉시 설계)** |
| **AB-03** | Charitable Conduit | Low | Medium | **Priority 3 (보류)** |
| **AB-04** | Excessive Hospitality | Low | Medium | **Priority 3 (보류)** |
| **AB-05** | Per Diem Abuse | Low | Medium | **Priority 3 (보류)** |
| **AB-06** | Third-Party High Commission | Low | Medium | **Priority 3 (보류)** |
| **AB-07** | Political Contribution Masking | Low | Medium | **Priority 3 (보류)** |
| **AB-08** | Off-book Account | Low | Medium | **Priority 3 (보류)** |
| **AB-09** | Success Fee Anomaly | Low | Medium | **Priority 3 (보류)** |
| **AB-10** | Training Trip Junket | Low | Medium | **Priority 3 (보류)** |
| **AML-01** | Structuring (Smurfing) | Low | Hard | **Priority 3 (보류)** |
| **AML-02** | Trade-Based Laundering | Low | Hard | **Priority 3 (보류)** |
| **AML-03** | Shell Company Invoice | Low | Hard | **Priority 3 (보류)** |
| **AML-04** | Flow-Through Account | Low | Hard | **Priority 3 (보류)** |
| **AML-05** | Early Repayment Anomaly | Low | Hard | **Priority 3 (보류)** |
| **AML-06** | Third-Party Payer | Low | Hard | **Priority 3 (보류)** |
| **AML-07** | Jurisdiction High Risk | Low | Hard | **Priority 3 (보류)** |
| **AML-08** | Integration Signal | Low | Hard | **Priority 3 (보류)** |
| **AML-09** | Layering Pattern | Low | Hard | **Priority 3 (보류)** |
| **AML-10** | Dark Web Interaction | Low | Hard | **Priority 3 (보류)** |
| **CC-01** | Merchant Category Fraud | High | Easy | **Priority 2 (Sprint 후보)** |
| **CC-02** | Personal Grocery Expense | High | Easy | **Priority 2 (Sprint 후보)** |
| **CC-03** | Cash Withdrawal | High | Easy | **Priority 2 (Sprint 후보)** |
| **CC-04** | Insurance/Tax Mix | High | Easy | **Priority 2 (Sprint 후보)** |
| **CC-05** | Third-party Delivery | High | Easy | **Priority 2 (Sprint 후보)** |
| **CC-06** | Recurring Unvouched | High | Easy | **Priority 2 (Sprint 후보)** |
| **CC-07** | Flight Class Violation | High | Easy | **Priority 2 (Sprint 후보)** |
| **CC-08** | Hotel Spoilage | High | Easy | **Priority 2 (Sprint 후보)** |
| **CC-09** | Gift Card Laundering | High | Easy | **Priority 2 (Sprint 후보)** |
| **CC-10** | Ghost Merchant | High | Easy | **Priority 2 (Sprint 후보)** |
| **CL-01** | FCPA - Success Fee | Medium | Medium | **Priority 3 (보류)** |
| **CL-02** | GDPR PII Leak | Medium | Medium | **Priority 3 (보류)** |
| **CL-03** | AML - Round-tripping | Medium | Medium | **Priority 3 (보류)** |
| **CL-04** | Sanctions Hit | Medium | Medium | **Priority 3 (보류)** |
| **CL-05** | Whistleblower Retaliation | Medium | Medium | **Priority 3 (보류)** |
| **CL-06** | Export Control Breach | Medium | Medium | **Priority 3 (보류)** |
| **CL-07** | Antitrust Meeting | Medium | Medium | **Priority 3 (보류)** |
| **CL-08** | Insider Trading Signal | Medium | Medium | **Priority 3 (보류)** |
| **CL-09** | SOX Control Failure | Medium | Medium | **Priority 3 (보류)** |
| **CL-10** | Permit Expiry | Medium | Medium | **Priority 3 (보류)** |
| **ES-01** | Greenwashing - Carbon | Medium | Medium | **Priority 3 (보류)** |
| **ES-02** | Conflict Minerals | Medium | Medium | **Priority 3 (보류)** |
| **ES-03** | Child Labor Indicator | Medium | Medium | **Priority 3 (보류)** |
| **ES-04** | Toxic Waste Dumping | Medium | Medium | **Priority 3 (보류)** |
| **ES-05** | Diversity Quota Fraud | Medium | Medium | **Priority 3 (보류)** |
| **ES-06** | Safety Accident Cover-up | Medium | Medium | **Priority 3 (보류)** |
| **EX-01** | Spilling Receipt | High | Easy | **Priority 2 (Sprint 후보)** |
| **EX-02** | Weekend/Night Usage | High | Easy | **Priority 2 (Sprint 후보)** |
| **EX-03** | Remote Area Travel | High | Easy | **Priority 2 (Sprint 후보)** |
| **EX-04** | Luxury Item Purchase | High | Easy | **Priority 1 (이미 구현됨)** |
| **EX-05** | Duplicate Airfare | High | Easy | **Priority 2 (Sprint 후보)** |
| **EX-06** | Mileage Personal Gain | High | Easy | **Priority 2 (Sprint 후보)** |
| **EX-07** | No-show Refund Fraud | High | Easy | **Priority 2 (Sprint 후보)** |
| **EX-08** | Hidden Entertainment | High | Easy | **Priority 2 (Sprint 후보)** |
| **EX-09** | Commuter Fuel Abuse | High | Easy | **Priority 2 (Sprint 후보)** |
| **EX-10** | Subscription Shadow IT | High | Easy | **Priority 2 (Sprint 후보)** |
| **FA-01** | Inter-office Suspense | Critical | Medium | **Priority 2 (Sprint 후보 - 즉시 설계)** |
| **FA-02** | Manual Journal Abuse | Critical | Medium | **Priority 2 (Sprint 후보 - 즉시 설계)** |
| **FA-03** | FX Gain Shifting | Low | Medium | **Priority 3 (보류)** |
| **FA-04** | Expense Under-accrual | Critical | Medium | **Priority 2 (Sprint 후보 - 즉시 설계)** |
| **FA-05** | Tax Refund Leakage | Low | Medium | **Priority 3 (보류)** |
| **FA-06** | Asset Capitalization Bias | Low | Medium | **Priority 3 (보류)** |
| **FA-07** | Dividend Compliance | Low | Medium | **Priority 3 (보류)** |
| **FA-08** | Restricted Cash Leak | Low | Medium | **Priority 3 (보류)** |
| **FA-09** | Related Party Omission | Low | Medium | **Priority 3 (보류)** |
| **FA-10** | Audit Trail Deletion | Critical | Medium | **Priority 2 (Sprint 후보 - 즉시 설계)** |
| **FF-01** | Rapid Money Cycling (Ping-pong) | Critical | Very Hard | **Priority 2 (Sprint 후보 - 즉시 설계)** |
| **FF-02** | Lapping & Ledger Delay | Critical | Very Hard | **Priority 2 (Sprint 후보 - 즉시 설계)** |
| **FF-03** | Registered Vendor Mismatch | Critical | Hard | **Priority 2 (Sprint 후보 - 즉시 설계)** |
| **FF-04** | Structured Threshold Monitor | High | Hard | **Priority 2 (Sprint 후보)** |
| **FF-05** | Inactive Project Account Drain | High | Hard | **Priority 2 (Sprint 후보)** |
| **HR-01** | Ghost Payroll Entry | Critical | Medium | **Priority 2 (Sprint 후보 - 즉시 설계)** |
| **HR-02** | Overtime Fraud | Low | Medium | **Priority 3 (보류)** |
| **HR-03** | Benefit Scoping | Low | Medium | **Priority 3 (보류)** |
| **HR-04** | Severance Manipulation | Critical | Medium | **Priority 2 (Sprint 후보 - 즉시 설계)** |
| **HR-05** | Ghost Training | Low | Medium | **Priority 3 (보류)** |
| **HR-06** | Duplicate Benefit Payout | Low | Medium | **Priority 3 (보류)** |
| **HR-07** | Unauthorized Pay Raise | Critical | Medium | **Priority 2 (Sprint 후보 - 즉시 설계)** |
| **HR-08** | Expat Housing Abuse | Low | Medium | **Priority 3 (보류)** |
| **HR-09** | Family Hiring Proxy | Low | Medium | **Priority 3 (보류)** |
| **HR-10** | Dossier Access Abuse | Low | Medium | **Priority 3 (보류)** |
| **IN-01** | Shrinkage Peak | Critical | Hard | **Priority 2 (Sprint 후보 - 즉시 설계)** |
| **IN-02** | Phantom Inventory | Low | Hard | **Priority 3 (보류)** |
| **IN-03** | Obsolete Stock Concealment | Low | Hard | **Priority 3 (보류)** |
| **IN-04** | Inventory Cycle Abuse | Low | Very Hard | **Priority 3 (보류)** |
| **IN-05** | Unauthorized Scrapping | Critical | Hard | **Priority 2 (Sprint 후보 - 즉시 설계)** |
| **IN-06** | Valuation Skew | Low | Hard | **Priority 3 (보류)** |
| **IN-07** | Loading Dock Weakness | Low | Hard | **Priority 3 (보류)** |
| **IN-08** | Inter-company Transfer Loop | Low | Hard | **Priority 3 (보류)** |
| **IN-09** | Sample Asset Leakage | Low | Hard | **Priority 3 (보류)** |
| **IN-10** | BOM Discrepancy | Critical | Very Hard | **Priority 2 (Sprint 후보 - 즉시 설계)** |
| **IT-01** | Access Privilege Escalation | Medium | Medium | **Priority 3 (보류)** |
| **IT-02** | Shadow IT Usage | Medium | Medium | **Priority 3 (보류)** |
| **IT-03** | Data Exfiltration Signal | Medium | Medium | **Priority 3 (보류)** |
| **IT-04** | Ghost Access | Medium | Medium | **Priority 3 (보류)** |
| **IT-05** | VPN Access Anomaly | Medium | Medium | **Priority 3 (보류)** |
| **IT-06** | Backup Non-compliance | Medium | Medium | **Priority 3 (보류)** |
| **IT-07** | System Log Inactivity | Medium | Medium | **Priority 3 (보류)** |
| **IT-08** | Unpatched Vulnerability | Medium | Medium | **Priority 3 (보류)** |
| **IT-09** | Shared Account Usage | Medium | Medium | **Priority 3 (보류)** |
| **IT-10** | Dev/Ops SoD Violation | Medium | Medium | **Priority 3 (보류)** |
| **ITX-01** | Rootkit Signal | Medium | Medium | **Priority 3 (보류)** |
| **ITX-02** | Unauthorized Port Forwarding | Medium | Medium | **Priority 3 (보류)** |
| **ITX-03** | API Key Leakage | Medium | Medium | **Priority 3 (보류)** |
| **ITX-04** | Log Wiping | Medium | Medium | **Priority 3 (보류)** |
| **ITX-05** | Ransomware Precursor | Medium | Medium | **Priority 3 (보류)** |
| **LDG-01** | 고액 상위 1% 전표 리스트 | High | Easy | **Priority 1 (이미 구현됨)** |
| **LDG-02** | 라운드 금액 반복 패턴 | High | Easy | **Priority 1 (이미 구현됨)** |
| **LDG-03** | 동일 금액 반복 발생 (Short Interval) | High | Easy | **Priority 2 (Sprint 후보)** |
| **LDG-04** | 주말 / 공휴일 고액 전표 | High | Easy | **Priority 2 (Sprint 후보)** |
| **LDG-05** | 계정 사용 액티비티 변동 (Account Volatility) | Medium | Easy | **Priority 1 (이미 구현됨)** |
| **LDG-06** | 특정 부서 집중 거래 (Departmental Outlier) | High | Easy | **Priority 1 (이미 구현됨)** |
| **LDG-07** | 적요 키워드 위험 탐지 | High | Easy | **Priority 1 (이미 구현됨)** |
| **LDG-08** | 승인 한도 경계선 거래 (Threshold Pattern) | High | Easy | **Priority 2 (Sprint 후보)** |
| **LDG-09** | 신규 원장/거래처 급증 (New Vendor Spike) | High | Easy | **Priority 2 (Sprint 후보)** |
| **LDG-10** | 벤더 노출도 분석 (Vendor Concentration) | High | Easy | **Priority 2 (Sprint 후보)** |
| **PC-01** | 입찰 로테이션 (Bid Rotation) | Medium | Medium | **Priority 3 (보류)** |
| **PC-02** | 유령 입찰 (Phantom Bids) | Medium | Medium | **Priority 3 (보류)** |
| **PC-03** | 설계 변경 남용 (Change Order) | Medium | Medium | **Priority 3 (보류)** |
| **PC-04** | Exclusive Distributor Mockery | Medium | Medium | **Priority 3 (보류)** |
| **PC-05** | Inventory Parking | Medium | Medium | **Priority 3 (보류)** |
| **PC-06** | Product Substitution | Medium | Medium | **Priority 3 (보류)** |
| **PC-07** | Kickback - Consultant | Medium | Medium | **Priority 3 (보류)** |
| **PC-08** | Emergency Purchase Loop | Medium | Medium | **Priority 3 (보류)** |
| **PQ-01** | Yield Manipulation | Medium | Medium | **Priority 3 (보류)** |
| **PQ-02** | Defect Concealment | Medium | Medium | **Priority 3 (보류)** |
| **PQ-03** | Maintenance Log Fraud | Medium | Medium | **Priority 3 (보류)** |
| **PQ-04** | Energy Usage Spike | Medium | Medium | **Priority 3 (보류)** |
| **PQ-05** | Non-spec Material Use | Medium | Medium | **Priority 3 (보류)** |
| **PQ-06** | Safety Incident Omission | Medium | Medium | **Priority 3 (보류)** |
| **PQ-07** | QA Stamp Override | Medium | Medium | **Priority 3 (보류)** |
| **PQ-08** | Excessive Down-time | Medium | Medium | **Priority 3 (보류)** |
| **PQ-09** | Subcontractor Over-usage | Medium | Medium | **Priority 3 (보류)** |
| **PQ-10** | Storage Condition Breach | Medium | Medium | **Priority 3 (보류)** |
| **PR-01** | 담합 의심 (Bid-rigging) | Critical | Easy | **Priority 2 (Sprint 후보 - 즉시 설계)** |
| **PR-02** | 품의 분할 (Split PO) | High | Easy | **Priority 1 (이미 구현됨)** |
| **PR-03** | 시장가 격차 (Market Price Gap) | Critical | Easy | **Priority 2 (Sprint 후보 - 즉시 설계)** |
| **PR-04** | Conflict of Interest | High | Easy | **Priority 2 (Sprint 후보)** |
| **PR-05** | Sole Source Overreliance | High | Easy | **Priority 2 (Sprint 후보)** |
| **PR-06** | Zombie Vendor Payments | Critical | Easy | **Priority 2 (Sprint 후보 - 즉시 설계)** |
| **PR-07** | Kickback Signal | High | Easy | **Priority 2 (Sprint 후보)** |
| **PR-08** | Contract Variation Abuse | High | Easy | **Priority 2 (Sprint 후보)** |
| **PR-09** | Unauthorized Vendor | High | Easy | **Priority 2 (Sprint 후보)** |
| **PR-10** | Advance Payment Non-performance | High | Easy | **Priority 2 (Sprint 후보)** |
| **RV-01** | Bill and Hold Scheme | Low | Hard | **Priority 3 (보류)** |
| **RV-02** | Side Letter Agreement | Low | Hard | **Priority 3 (보류)** |
| **RV-03** | Round Tripping | Low | Hard | **Priority 3 (보류)** |
| **RV-04** | Percentage of Completion Abuse | Low | Hard | **Priority 3 (보류)** |
| **RV-05** | Cookie Jar Reserves | Low | Hard | **Priority 3 (보류)** |
| **RV-06** | Consignment as Sales | Low | Hard | **Priority 3 (보류)** |
| **RV-07** | Premature Recognition | Low | Hard | **Priority 3 (보류)** |
| **RV-08** | Gross vs Net Presentation | Low | Hard | **Priority 3 (보류)** |
| **RV-09** | Barter Transaction | Low | Hard | **Priority 3 (보류)** |
| **RV-10** | Related Party Pricing | Low | Hard | **Priority 3 (보류)** |
| **SA-01** | Channel Stuffing | Critical | Medium | **Priority 2 (Sprint 후보 - 즉시 설계)** |
| **SA-02** | Unusual Returns | Critical | Medium | **Priority 2 (Sprint 후보 - 즉시 설계)** |
| **SA-03** | Credit Limit Override | Low | Medium | **Priority 3 (보류)** |
| **SA-04** | AR Aging Manipulation | Low | Medium | **Priority 3 (보류)** |
| **SA-05** | Unauthorized Discounts | Low | Medium | **Priority 3 (보류)** |
| **SA-06** | Circular Trading | Critical | Medium | **Priority 2 (Sprint 후보 - 즉시 설계)** |
| **SA-07** | Revenue Cut-off Error | Low | Medium | **Priority 3 (보류)** |
| **SA-08** | Duplicate Sales Recognition | Low | Medium | **Priority 3 (보류)** |
| **SA-09** | Customer Master Fraud | Low | Medium | **Priority 3 (보류)** |
| **SA-10** | Rebate Overcalculation | Low | Medium | **Priority 3 (보류)** |
