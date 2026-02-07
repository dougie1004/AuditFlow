# AuditFlow v1.0 Safe Harbor Policy (Exception Clause)

To prevent developmental paralysis while maintaining constitutional integrity, the following "Safe Harbors" are defined as permissible states in the AuditFlow v1.0 engine.

## ⚖️ Permissible NULL / NONE
A `None` or `Null` value is NOT a constitutional violation if it represents:
1. **User Initiation**: The user has intentionally left a non-mandatory field empty in a dataset.
2. **Pre-Processing State**: Data that is currently in the ingestion pipeline and has not yet reached the Adjudication phase.
3. **Optional Context**: Metadata that is useful but not critical for the final "Guilty/Innocent" verdict.

## 🔍 Permissible Undeterminable State
If the AI or Rule Engine cannot reached a definitive conclusion due to lack of evidence, it MUST return `ConstitutionalSafeHarbor::InsufficientData`.
- **Honest Refusal**: Stating "I don't know" is a constitutional virtue. 
- **Prohibition**: Guessing or using a default "Low Risk" (Kind Lie) is a violation.

## 🔢 Permissible System Constants
The followings are NOT forbidden literals:
1. **Mathematical Zeros**: Used for counts, balances, and initialized metrics.
2. **Structural IDs**: Project IDs (UUIDs), File IDs, and Rule IDs.
3. **Empty Strings of Intent**: `""` used to signify a "Waiting for Input" state in UI components.
4. **Standard Audit Terminology**: Terms like "Internal Auditor", "Ghost Employee", "Risk Assessment" are allowed (Script whitelist applied).

## 🛡️ The "Emergency Override" (ALLOW_MOCK)
In rare cases where a mock value is absolutely required for a specific unit test, the developer must attach the `// ALLOW_MOCK` comment to that line. The CI script will ignore lines with this annotation.

---
*Seal of Honesty v1.0 - Locked.*
