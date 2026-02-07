# 🚫 Execution Refusal Spec
## (System Self-Protection Guidelines v1.0)

AuditFlow는 **Verified Judgment Engine**으로서, 판단의 정당성과 재현성이 확보되지 않은 환경에서의 실행을 시스템 레벨에서 거부한다. 본 문서는 시스템이 스스로를 보호하기 위해 실행을 중단(Refusal)해야 하는 명시적 조건을 규정한다.

---

### 1. 거부 대상 실행 (Target Executions)

본 명세는 다음의 실행 모드에 적용된다:
- **Verified Judgment Run** (Traceable Execution)
- **Resilience Stress Test** (Strategic Simulation)
- **Executive Report Generation** (Governance Consolidation)

---

### 2. 절대적 중단 조건 (Hard Refusal Conditions)

다음 조건 중 하나라도 충족될 경우, AuditFlow는 즉시 실행을 거부하고 에러를 발생시켜야 한다.

#### 2.1 RuleSet Integrity Failure
- **RuleSet = 'Draft'**: 확정되지 않은 규칙 세트로 Verified Run을 시도할 경우.
- **RuleSet Version Mismatch**: 입력 데이터 스냅샷의 시점과 적용하려는 규칙의 시점이 정합되지 않을 경우.

#### 2.2 Trace Path Incompleteness
- **JudgmentTrace Generation Failure**: 판단의 논리 흐름을 기록할 저장소나 핸들러가 확보되지 않았을 경우.
- **Evidence Snapshot Missing**: 판단의 근거가 되는 원천 데이터의 스냅샷이 누락되었을 경우.

#### 2.3 Judgment Boundary Violation
- **Heuristic-only Logic**: 결정론적 규칙(Deterministic Rules) 없이 AI의 추론(Heuristics)만으로 등급을 확정 지으려 할 경우. (Manifesto 3.1 위반)
- **Autonomous Intent Attribution**: 시스템이 인간의 개입 없이 사용자의 "의도(Intent)"를 직접적으로 단정 지으려 할 경우.

---

### 3. 조건부 거부 및 경고 (Conditional Refusal)

실행은 가능하나, **'Verified'** 인증 마크를 부여할 수 없는 조건:
- **PII Masking Integrity Unknown**: 데이터 마스킹 상태가 확인되지 않은 경우, 외부 데이터 전송(AI 분석)을 거부함.
- **Unstable Neural Connection**: AI 모델의 응답이 일관성을 잃거나 시스템 프롬프트를 이탈하려는 징후가 보일 경우.

---

### 4. 거부 메시지 표준 (Refusal UX)

실행 거부 시 사용자에게는 단순한 "Error"가 아닌, **헌법적 근거**가 포함된 메시지를 전달한다.

> **예시:** "Verified Judgment Run을 시작할 수 없습니다. 사유: RuleSet이 'Draft' 상태입니다. (Refusal Spec 2.1 준수) 판단의 재현성을 위해 규칙을 먼저 'Locked' 상태로 전환하십시오."

---

### 5. 선언 (Declaration)

이 거부 명세는 코드의 **Guard Clause**로 구현되어야 한다. 시스템의 실행 가능성보다 판단의 무결성이 항상 우선한다.
