# Forbidden Patterns Constitution v1.0 – AuditFlow

## Section 1. Constitutional Definition

Mock or placeholder values are not development conveniences.  
**They are constitutional violations.**

In AuditFlow, "Nothingness" (Error/Failure) is infinitely superior to "Fake Somethingness" (Mock/Placeholder). A system that shows a false success is a failed system. A system that shows an honest failure is a compliant system.

---

## Section 2. Forbidden Runtime Patterns (Runtime Path Guards)

The following patterns are strictly prohibited in the primary execution path of any AuditFlow Judgment Run.

### 2.1 Forbidden Literals (Hardcoded Deception)
Any output, log, or data structure containing the following literals during execution shall trigger an immediate **Execution Refusal**.

- **Numeric**: `15420`, `37.5665`, `126.9780`, `1000` (when used as a fake count)
- **Strings**: `"mock"`, `"placeholder"`, `"sample"`, `"test_user"`, `"Employee"` (as default owner), `"dummy"`
- **Dev Tags**: `"TODO"`, `"FIXME"`, `"HACK"`, `"TEMP"`

### 2.2 Forbidden Logical Fallbacks (The "친절한 거짓말" Operators)
The use of fallback operators to provide "reasonable-looking" fake data when real data is missing is prohibited.

- **Rust**: `unwrap_or()`, `unwrap_or_default()` (on business-critical fields), `Option::None` converted to success.
- **TypeScript/JS**: `||`, `??` (when used to inject defaults like "N/A", "Unknown", or fake numbers).

**Constitutional Standard**:
- ❌ `let owner = header.owner.unwrap_or("Employee".to_string());`
- ✅ `let owner = header.owner.ok_or("Constitutional Violation: Missing transaction owner")?;`

### 2.3 Success-Masking (Silent Error Suppression)
Empty results resulting from data absence must not be treated as "0 findings" or "Green State".

- **Invalid**: `if data.is_empty() { return Ok(DefaultResults); }`
- **Mandatory**: `if data.is_empty() { return Err("INSUFFICIENT_DATA: Execution Refused".into()); }`

### 2.4 Legacy/Experimental Model Names
The use of experimental or unconfirmed Gemini model variants (e.g., `-exp`) is prohibited in production paths as they lead to 404/NOT_FOUND errors.
- **Forbidden**: `gemini-2.0-flash-exp`, `gemini-1.5-pro-exp`
- **Mandatory**: Use stable variants like `gemini-2.0-flash`.

### 2.5 Zero-Hardcoding Enforcement (Configuration Dependency)
Key financial thresholds, API endpoints, and model identifiers must never be hardcoded as literals in business logic modules. 
- **Mandatory**: Use `crate::config::get_config()` to retrieve values from `app_config.json`.
- **Forbidden**: Literal values like `130000000000.0` or `1350.0` (exchange rates) inside `.rs` files or `.tsx` components.
- **Enforcement**: Build-time verification must confirm that all dynamic thresholds are loaded from the central configuration manager.

### 2.6 Demo & Simulator Integrity
The "Simulate" functionality is critical for stakeholder demonstrations (VC runs).
- **Mandatory**: Any changes to `simulator.rs` or `scenarios_seeder.rs` must be validated against the `DEMO_GUIDE.html` workflow.
- **Forbidden**: Hardcoding "fake" success messages or static dashboard figures that do not originate from the real simulation engine.
- **Goal**: Maintain 100% transparency between simulated data logic and real-world audit judgment logic.

---

## Section 3. The Execution Refusal Mechanism

### 3.1 Self-Check Gate
Every **Verified Judgment Run** must begin with a **Constitutional Self-Check**. If the runtime environment or the loaded codebase contains signals of forbidden patterns, the run must abort before the first calculation.

### 3.2 Traceability Requirement
Every value displayed in the UI must be traceable to a specific DB record or a deterministic calculation path. Any "untraceable" value is a violation.

---

## Section 4. Safe Harbors (허용되는 예외 조항)

To prevent developmental paralysis, the following "Honest States" are permitted. These are not mocks, but accurate representations of incomplete information.

### 4.1 Permitted Nulls
- **Metadata**: Optional tags that do not affect the Judicial Verdict (e.g., `extracted_user` can be `UNKNOWN_USER` if it doesn't change the risk score).
- **UI State**: Progress indicators showing `0%` or `PENDING` when a task has not started.

### 4.2 Permitted "None" for User Input
- Fields explicitly marked as "Optional" for the user.
- System results where the AI's honest conclusion is "I cannot determine this based on the evidence" (e.g., `UNCLASSIFIED`).

---

## Section 5. The Constitutional Seal (v1.0)

**AuditFlow v1.0 is constitutionally sealed.**  
Any relaxation of forbidden patterns requires a formal constitutional amendment. 

Antigravity and all subsequent developers are bound by the **Zero-Mock Policy**. The emergence of a forbidden pattern in a Verified Run is a terminal failure.

**"We do not build to please the user; we build to withstand the inquiry."**

---

## Section 6. Knowledge & History Tracking (Constitution Annex)
To prevent the recurrence of the same technical failures, the system must maintain a living record of "Judicial Precedents" (Fixed Errors).

### 6.1 Historical Resolution Log
- **2026-02-20**: Resolved "404 NOT_FOUND" failure in `generate_professional_report`. 
    - **Cause**: Use of experimental model string `gemini-2.0-flash-exp`.
    - **Enforcement**: Mandatory migration to `gemini-2.0-flash`.
- **2026-02-20 (Post-Refactoring)**: Fixed Rust compilation errors in `database.rs` and `ai_detection.rs` after centralizing configuration.
    - **Cause**: Missing `Value` import in `database.rs` and scope/visibility issues of `config` variable in `ai_detection.rs`.
    - **Enforcement**: Always run `cargo check` after configuration-related refactoring.
- **2026-02-20**: Eradicated hardcoded budget thresholds (`130B`, `13B`) in `compliance_judge.rs`.
    - **Enforcement**: All materiality thresholds must now be sourced from `FinancialsConfig`.

---

## Appendix A. Automated Violation Patterns (CI/CD Rules)

The following patterns MUST NOT exist in the production binary path:
1. `unwrap_or_default()` on `amount`, `severity`, or `title`.
2. Static numeric constants: `15420`, `37.5665`.
3. String fallbacks: `"mock"`, `"placeholder"`, `"sample"`.
4. Experimental model tags: `"-exp"`.
5. Hardcoded Materiality: `130000000000`, `13000000000`.
6. Literal FX Rates: `1350.0`, `1400.0`.
