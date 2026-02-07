# 🧪 AuditFlow v1.0 테스트 로드맵
## (Constitutional Integrity Test Suite)

AuditFlow의 테스트는 기능의 작동 여부가 아니라, **시스템이 스스로의 원칙(Manifesto)을 준수하는지**를 검증하는 과정이다.

---

### 🏛️ 테스트 대원칙
- ❌ **정확도(Accuracy) 테스트 아님**: 발견율이나 탐지율을 평가하지 않는다.
- ❌ **성능(Performance) 테스트 아님**: 분석 속도를 측정하지 않는다.
- ❌ **UX 테스트 아님**: 화면의 편의성을 보지 않는다.
- 👉 **헌법 테스트 / 판단 무결성 테스트**: 시스템이 책임 경계를 지키고, 설명 가능한 판단을 내리며, 결정론적으로 동작하는지 검증한다.

---

### 🚩 PHASE 0 — 테스트 환경 고정
테스트 시작 전 다음 요소들이 메타데이터로 고정 및 출력되어야 한다.
- **Rule Set Version**: 사용된 규칙 세트의 고유 버전.
- **Engine Version**: 감사 엔진 코드의 버전.
- **Manifesto Version**: `MANIFESTO.md`의 커밋 해시 또는 버전.
- **DB Schema Version**: 데이터베이스 스키마 버전.

---

### 🛡️ PHASE 1 — 실행 자격 테스트 (Execution Refusal Test)
**목적**: 실행되어서는 안 되는 조건에서 시스템이 명확히 거부(Refusal)하는지 확인한다.
- **1-1. RuleSet = Draft**: 'Locked'되지 않은 규칙으로는 'Verified Judgment Run'을 수행할 수 없다.
- **1-2. Trace Path 불완전**: 판단 경로를 기록할 수 없는 환경에서는 실행을 중단한다.
- **1-3. Heuristic-only 판단**: 명시적 규칙(Explicit Rule) 없이 AI의 추론만으로 등급을 확정하는 것을 거부한다.

---

### 💎 PHASE 2 — 결정론 테스트 (Determinism Test)
**목적**: 동일 입력에 대해 상시 동일한 결과를 보장하는 결정 시스템임을 증명한다.
- **2-1. 동일 입력 반복 실행**: 동일 데이터/규칙셋 3회 실행 시 Hash 및 Trace가 일치해야 한다.
- **2-2. 실행 순서 무작위화**: 규칙 평가 순서가 바뀌어도 최종 Judgment는 불변해야 한다.

---

### 🗣️ PHASE 3 — 설명 가능성 테스트 (Explainability Test)
**목적**: "설명 없는 판단은 존재하지 않는다"는 원칙을 검증한다.
- **3-1. Confirmed**: Applied Rules, Evidence Snapshot, 판단 근거가 명확히 제시되어야 한다.
- **3-2. Manual Review**: 왜 자동 확정이 불가능한지, 인간의 어떤 판단이 필요한지 명시되어야 한다.
- **3-3. Dismissed**: 검토된 리스크 목록과 "책임 없음"에 대한 정당한 사유가 포함되어야 한다.

---

### 🚧 PHASE 4 — Negative Capability 테스트
**목적**: 시스템이 하지 말아야 할 일(예측, 보증 등)을 명확히 거절하는지 확인한다.
- **4-1. 예측 요구 거부**: 미래 리스크나 생존 확률에 대한 주관적 수치 제공을 거부한다.
- **4-2. 자동 승인 요구 거부**: "문제 없으면 자동 통과"와 같은 결과 인증 요구를 거부한다.

---

### 🤝 PHASE 5 — Human-in-the-loop 테스트
**목적**: 인간의 개입이 시스템의 무결성을 깨지 않고 기록되는지 확인한다.
- **5-1. 판단 수정 기록**: AI 판결과 인간 판결이 별도 레이어로 보존되는지 확인한다.
- **5-2. Annotation 보존**: 원본 Trace를 훼손하지 않고 사람의 rationale이 추가되는지 확인한다.

---

### 📉 PHASE 6 — 실패의 품질 테스트 (Failure Quality)
**목적**: 시스템 실패 시 불완전한 결과를 노출하지 않고 안전하게 중단되는지 확인한다.
- **6-1. 무결성 훼손 시 중단**: DB 연결 실패 등 발생 시 Partial Judgment를 절대 보여주지 않는다.
- **6-2. No Judgment rendered**: 실패 시 명확히 "판결 없음" 상태를 유지한다.
- **6-3. Dataset Tampering**: 확정(Lock)된 시점 이후 데이터 파일이 1바이트라도 변경되면 실행을 원천 차단한다.

---

### 🏁 PHASE 7 — v1.0 통과 기준
- 설명 없는 판단이 단 하나라도 존재하는가? → **NO**
- 재현 불가능한 실행이 있는가? → **NO**
- AuditFlow가 책임을 가져간 적이 있는가? → **NO**
- 사람이 개입하면 기록이 깨지는가? → **NO**

---

### 🏛️ 구현 및 검증 상태 (2026-02-06)
- [x] **PHASE 0**: 고정된 하드웨어/메타데이터 출력 (`commands.rs` 환경 체크 로직)
- [x] **PHASE 1**: 실행 거절 스펙 (`LOCKED` 상태 체크, `HeuristicOnlyViolation` 필터)
- [x] **PHASE 2**: 결정론적 해시 (`integrity_hash` 생성 로직)
- [x] **PHASE 3**: Logic Trace 시각화 (`logic_chain` 렌더링)
- [x] **PHASE 4**: 예측 및 책임 회피 가드 (`ask_ai_assistant` 시스템 프롬프트)
- [x] **PHASE 5**: 인간 개입 추적 (`HUMAN_REVIEWED` 플래그 및 원본 보호)
- [x] **PHASE 6**: 실패 품질 보증 (에러 발생 시 즉각 중단 로직)

**최종 상태: 憲法(CONSTITUTION) 준수 엔진 v1.0 READY**
