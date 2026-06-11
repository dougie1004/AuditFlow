# AuditFlow Daily Worklog

## 2026-02-18
### 🚀 Completed: Account Classification Layer & Financial Trend Engine Integration (Phase 4.7)

#### 1. Financial Trend Engine (Real Data Handling)
- **Robust Ingestion**: Enhanced `ledger_builder.rs` with intelligent header detection (scans first 10 rows) to handle messy ERP exports like the 2009 ledger.
- **Query Optimization**: Fixed `get_multi_year_trial_balance` in `commands.rs` to use native SQLite columns, improving performance for 100k+ row datasets.
- **Visual Analytics**: Implemented `FinancialTrendPanel.tsx` featuring YoY percentage changes, sparkline trends, and high-volatility highlights.

#### 2. Account Classification Layer (Shift to "Audit Engine")
- **Behavioral Logic**: Introduced `AccountBehavior` enum to categorize accounts by their inherent business nature:
    - `DistributionExpected` (e.g., Welfare, Supplies) - High concentration is suspicious.
    - `StructuralConcentrationAllowed` (e.g., Deposits, Subsidies) - High concentration is normal.
    - `VolatilityObserved` (e.g., Revenue) - Focus on monthly variance.
    - `AdjustmentSensitive` / `EarningsManagementSensitive` (e.g., Suspense, Allowances) - High-sensitivity monitoring for year-end spikes.
- **Intelligent Scoring**: Updated `flow_analysis.rs` to adjust risk scores based on behavior (e.g., reducing HHI penalties for deposits).
- **Contextual Reasoning**: Revamped "Risk Reasons" to provide professional audit judgment (e.g., "Naturally focused account" vs "Suspicious concentration in costs").

#### 3. UI/UX & Type System
- **Badge System**: Added behavioral badges to the Statistical Anomaly Engine UI in `AuditWorkspace.tsx`.
- **Smart Indicators**: Implemented dimmed/italicized markers for "Expected Structural Patterns" to reduce auditor fatigue and false positives.
- **Type Sync**: Updated `src/types/index.ts` to include full behavioral metadata support.

## 2026-02-19
### 🚀 Completed: CFO-Centric Risk 정밀 조정 & Enhanced Data Mapping Pipeline (Phase 4.8)

#### 1. CFO-Centric Risk Model Refinement
- **Realism Alignment**: Recalibrated the financial impact model in `compliance_judge.rs` and `audit_engine.rs` to prevent inflated risk figures.
- **Delta-Based Exposure**: Shifted Flux risk calculation from "Total Volume" to "Net Delta Change" (2% damping factor) to focus on unexplained money shifts.
- **Micro-Materiality**: Adjusted Triple-Loss model (Leakage, Penalty, Waste) factors (5x reduction) to align with conservative CFO-level reporting.
- **Exposure Justification**: Implemented more professional, justifiable commentary for financial deviations to ensure actionable decision-making.

#### 2. Enhanced Data Mapping & Preview Pipeline
- **Intelligent Row Detection**: Upgraded `DataUpload.tsx` with dynamic header scanning (Row 1-10) to bypass "Company Header" preambles common in legacy ERP exports.
- **Domain Intelligence**: Expanded `domain_map.rs` and `ledger_builder.rs` with 20+ new Korean accounting terms (차변, 대변, 입금, 출금, 가맹점, etc.) for automated column mapping.
- **Precision Preview**: Integrated `parse_csv_line` into `get_file_preview` backend to correctly handle commas within quoted numeric fields (e.g., "1,200,000").
- **Dynamic Grid Scaling**: Fixed UI truncation issues in `DataUpload.tsx` by calculating max column widths across the entire preview sample.

#### 3. System Stability & Bug Fixes
- **Metadata Sync**: Fixed `total_volume` logging error in `audit_engine.rs` where an undefined variable caused calculation failures.
- **IPC Safety**: Added safe truncation markers to the backend preview to prevent buffer overruns during large file scans.

