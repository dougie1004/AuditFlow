# 📜 Phase 4 Entry Declaration – AuditFlow

## 1. Declaration of Entry

본 선언을 통해 AuditFlow 프로젝트는 **Phase 4 (Judgment Governance Phase)**에 공식적으로 진입했음을 선언한다.

Phase 4는 기능 확장이나 자동화 고도화를 의미하지 않는다. 이는 판단 권한, 책임 경계, 자동화의 한계를 명시적으로 고정한 상태에서만 허용되는 운영 단계이다.

AuditFlow는 본 단계부터 **“발견(Discovery)”이 아닌 “판단의 거버넌스(Judgment Governance)”**를 최우선 설계 목표로 삼는다.

---

## 2. Preconditions for Entry (Satisfied)

본 Phase 4 진입 선언은 다음의 문서들이 완결·합헌·상호 정합됨을 전제로 한다.

1. **Phase 4 Entry Gate – AuditFlow**
   - Phase 4의 정의, 금지 사항, 진입 요건이 문서적으로 고정됨
2. **Grade Constitution v1.1 – AuditFlow**
   - Grade A–D가 점수가 아닌 **불변 상태(State)**로 정의됨
   - 단일 규칙, 확률, AI 텍스트에 의한 자동 판결이 헌법적으로 금지됨
3. **Judgment Boundary Declaration – AuditFlow**
   - AUTO-CONFIRM / HUMAN-REQUIRED / AUTO-DISMISS의 책임 경계가 명시적으로 선언됨
   - 시스템이 무엇을 절대 자동으로 판단하지 않는지가 고정됨

위 문서 중 하나라도 무효화될 경우, 본 Phase 4 선언은 자동으로 효력을 상실한다.

---

## 3. Scope of Phase 4 Operations

Phase 4에서 AuditFlow는 다음 범위 내에서만 동작한다.

### Allowed
- 헌법과 선언문에 부합하는 결정론적 판결 로직의 구현
- 인간 판단을 전제로 한 B/C 등급 사례의 구조적 전달
- 재현 가능한 판결 결과 생성 및 감사 로그 축적

### Explicitly Disallowed
- 실데이터 기반 규칙 튜닝 또는 임계값 조정
- 처리 속도, 병별성, 비용 효율을 이유로 한 판단 단순화
- 자동 판결 범위의 암묵적 확대
- “AI가 판단했다”는 표현 또는 책임 전가
- **규칙 정확도(Accuracy) 또는 탐지율(Detection Rate)에 기반한 시스템 평가**

---

## 4. Definition of Phase 4 Compliance Testing

Phase 4의 "Compliance Testing"은 고도의 탐지 능력을 검증하는 과정이 아니다. 이는 시스템이 헌법적 가치를 기술적으로 준수하는지 확인하는 **무결성 테스트(Integrity Test)**로 한정된다.

### Testing Scope (Strictly Limited to):
1. **동일 입력 → 동일 결과 (Deterministic Check)**: 환경과 무관하게 동일한 데이터는 항상 동일한 판단 경로와 결과를 낳아야 함.
2. **Rule 변경 시 Diff 발생 (Change Traceability)**: 규칙의 작은 변경이 판단 결과에 어떤 영향을 미치는지 명확히 추적 가능해야 함.
3. **JudgmentTrace 누락 제로 (Trace Completeness)**: 모든 판단 단계에서 Manifesto 3.1에 따른 근거 기록이 단 하나도 누락되지 않아야 함.

### Non-Goal for Phase 4:
- 탐지 규칙의 정교화 및 정확도 향상
- 더 많은 이상 징후의 포착 (FP/FN 최적화)
- 분석 속도의 물리적 단축

---

## 4. Nature of Automation in Phase 4

Phase 4의 자동화는 결론을 내리기 위한 자동화가 아니라, 결론을 제한하기 위한 자동화이다.

AuditFlow는 다음 원칙을 따른다:
> “자동화는 편의를 위해 존재하지 않는다. 자동화는 잘못된 판단을 하지 않기 위해 존재한다.”

이에 따라, Phase 4에서 시스템은 다음을 적극적으로 수행한다:
- 의심스러운 사례의 자동 확정이 아닌 자동 보류
- 애매한 신호의 자동 기각이 아닌 인간 전달
- 확실한 위반만의 극히 제한적 자동 확인

---

## 5. Responsibility Statement

AuditFlow는 Phase 4부터 다음 책임 원칙을 따른다:
- 시스템은 결정의 보조자이며, 판사의 대체물이 아니다.
- 모든 고임팩트 판단의 최종 책임은 인간 전문가에게 귀속된다.
- 시스템은 판단하지 않는 선택을 의도적으로 유지할 수 있다. (이는 기술적 한계가 아니라, 윤리적·전문적 설계 선택이다.)

---

## 6. Closing Declaration

Phase 4는 완성이 아니라 통제의 시작이다.

AuditFlow는 본 단계에서 더 빨라지거나 더 공격적으로 판단하지 않는다. 대신, 더 느리더라도 항상 설명 가능하고 되돌릴 수 있는 판단 체계를 유지한다.

본 선언은 AuditFlow가 자동화보다 책임을 우선하는 감사 시스템임을 공식적으로 확인한다.
