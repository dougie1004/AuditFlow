use rusqlite::{Connection, OptionalExtension};
use serde_json::Value;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SensitivityLevel {
    Low,
    Normal,
    High,
}

impl SensitivityLevel {
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "low" => SensitivityLevel::Low,
            "high" => SensitivityLevel::High,
            _ => SensitivityLevel::Normal,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            SensitivityLevel::Low => "Low",
            SensitivityLevel::Normal => "Normal",
            SensitivityLevel::High => "High",
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Pr02Params {
    pub lookback_window_days: i64,
    pub threshold_ratio: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Ex01Params {
    pub split_time_window_minutes: i64,
    pub split_count_threshold: i64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Ex04Params {
    pub restricted_keywords: Vec<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Ldg01Params {
    pub outlier_percentile: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Ldg02Params {
    pub repetition_count: i64,
    pub modulus: i64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Ldg05Params {
    pub monthly_spend_multiplier: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Ldg06Params {
    pub departmental_concentration_ratio: f64,
    pub department_count_threshold: i64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Ldg07Params {
    pub risk_keywords: Vec<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ActiveScenariosParams {
    pub pr_02: Pr02Params,
    pub ex_01: Ex01Params,
    pub ex_04: Ex04Params,
    pub ldg_01: Ldg01Params,
    pub ldg_02: Ldg02Params,
    pub ldg_05: Ldg05Params,
    pub ldg_06: Ldg06Params,
    pub ldg_07: Ldg07Params,
}

pub fn get_override_value(conn: &Connection, scenario_id: &str, parameter_key: &str) -> Option<String> {
    conn.query_row(
        "SELECT parameter_value FROM scenario_parameter_overrides WHERE scenario_id = ?1 AND parameter_key = ?2",
        [scenario_id, parameter_key],
        |row| row.get(0)
    ).optional().unwrap_or(None)
}

pub fn get_global_sensitivity(conn: &Connection) -> SensitivityLevel {
    if let Some(val) = get_override_value(conn, "GLOBAL", "sensitivity") {
        SensitivityLevel::from_str(&val)
    } else {
        SensitivityLevel::Normal
    }
}

pub fn get_domain_sensitivity(conn: &Connection, domain: &str, global_sensitivity: SensitivityLevel) -> SensitivityLevel {
    let key = format!("DOMAIN_{}", domain.to_uppercase());
    if let Some(val) = get_override_value(conn, &key, "sensitivity") {
        if val == "Inherit" {
            global_sensitivity
        } else {
            SensitivityLevel::from_str(&val)
        }
    } else {
        global_sensitivity
    }
}

pub fn resolve_effective_params(conn: &Connection) -> Result<ActiveScenariosParams, String> {
    let global_sens = get_global_sensitivity(conn);

    let procurement_sens = get_domain_sensitivity(conn, "PROCUREMENT", global_sens);
    let expense_sens = get_domain_sensitivity(conn, "EXPENSE", global_sens);
    let ledger_sens = get_domain_sensitivity(conn, "LEDGER", global_sens);

    // 1. Resolve PR-02
    let pr_02_lookback = get_override_value(conn, "PR-02", "lookback_window_days")
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or_else(|| match procurement_sens {
            SensitivityLevel::Low => 3,
            SensitivityLevel::Normal => 7,
            SensitivityLevel::High => 14,
        });

    let pr_02_threshold = get_override_value(conn, "PR-02", "threshold_ratio")
        .and_then(|v| v.parse::<f64>().ok())
        .unwrap_or_else(|| match procurement_sens {
            SensitivityLevel::Low => 0.95,
            SensitivityLevel::Normal => 0.90,
            SensitivityLevel::High => 0.80,
        });

    // 2. Resolve EX-01
    let ex_01_window = get_override_value(conn, "EX-01", "split_time_window_minutes")
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or_else(|| match expense_sens {
            SensitivityLevel::Low => 5,
            SensitivityLevel::Normal => 15,
            SensitivityLevel::High => 30,
        });

    let ex_01_count = get_override_value(conn, "EX-01", "split_count_threshold")
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or_else(|| match expense_sens {
            SensitivityLevel::Low => 4,
            SensitivityLevel::Normal => 3,
            SensitivityLevel::High => 2,
        });

    // 3. Resolve EX-04
    let ex_04_keywords = get_override_value(conn, "EX-04", "restricted_keywords")
        .map(|v| v.split(',').map(|s| s.trim().to_string()).collect::<Vec<String>>())
        .unwrap_or_else(|| match expense_sens {
            SensitivityLevel::Low => vec!["luxury".to_string(), "jewelry".to_string()],
            SensitivityLevel::Normal => vec!["luxury".to_string(), "jewelry".to_string(), "casino".to_string(), "bar".to_string()],
            SensitivityLevel::High => vec!["luxury".to_string(), "jewelry".to_string(), "casino".to_string(), "bar".to_string(), "department".to_string(), "golf".to_string(), "hotel".to_string()],
        });

    // 4. Resolve LDG-01
    let ldg_01_percentile = get_override_value(conn, "LDG-01", "outlier_percentile")
        .and_then(|v| v.parse::<f64>().ok())
        .unwrap_or_else(|| match ledger_sens {
            SensitivityLevel::Low => 0.005,
            SensitivityLevel::Normal => 0.01,
            SensitivityLevel::High => 0.02,
        });

    // 5. Resolve LDG-02
    let ldg_02_count = get_override_value(conn, "LDG-02", "repetition_count")
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or_else(|| match ledger_sens {
            SensitivityLevel::Low => 5,
            SensitivityLevel::Normal => 3,
            SensitivityLevel::High => 2,
        });

    let ldg_02_modulus = get_override_value(conn, "LDG-02", "modulus")
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or_else(|| match ledger_sens {
            SensitivityLevel::Low => 500000,
            SensitivityLevel::Normal => 100000,
            SensitivityLevel::High => 50000,
        });

    // 6. Resolve LDG-05
    let ldg_05_multiplier = get_override_value(conn, "LDG-05", "monthly_spend_multiplier")
        .and_then(|v| v.parse::<f64>().ok())
        .unwrap_or_else(|| match ledger_sens {
            SensitivityLevel::Low => 5.0,
            SensitivityLevel::Normal => 3.0,
            SensitivityLevel::High => 1.5,
        });

    // 7. Resolve LDG-06
    let ldg_06_ratio = get_override_value(conn, "LDG-06", "departmental_concentration_ratio")
        .and_then(|v| v.parse::<f64>().ok())
        .unwrap_or_else(|| match ledger_sens {
            SensitivityLevel::Low => 0.95,
            SensitivityLevel::Normal => 0.90,
            SensitivityLevel::High => 0.80,
        });

    let ldg_06_count = get_override_value(conn, "LDG-06", "department_count_threshold")
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or_else(|| match ledger_sens {
            SensitivityLevel::Low => 3,
            SensitivityLevel::Normal => 2,
            SensitivityLevel::High => 1,
        });

    // 8. Resolve LDG-07
    let ldg_07_keywords = get_override_value(conn, "LDG-07", "risk_keywords")
        .map(|v| v.split(',').map(|s| s.trim().to_string()).collect::<Vec<String>>())
        .unwrap_or_else(|| match ledger_sens {
            SensitivityLevel::Low => vec!["gift card".to_string(), "상품권".to_string()],
            SensitivityLevel::Normal => vec!["gift card".to_string(), "상품권".to_string(), "자문료".to_string(), "유흥".to_string()],
            SensitivityLevel::High => vec!["gift card".to_string(), "상품권".to_string(), "자문료".to_string(), "유흥".to_string(), "현금".to_string(), "지원".to_string(), "접대".to_string(), "식대".to_string()],
        });

    Ok(ActiveScenariosParams {
        pr_02: Pr02Params { lookback_window_days: pr_02_lookback, threshold_ratio: pr_02_threshold },
        ex_01: Ex01Params { split_time_window_minutes: ex_01_window, split_count_threshold: ex_01_count },
        ex_04: Ex04Params { restricted_keywords: ex_04_keywords },
        ldg_01: Ldg01Params { outlier_percentile: ldg_01_percentile },
        ldg_02: Ldg02Params { repetition_count: ldg_02_count, modulus: ldg_02_modulus },
        ldg_05: Ldg05Params { monthly_spend_multiplier: ldg_05_multiplier },
        ldg_06: Ldg06Params { departmental_concentration_ratio: ldg_06_ratio, department_count_threshold: ldg_06_count },
        ldg_07: Ldg07Params { risk_keywords: ldg_07_keywords },
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_mock_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute(
            "CREATE TABLE scenario_parameter_overrides (
                scenario_id TEXT NOT NULL,
                parameter_key TEXT NOT NULL,
                parameter_value TEXT NOT NULL,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                actor_id TEXT,
                reason TEXT,
                PRIMARY KEY (scenario_id, parameter_key)
            )",
            [],
        ).unwrap();
        conn
    }

    #[test]
    fn test_default_resolution() {
        let conn = setup_mock_db();
        let params = resolve_effective_params(&conn).unwrap();
        
        // Defaults to global Normal sensitivity
        assert_eq!(params.pr_02.lookback_window_days, 7);
        assert_eq!(params.pr_02.threshold_ratio, 0.90);
        assert_eq!(params.ex_01.split_time_window_minutes, 15);
        assert_eq!(params.ex_01.split_count_threshold, 3);
        assert_eq!(params.ex_04.restricted_keywords.len(), 4);
        assert_eq!(params.ldg_01.outlier_percentile, 0.01);
        assert_eq!(params.ldg_02.repetition_count, 3);
        assert_eq!(params.ldg_02.modulus, 100000);
        assert_eq!(params.ldg_05.monthly_spend_multiplier, 3.0);
        assert_eq!(params.ldg_06.departmental_concentration_ratio, 0.90);
        assert_eq!(params.ldg_07.risk_keywords.len(), 4);
    }

    #[test]
    fn test_global_sensitivity_override() {
        let conn = setup_mock_db();
        conn.execute(
            "INSERT INTO scenario_parameter_overrides (scenario_id, parameter_key, parameter_value) VALUES ('GLOBAL', 'sensitivity', 'High')",
            [],
        ).unwrap();

        let params = resolve_effective_params(&conn).unwrap();
        
        // All domains inherit High sensitivity
        assert_eq!(params.pr_02.lookback_window_days, 14);
        assert_eq!(params.pr_02.threshold_ratio, 0.80);
        assert_eq!(params.ex_01.split_time_window_minutes, 30);
        assert_eq!(params.ex_01.split_count_threshold, 2);
        assert_eq!(params.ex_04.restricted_keywords.len(), 7);
        assert_eq!(params.ldg_01.outlier_percentile, 0.02);
        assert_eq!(params.ldg_02.repetition_count, 2);
        assert_eq!(params.ldg_02.modulus, 50000);
        assert_eq!(params.ldg_05.monthly_spend_multiplier, 1.5);
    }

    #[test]
    fn test_domain_sensitivity_override() {
        let conn = setup_mock_db();
        // Global = High, but Procurement overridden to Low
        conn.execute(
            "INSERT INTO scenario_parameter_overrides (scenario_id, parameter_key, parameter_value) VALUES ('GLOBAL', 'sensitivity', 'High')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO scenario_parameter_overrides (scenario_id, parameter_key, parameter_value) VALUES ('DOMAIN_PROCUREMENT', 'sensitivity', 'Low')",
            [],
        ).unwrap();

        let params = resolve_effective_params(&conn).unwrap();
        
        // PR-02 (Procurement) should be Low
        assert_eq!(params.pr_02.lookback_window_days, 3);
        assert_eq!(params.pr_02.threshold_ratio, 0.95);

        // EX-01 (Expense) should remain High
        assert_eq!(params.ex_01.split_time_window_minutes, 30);
        assert_eq!(params.ex_01.split_count_threshold, 2);
    }

    #[test]
    fn test_individual_parameter_override() {
        let conn = setup_mock_db();
        // Global = Normal, but PR-02 lookback overridden directly to 99 days
        conn.execute(
            "INSERT INTO scenario_parameter_overrides (scenario_id, parameter_key, parameter_value) VALUES ('PR-02', 'lookback_window_days', '99')",
            [],
        ).unwrap();

        let params = resolve_effective_params(&conn).unwrap();
        
        // PR-02 lookback overridden directly
        assert_eq!(params.pr_02.lookback_window_days, 99);
        // PR-02 threshold still inherits global Normal
        assert_eq!(params.pr_02.threshold_ratio, 0.90);
    }
}
