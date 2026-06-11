# AuditFlow Architecture Review Gate (아키텍처 승인 게이트 검증 문서)

본 문서는 AuditFlow 플랫폼 내부통제 고도화 프로젝트의 다음 개발 단계로 진입하기 전, 감사 및 아키텍처 관점의 정당성을 최종 승인받기 위해 제출하는 **아키텍처 게이트(Architecture Review Gate) 검증 문서**입니다.

> [!IMPORTANT]
> **중요 공지 (Disclaimer)**
> 본 Sprint 6A의 결과는 실제 제조업 감사 정밀도 검증 결과가 아닙니다. 실제 제조업 ERP 데이터가 부재한 상황에서, 가상의 제조업 데이터셋(Synthetic Dataset: Deers)을 주입하여 기존 동결 엔진이 어떻게 반응하는지 확인한 **실험 검증 결과**입니다.

---

## 🚦 1. 아키텍처 게이트 통과 체크리스트 및 상태 요약

| 게이트 항목 | 세부 검증 사항 | 관련 산출물 | 검증 상태 |
| :--- | :--- | :--- | :---: |
| **A. Regression PASS** | • 5대 감사 도메인 및 제조업 가상 데이터셋 결과 정합성 검증<br>• `regression_baseline_v2.json` 스냅샷과 100% 일치 확인 (36개 이슈, 2개 관계) | [scenario_regression_report_v1.json](scenario_regression_report_v1.json) | **PASS** |
| **B. FF Domain 증적 제출** | • FF-01 ~ FF-05 시나리오의 구현부 및 테스트 가능성 감사<br>• 실질적인 탐지 연산 코드 유무 추적 및 실태 보고 | [ff_domain_audit_report.md](ff_domain_audit_report.md) | **SUBMITTED** |
| **C. Mapping Manifest 검증** | • 각 감사 시나리오별 통제 프레임워크 매핑 정교화<br>• 통제 영역(Control Area) 및 매핑 근거(Reason) 정의 완료 | [mapping_manifest_v2.json](mapping_manifest_v2.json) | **PASS** |
| **D. Sensitivity Paper 검토** | • 8대 활성 시나리오의 감도 수준별 임계치 수립 근거<br>• 각 감도 수준의 오탐(FP) 및 미탐(FN) 영향 분석 | [sensitivity_design_review.md](sensitivity_design_review.md) | **SUBMITTED** |
| **E. Advanced Mode OFF UI 검증** | • 토글 스위치 비활성화 시 화면 내 기술 노이즈 은폐 검증<br>• 최고경영진(회장님) 보고용 clean UX 정상 유지 확인 | [ScenarioManager.tsx](src/pages/ScenarioManager.tsx) | **PASS** |
| **F. 164개 시나리오 통제 현황** | • 전체 164개 시나리오 대비 실제 구현 시나리오 매핑 및 추적<br>• 구현율(Coverage Ratio) 4.27% 공식 기록 | [architecture_review_gate.md](architecture_review_gate.md) | **PASS** |

---

## 📊 2. 전체 164개 시나리오 구현 및 통제 상태 (Scenarios Status Table)

AuditFlow의 전체 설계 시나리오 164개에 대한 백엔드 감사 엔진 구현 현황 및 정합성 검증 결과는 다음과 같습니다.

* **총 설계 시나리오**: 164개
* **실제 구현된 시나리오**: 7개 (`PR-02`, `EX-04`, `LDG-01`, `LDG-02`, `LDG-05`, `LDG-06`, `LDG-07`)
* **미구현 시나리오**: 157개 (재고 도메인 `IN-01`, `IN-05` 및 자금 도메인 `FF` 시리즈 전체 포함)
* **시나리오 커버리지 비율**: **4.27%** (7 / 164)

### 2.1 감사 도메인별 세부 구현 현황

| 감사 도메인 | 코드 | 설계 시나리오 수 | 구현 완료 (검증 필) | 미구현 시나리오 수 | 주요 구현 시나리오 및 상태 |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Procurement** (구매) | `PR` | 10 | 1 | 9 | • **PR-02** (품의 분할): 구현 완료 및 탐지 검증<br>• 타 시나리오(PR-01, PR-03 등): 미구현 |
| **Expense** (법인카드/경비) | `EX` | 10 | 1 | 9 | • **EX-04** (제한 업종 직접 감지): 구현 완료 및 탐지 검증<br>• 타 시나리오(EX-01, EX-02 등): 미구현 |
| **Ledger** (일반 전표) | `LDG` | 8 | 5 | 3 | • **LDG-01** (고액 상위 1%), **LDG-02** (라운드 금액 반복), **LDG-05** (계정 액티비티 변동), **LDG-06** (특정 부서 집중), **LDG-07** (적요 키워드 위험): 구현 완료 및 탐지 검증<br>• 타 시나리오: 미구현 |
| **Finance** (자금 흐름) | `FF` | 5 | 0 | 5 | • **FF-01 ~ FF-05**: **전수 미구현** (소스코드 상 탐지 로직 부재, [ff_domain_audit_report.md](ff_domain_audit_report.md) 참고) |
| **Inventory** (재고 감사) | `IN` | 10 | 0 | 10 | • **IN-01** (재고 감모율 폭증), **IN-05** (고가 재고 임의 폐기): **전수 미구현** (일반 전표 엔진 우회 검출만 존재) |
| **기타 도메인** (매출, 인사 등) | - | 121 | 0 | 121 | • 전체 미구현 (향후 고도화 단계에서 구현 예정) |
| **합계** | | **164** | **7** | **157** | **커버리지: 4.27%** |

