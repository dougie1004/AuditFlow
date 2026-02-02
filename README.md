# AuditFlow: Automated Compliance & Audit Decision Engine

> **"회계 데이터를 입력값으로 사용하는 독립적인 규정 준수 및 감사 결정 엔진"**
>
> *"This is NOT an accounting system. This is an AUDIT system."*

AuditFlow is a **Rule-First, AI-Augmented Audit Engine** designed to detect compliance violations with legal-grade evidence chains.

## 🏛️ Core Philosophy (The Iron Rules)

1.  **Rule is the Judge (Authority)**
    *   Violation detection is **Deterministic** based on Hard Rules (Rust Engine).
    *   AI never decides "Guilty/Not Guilty".
2.  **AI is the Witness (Commentary)**
    *   AI explains the *context* of established violations.
    *   AI outputs are strictly limited to "Narrative" and cannot override risk flags.
3.  **Evidence is Immutable**
    *   Once a finding is created, its evidence chain is sealed.

## 🏗️ Architecture: Compliance DD Flow

Data → **[Rule Engine]** (Hard Rules) → **[ComplianceFinding]** → **[AI Witness]** (Context) → **[Immutable Record]**

- `src-tauri/src/compliance_dd_flow.rs`: The Supreme Authority Module.
- `src-tauri/src/audit_engine.rs`: Legacy/Utility functions.

## 🚀 Key Features

*   **Deterministic Violation Detection**: Split payments, restricted vendors, time/date anomalies.
*   **Legal-Grade Evidence Chain**: JSON-structured evidence linked to specific regulations.
*   **AI Commentary with Safety Seals**: Automated generation of audit narratives with mandatory legal disclaimers.

## 🛠️ Stack

*   **Core**: Rust (Tauri)
*   **DB**: SQLite (Local, Secure)
*   **UI**: React + Tailwind
*   **AI**: Google Gemini Flash (Strictly controlled scope)
