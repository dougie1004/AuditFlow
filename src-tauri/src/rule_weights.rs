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

pub struct AnomalyScorer;

impl AnomalyScorer {
    /// Calculates a normalized score from a set of triggered weights.
    /// Logic: Sum of weights, capped at 1.0 (Critical).
    /// This ensures that multiple low/medium risks can accumulate to a high risk,
    /// but a single Critical risk immediately tops out the score.
    pub fn calculate(weights: &[RuleWeight]) -> f64 {
        let raw_sum: f64 = weights.iter().map(|w| w.as_f64()).sum();
        raw_sum.min(1.0)
    }

    /// Calculates a score for a single weighted rule triggering, optionally with a multiplier.
    pub fn score(weight: RuleWeight, multiplier: f64) -> f64 {
        (weight.as_f64() * multiplier).min(1.0)
    }
}