---

## 🛠️ 3. 항목별 세부 검증 보고

### 1) [A] Regression PASS (회귀 테스트 및 신규 베이스라인 정합성 검증)
* **검증 방법**: 신규 작성된 독립 회귀 테스트 러너(`regression_baseline.rs`)를 실행하여 이상치가 주입된 제조업 가상 데이터셋 3종(`deers_procurement.csv`, `deers_ledger.csv`, `deers_inventory.csv`)을 분석하고, 그 결과가 동결된 스냅샷 기준선(`regression_baseline_v2.json`)의 **36개 이슈 및 2개 관계 정보와 100% 완벽하게 일치(PASS)**함을 확인했습니다.
* **중요 통제 원칙**: 헌법 제6조에 따라, 코어 판정 엔진(`audit_engine.rs`, `compliance_judge.rs`)은 코드 프리즈 상태를 완벽히 유지하였으며, 기존 룰을 적용해 제조업 가상 전표를 분석한 결과의 정합성만을 검증했습니다.
* **재고(IN) 시나리오 정밀 분석**: `IN-01` 및 `IN-05`는 백엔드 소스코드 내에 탐지 로직이 존재하지 않아 **0건 탐지**되었습니다. 다만 `deers_inventory.csv`에 기록된 거액 감모 정산 전표는 일반전표 엔진에 의해 고액 전표(`LDG-01`) 및 라운드 금액 반복(`LDG-02`)으로 우회 감지되어, 기존 엔진의 반응도가 정상 작동함을 확인했습니다.

### 2) [B] FF Domain 증적 제출 (자금 흐름 영역 실태조사)
* **검증 결과**: 자금 순환 및 송금 이상 거래를 탐지하는 `FF-01` ~ `FF-05` 시나리오는 백엔드 Rust 소스코드 내에 실질적인 연산 로직이 전혀 작성되어 있지 않은 **"완전 미구현(0.0%)"** 상태입니다. 해당 내용은 [ff_domain_audit_report.md](ff_domain_audit_report.md)에 정직하고 투명하게 기록하여 클라우드에 공시했습니다.

### 3) [C] Mapping Manifest 검증 (규제 준수 프레임워크 매핑)
* **검증 결과**: 규제 준수 프레임워크(ISO37001, COSO, NTS 등)와 감사 시나리오 간의 매핑 정교화를 완료했습니다. 각 시나리오별 통제 영역 및 명확한 감사 매핑 근거(Reason)를 정의한 [mapping_manifest_v2.json](mapping_manifest_v2.json)을 구성하여 컴플라이언스 테마의 아키텍처 정당성을 증명했습니다.

### 4) [D] Sensitivity Paper 검토 완료 (감도 정밀 조율 근거)
* **검증 결과**: 8대 활성 시나리오에 대해 수립된 감도 테이블의 정당성을 감사관 관점에서 공시했습니다. Low(오탐 최소화/일상적 통제), Normal(권장 기준선), High(미탐 최소화/정밀 감사) 감도 조율에 따른 오탐(FP) 및 미탐(FN) 위험 영향을 종합 분석하여 [sensitivity_design_review.md](sensitivity_design_review.md)로 보고 완료했습니다.

### 5) [E] Advanced Mode OFF 상태 UI 회귀 검증
* **검증 결과**: 복잡한 개발 파라미터가 최고경영진 및 비기술적 사용자에게 노출되지 않는지 UI 회귀 검증을 수행했습니다. `ScenarioManager.tsx`의 **`Advanced Mode` 토글 스위치가 OFF 상태일 때 정밀 캘리브레이션 폼, 컴플라이언스 테마 셀렉터, SQLite 변경 이력 로그 뷰어 등이 완벽하게 화면에서 숨김(Hidden) 처리**됨을 확인했습니다.

### 6) [F] SQLite Audit Trail (감사 추적 이력 시스템)
* **검증 결과**: 감사 매개변수의 변경 이력을 추적 및 보존하기 위한 SQLite DDL 및 IPC 명령어가 올바르게 구현되어 정상 작동함을 확인했습니다.
  * **데이터베이스 스키마 (`database.rs`)**: `scenario_parameter_overrides` (현재 매개변수 값 유지) 및 `scenario_parameter_override_history` (모든 변경 사항 이력 보존) 테이블 구현 완료.
  * **서버 연산 명령어 (`commands_append.rs`)**: `get_parameter_overrides`, `set_parameter_override`, `get_parameter_override_history` IPC 인터페이스 구현 및 로깅 안정성 검증 완료.

---

## 🔒 4. 게이트 통제 준수 서약

본 게이트 문서에 기재된 6개 검증 항목에 대한 경영진 및 PM의 승인이 완료되기 전까지, **코어 판정 엔진(`audit_engine.rs`, `compliance_judge.rs`)에 어댑터(`sensitivity_adapter.rs`) 및 오버라이드 컨텍스트(`ScenarioContext`)를 연계·결합하는 작업을 원천 금지**할 것을 엄격히 약속합니다.
