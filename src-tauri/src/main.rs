#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod models;
mod database;
mod file_utils;
mod ai;
mod commands;
mod audit_engine;
mod dedup;
mod scenarios_seeder;

use database::initialize_database;
use std::fs;
use serde_json::Value;

// [PERMANENT] Load optimization config at startup
fn load_permanent_config() -> Result<(), String> {
    let config_path = std::env::current_dir()
        .map_err(|e| e.to_string())?
        .join("app_config.json");
    
    if config_path.exists() {
        let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
        let config: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        
        println!(">>> [PERMANENT CONFIG] Loaded optimization settings:");
        println!("    Mode: {}", config["optimization"]["mode"].as_str().unwrap_or("hybrid"));
        println!("    PII Threshold: {}", config["optimization"]["pii_weight_threshold"].as_f64().unwrap_or(2.0));
        println!("    Flash Model: {}", config["optimization"]["use_flash_model"].as_bool().unwrap_or(true));
        println!("    Batch Size: {}", config["optimization"]["batch_size"].as_u64().unwrap_or(2000));
    } else {
        println!(">>> [PERMANENT CONFIG] Creating default config...");
        // Config will be created by first run
    }
    
    Ok(())
}

fn main() {
    dotenvy::dotenv().ok();
    
    // [CRITICAL] Load permanent config FIRST
    load_permanent_config().ok();
    
    tauri::Builder::default()
        .setup(|app| {
            initialize_database(app.handle())?;
            println!(">>> [INIT] AuditFlow Backend Ready. Scenarios validated.");
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_all_scenarios,
            commands::get_files_by_type,
            commands::upload_audit_file,
            commands::delete_audit_file,
            commands::get_dashboard_summary,
            commands::run_audit_analysis,
            commands::get_audit_issues,
            commands::update_issue_status,
            commands::update_audit_issue_status,
            commands::update_audit_issue_field,
            commands::dismiss_audit_issue,
            commands::get_file_preview,
            commands::get_masked_preview,
            commands::get_audit_history,
            commands::generate_annual_report,
            commands::get_audit_projects,
            commands::create_audit_project,
            commands::delete_audit_project,
            commands::add_audit_plan,
            commands::get_audit_plans,
            commands::update_audit_plan_status,
            commands::reset_database,
            commands::add_issue_to_scenarios,
            commands::create_custom_scenario,
            commands::get_annual_performance,
            commands::analyze_process_mining,
            commands::generate_mining_mock_data,
            commands::get_scenario_categories,
            commands::ask_ai_assistant,
            commands::generate_professional_report,
            commands::add_audit_universe_entity,
            commands::update_risk_assessment,
            commands::get_audit_universe,
            commands::get_risk_heatmap_data,
            commands::ai_suggest_risk_score,
            commands::generate_audit_priorities,
            commands::get_google_maps_key,
            commands::get_card_transactions,
            commands::upload_knowledge_doc,
            dedup::remove_duplicate_issues,
            commands::optimize_database,
            commands::clean_temp_files,
            commands::get_knowledge_docs,
            commands::get_global_patterns,
            commands::delete_knowledge_doc,
            commands::add_audit_plan_from_entity,
            commands::force_seed_universe,
            commands::get_system_events,
            commands::execute_project_analysis,
            commands::reset_system_data,
            commands::update_project_metadata,
            commands::get_workbook_details,
            commands::get_latest_analysis,
            commands::perform_audit_analysis,
            commands::get_latest_accepted_finding,
            commands::get_optimization_stats
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                
                let window_ = window.clone();
                
                use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
                
                window.dialog()
                    .message("작업 중인 데이터가 유실될 수 있습니다. 정말 프로그램을 종료하시겠습니까?")
                    .title("애플리케이션 종료")
                    .kind(MessageDialogKind::Warning)
                    .buttons(MessageDialogButtons::OkCancelCustom("종료하기".to_string(), "취소".to_string()))
                    .show(move |result| {
                        if result {
                            window_.destroy().unwrap();
                        }
                    });
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
