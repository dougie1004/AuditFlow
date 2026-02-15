use serde::Serialize;

#[derive(Debug, Serialize, Clone, PartialEq)]
pub enum StructuralLabel {
    Stable,
    Observe,
    Warning,
    StructuralConcentration,
}

impl StructuralLabel {
    pub fn as_str(&self) -> &'static str {
        match self {
            StructuralLabel::Stable => "STABLE",
            StructuralLabel::Observe => "OBSERVE",
            StructuralLabel::Warning => "WARNING",
            StructuralLabel::StructuralConcentration => "STRUCTURAL_CONCENTRATION",
        }
    }
}

#[derive(Debug, Serialize, Clone, PartialEq)]
pub enum RiskMatrixLabel {
    StructuralDependency,
    SystemicAnomaly,
    TransactionalSpike,
    NormalPattern,
    Monitor, // For middle ranges
}

impl RiskMatrixLabel {
    pub fn as_str(&self) -> &'static str {
        match self {
            RiskMatrixLabel::StructuralDependency => "STRUCTURAL_DEPENDENCY",
            RiskMatrixLabel::SystemicAnomaly => "SYSTEMIC_ANOMALY",
            RiskMatrixLabel::TransactionalSpike => "TRANSACTIONAL_SPIKE",
            RiskMatrixLabel::NormalPattern => "NORMAL_PATTERN",
            RiskMatrixLabel::Monitor => "MONITOR",
        }
    }
}

/// Pure function to interpret Structural Score (S-Scr)
pub fn interpret_structural_score(score: f64) -> StructuralLabel {
    if score < 0.3 {
        StructuralLabel::Stable
    } else if score < 0.6 {
        StructuralLabel::Observe
    } else if score <= 0.8 {
        StructuralLabel::Warning
    } else {
        StructuralLabel::StructuralConcentration
    }
}

/// Pure function to determine Risk Matrix Label based on Interaction
pub fn determine_risk_interaction(s_score: f64, a_score: f64) -> RiskMatrixLabel {
    if s_score > 0.8 {
        if a_score < 0.3 {
            RiskMatrixLabel::StructuralDependency
        } else if a_score > 0.8 {
            RiskMatrixLabel::SystemicAnomaly
        } else {
            // S High, A Mid -> Concern
            RiskMatrixLabel::StructuralDependency // Leaning towards structural issue
        }
    } else if s_score < 0.3 {
        if a_score > 0.8 {
            RiskMatrixLabel::TransactionalSpike
        } else if a_score < 0.3 {
            RiskMatrixLabel::NormalPattern
        } else {
            // S Low, A Mid
            RiskMatrixLabel::NormalPattern
        }
    } else {
        // Middle S-Score ranges
        if a_score > 0.8 {
            RiskMatrixLabel::TransactionalSpike
        } else {
            RiskMatrixLabel::Monitor
        }
    }
}
