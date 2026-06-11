# FF Domain Audit Report (자금 흐름 영역 전수 감사 보고서)

본 보고서는 AuditFlow 플랫폼 내의 핵심 차별화 요소인 **자금 흐름(Financial Integrity - FF) 시나리오 5종**의 Rust 백엔드 엔진 내 실제 구현 여부 및 테스트 가능성을 전수 전수조사한 품질 검증 서류입니다.

---

## 🔎 1. FF Domain 시나리오별 구현 및 스캔 결과

백엔드 소스코드 전수 검색(`FF-`, `cycling`, `ping`, `lapping` 등)을 통해 각 시나리오의 실질적인 구현 증적을 추적한 결과는 다음과 같습니다.

### 1) FF-01: Rapid Money Cycling (Ping-pong)
* **설명**: 24시간 이내에 특정 계정으로 나간 금액이 특수관계자 등을 거쳐 다시 회사 계정으로 순환 입금되는 핑퐁 거래 감지.
* **실제 구현 여부**: **미구현 (Unimplemented)**
* **소스코드 내 증적**:
  * [scenarios_seeder.rs](file:///c:/Users/user/.gemini/antigravity/playground/AuditFlow/src-tauri/src/scenarios_seeder.rs#L201)에 시나리오 설명 DDL 시드만 존재.
  * [regression_baseline.rs:L255](file:///c:/Users/user/.gemini/antigravity/playground/AuditFlow/src-tauri/src/bin/regression_baseline.rs#L255)에 `// Run correlations for money cycling` 주석이 달려 있고 `flux_engine::FluxEngine::run_correlations(&conn)`을 호출하고 있으나, 실제 `flux_engine.rs` 내부에는 구매 분할 결제(PR-02) 쿼리만 작동 중이며 핑퐁 순환 감지 로직은 비어 있음.

### 2) FF-02: Lapping & Ledger Delay
* **설명**: 은행 송금 입금일과 장부상 전표 기입일 간의 2일 이상 차이를 추적하여 자금 유용 및 래핑(Lapping) 행위 감지.
* **실제 구현 여부**: **미구현 (Unimplemented)**
* **소스코드 내 증적**:
  * [scenarios_seeder.rs](file:///c:/Users/user/.gemini/antigravity/playground/AuditFlow/src-tauri/src/scenarios_seeder.rs#L202)에 메타데이터 시드 등록 이외에 소스코드 내 연산 로직 없음.

### 3) FF-03: Registered Vendor Mismatch
* **설명**: 장부상 '법인 거래처'로 기록되었으나 실제 은행 송금 수취인은 개인 계좌인 경우 감지.
* **실제 구현 여부**: **미구현 (Unimplemented)**
* **소스코드 내 증적**:
  * [scenarios_seeder.rs](file:///c:/Users/user/.gemini/antigravity/playground/AuditFlow/src-tauri/src/scenarios_seeder.rs#L203)에 설명 시드 등록 외에 소스코드 내 연산 로직 없음.

### 4) FF-04: Structured Threshold Monitor
* **설명**: 송금 보고 의무 기준인 10,000달러 바로 아래인 9,900달러 등으로 쪼개기 거래가 반복 발생하는 금융 모니터링 우회 행위 감지.
* **실제 구현 여부**: **미구현 (Unimplemented)**
* **소스코드 내 증적**:
  * [scenarios_seeder.rs](file:///c:/Users/user/.gemini/antigravity/playground/AuditFlow/src-tauri/src/scenarios_seeder.rs#L204)에 메타데이터 시드 등록 이외에 소스코드 내 연산 로직 없음.

### 5) FF-05: Inactive Project Account Drain
* **설명**: 12개월 이상 비활성화되어 유휴 상태인 프로젝트 자금 계좌에서 갑작스럽게 거액의 송금이 발생하는 자금 유출 징후 감지.
* **실제 구현 여부**: **미구현 (Unimplemented)**
* **소스코드 내 증적**:
  * [scenarios_seeder.rs](file:///c:/Users/user/.gemini/antigravity/playground/AuditFlow/src-tauri/src/scenarios_seeder.rs#L205)에 메타데이터 시드 등록 이외에 소스코드 내 연산 로직 없음.

---

## ⚠️ 2. 종합 판단 및 테스트 가능 여부

* **실제 구현 여부**: **FF 도메인의 모든 시나리오(FF-01 ~ FF-05)는 현재 Rust 엔진 내에 어떠한 연산 코드나 판정 조건식도 존재하지 않는 "완전 미구현(0.0%)" 상태**입니다.
* **테스트 가능 여부**: 
  * 엔진 내 조건식이 부재하므로, 현 상태에서 골든 데이터셋(`golden_finance.csv`)을 흘려보내도 FF-01 ~ FF-05에 대한 위반 탐지는 발생하지 않으며(0건 검출), 따라서 **회귀 테스트 및 정합성 검증이 불가능**합니다.
  * 골든 데이터셋 실행 시 `relations`가 2건만 나오는 근본적인 원인은 이 영역이 완전히 비어 있기 때문입니다.
* **향후 대응 방안**:
  * 추후 Sprint 5C 결합 단계 이전에 FF 영역의 탐지 로직(예: SQL 혹은 메모리 내 핑퐁 순환 그래프 탐색 알고리즘)이 구현되어야만 실질적인 자금 흐름 모니터링이 가능해집니다.
  * 현 개발 단계에서는 UI 및 DB 감사 증적 저장소(Calibrations)만 선제 마련된 상태이므로, 코드 연결은 원천 금지합니다.

---

## 🗺️ 3. 자금 흐름(FF) 영역 시나리오별 실제 구현 로드맵 (Proposed Roadmap)

CPA 및 내부감사 요건에 부합하는 자금 흐름 탐지 기능을 엔진에 통합하기 위한 구체적인 기술적 구현 로드맵입니다:

### 1) [FF-01] Rapid Money Cycling (Ping-pong) 구현 계획
* **구현 방식**: 
  * 자금 이동 내역(`entity_event`) 데이터를 directed graph(유향 그래프) 구조로 추상화하여, 메모리 상에서 DFS(깊이 우선 탐색) 또는 Tarjan 알고리즘을 통해 자금 순환 사이클 탐색.
  * 사이클 내의 거래 일자 차이가 24시간 이내이고, 이체 금액의 차이가 5% 이내인 경우 '핑퐁 거래 관계'로 판단.
* **대상 파일**: `src-tauri/src/flux_engine.rs`
* **신설 함수**: `pub fn detect_money_cycling(conn: &Connection) -> Result<usize, String>`

### 2) [FF-02] Lapping & Ledger Delay 구현 계획
* **구현 방식**:
  * 은행 실 송금일(`CARD` 또는 `BANK` 소스)과 장부 전표 입력일(`LEDGER` 소스)을 Invoice ID 혹은 거래처별로 대조.
  * 은행 거래 일자 대비 장부 입력일의 지연 일수(`ledger_date - bank_date`)를 계산하여, 임계값(예: 2일 이상)을 초과해 기록을 고의 지연하거나 다음 수취금으로 대체하는 징후 검출 시 경고.
* **대상 파일**: `src-tauri/src/ledger_engine.rs`
* **신설 함수**: `pub fn detect_ledger_delay(conn: &Connection) -> Result<usize, String>`

### 3) [FF-03] Registered Vendor Mismatch 구현 계획
* **구현 방식**:
  * 마스터 거래처 대장(계좌 실명 데이터 포함)과 실제 전표 송금 실행 파일의 예금주명을 비교 대조.
  * 송금 실행 Beneficiary가 법인 거래처가 아닌 개인 성명으로 식별되거나, 마스터 대장의 등록 계좌명과 불일치할 경우 우회 거래로 필터링.
* **대상 파일**: `src-tauri/src/compliance_judge.rs`
* **신설 함수**: `pub fn check_vendor_account_mismatch(conn: &Connection) -> Result<usize, String>`

### 4) [FF-04] Structured Threshold Monitor 구현 계획
* **구현 방식**:
  * 고액 현금 거래 보고(CTR) 기준인 1천만 원(또는 1만 달러) 회피 목적의 쪼개기(Structuring) 송금을 추적.
  * 동일인/동일 거래처에 대해 동일 날짜(혹은 3일 내)에 900만 원~999만 원 대의 분할 이체가 반복 발생하는 패턴을 군집(Clustering)화하여 탐지.
* **대상 파일**: `src-tauri/src/flux_engine.rs`
* **신설 함수**: `pub fn detect_structured_transactions(conn: &Connection) -> Result<usize, String>`

### 5) [FF-05] Inactive Project Account Drain 구현 계획
* **구현 방식**:
  * 최근 12개월(365일)간 자금 유출 이력이 없던 비활성 프로젝트용 은행 계좌 목록 필터링.
  * 해당 유휴 계좌에서 갑작스럽게 임계값(예: 500만 원)을 초과하는 고액의 대외 송금이 발생할 경우 유휴 자금 횡령 징후로 판단하여 즉각 탐지.
* **대상 파일**: `src-tauri/src/flux_engine.rs`
* **신설 함수**: `pub fn detect_inactive_account_drain(conn: &Connection) -> Result<usize, String>`
