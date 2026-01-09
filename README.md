# AuditFlow 🛡️

AuditFlow는 Gemini 3.0 하이브리드 엔진을 탑재한 차세대 지능형 감사 보조 시스템입니다. 대량의 데이터에서 리스크를 탐지하고, 복잡한 인과관계를 리스크 토폴로지로 시각화하며, 전문가 수준의 보고서를 자동 생성합니다.

## 핵심 기능 ✨

- **Gemini 3.0 Pro/Flash 하이브리드 엔진**: 
  - **라우팅 로직**: 대량 데이터의 실시간 클렌징 및 유효성 검사는 **Flash** (저비용/고속) 모델이 담당하고, 복잡한 리스크 판별 및 중요도 분류는 **Pro** (고품질/정밀) 모델이 담당하는 지능형 라우팅 구현
  - **Few-shot Learning**: 감사 도메인 특화 데이터(정상/이상 징후)를 모델에 사전에 학습시켜 탐지 정확도를 극적으로 향상
  - **비용 최적화**: Flash 모델 우선 활용 전략으로 API 호출 비용을 기존 대비 최대 80% 절감
- **가중치 기반 PII 탐지 엔진**: 
  - 단순 패턴 매칭을 넘어 이름, 주민번호, 주소 등 각 개인정보 항목별 가중치를 부여하고, 임계값을 초과하는 행(Row)만 선택적으로 마스킹 처리하는 정밀 탐지 시스템
- **리스크 토폴로지 (Risk Topology)**: 탐지된 리스크 간의 연관성을 그래프 시각화로 한눈에 파악
- **실시간 리스크 히트맵 동기화**: 분석 결과가 실시간으로 조직 리스크 히트맵에 반영되어 전사적 위험 수준 즉시 모니터링 가능
- **실시간 데이터 분석**: General Ledger 등 대용량 CSV 데이터의 실시간 리스크 스캐닝
- **전문화된 보고서**: 한국어 기반의 상세 감사 발견사항 및 권고안 자동 생성

## 시작 가이드 🛠️

### 필수 요구사항
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/) (stable)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

### 설정 (Environment Variables)
1. 프로젝트 루트에 `.env` 파일을 생성합니다.
2. Google AI Studio에서 발급받은 Gemini API 키를 입력합니다.
   ```env
   GOOGLE_API_KEY=your_api_key_here
   ```

### 기술 스택 📚
- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Backend**: Rust, Tauri 2.0
- **AI Core**: Google Gemini 1.5 Pro/Flash & 3.0 Hybrid Engine
- **Intelligence**: Weighted PII Engine, Few-shot Analysis Pipeline
- **Database**: SQLite (Local-first)


## 라이선스 📄
Copyright © 2026 AuditFlow Team. All rights reserved.
