use serde::{Deserialize, Serialize};
use rusqlite::{params, Connection};

/// [JUDGE LAYOUT]
/// 이 모듈은 "배심원(AI)"이 제출한 Fact와 Evidence를 바탕으로,
/// "판사(Code)"가 확정적인 재무적/법적 판단을 내리는 로직을 담당합니다.
/// 
/// 핵심 철학 (Materiality 2.0 - Dual Track):
/// 1. Control Impact (통제 영향도): 예산 집행 프로세스의 건전성을 측정합니다. (공적 영역)
/// 2. Financial Materiality (재무적 중요성): 실제 영업이익에 미치는 타격액을 측정합니다. (실리적 영역)
/// 
/// 이를 통해 감사는 "과정의 정당성"과 "결과의 중대성"을 동시에 리포트하여 CFO와 현업을 설득합니다.

// ============================================================================
// 1. Data Structures
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct ExposureVerdict {
    pub entity_name: String,
    pub budget_tier: String,      
    pub risk_level: String,       
    pub calculated_exposure: f64,    // 재무적 영향액 (KRW)
    pub control_leakage_ratio: f64,  // 통제 오염도 (%)
    pub materiality_impact_ratio: f64, // 재무 중요도 (%)
    pub policy_version: String,
    pub formula_used: String,        
}

const POLICY_VERSION: &str = "AuditFlow Dual-Track Model v2026.02";

// ============================================================================
// 2. Logic Implementation
// ============================================================================

/// 메인 판결 함수
pub fn judge_commercial_risk(db_path: &std::path::PathBuf, entity_id: i64, severity: &str) -> Result<ExposureVerdict, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    
    // 부서 정보 조회
    let (name, budget_str, profit_str): (String, String, String) = conn.query_row(
        "SELECT unit_name, budget_size, operating_profit FROM audit_universe WHERE id = ?1",
        [entity_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    ).map_err(|_| "Entity not found in Audit Universe".to_string())?;

    let budget_krw = parse_amount_to_krw(&budget_str);
    let profit_krw = parse_amount_to_krw(&profit_str);
    
    // ------------------------------------------------------------------------
    // 축 1. Control Impact (예산 대비 가중치 - 통제 엔진의 오염도)
    // ------------------------------------------------------------------------
    let control_ratio = match severity.to_uppercase().as_str() {
        "HIGH" | "CRITICAL" => 0.050, // "이 프로세스는 5%나 신뢰할 수 없습니다."
        "MEDIUM" =>            0.020, 
        _ =>                   0.005, 
    };

    // ------------------------------------------------------------------------
    // 축 2. Financial Materiality (영업이익 대비 가중치 - 실질적 타격)
    // ------------------------------------------------------------------------
    let materiality_ratio = match severity.to_uppercase().as_str() {
        "HIGH" | "CRITICAL" => 0.050, // "영업이익의 5%를 흔드는 중대한 위협입니다."
        "MEDIUM" =>            0.020, 
        _ =>                   0.010, 
    };

    // 최종 익스포저 계산 (재무적 영향 위주)
    let exposure = if profit_krw > 0.0 {
        profit_krw * materiality_ratio
    } else {
        budget_krw * (control_ratio * 0.2) // Cost Center는 예산 통제 오염도의 1/5 수준을 보수적 익스포저로 산출
    };

    let formula = if profit_krw > 0.0 {
        format!("Control Risk({:.1}%) & Profit Impact({:.1}%)", control_ratio * 100.0, materiality_ratio * 100.0)
    } else {
        format!("Control Risk({:.1}%) [Cost Center Logic Applied]", control_ratio * 100.0)
    };

    Ok(ExposureVerdict {
        entity_name: name,
        budget_tier: get_budget_tier(budget_krw),
        risk_level: severity.to_uppercase(),
        calculated_exposure: exposure,
        control_leakage_ratio: control_ratio * 100.0,
        materiality_impact_ratio: if profit_krw > 0.0 { 
            materiality_ratio * 100.0 
        } else if budget_krw > 0.0 { 
            (exposure / budget_krw) * 100.0 
        } else {
            0.0
        },
        policy_version: POLICY_VERSION.to_string(),
        formula_used: formula,
    })
}

// ----------------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------------

fn parse_amount_to_krw(raw_str: &str) -> f64 {
    let mut clean = raw_str.to_lowercase()
        .replace(",", "")
        .replace("krw", "")
        .replace("$", "")
        .trim().to_string();
    
    if let Some(idx) = clean.find('(') {
        clean = clean[..idx].trim().to_string();
    }

    let is_usd = raw_str.contains('$');
    let mut multiplier = if is_usd { 1300.0 } else { 1.0 };

    if clean.contains('억') {
        multiplier *= 100_000_000.0;
        clean = clean.replace("억", "");
    } else if clean.contains('m') {
        multiplier *= 1_000_000.0;
        clean = clean.replace("m", "");
    } else if clean.contains('b') {
        multiplier *= 1_000_000_000.0;
        clean = clean.replace("b", "");
    } else if clean.contains('k') {
        multiplier *= 1_000.0;
        clean = clean.replace("k", "");
    }

    clean.parse::<f64>().unwrap_or(0.0) * multiplier
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