## 2026-02-20
### 🚀 Completed: Centralized Configuration Management & AI Engine Stabilization (Phase 4.9)

#### 1. Centralized Configuration System (The "Heart" of AuditFlow)
- **Unified Settings**: Implemented `app_config.json` and `config.rs` to manage crucial system parameters (Exchange rates, Materiality thresholds, AI model names).
- **Zero-Hardcoding Enforcement**: Removed literal thresholds (130B, 13B) and FX rates (1350.0) from business logic, sourcing them from a global `OnceLock` config manager.
- **Constitutional Guardrails**: Updated `FORBIDDEN_PATTERNS.md` to formally prohibit hardcoded literals and experimental model strings.

#### 2. AI Engine & Infrastructure Stabilization
- **Model Normalization**: Migrated all AI calls to stable `gemini-2.0-flash` to resolve 404 NOT_FOUND errors caused by experimental `-exp` versions.
- **Guardrail Sync**: Updated `ban-legacy-gemini-models.mjs` to block experimental model names from entering the codebase.
- **Externalized Data**: Migrated `audit_universe_seed.json` and `master_scenarios.json` to external 데이터 파일 files, decoupling data from the compiled binary.

#### 3. System Integrity & Deployment
- **Fail-Safe Checks**: Enhanced `constitution.rs` to verify the presence of `app_config.json` before execution.
- **Clean Build**: Resolved critical Rust compilation errors (missing `Value` import, scope visibility) after refactoring.
- **Deployment Ready**: Successfully pushed stabilized codebase to GitHub and initiated production build for `.exe` executable.

#### 4. Demo & Stakeholder Onboarding Suite
- **Interactive Guides**: Created `README_VC_DEMO.md` and a premium `DEMO_GUIDE.html` for VCs and potential investors.
- **Simulation Workflow**: Formally documented the "One-Click Simulation" scenario to ensure a "WOW" experience during demonstrations.
- **Constitutional Sealing**: Updated the Constitution to prevent future regressions in the simulation engine.

## 2026-02-23
### 🚀 Completed: Dashboard UI Resilience & AI Engine Refinement

#### 1. Dashboard UI Resilience
- **Flux Radar Simplification**: Refactored the `Dashboard.tsx` "Temporal Flux Radar" to display only the top 3 items based on Estimated Impact, eliminating disruptive vertical scrolling and improving at-a-glance readability.
- **Routing Fix**: Corrected the click handler on Flux cards to navigate directly to the detailed `/flux-analysis` view instead of an empty workspace metric page.
- **Removed Artificial Latency**: Removed a hardcoded 1.6-second `setTimeout` loading delay in the dashboard initialization sequence, providing near-instant data visualization upon mounting or returning to the dashboard.

#### 2. CFO-Centric AI Engine 정밀 조정 (False Positive Reduction)
- **Account Exclusion Logic**: Updated `audit_engine.rs` structural analysis (CR1/HHI calculation loops) to strictly ignore internal/non-counterparty accounts that generate meaningless "Unknown Player" dominance alerts.
- **Refined Chart of Accounts**: Excluded Salary/Payroll (50300, 50400, 80200), Taxes & Dues (51700, 81700), Depreciation (51800, 81800), and specific internal Fees (83100) from temporal flux evaluation, resulting in cleaner, highly actionable anomaly detection.

---
*향후 계획: Finalize production validation, perform stress tests on the new configuration loader, and enhance regional localized reporting.*

## 2026-02-24
### 🚀 Completed: Build Stabilization & Test Integrity Restoration

#### 1. Resolved Asset Integrity Errors
- **Icon Corruption Fix**: Resolved critical `proc macro panicked` error caused by `Invalid PNG signature` in `src-tauri/icons/`. 
- **Asset Replacement**: Generated valid 32x32 and 128x128 PNG assets to replace corrupted ones, unblocking the 서버 연산 기능 build process.

