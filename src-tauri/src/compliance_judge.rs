use serde::{Deserialize, Serialize};
use rusqlite::{params, Connection};

// f64 to String helper for internal logic
trait FloatExt { fn to_fixed(&self, precision: usize) -> String; }
impl FloatExt for f64 {
    fn to_fixed(&self, precision: usize) -> String {
        format!("{:.1$}", self, precision)
    }
}

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
    pub risk_level: String,       
    pub calculated_exposure: f64,    // 통합 재무 익스포저
    pub leakage_impact: f64,         // 직접 손실 (현금 유출)
    pub penalty_risk: f64,           // 과징금/추징금 위험
    pub operational_waste: f64,      // 운영 비효율 손실
    pub formula_used: String,        
    pub cfo_commentary: String,
}

/// CFO 전용 리스크 판결 함수
pub fn judge_commercial_risk(db_path: &std::path::PathBuf, entity_id: i64, severity: &str) -> Result<ExposureVerdict, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    
    let (name, revenue_str, budget_str, profit_str, imp_score, lik_score): (String, String, String, String, i32, i32) = conn.query_row(
        "SELECT unit_name, revenue, budget_size, operating_profit, impact_score, likelihood_score FROM audit_universe WHERE id = ?1",
        [entity_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?))
    ).map_err(|_| "Entity not found".to_string())?;

    let rev_krw = parse_amount_to_krw(&revenue_str);
    let budget_krw = parse_amount_to_krw(&budget_str);
    let profit_krw = parse_amount_to_krw(&profit_str);
    
    // ------------------------------------------------------------------------
    // [REALISM CALIBRATION] 
    // CFOs don't see 100% of budget at risk. We use "Micro-Materiality" factors.
    // Leakage: 0.01% (Normal) to 0.05% (High) of base volume.
    // Waste: 0.02% (Normal) to 0.10% (High) of base volume.
    // ------------------------------------------------------------------------
    
    let base_volume = if profit_krw > 0.0 { profit_krw } else { budget_krw };
    let (leak_factor, waste_factor) = match severity.to_uppercase().as_str() {
        "HIGH" | "CRITICAL" => (0.0005, 0.0010), // 0.05%, 0.10%
        "MEDIUM" =>            (0.0002, 0.0005), // 0.02%, 0.05%
        _ =>                   (0.0001, 0.0002), // 0.01%, 0.02%
    };

    // 1. [LEAKAGE] 실제 누수 (현금화/횡령/오지급 가능성)
    let leakage = base_volume * leak_factor * (lik_score as f64 / 10.0);

    // 2. [PENALTY] 세무/규제 (현실적으로 leakage의 20~30% 추징)
    let penalty = (leakage * 0.3) + if severity == "CRITICAL" { 5_000_000.0 } else { 0.0 };

    // 3. [WASTE] 운영상 비효율 (Friction)
    let waste = base_volume * waste_factor * (imp_score as f64 / 10.0);

    let total = leakage + penalty + waste;

    let commentary = match severity.to_uppercase().as_str() {
        "CRITICAL" => format!("현금 유출(₩{}M)과 과징금 리스크가 결합된 즉시 조치 대상입니다.", (total/1000000.0).to_fixed(1)),
        "HIGH" => format!("운영 비효율(₩{}M)이 누적되어 연간 손실로 전이될 우려가 높습니다.", (waste/1000000.0).to_fixed(1)),
        _ => "잠재적 리스크이나 기회 비용 측정 시 유의미한 수준입니다.".to_string(),
    };

    Ok(ExposureVerdict {
        entity_name: name,
        risk_level: severity.to_uppercase(),
        calculated_exposure: total,
        leakage_impact: leakage,
        penalty_risk: penalty,
        operational_waste: waste,
        formula_used: "CFO Triple-Loss Model (Leakage + Penalty + Waste)".to_string(),
        cfo_commentary: commentary,
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
        .replace("₩", "")
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
