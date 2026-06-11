use rusqlite::Connection;

#[path = "../assurance/sensitivity_adapter.rs"]
pub mod sensitivity_adapter;

use sensitivity_adapter::{
    resolve_effective_params,
};

fn main() -> Result<(), String> {
    println!("=== Sensitivity Adapter Standalone Test ===");
    
    // Create an in-memory database
    let conn = Connection::open_in_memory().map_err(|e| e.to_string())?;
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
    ).map_err(|e| e.to_string())?;

    // 1. Resolve defaults (Normal)
    let params = resolve_effective_params(&conn)?;
    println!("1. Default Resolution (Normal):");
    println!("   PR-02: lookback = {} days, threshold = {}", params.pr_02.lookback_window_days, params.pr_02.threshold_ratio);
    println!("   EX-01: split_time = {} mins, count = {}", params.ex_01.split_time_window_minutes, params.ex_01.split_count_threshold);
    println!("   EX-04: restricted_keywords = {:?}", params.ex_04.restricted_keywords);
    println!("   LDG-01: percentile = {}", params.ldg_01.outlier_percentile);
    println!("   LDG-02: count = {}, modulus = {}", params.ldg_02.repetition_count, params.ldg_02.modulus);
    println!("   LDG-05: multiplier = {}", params.ldg_05.monthly_spend_multiplier);
    println!("   LDG-06: conc_ratio = {}, count = {}", params.ldg_06.departmental_concentration_ratio, params.ldg_06.department_count_threshold);
    println!("   LDG-07: risk_keywords = {:?}", params.ldg_07.risk_keywords);
    
    assert_eq!(params.pr_02.lookback_window_days, 7);
    assert_eq!(params.pr_02.threshold_ratio, 0.90);

    // 2. Override globally to High
    conn.execute(
        "INSERT INTO scenario_parameter_overrides (scenario_id, parameter_key, parameter_value) VALUES ('GLOBAL', 'sensitivity', 'High')",
        [],
    ).map_err(|e| e.to_string())?;

    let params_high = resolve_effective_params(&conn)?;
    println!("\n2. Global Sensitivity Override (High):");
    println!("   PR-02: lookback = {} days, threshold = {}", params_high.pr_02.lookback_window_days, params_high.pr_02.threshold_ratio);
    println!("   EX-01: split_time = {} mins, count = {}", params_high.ex_01.split_time_window_minutes, params_high.ex_01.split_count_threshold);
    println!("   LDG-01: percentile = {}", params_high.ldg_01.outlier_percentile);
    
    assert_eq!(params_high.pr_02.lookback_window_days, 14);
    assert_eq!(params_high.pr_02.threshold_ratio, 0.80);

    // 3. Override domain Procurement to Low
    conn.execute(
        "INSERT INTO scenario_parameter_overrides (scenario_id, parameter_key, parameter_value) VALUES ('DOMAIN_PROCUREMENT', 'sensitivity', 'Low')",
        [],
    ).map_err(|e| e.to_string())?;

    let params_mix = resolve_effective_params(&conn)?;
    println!("\n3. Mixed Sensitivity (Global=High, Procurement=Low):");
    println!("   PR-02 (Procurement): lookback = {} days, threshold = {}", params_mix.pr_02.lookback_window_days, params_mix.pr_02.threshold_ratio);
    println!("   EX-01 (Expense): split_time = {} mins, count = {}", params_mix.ex_01.split_time_window_minutes, params_mix.ex_01.split_count_threshold);
    
    assert_eq!(params_mix.pr_02.lookback_window_days, 3);
    assert_eq!(params_mix.ex_01.split_time_window_minutes, 30);

    // 4. Override specific parameter directly
    conn.execute(
        "INSERT OR REPLACE INTO scenario_parameter_overrides (scenario_id, parameter_key, parameter_value) VALUES ('PR-02', 'lookback_window_days', '99')",
        [],
    ).map_err(|e| e.to_string())?;

    let params_direct = resolve_effective_params(&conn)?;
    println!("\n4. Direct Parameter Override (PR-02 lookback = 99):");
    println!("   PR-02: lookback = {} days (expected 99), threshold = {}", params_direct.pr_02.lookback_window_days, params_direct.pr_02.threshold_ratio);
    
    assert_eq!(params_direct.pr_02.lookback_window_days, 99);
    assert_eq!(params_direct.pr_02.threshold_ratio, 0.95); // since Procurement is Low, threshold_ratio should be 0.95

    println!("\n=== ALL STANDALONE SENSITIVITY TESTS PASSED ===");
    Ok(())
}