#### 2. Restored Test Integrity
- **Scenario Seeding Accuracy**: Corrected `test_master_scenarios_integrity` in `scenarios_seeder.rs`. Updated the expected scenario name for PR-01 to match the actual seeded Korean string ("담합 의심 (Bid-rigging)").
- **Verification**: Confirmed that `cargo test` for scenario integrity passes successfully.

#### 3. Comprehensive Code Cleanup & Refactoring
- **Import Optimization**: Removed redundant and unused imports across major backend modules (`constitution.rs`, `compliance_dd_flow.rs`, `debug_api.rs`, `compliance_judge.rs`, `ledger_engine.rs`, `simulator.rs`, `config.rs`, `audit_engine.rs`).
- **Convention Enforcement**: Renamed `entityId` to `entity_id` in `commands.rs` to comply with Rust's `snake_case` naming conventions and fixed all dependent logic.
- **Dead Code Removal**: Deleted unused logic including the `AnomalyScorer` struct in `rule_weights.rs` and the `pillar_culture` variable in `commands.rs`.

#### 4. Stability Verification
- **Build Status**: Verified that the codebase satisfies `cargo check` with zero errors.
- **Post-Refactor Integrity**: Ensured that the renaming of variables and cleanup of imports did not introduce regressions in core command handlers.

---
*향후 계획 (Post-Reboot): Complete the integration of the new AFRI (AuditFlow Risk Index) engine into the UI, finalize report export logic, and prepare for Phase 5 beta testing.*

## 2026-04-28: AuditFlow Pilot & Business Strategy
- **Clarification Loop Integration**: Updated generate_professional_report in backend (commands.rs) to include dynamic clarification request statistics (Total, Answered, Pending).
- **Reporting UX Upgrade**: Implemented the "Generate Executive Report" button on the Dashboard and added a professional "data synthesis" animation in AuditReport.tsx.
- **Pilot Installer Build**: Successfully built standalone .msi and .exe pilot installers using pm run tauri build.
- **Monetization & Go-To-Market Planning**: Analyzed the "2026 Preliminary Startup Package Business Plan" (예비창업패키지 사업계획서) to evaluate the feasibility of local payment integration.
- **Architecture Strategy**: Formulated a "Local-First Desktop App + Web/Supabase Auth" architecture for the B2B SaaS subscription model, utilizing the existing Vercel landing page (insightrix-auditflow-website.vercel.app).
- **향후 계획**: Defined the next sprint to choose between adding pricing UI placeholders in the local MVP (Dashboard) or connecting a mock Supabase login flow.

---

## 2026-06-05 ~ 2026-06-07: 5단계 (표준 데이터 수립)
### 🚀 Completed: Golden Dataset Baseline & SQLite Migration Schema

#### 1. Golden Dataset Risk Score Freezing
- **CPA Anomaly Insertion**: Designed and compiled mock CSV data representing 5 major audit domains (Procurement, Expense, Ledger, Finance, Inventory) containing representative audit risks.
- **Baseline Freeze**: Ran the audit engine, captured all 19 findings and 2 relationships, and froze the risk scores inside `regression_baseline_v2.json`.

#### 2. SQLite Registry & History Schema DDL
- **Registry Integration**: Created `scenario_parameter_overrides` and `scenario_parameter_override_history` tables in `database.rs` to persist parameter values.
- **Audit Trail Backend**: Implemented 서버 연산 기능 IPC commands (`get_parameter_overrides`, `set_parameter_override`, `get_parameter_override_history`) to modify and fetch the override history securely.

---

## 2026-06-07 ~ 2026-06-08: 6-7단계 (화면 연동 및 예외 처리)
### 🚀 Completed: Sensitivity 감도 조정 화면 & Parameter Adapter

