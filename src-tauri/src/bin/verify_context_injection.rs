#[path = "../scenario_registry.rs"]
mod scenario_registry;

#[path = "../models.rs"]
mod models;

#[path = "../context_builder.rs"]
mod context_builder;

use scenario_registry::MockRegistry;
use context_builder::{ContextBuilder, ParameterValue};

fn main() {
    println!(">>> [PoC] Initializing Mock Registry for Scenario Parameter Calibration...");
    
    // 1. Initialize Mock Registry
    let mut registry = MockRegistry::new();
    
    // 2. Fetch definition for Split PO (PR-02)
    let pr02 = registry.get_scenario("PR-02");
    assert!(pr02.is_some(), "PR-02 scenario definition should be loaded from registry_mock.json");
    
    let pr02_cfg = pr02.unwrap();
    println!(">>> [PoC] Scenario Found: {} (Domain: {})", pr02_cfg.name, pr02_cfg.domain);
    
    // 3. Build default context
    let default_ctx = ContextBuilder::build_context(&registry, "proj_123", "PR-02").expect("Failed to build default context");
    
    let lookback = default_ctx.parameters.get("lookback_window_days").expect("lookback_window_days missing");
    let threshold = default_ctx.parameters.get("threshold_ratio").expect("threshold_ratio missing");
    
    match lookback {
        ParameterValue::Int(val) => {
            println!(">>> [PoC] Default lookback_window_days = {}", val);
            assert_eq!(*val, 7);
        }
        _ => panic!("Expected Int value for lookback_window_days"),
    }
    
    match threshold {
        ParameterValue::Float(val) => {
            println!(">>> [PoC] Default threshold_ratio = {}", val);
            assert_eq!(*val, 0.90);
        }
        _ => panic!("Expected Float value for threshold_ratio"),
    }
    
    // 4. Inject Override Value
    println!(">>> [PoC] Injecting User Override: lookback_window_days = 14, threshold_ratio = 0.95");
    registry.set_override("proj_123", "PR-02", "lookback_window_days", "14");
    registry.set_override("proj_123", "PR-02", "threshold_ratio", "0.95");
    
    // 5. Build overridden context (Read-Only verify)
    let overridden_ctx = ContextBuilder::build_context(&registry, "proj_123", "PR-02").expect("Failed to build overridden context");
    
    let o_lookback = overridden_ctx.parameters.get("lookback_window_days").expect("overridden lookback missing");
    let o_threshold = overridden_ctx.parameters.get("threshold_ratio").expect("overridden threshold missing");
    
    match o_lookback {
        ParameterValue::Int(val) => {
            println!(">>> [PoC] Overridden lookback_window_days = {}", val);
            assert_eq!(*val, 14);
        }
        _ => panic!("Expected Int value for lookback_window_days"),
    }
    
    match o_threshold {
        ParameterValue::Float(val) => {
            println!(">>> [PoC] Overridden threshold_ratio = {}", val);
            assert_eq!(*val, 0.95);
        }
        _ => panic!("Expected Float value for threshold_ratio"),
    }
    
    println!(">>> [SUCCESS] Scenario Context Injection PoC Verified Successfully! (100% Correct)");
}
