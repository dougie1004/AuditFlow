#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;

mod models;
mod database;
mod file_utils;
mod ai;
mod commands;
mod commands_append;
mod audit_engine;
mod file_loader;
mod parser;
mod domain_map;
mod dedup;
mod scenarios_seeder;
mod mapper;
mod compliance_dd_flow;
mod ai_detection;
mod debug_api;
mod constitution;
mod assurance;
mod simulator;
mod compliance_judge;
mod ledger_engine;
mod entity_resolver;
mod ingestion;
mod risk_interpret;
mod risk_score;
mod rule_weights;
mod error;

mod flux_engine;
pub mod scenario_registry;
pub mod context_builder;

use database::initialize_database;
use std::fs;
use serde_json::Value;
use tauri::Manager;

fn load_permanent_config() -> Result<(), String> {
    let config_path = std::env::current_dir()
        .map_err(|e| e.to_string())?
        .join("app_config.json");
    
    if config_path.exists() {
        let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
        let config: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        
        println!(">>> [PERMANENT CONFIG] Loaded optimization settings:");
        println!("    Mode: {}", config["optimization"]["mode"].as_str().unwrap_or("hybrid")); // ALLOW_MOCK: Default UI mode is non-critical
        println!("    PII Threshold: {}", config["optimization"]["pii_weight_threshold"].as_f64().unwrap_or(2.0)); // ALLOW_MOCK
        println!("    Flash Model: {}", config["optimization"]["use_flash_model"].as_bool().unwrap_or(true)); // ALLOW_MOCK
        println!("    Batch Size: {}", config["optimization"]["batch_size"].as_u64().unwrap_or(2000)); // ALLOW_MOCK
    } else {
        println!(">>> [PERMANENT CONFIG] Creating default config...");
        // Config will be created by first run
    }
    
    Ok(())
}

fn main() {
    dotenvy::dotenv_override().ok();
    
    // [CRITICAL] Load permanent config FIRST
    load_permanent_config().ok();
    
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle();
            initialize_database(handle)?;
            
            // [API KEY INJECTION] Load persistent key from settings table
            let db_path = handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
            if let Ok(conn) = rusqlite::Connection::open(db_path) {
                let key: Option<String> = conn.query_row(
                    "SELECT value FROM settings WHERE key = 'GEMINI_API_KEY'",
                    [],
                    |r| r.get(0)
                ).ok();
                if let Some(api_key) = key {
                    crate::ai::set_api_key(api_key);
                    println!(">>> [INIT] Persistent GEMINI_API_KEY loaded into runtime.");
                }
            }

            println!(">>> [INIT] AuditFlow Backend Ready. Scenarios validated.");
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_dashboard_summary,
            commands::get_all_scenarios,
            commands::get_files_by_type,
            commands::ingest_material,
            commands::get_audit_objects,
            commands::get_relation_candidates,
            commands::create_audit_session,
            commands::get_audit_sessions,
            commands::get_review_queue,
            commands::update_review_status,
            commands::close_audit_session,
            commands::resolve_escalation,
            commands::acknowledge_session_report,
            commands::delete_audit_file,
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
            commands::get_entity_timeline,
            commands::get_monthly_summary,
            commands::get_account_flow_graph,
            commands::get_structural_insight,
            commands::get_structural_top_accounts,
            commands::get_strategic_deviations,
            commands::get_multi_year_financial_summary,
            dedup::remove_duplicate_issues,
            commands::optimize_database,
            commands::clean_temp_files,
            commands::get_knowledge_docs,
            commands::get_global_patterns,
            commands::delete_knowledge_doc,
            commands::add_audit_plan_from_entity,
            commands::force_seed_universe,
            commands::get_system_events,
            commands::update_project_metadata,
            commands::get_workbook_details,
            commands::get_latest_analysis,
            commands::get_latest_accepted_finding,
            commands::get_optimization_stats,
            commands::map_transaction,
            commands::generate_risk_summary,
            commands::get_expert_risk_signals,
            commands::get_case_detail,
            commands::get_engine_health_stats,
            commands::run_formal_adjudication,
            commands::execute_certified_audit,
            commands::lock_project_ruleset,
            debug_api::debug_reset_inbox,
            debug_api::debug_get_inbox_stats,
            debug_api::debug_process_next,
            debug_api::get_risk_report_data,
            commands::get_assurance_map_stats,
            constitution::check_system_integrity,
            commands::get_risk_summary,
            commands::preview_vectorization,
            commands::promote_risk_v2,
            commands::update_status_v2,
            commands::update_audit_universe_field,
            commands::judge_risk_exposure,
            simulator::generate_annual_audit_data,
            commands::set_gemini_api_key,
            commands::get_gemini_api_key,
            commands::run_flux_scan,
            commands::get_multi_year_trial_balance,
            commands_append::promote_risk_to_review,
            commands_append::create_clarification_request,
            commands_append::get_clarifications_by_issue,
            commands_append::submit_clarification_answer,
            commands_append::get_parameter_overrides,
            commands_append::set_parameter_override,
            commands_append::get_parameter_override_history,
            commands::get_ai_fraud_deep_dive,
            commands::get_auth_status,
            commands::register_user
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