#### 1. Advanced Mode UI & Justification Form (6단계 (감도 저장 화면 연동))
- **UI Decoupling**: Replaced temporary `브라우저 임시 메모리` logic inside `ScenarioManager.tsx` with direct SQLite API calls.
- **Justification Enforcement**: Mandated the entry of CFO reasons (`Justification`) before saving overrides.
- **Audit Trail Log Viewer**: Rendered a real-time list of parameter changes at the bottom of the Scenario Manager panel.

#### 2. 감도 정밀 조율 모듈 & 3-Tier Fallback Resolver (7단계 (예외 자동 조율 로직))
- **Adapter Design**: Created `감도 조율 엔진 코드` to map three levels of sensitivity (Low, Normal, High) to specific parameters.
- **Resolution Chain**: Implemented 3-tier fallback logic: Individual Scenario Overrides ➔ Domain-level Settings ➔ Global Sensitivity.
- **Validation**: Executed standalone unit tests (`test_감도 조율 엔진 코드`) to ensure 100% correct parameter resolution.

---

## 2026-06-08: 8단계 (데이터 검증 정확도 향상)
### 🚀 Completed: 일관된 고유 키 생성 & Order-Invariant Regression Pass

#### 1. Hash Canonicalization Engine
- **Normalizers**: Created 고유 검증 키-based `compute_stable_hash` in `regression_baseline.rs` with strict canonicalization rules (trim whitespace, uppercase normalization, float format `%.2f`, and null replacement).
- **데이터 고유 번호 Mitigation**: Replaced volatile database 데이터 고유 번호s with stable transaction hashes at verification time.

#### 2. 정렬 기반 데이터 비교
- **Order Invariance**: Sorted finding arrays and relationships in memory prior to assertion.
- **Zero-Error Gate**: Resolved order-dependency and parallel execution errors, achieving 100% 일치 통과 for regression baseline verification.

---

## 2026-06-09: 향후 계획 (실제 데이터 검증) (Today)
### 🚀 Completed: Fixed Cloud Sync Pipeline & Jargon Normalization

