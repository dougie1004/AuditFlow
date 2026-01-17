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
    pub const RRN: f32 = 3.0;           // 二쇰?踰덊샇 - ?⑤룆?쇰줈??異⑸텇
    pub const PHONE: f32 = 1.5;         // ?꾪솕踰덊샇
    pub const NAME: f32 = 1.0;          // ?깅챸
    pub const EMPLOYEE_ID: f32 = 1.5;   // ?ъ썝踰덊샇
    pub const ADDRESS: f32 = 1.0;       // ?곸꽭二쇱냼
    pub const DEPARTMENT: f32 = 0.5;    // 遺?쒕챸 (?⑤룆?쇰줈??PII ?꾨떂)
}
