// [PERMANENT] Hybrid PII Detection Configuration
// This configuration persists across builds and is loaded at app startup

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PiiDetectionConfig {
    pub weight_threshold: f32,
    pub use_hybrid_mode: bool,
    pub batch_size: usize,
    pub use_flash_model: bool,
}

impl Default for PiiDetectionConfig {
    fn default() -> Self {
        Self {
            weight_threshold: 2.0, // Require 2+ PII indicators per row
            use_hybrid_mode: true,
            batch_size: 2000,
            use_flash_model: true, // Use Gemini 1.5 Flash for data cleaning
        }
    }
}

// [CRITICAL] PII Weight System
// Each PII type has a weight. If total weight >= threshold in a row, it's masked
pub struct PiiWeights;

impl PiiWeights {
    pub const RRN: f32 = 3.0;           // 주민번호 - 단독으로도 충분
    pub const PHONE: f32 = 1.5;         // 전화번호
    pub const NAME: f32 = 1.0;          // 성명
    pub const EMPLOYEE_ID: f32 = 1.5;   // 사원번호
    pub const ADDRESS: f32 = 1.0;       // 상세주소
    pub const DEPARTMENT: f32 = 0.5;    // 부서명 (단독으로는 PII 아님)
}
