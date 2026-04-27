use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum RuleWeight {
    Low = 20,       // 0.2
    Medium = 40,    // 0.4
    High = 70,      // 0.7
    Critical = 100, // 1.0
}

impl RuleWeight {
    pub fn as_f64(&self) -> f64 {
        (*self as u32 as f64) / 100.0
    }
}

