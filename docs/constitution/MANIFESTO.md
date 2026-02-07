# AuditFlow Manifesto v1.0
## (Verified Judgment Engine)

### 1. 존재 이유 (Purpose)

AuditFlow는 **판단이 옳았는지를 대신 결정하지 않는다.**
AuditFlow는 **그 판단이 어떻게 내려졌는지를 검증한다.**

AuditFlow의 목적은 결과를 인증하는 것이 아니라, 의사결정 과정이 **정합적·설명 가능·재현 가능**했는지를 입증하는 것이다.

---

### 2. AuditFlow가 다루는 대상 (Scope)

AuditFlow는 데이터를 평가하지 않는다. AuditFlow는 **판단(Judgment)**을 평가한다.

AuditFlow가 다루는 것은 다음으로 한정된다:
1. 사람이거나 시스템이 내린 판단
2. 그 판단에 적용된 규칙
3. 판단의 근거가 된 데이터 스냅샷
4. 판단이 내려진 절차와 순서

AuditFlow는 “이 회사는 안전하다 / 위험하다”를 말하지 않는다.
AuditFlow는 **“이 판단은 이러한 조건과 규칙 하에서 내려졌다”**를 말한다.

---

### 3. 핵심 원칙 (Core Principles)

#### 3.1 설명 불가능한 판단은 허용되지 않는다
모든 판단은 반드시 다음을 포함해야 한다:
- 적용된 규칙
- 배제된 규칙
- 사용된 근거
- 판단에 이른 논리 흐름

설명할 수 없는 판단은 AuditFlow에서 존재할 수 없다.

#### 3.2 동일 입력은 동일 판단을 낳아야 한다
AuditFlow는 확률 시스템이 아니다. AuditFlow는 **결정 시스템**이다.
동일한 입력, 동일한 규칙, 동일한 환경에서는 반드시 동일한 판단이 재현되어야 한다.

#### 3.3 AuditFlow는 사람을 대체하지 않는다
AuditFlow는 인간의 판단을 대신하지 않는다. AuditFlow는 **인간의 판단을 보호한다.**
최종 판단 책임은 항상 인간에게 있다. AuditFlow의 역할은 판단의 근거를 남기는 것이다.

#### 3.4 버린 판단은 존재하지 않는다
*Dismissed, No Issue, Cleared* 상태는 무시가 아니라 **검증 완료**를 의미한다.
AuditFlow는 “보지 않았다”는 상태를 허용하지 않는다. “검토했고, 책임이 없음을 확인했다”만을 허용한다.

---

### 4. AuditFlow가 의도적으로 하지 않는 것 (Negative Capability)

AuditFlow는 다음을 의도적으로 수행하지 않는다:
- 결과를 인증하거나 보증하지 않는다
- 규정 준수를 선언하지 않는다
- **미래 리스크를 예측하지 않는다** (The system evaluates resilience, not fortune-telling)
- 인간 판단을 자동으로 대체하지 않는다
- 설명 없이 학습하거나 변경되지 않는다

이 항목들은 기술적 한계가 아니라 **설계적 선택**이다.

---

### 5. 실행 모드에 대한 원칙 (Execution Integrity)

AuditFlow의 **검증 실행(Verified Judgment Run)**은 다음 조건이 충족될 때만 허용된다:
1. 규칙 세트가 고정되어 있을 것
2. 판단 경로가 전부 기록 가능할 것
3. 재현성 검증이 가능할 것
4. 책임 경계가 명확할 것

이 조건을 만족하지 못하면 AuditFlow는 실행을 거부한다.

---

### 6. 최종 선언 (Declaration)

AuditFlow는 감사를 자동화하는 도구가 아니다. AI 판사를 만드는 시스템도 아니다.
AuditFlow는 판단이 정당하게 이루어졌음을 증명하기 위한 **Verified Judgment Engine**이다.

이 선언은 기능보다 우선하며, 코드보다 상위에 존재한다.
