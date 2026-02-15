/// Pure functions for structural risk score calculations
/// Based on Piecewise Acceleration Model

pub fn calculate_cv_weight(cv: f64) -> f64 {
    let base_linear = (cv / 2.0).min(1.0);
    
    if cv <= 1.5 {
        base_linear
    } else if cv <= 2.5 {
        (base_linear * 1.2).min(1.0)
    } else {
        (base_linear * 1.5).min(1.0)
    }
}

pub fn calculate_structural_score(cv: f64, cr1: f64, hhi: f64) -> f64 {
    let cv_weight = calculate_cv_weight(cv);
    // Formula: (CV_Weight * 0.4 + CR1 * 0.3 + HHI * 0.3)
    (cv_weight * 0.4 + cr1 * 0.3 + hhi * 0.3).min(1.0)
}
