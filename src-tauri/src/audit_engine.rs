use std::path::{Path, PathBuf};
use tauri::AppHandle;

#[allow(dead_code)]
pub fn calculate_distance(_lat1: f64, _lng1: f64, _lat2: f64, _lng2: f64) -> f64 {
    0.0 
}

pub fn parse_csv_line(_line: &str) -> Vec<String> {
    vec![]
}

pub fn load_file_rows(_path_str: &str) -> Vec<Vec<String>> {
    // Minimal stub: Return empty vector to prevent errors in caller
    // but log valid warning
    println!(">>> [CBT STUB] load_file_rows called. Returning empty.");
    vec![]
}

#[allow(dead_code)]
pub async fn run_specialized_card_rules(
    _card_file_path: &str,
    _emp_file_path: &str,
    _project_type: &str,
    _db_path: &PathBuf,
    _app_handle: &AppHandle,
    _api_key: &str,
    _enable_masking: bool
) -> Result<(), String> {
    println!(">>> [CBT STUB] run_specialized_card_rules called. Skipping.");
    Ok(())
}

#[allow(dead_code)]
pub async fn run_generic_ai_audit(
    _target_files: Vec<(String, String)>,
    _reference_files: Vec<(String, String)>,
    _project_type: &str,
    _db_path: &PathBuf,
    _app_handle: &AppHandle,
    _api_key: &str,
    _enable_masking: bool,
    _external_context: Option<String>
) -> Result<(), String> {
    println!(">>> [CBT STUB] run_generic_ai_audit called. Skipping.");
    Ok(())
}
