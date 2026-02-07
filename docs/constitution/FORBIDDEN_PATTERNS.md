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

## Appendix A. Automated Violation Patterns (CI/CD Rules)

The following patterns MUST NOT exist in the production binary path:
1. `unwrap_or_default()` on `amount`, `severity`, or `title`.
2. Static numeric constants: `15420`, `37.5665`.
3. String fallbacks: `"mock"`, `"placeholder"`, `"sample"`.
