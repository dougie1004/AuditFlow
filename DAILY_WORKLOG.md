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
### 🚀 Completed: CFO-Centric Risk Calibration & Enhanced Data Mapping Pipeline (Phase 4.8)

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
- **Externalized Data**: Migrated `audit_universe_seed.json` and `master_scenarios.json` to external JSON files, decoupling data from the compiled binary.

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

#### 2. CFO-Centric AI Engine Calibration (False Positive Reduction)
- **Account Exclusion Logic**: Updated `audit_engine.rs` structural analysis (CR1/HHI calculation loops) to strictly ignore internal/non-counterparty accounts that generate meaningless "Unknown Player" dominance alerts.
- **Refined Chart of Accounts**: Excluded Salary/Payroll (50300, 50400, 80200), Taxes & Dues (51700, 81700), Depreciation (51800, 81800), and specific internal Fees (83100) from temporal flux evaluation, resulting in cleaner, highly actionable anomaly detection.

---
*Next Steps: Finalize production validation, perform stress tests on the new configuration loader, and enhance regional localized reporting.*

## 2026-02-24
### 🚀 Completed: Build Stabilization & Test Integrity Restoration

#### 1. Resolved Asset Integrity Errors
- **Icon Corruption Fix**: Resolved critical `proc macro panicked` error caused by `Invalid PNG signature` in `src-tauri/icons/`. 
- **Asset Replacement**: Generated valid 32x32 and 128x128 PNG assets to replace corrupted ones, unblocking the Tauri build process.

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
*Next Steps (Post-Reboot): Complete the integration of the new AFRI (AuditFlow Risk Index) engine into the UI, finalize report export logic, and prepare for Phase 5 beta testing.*

## 2026-04-28: AuditFlow Pilot & Business Strategy
- **Clarification Loop Integration**: Updated generate_professional_report in backend (commands.rs) to include dynamic clarification request statistics (Total, Answered, Pending).
- **Reporting UX Upgrade**: Implemented the "Generate Executive Report" button on the Dashboard and added a professional "data synthesis" animation in AuditReport.tsx.
- **Pilot Installer Build**: Successfully built standalone .msi and .exe pilot installers using 
pm run tauri build.
- **Monetization & Go-To-Market Planning**: Analyzed the "2026 Preliminary Startup Package Business Plan" (예비창업패키지 사업계획서) to evaluate the feasibility of local payment integration.
- **Architecture Strategy**: Formulated a "Local-First Desktop App + Web/Supabase Auth" architecture for the B2B SaaS subscription model, utilizing the existing Vercel landing page (insightrix-auditflow-website.vercel.app).
- **Next Steps**: Defined the next sprint to choose between adding pricing UI placeholders in the local MVP (Dashboard) or connecting a mock Supabase login flow.
