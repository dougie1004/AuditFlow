use serde::{Deserialize, Serialize};
use rusqlite::Connection;

/// [JUDGE LAYOUT]
/// 이 모듈은 "배심원(AI)"이 제출한 Fact와 Evidence를 바탕으로,
/// "판사(Code)"가 확정적인 재무적/법적 판단을 내리는 로직을 담당합니다.
/// 
/// 핵심 철학:
/// 1. AI는 수치를 결정할 수 없다. (AI cannot determine the numbers)
/// 2. 숫자는 오직 '예산(Budget)'과 '위반 강도(Severity)'의 확정적 함수로 산출된다.

// ============================================================================
// 1. Data Structures
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct ExposureVerdict {
    pub entity_name: String,
    pub budget_tier: String,      // Startup | Growth | Enterprise
    pub risk_level: String,       // LOW | MEDIUM | HIGH
    pub calculated_exposure: f64, // 확정된 재무 익스포저 (KRW)
    pub policy_version: String,
    pub formula_used: String,     // 계산에 사용된 공식 설명
}

const POLICY_VERSION: &str = "AuditFlow Standard Model v2026";

// ============================================================================
// 2. Logic Implementation
// ============================================================================

/// 메인 판결 함수
/// entity_id: 감사 대상 부서/프로젝트 ID
/// severity: AI(배심원)가 관측한 현상의 강도 ("HIGH", "MEDIUM", "LOW")
pub fn judge_commercial_risk(db_path: &std::path::PathBuf, entity_id: i64, severity: &str) -> Result<ExposureVerdict, String> {
    
    // 1. Load Evidence & Context (Budget)
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    
    // 부서 정보 조회 (예산, 이름)
    let (name, budget_str): (String, String) = conn.query_row(
        "SELECT unit_name, budget_size FROM audit_universe WHERE id = ?1",
        [entity_id],
        |row| Ok((row.get(0)?, row.get(1)?))
    ).map_err(|_| "Entity not found in Audit Universe".to_string())?;

    // 2. Budget Parsing (Deterministic)
    let budget_krw = parse_budget_to_krw(&budget_str);
    
    // 3. Determine Risk Tier & Multiplier
    let (multiplier, risk_label) = match severity.to_uppercase().as_str() {
        "HIGH" | "CRITICAL" => (0.050, "HIGH"),    // 예산의 5.0% (심각한 위반)
        "MEDIUM" =>            (0.010, "MEDIUM"),  // 예산의 1.0% (주의)
        _ =>                   (0.001, "LOW"),     // 예산의 0.1% (단순 실수)
    };

    // [SPECIAL RULE] Marketing Team "29억" Logic (User Request)
    // 만약 예산이 400억 이상이고 HIGH 리스크라면, 
    // 표준 5% 대신 6.5%를 적용하여 "강력한 경고"를 보냄.
    let final_multiplier = if budget_krw > 40_000_000_000.0 && risk_label == "HIGH" {
        0.065 // 455억 * 0.065 = 약 29.5억
    } else {
        multiplier
    };

    let exposure = budget_krw * final_multiplier;

    // 4. Return Verdict
    Ok(ExposureVerdict {
        entity_name: name,
        budget_tier: get_budget_tier(budget_krw),
        risk_level: risk_label.to_string(),
        calculated_exposure: exposure,
        policy_version: POLICY_VERSION.to_string(),
        formula_used: format!("Budget(KRW {:.0}) * Multiplier({:.3})", budget_krw, final_multiplier),
    })
}

// ----------------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------------

fn parse_budget_to_krw(budget_str: &str) -> f64 {
    let raw = budget_str.replace(",", "").replace(" ", "").to_lowercase();
    
    if raw.contains("krw") {
        if raw.contains("억") {
            raw.replace("krw", "").replace("억", "").parse::<f64>().unwrap_or(0.0) * 100_000_000.0
        } else {
            raw.replace("krw", "").parse::<f64>().unwrap_or(0.0)
        }
    } else if raw.contains("$") {
        // Exchange Rate: 1 USD = 1300 KRW
        let usd_val = if raw.contains("m") {
            raw.replace("$", "").replace("m", "").parse::<f64>().unwrap_or(0.0) * 1_000_000.0
        } else {
            raw.replace("$", "").parse::<f64>().unwrap_or(0.0)
        };
        usd_val * 1300.0
    } else {
        0.0 // Default or Error
    }
}

fn get_budget_tier(amount_krw: f64) -> String {
    if amount_krw > 130_000_000_000.0 { // $100M+
        "Enterprise (Tier 1)".to_string()
    } else if amount_krw > 13_000_000_000.0 { // $10M+
        "Growth (Tier 2)".to_string()
    } else {
        "Startup (Tier 3)".to_string()
    }
}
