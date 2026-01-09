# AuditFlow 🛡️

AuditFlow는 Gemini 3.0 하이브리드 엔진을 탑재한 차세대 지능형 감사 보조 시스템입니다. 대량의 데이터에서 리스크를 탐지하고, 복잡한 인과관계를 리스크 토폴로지로 시각화하며, 전문가 수준의 보고서를 자동 생성합니다.

## 핵심 기능 ✨

- **Gemini 3.0 하이브리드 엔진**: 
  - **Flash 모델**: 대량 데이터의 실시간 클렌징 및 유효성 검사 (저비용/고속)
  - **Pro 모델**: 복잡한 리스크 판별, 중요도(Severity) 분류 및 감사 보고서 생성 (고품질/정밀)
- **리스크 토폴로지 (Risk Topology)**: 탐지된 리스크 간의 연관성을 그래프 시각화로 한눈에 파악
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

### 설치 및 빌드
```bash
# 의존성 설치
npm install

# 개발 모드 실행
npm run tauri dev

# 프로덕션 빌드
npm run tauri build
```

## 기술 스택 📚
- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Backend**: Rust, Tauri 2.0
- **AI**: Google Gemini 1.5 Pro/Flash & 3.0 Hybrid Engine
- **Database**: SQLite (Local-first)

## 라이선스 📄
Copyright © 2026 AuditFlow Team. All rights reserved.