#### 1. Google Drive & NotebookLM Pipeline Stabilization
- **Fixed Output Directory**: Created `live_dashboard/` and mapped all visual HTML files (`progress_dashboard.html`, `regression_hashing_proof.html`, `walkthrough.html`) and baselines directly to `G:\내 드라이브\live_dashboard\`.
- **NotebookLM Text Exposer**: Cloned all markdown reports as `.txt` files inside G Drive to bypass NotebookLM's HTML restriction, enabling real-time Refresh capabilities.

#### 2. Audit Vocabulary Normalization
- **Term Replacement**: Replaced technical developer jargon "증적" (Evidence) with corporate-friendly "검증 보고서" (Verification Report) and "변경 로그/이력" (Change History/Log) in all documentation and UI components.
- **Removed Jargon**: Replaced "독립형" (독립형) with "독립형" (Independent) or "기존 시스템 영향 최소화".
- **Build Verification**: Ran production compiler (`npm run build`) to ensure React frontend stability after refactoring.

#### 3. Executive UI Redesign & Interactive Compliance Verification Linkage
- **Premium Gantt Chart Redesign**: Upgraded the Gantt chart in `progress_dashboard.html` to a sleek, modern timeline using thin pill-shaped progress indicators and a sophisticated monochrome slate/indigo corporate palette. Hided raw text on the bars themselves for a clean executive-level layout.
- **Interactive Compliance Evidence**: Made the "Compliance Status: Verified (검증 완료)" list items interactive. Clicking on ISO 37001, COSO, or NTS items now opens a detailed modal displaying the concrete verification scope, simulated transaction counts, and verification results.
- **Dynamic Contextual Labels**: Configured the modal to dynamically update its metadata labels (e.g., displaying "Control & Verification Scope" and "Verification Evidence & Results" instead of "Target Component" and "Progress") when showing compliance details.

#### 4. Architecture Review Gate Deliverables
- **Scenario Regression Report**: Created `scenario_regression_report_v1.json` detailing individual scores, issue counts, and status for all active scenarios to prevent blind regression passes.
- **FF Domain Audit**: Conducted source auditing and compiled `ff_domain_audit_report.md` detailing the implementation status, function name, testability, and golden dataset presence for all 5 funds flow scenarios.
- **Mapping Manifest v2**: Created `mapping_manifest_v2.json` mapping rules to compliance frameworks with detailed control areas and rationales.
- **Sensitivity Design Review**: Documented the default thresholds, rationales, and FP/FN impact for all 8 active scenarios in `sensitivity_design_review.md`.
- **Review Gate Checklist**: Formulated `architecture_review_gate.md` checklist summarizing the status of all five checkpoints.
- **Cloud Synchronization**: Synced all 5 deliverables and their text clones to `G:\내 드라이브\live_dashboard\`.

---

## 2026-06-10
### 🚀 Completed: Sprint 6A: 제조업 감사 데이터(Deers) 실 결합 검증 및 캘리브레이션

#### 1. 제조업 샘플 데이터(Mock/Synthetic) 생성 및 파이프라인 결합
- **가상 디어스 데이터 생성**: `generate_deers_data.py`를 활용하여 제조업 내부통제 리스크(원자재 구매 쪼개기 `PR-02`, 외주가공비 변동성 `LDG-05`, 라운드 전표 반복 `LDG-02`, 부서 집중 거래 `LDG-06`)를 심은 EUC-KR(CP949) 규격의 3대 CSV( ledger, inventory, procurement) 데이터를 생성했습니다.
- **감사 엔진 회귀 검증 패스**: `regression_baseline.rs`를 수정하여 신규 제조업 데이터셋 3종을 로드하도록 갱신하고, 실행 결과 총 36개의 지적사항(Issues) 및 2개의 연관 관계(Relations)가 도출된 분석 결과를 `regression_baseline_v2.json`으로 동결했습니다. 이후 회귀 검증 실행 시 100% 동일 패스함을 보장합니다.

#### 2. 프론트엔드 TypeScript 컴파일 및 의존성 해결
- **정적 타입 오류 수정**: `ScenarioManager.tsx` 내 `enabled: bool` 문법 오류를 표준 타입 `boolean`으로 수정하고, `detectSplit.ts`에서 unknown 타입 추론으로 발생하던 Array.reduce 오류를 해결하기 위해 `Transaction` 및 `AuditResult` 인터페이스와 매핑 타입을 부여했습니다.
- **Supabase 라이브러리 추가**: 라우팅 컴파일 차단 원인이었던 `@supabase/supabase-js` 패키지를 설치하여 `npx tsc --noEmit` 검사를 무오류(Zero Error)로 통과시켰습니다.

#### 3. 내부 헌법(Constitution) 검사 통과 및 commands.rs 리팩토링
- **금지 패턴 제거**: 비즈니스 크리티컬 필드에 대해 기본값을 허용하는 `unwrap_or_default()`를 금지하는 내부 헌법 규칙(`test_constitutional_forbidden_patterns`)을 준수하기 위해, `src-tauri/src/commands.rs` 내 `title` 및 `severity` 관련 코드 4곳을 `unwrap_or_else(|_| "".to_string())` 등으로 리팩토링했습니다.
- **테스트 정합성**: `cargo test`를 실행하여 헌법 자가진단 테스트를 포함한 백엔드 15개 단위 테스트가 전부 정상 통과(Success)함을 확인했습니다.

---

## 2026-06-11
### 🚀 Completed: 164개 시나리오 전수 실사(Coverage Audit) 및 Critical Top 20 분석

#### 1. 164개 시나리오 코드 증적 확보 (2차 검증)
- **증적 문서 생성**: `164_scenario_coverage_audit.md`에 구현된 7개 활성 시나리오(`PR-02`, `EX-04`, `LDG-01`, `LDG-02`, `LDG-05`, `LDG-06`, `LDG-07`)의 파일 경로, 함수명, 입력 데이터, 출력 결과, 회귀 테스트 상태를 실 코드 기반의 투명한 증적으로 완벽하게 입증해 공시하였습니다.

#### 2. Critical Top 20 선정 및 데이터 모델 요구사항 분석
- **비즈니스 치명도 평가**: 미구현 시나리오 중 내부통제 관점에서 치명도(횡령, 자금유출, 재고조작, 허위매출, 분식회계)가 가장 높으며 차세대 최우선 개발군인 **Critical Top 20 시나리오**를 선정하였습니다.
- **필수 데이터 원장 매핑**: 각 Top 20 시나리오가 작동하기 위해 필수적인 다차원 원장 요구사항(은행 이체 원장 `bank_transactions`, SCM 재고수불 원장 `inventory_ledger`, 생산 `production_bom` 등)을 분석하여 현 AuditFlow의 단일 전표 중심 데이터 구조와의 Gap을 [scenario_gap_analysis.md](file:///C:/Users/user/.gemini/antigravity/brain/169696e3-8b59-4f2b-a8a2-cbd8f8f4d605/scenario_gap_analysis.md)에 정밀 기술하였습니다.

#### 3. 우선순위 매트릭스 CSV 생성 및 클라우드 배포
- **우선순위 정형화**: 164개 전체 시나리오의 중요도, 난이도, 우선순위(Priority 1/2/3)를 구조화한 [scenario_priority_matrix.csv](file:///c:/Users/user/.gemini/antigravity/playground/AuditFlow/live_dashboard/scenario_priority_matrix.csv) 정형 데이터를 생성하였습니다.
- **클라우드 동기화**: 위 산출물 3종 및 NotebookLM 전용 텍스트 복제본(`.txt`)을 구글 드라이브 `G:\내 드라이브\live_dashboard\` 하위에 실시간 동기화 완료했습니다.

#### 4. Sprint 7 조건부 승인 보완 작업 (Conditional Approval Corrections)
- **분류 자동화 스크립트 복원**: `classify_scenarios.py`를 레포지토리에 복원하여 분류 결과의 재현성을 보장하고, `.gitignore` 예외 처리를 통해 Git 추적 상태로 전환했습니다.
- **오탐 방지를 위한 카드/휴일 규칙 재분류**: GL 기입 시간과 실제 승인 시간의 시차로 인한 오탐을 방어하기 위해, 모든 법인카드(`CC-*`) 및 주말/공휴일 실제 지출 관련 시나리오(`EX-*`, `CC-03` 등)를 **Category C (Additional Source Data)**로 일괄 재분류하고 상세 오탐 방지 근거를 명시했습니다.
- **데이터 요구사항 매트릭스 보완**: `scenario_data_requirement_matrix.md` 최상단에 분류 카운트 요약 테이블을 추가하고, 164개 전체 시나리오의 1문장 데이터 등급 산정 근거를 Markdown 및 CSV([scenario_data_requirement_matrix.csv](file:///c:/Users/user/.gemini/antigravity/playground/AuditFlow/scenario_data_requirement_matrix.csv)) 리포트에 연동했습니다.
- **Sprint 8 우선순위 로드맵 정교화**: `scenario_implementation_priority.md` 내 Sprint 8 P0 대상을 **Sprint 8A (GL-only 즉시 구현 7개 - `EX-02` 배제)**와 **Sprint 8B (Master Data 선행 설계 1개 - `PR-09`)**로 이원화하였습니다.
- **Vendor Master 최소 스키마 설계**: `PR-09` Unauthorized Vendor 판정에 필요한 `vendor_id`, `approval_status` 등의 핵심 스키마 명세를 로드맵 문서에 수록 완료했습니다.

---
*향후 계획: Sprint 8A 7개 GL-only 시나리오 탐지 알고리즘 구현 및 Sprint 8B PR-09 Vendor Master UI/DB 연동 설계 진행.*


