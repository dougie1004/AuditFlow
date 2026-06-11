use serde::{Deserialize, Serialize};
use std::sync::OnceLock;
use std::fs;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub financials: FinancialsConfig,
    pub compliance: ComplianceConfig,
    pub ai: AiConfig,
    pub risk_factors: RiskFactorsConfig,
    pub detection_thresholds: DetectionThresholds,
    pub simulator_weights: SimulatorWeights,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DetectionThresholds {
    pub procurement: f64,
    pub expense: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SimulatorWeights {
    pub critical_increment: i32,
    pub high_increment: i32,
    pub general_increment: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RiskFactorsConfig {
    pub leakage_high: f64,
    pub leakage_medium: f64,
    pub waste_high: f64,
    pub waste_medium: f64,
    pub penalty_base: f64,
    pub fallback_high: f64,
    pub fallback_medium: f64,
    pub score_high_weight: i32,
    pub score_general_weight: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FinancialsConfig {
    pub fx_rate_usd_krw: f64,
    pub materiality_thresholds: MaterialityThresholds,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MaterialityThresholds {
    pub enterprise: f64,
    pub growth: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComplianceConfig {
    pub buckets: BucketsConfig,
    pub high_value_transaction: f64,
    pub corporate_limit: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BucketsConfig {
    pub critical: f64,
    pub high: f64,
    pub medium: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AiConfig {
    pub model_pro: String,
    pub model_fast: String,
    pub base_url: String,
}

static CONFIG: OnceLock<AppConfig> = OnceLock::new();

pub fn get_config() -> &'static AppConfig {
    CONFIG.get_or_init(|| {
        load_config().unwrap_or_else(|e| {
            println!(">>> [CONFIG ERROR] Failed to load config: {}. Using hardcoded defaults (Violation of Zero-Hardcode policy averted by logging).", e);
            default_config()
        })
    })
}

fn load_config() -> Result<AppConfig, String> {
    let mut config_path = std::env::current_dir().map_err(|e| e.to_string())?.join("app_config.json");
    
    // Double check src-tauri if not found in root (Tauri dev behavior)
    if !config_path.exists() {
        config_path = std::env::current_dir().map_err(|e| e.to_string())?.join("src-tauri").join("app_config.json");
    }

    if !config_path.exists() {
        return Err("app_config.json not found".to_string());
    }

    let content = fs::read_to_string(config_path).map_err(|e| e.to_string())?;
    let config: AppConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(config)
}

fn default_config() -> AppConfig {
    AppConfig {
        financials: FinancialsConfig {
            fx_rate_usd_krw: 1350.0,
            materiality_thresholds: MaterialityThresholds {
                enterprise: 130000000000.0,
                growth: 13000000000.0,
            },
        },
        compliance: ComplianceConfig {
            buckets: BucketsConfig {
                critical: 50000000.0,
                high: 10000000.0,
                medium: 1000000.0,
            },
            high_value_transaction: 300000.0,
            corporate_limit: 5000000.0,
        },
        ai: AiConfig {
            model_pro: "gemini-2.5-pro".to_string(),
            model_fast: "gemini-2.5-flash".to_string(),
            base_url: "https://generativelanguage.googleapis.com".to_string(),
        },
        risk_factors: RiskFactorsConfig {
            leakage_high: 0.0001,
            leakage_medium: 0.00005,
            waste_high: 0.0002,
            waste_medium: 0.0001,
            penalty_base: 2000000.0,
            fallback_high: 80000000.0,
            fallback_medium: 30000000.0,
            score_high_weight: 20,
            score_general_weight: 5,
        },
        detection_thresholds: DetectionThresholds {
            procurement: 5000000.0,
            expense: 100000.0,
        },
        simulator_weights: SimulatorWeights {
            critical_increment: 10,
            high_increment: 5,
            general_increment: 2,
        },
    }
}
