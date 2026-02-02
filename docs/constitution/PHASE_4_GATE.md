# Phase 4 Entry Gate – AuditFlow

## Section 1. Current System Status
The AuditFlow system is currently positioned in **Phase 3.9 (Advanced Discovery & Signal Generation)**. 

### Existing Capabilities:
- High-fidelity ingestion of raw audit data.
- AI-driven discovery of risk signals with granular anomaly scoring (0.3–1.0).
- Categorization of signals based on metadata extraction and observation text.
- Functional database storage of risk signals in a suspicion inbox.

### Not Yet Satisfied for Phase 4:
- The **Grade Constitution** is not yet locked; current adjudication relies on heuristic thresholds rather than constitutional rule combinations.
- **Responsibility Boundaries** have not been formally codified within the code execution path.
- **Deterministic Reproducibility** has not been verified; current outcomes may vary based on probabilistic AI inference during the signal generation phase.
- **Automatic judgment restraint** is not yet enforced; the system lacks a hard-coded mechanism to prevent single-rule Grade A assignments.

---

## Section 2. Definition of Phase 4
Phase 4 is the transition from a "Discovery Engine" to a "Judgment Pipeline" where the system performs formal adjudication within strictly governed human boundaries, characterized by total deterministic reproducibility and codified judgment restraint.

---

## Section 3. Phase 4 Entry Gates (Checklist)

### Gate 1: Grade Constitution Fixed
- **Description**: The logic defining Grades A–D must be moved from heuristic weighting to a fixed, state-based constitutional matrix.
- **Pass Criteria**: No Grade A or D can be assigned by a single rule or an AI-generated text narrative; Grade A requires both Intent-Strong and Objective Violation rules.
- **Fail Criteria**: Any path exists where a single software rule or a standalone anomaly score results in an automated "Confirmed" status.

### Gate 2: Automatic Judgment Scope Explicitly Limited
- **Description**: The technical definition of "Auto-Confirmable" and "Auto-Dismissible" domains must be locked.
- **Pass Criteria**: Auto-confirmation is restricted solely to the intersection of IS and OV rule categories.
- **Fail Criteria**: The system permits automated dismissal of signals that contain a partial match to a high-risk objective rule.

### Gate 3: Human Judgment Boundary Codified
- **Description**: The workflow for Grades B and C must be technically redirected to mandatory expert interfaces.
- **Pass Criteria**: All probablistic or heuristic findings (Grades B and C) are hard-locked behind a human review gate with no bypass capability.
- **Fail Criteria**: System allows the "Finalizing" of a Grade B or C report without a verified human digital signature.

### Gate 4: Deterministic Reproducibility Verified
- **Description**: The adjudication logic must be separated from the discovery logic to ensure consistency.
- **Pass Criteria**: Re-running the adjudication pipeline on the same `suspicion_inbox` dataset produces 100% identical Grade assignments across multiple iterations.
- **Fail Criteria**: Any variance in Grade assignment occurs during repeated processing of static signal data.

### Gate 5: Regression Safety Guaranteed
- **Description**: Safeguards against logic "drift" or unintended weakening of thresholds.
- **Pass Criteria**: A suite of "Constitutional Integrity" tests confirms that updates to detection prompts cannot modify the adjudication outcome rules.
- **Fail Criteria**: Adjudication outcomes change because of a change in AI discovery prompt phrasing.

---

## Section 4. Explicit Prohibitions Before Phase 4
The following actions are strictly **FORBIDDEN** until a formal Phase 4 entry certificate is issued:
1.  **Automatic Confirmation on Real Enterprise Data**: Under no circumstances shall the system auto-confirm a violation in a production environment.
2.  **Speed / Throughput Optimization**: Performance tuning that sacrifices logic transparency or debug-traceability for processing speed is prohibited.
4. **Fast Mode Integrity**: Fast Mode Replay execution is strictly non-authoritative. Any failure, rollback, or interruption during batch execution SHALL NOT be interpreted as partial judgment or system decision.

---

## Section 5. Formal Declaration
This system MUST NOT claim Phase 4 status unless all gates above are passed. Violation of this gate invalidates any Phase 4 claim. Any automated adjudication performed prior to the verification of these gates is considered a high-risk governance failure.
