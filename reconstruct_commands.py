import os

def reconstruct_commands():
    path = r'c:\Users\user\AppData\Roaming\com.auditflow.app\audit_data_v4.db' # Not used here, just for context
    
    content = r"""use tauri::{AppHandle, Manager};
use rusqlite::{params, Connection};
use serde_json::{Value, json};
use std::path::Path;
use calamine::{Reader, open_workbook_auto};
use chrono::{Utc, Duration, Local};

use crate::models::{AuditIssue, AuditProject, AuditPlan, AuditUniverseEntity, AiRiskAnalysis};
use crate::database::{seed_master_scenarios, get_active_universe_column};
use crate::file_utils::{read_any_file, read_file_with_encoding};
use crate::ai::{call_gemini_api, call_gemini_direct, call_gemini_chat, extract_json};

#[tauri::command]
pub fn upload_audit_file(app_handle: AppHandle, project_type: String, file_path: String) -> Result<Value, String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let path = Path::new(&file_path);
    let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("unknown");
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    let file_type = match ext.as_str() { 
        "xlsx" | "xls" | "csv" => "정형", 
        "eml" | "msg" => "이메일", 
        "pdf" | "doc" | "docx" | "txt" => "문서", 
        _ => "기타" 
    };
    
    let mut pii_count = 0;
    if let Ok(content) = crate::file_utils::read_any_file(path, &ext) {
        pii_count = crate::file_utils::count_pii_entities(&content);
    }

    conn.execute("INSERT INTO audit_data (project_type, file_name, file_type, file_path) VALUES (?1, ?2, ?3, ?4)", params![project_type, file_name, file_type, file_path]).map_err(|e| e.to_string())?;
    
    Ok(json!({ "status": "Success", "pii_count": pii_count, "file_name": file_name }))
}

#[tauri::command]
pub async fn run_audit_analysis(app_handle: AppHandle, project_type: String, enable_masking: Option<bool>) -> Result<Value, String> {
    let masking = enable_masking.unwrap_or(false);
    use tauri::Emitter;

    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    app_handle.emit("analysis-progress", json!({ "progress": 5, "message": "내부 규정 및 데이터 분석 중...", "step": 0 })).ok();

    {
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM audit_issues WHERE project_type = ?1 OR audit_id = ?1", params![&project_type]).ok();
    }

    let files = get_files_by_type(app_handle.clone(), project_type.clone())?;
    let mut emp_file_path = String::new();
    let mut target_files = Vec::new();
    let mut reference_files = Vec::new();

    for f in &files {
        let path = f["file_path"].as_str().unwrap_or("").to_string();
        let name = f["file_name"].as_str().unwrap_or("").to_string();
        if name.contains("규정") || name.contains("매뉴얼") || name.contains("regulation") || name.contains("manual") {
            reference_files.push((path.clone(), name.clone()));
        } else {
            target_files.push((path.clone(), name.clone()));
        }

        if (name.contains("인사") || name.contains("직원") || name.contains("employee")) && (name.ends_with(".csv") || name.ends_with(".xlsx")) {
            emp_file_path = path;
        }
    }

    let mut card_file_path = String::new();
    for (path, name) in &target_files {
        let n = name.to_lowercase();
        if n.contains("법인카드") || n.contains("card") || n.contains("거래") || n.contains("데이터") {
            card_file_path = path.clone();
        }
    }

    if card_file_path.is_empty() && !target_files.is_empty() {
        card_file_path = target_files[0].0.clone();
    }

    let api_key = crate::ai::get_api_key();

    if !card_file_path.is_empty() {
        crate::audit_engine::run_specialized_card_rules(&card_file_path, &emp_file_path, &project_type, &db_path, &app_handle, &api_key, masking).await?;
    }

    if !target_files.is_empty() {
        crate::audit_engine::run_generic_ai_audit(target_files.clone(), reference_files, &project_type, &db_path, &app_handle, &api_key, masking).await?;
    }

    app_handle.emit("analysis-progress", json!({ "progress": 100, "message": "분석이 중단 없이 완료되었습니다.", "step": 5 })).ok();
    Ok(json!({ "status": "Success", "analyzed_files": target_files.len() }))
}

#[tauri::command]
pub fn get_dashboard_summary(app_handle: AppHandle, _audit_id: Option<String>) -> Result<Value, String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    
    let total_issues: i64 = conn.query_row("SELECT COUNT(*) FROM audit_issues", [], |r| r.get(0)).unwrap_or(0);
    let ai_signals: i64 = conn.query_row("SELECT COUNT(*) FROM system_events WHERE event_type = 'AI_SIGNAL'", [], |r| r.get(0)).unwrap_or(0);
    let critical_coverage: String = "94.2%".to_string();
    let open_findings: i64 = conn.query_row("SELECT COUNT(*) FROM audit_issues WHERE status = 'Open'", [], |r| r.get(0)).unwrap_or(0);

    let high_severity: i64 = conn.query_row("SELECT COUNT(*) FROM audit_issues WHERE severity = 'High'", [], |r| r.get(0)).unwrap_or(0);
    let risk_score = if total_issues == 0 { 0 } else { std::cmp::min(100, (high_severity * 15) + ((total_issues - high_severity) * 5)) };

    let mut trends = Vec::new();
    for i in (0..7).rev() {
        let date = Utc::now() - Duration::days(i);
        let day_str = date.format("%m-%d").to_string();
        let base = if total_issues > 0 { 20 } else { 5 };
        trends.push(json!({ "day": day_str, "value": base + (i * 2) % 15 })); 
    }

    Ok(json!({ "total_risks": total_issues, "ai_signals": ai_signals, "critical_coverage": critical_coverage, "open_findings": open_findings, "risk_exposure_score": risk_score, "trends": trends }))
}

#[tauri::command]
pub fn get_audit_issues(app_handle: AppHandle, project_type: String) -> Result<Vec<AuditIssue>, String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let query = if project_type == "ALL" || project_type.is_empty() {
        "SELECT id, issue_title, description, severity, raw_row_data, row_index, detected_at, recommendations, evidence_quote, audit_id, evidence_image, status, assignee, due_date, remediation_plan, manager_comment FROM audit_issues ORDER BY id DESC"
    } else {
        "SELECT id, issue_title, description, severity, raw_row_data, row_index, detected_at, recommendations, evidence_quote, audit_id, evidence_image, status, assignee, due_date, remediation_plan, manager_comment FROM audit_issues WHERE project_type = ?1 OR audit_id = ?1 ORDER BY id DESC"
    };

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;
    let mapper = |r: &rusqlite::Row| {
        Ok(AuditIssue { 
            id: r.get(0)?, issue_title: r.get(1)?, description: r.get(2)?, severity: r.get(3)?, 
            raw_row_data: r.get(4).ok(), row_index: r.get(5)?, detected_at: r.get(6)?,
            recommendations: r.get(7).unwrap_or_default(), evidence_quote: r.get(8).unwrap_or_default(),
            audit_id: r.get(9).ok(), evidence_image: r.get(10).ok(),
            status: r.get(11).unwrap_or_else(|_| "Open".to_string()),
            assignee: r.get(12).ok(), due_date: r.get(13).ok(),
            remediation_plan: r.get(14).ok(), manager_comment: r.get(15).ok()
        })
    };

    let rows_res = if project_type == "ALL" || project_type.is_empty() {
         stmt.query_map([], mapper)
    } else {
         stmt.query_map([&project_type], mapper)
    }.map_err(|e| e.to_string())?;

    let mut list = Vec::new(); 
    for r in rows_res { if let Ok(issue) = r { list.push(issue); } }
    Ok(list)
}

#[tauri::command]
pub fn update_issue_status(app_handle: AppHandle, id: i64, status: String, assignee: Option<String>, due_date: Option<String>, remediation: String, comment: String) -> Result<(), String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    conn.execute("UPDATE audit_issues SET status = ?1, assignee = ?2, due_date = ?3, remediation_plan = ?4, manager_comment = ?5 WHERE id = ?6", params![status, assignee, due_date, remediation, comment, id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_audit_history(app_handle: AppHandle, status_filter: Option<String>) -> Result<Vec<AuditIssue>, String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let mut query = "SELECT id, issue_title, description, severity, raw_row_data, row_index, detected_at, recommendations, evidence_quote, audit_id, evidence_image, status, assignee, due_date, remediation_plan, manager_comment FROM audit_issues".to_string();
    if let Some(ref s) = status_filter { query.push_str(&format!(" WHERE status = '{}'", s)); }
    query.push_str(" ORDER BY detected_at DESC");
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let mapper = |r: &rusqlite::Row| {
        Ok(AuditIssue { 
            id: r.get(0)?, issue_title: r.get(1)?, description: r.get(2)?, severity: r.get(3)?, 
            raw_row_data: r.get(4).ok(), row_index: r.get(5)?, detected_at: r.get(6)?,
            recommendations: r.get(7).unwrap_or_default(), evidence_quote: r.get(8).unwrap_or_default(),
            audit_id: r.get(9).ok(), evidence_image: r.get(10).ok(),
            status: r.get(11).unwrap_or_else(|_| "Open".to_string()),
            assignee: r.get(12).ok(), due_date: r.get(13).ok(),
            remediation_plan: r.get(14).ok(), manager_comment: r.get(15).ok()
        })
    };
    let rows_res = stmt.query_map([], mapper).map_err(|e| e.to_string())?;
    let mut list = Vec::new();
    for r in rows_res { if let Ok(issue) = r { list.push(issue); } }
    Ok(list)
}

#[tauri::command]
pub async fn generate_annual_report(app_handle: AppHandle, year: i32) -> Result<Value, String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let (total_issues, high_risk_count, top_domains) = {
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        let year_str = format!("{}%", year);
        let mut stmt = conn.prepare("SELECT issue_title, severity, project_type FROM audit_issues WHERE detected_at LIKE ?1").map_err(|e| e.to_string())?;
        let issue_rows = stmt.query_map(params![year_str], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, String>(2)?))).map_err(|e| e.to_string())?;
        let mut total = 0; let mut high = 0;
        let mut domain_counts: std::collections::HashMap<String, i32> = std::collections::HashMap::new();
        for r in issue_rows {
            if let Ok((_title, severity, domain)) = r {
                total += 1; if severity == "High" { high += 1; }
                *domain_counts.entry(domain).or_insert(0) += 1;
            }
        }
        let mut domains: Vec<_> = domain_counts.into_iter().collect();
        domains.sort_by(|a, b| b.1.cmp(&a.1));
        let top: Vec<_> = domains.iter().take(3).map(|(d, c)| format!("{} ({}건)", d, c)).collect();
        (total, high, top)
    };

    let system_prompt = format!(r#"
    당신은 기업의 최고 감사 책임자(Chief Audit Executive, CAE)입니다. CEO를 위한 {year}년 연간 감사 경영 요약 보고서를 작성하십시오.
    제공된 통계:
    - 총 발견 이슈: {total_issues}건
    - 고위험 이슈: {high_risk_count}건
    - 주요 취약 영역: {top_domains}
    요구사항:
    1. 당해년도 감사 트렌드를 분석하십시오.
    2. 발견된 가장 큰 리스크 요인을 지적하십시오.
    3. 내년도 감사 전략 수립을 위한 핵심 중점 분야를 제안하십시오.
    4. 전문적이고 전략적인 톤을 유지하며 한국어로 작성하십시오. Markdown 형식을 사용하세요.
    "#, year=year, total_issues=total_issues, high_risk_count=high_risk_count, top_domains=top_domains.join(", "));

    let ai_insight = call_gemini_chat("위 통계를 바탕으로 연간 보고서를 작성해줘.".to_string(), &system_prompt).await.unwrap_or_else(|e| format!("AI Insight 생성 실패: {}", e));
    Ok(json!({ "year": year, "total_issues": total_issues, "high_risk_count": high_risk_count, "top_domains": top_domains, "ai_insight": ai_insight }))
}

#[tauri::command]
pub fn add_audit_plan(app_handle: AppHandle, year: i32, domain: String, risk_score: i32, importance: String, days: i32, description: String) -> Result<(), String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO audit_plans (year, audit_domain, risk_score, strategic_importance, resource_days, description) VALUES (?1, ?2, ?3, ?4, ?5, ?6)", params![year, domain, risk_score, importance, days, description]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_audit_plans(app_handle: AppHandle, year: i32) -> Result<Vec<AuditPlan>, String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, year, audit_domain, risk_score, strategic_importance, resource_days, status, description FROM audit_plans WHERE year = ?1 ORDER BY risk_score DESC").map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![year], |r| Ok(AuditPlan { id: r.get(0)?, year: r.get(1)?, audit_domain: r.get(2)?, risk_score: r.get(3)?, strategic_importance: r.get(4)?, resource_days: r.get(5)?, status: r.get(6)?, description: r.get(7).unwrap_or_default() })).map_err(|e| e.to_string())?;
    let mut list = Vec::new(); for r in rows { if let Ok(p) = r { list.push(p); } }
    Ok(list)
}

#[tauri::command]
pub fn add_audit_universe_entity(app_handle: AppHandle, unit_name: String, category: String, last_audit_year: i32) -> Result<(), String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let active_col = get_active_universe_column(&conn)?;
    let sql = format!("INSERT INTO audit_universe ({}, category, last_audit_year) VALUES (?1, ?2, ?3)", active_col);
    conn.execute(&sql, params![unit_name, category, last_audit_year]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_audit_universe(app_handle: AppHandle) -> Result<Vec<AuditUniverseEntity>, String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let mut conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let active_col = get_active_universe_column(&conn)?;
    let query_sql = format!("SELECT id, {}, category, impact_score, likelihood_score, last_audit_year, budget_size, headcount, last_audit_rating, key_systems, ai_analysis_data FROM audit_universe", active_col);
    let mut list = Vec::new();
    {
        let mut stmt = conn.prepare(&query_sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |r| {
            let ai_json: Option<String> = r.get(10)?;
            let ai_analysis: Option<AiRiskAnalysis> = ai_json.and_then(|s| serde_json::from_str(&s).ok());
            Ok(AuditUniverseEntity { id: r.get(0)?, unit_name: r.get(1)?, category: r.get(2)?, impact_score: r.get(3)?, likelihood_score: r.get(4)?, last_audit_year: r.get(5)?, budget_size: r.get(6).unwrap_or("N/A".to_string()), headcount: r.get(7).unwrap_or(0), last_audit_rating: r.get(8).unwrap_or("Not Rated".to_string()), key_systems: r.get(9).unwrap_or("None".to_string()), ai_analysis })
        }).map_err(|e| e.to_string())?;
        for r in rows { if let Ok(e) = r { list.push(e); } }
    }
    Ok(list)
}

#[tauri::command]
pub async fn ai_suggest_risk_score(app_handle: AppHandle, id: i64, use_live_ai: bool) -> Result<Value, String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let (unit_name, category, budget, headcount, rating, systems, pre_seeded_json) = {
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        let active_col = get_active_universe_column(&conn)?;
        let query = format!("SELECT {}, category, budget_size, headcount, last_audit_rating, key_systems, ai_analysis_data FROM audit_universe WHERE id = ?1", active_col);
        conn.query_row(&query, params![id], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, String>(2).unwrap_or("N/A".to_string()), r.get::<_, i32>(3).unwrap_or(0), r.get::<_, String>(4).unwrap_or("N/A".to_string()), r.get::<_, String>(5).unwrap_or("N/A".to_string()), r.get::<_, Option<String>>(6)?))).map_err(|e| e.to_string())?
    };

    if !use_live_ai {
        if let Some(json_str) = pre_seeded_json {
            let val: crate::models::AiRiskAnalysis = serde_json::from_str(&json_str).map_err(|e| e.to_string())?;
            return Ok(json!(val));
        }
        return Ok(json!({"reason": "Simulation mode fallback", "impact_score": 5, "likelihood_score": 5}));
    }

    let issues: Vec<String> = {
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        let search_pattern = format!("%{}%", unit_name);
        let mut stmt = conn.prepare("SELECT issue_title || ': ' || description FROM audit_issues WHERE issue_title LIKE ?1 OR description LIKE ?1 OR project_type LIKE ?1 LIMIT 15").map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![search_pattern], |r| r.get(0)).map_err(|e| e.to_string())?;
        rows.filter_map(|r| r.ok()).collect()
    };
    
    let issues_context = if issues.is_empty() { "No specific findings.".into() } else { format!("Findings:\n{}", issues.join("\n")) };
    let prompt = format!("You are a CAE. Assess risk for {}. Type: {}. Budget: {}. Context: {}. Output JSON with reason, impact_score, likelihood_score.", unit_name, category, budget, issues_context);

    let result = call_gemini_direct(&prompt).await.map_err(|e| e.to_string())?;
    let cleaned = extract_json(&result);
    let val: crate::models::AiRiskAnalysis = serde_json::from_str(&cleaned).map_err(|e| format!("JSON Parse Error: {}", e))?;
    Ok(json!(val))
}

#[tauri::command]
pub fn get_files_by_type(app_handle: AppHandle, project_type: String) -> Result<Vec<Value>, String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, file_name, file_type, upload_date, file_path FROM audit_data WHERE project_type = ?1 ORDER BY id DESC").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([project_type], |r| Ok(json!({ "id": r.get::<usize, i64>(0)?, "file_name": r.get::<usize, String>(1)?, "file_type": r.get::<usize, String>(2)?, "upload_date": r.get::<usize, String>(3)?, "file_path": r.get::<usize, String>(4)? }))).map_err(|e| e.to_string())?;
    let mut list = Vec::new(); for r in rows { if let Ok(f) = r { list.push(f); } }
    Ok(list)
}

#[tauri::command]
pub fn delete_audit_project(app_handle: AppHandle, project_id: String) -> Result<String, String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let _ = conn.execute("DELETE FROM audit_issues WHERE project_type = ?1 OR audit_id = ?1", params![&project_id]);
    let _ = conn.execute("DELETE FROM audit_projects WHERE id = ?1", params![&project_id]);
    Ok("Deleted".into())
}

#[tauri::command]
pub fn get_system_events(app_handle: AppHandle) -> Result<Vec<crate::models::SystemEvent>, String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, timestamp, event_type, description, related_entity_id FROM system_events ORDER BY timestamp DESC LIMIT 50").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |r| Ok(crate::models::SystemEvent { id: r.get(0)?, timestamp: r.get(1)?, event_type: r.get(2)?, description: r.get(3)?, related_entity_id: r.get(4)? })).map_err(|e| e.to_string())?;
    let mut list = Vec::new(); for r in rows { if let Ok(e) = r { list.push(e); } }
    Ok(list)
}

#[tauri::command]
pub fn get_file_preview(file_path: String, limit: Option<usize>) -> Result<Vec<Vec<String>>, String> {
    let path = Path::new(&file_path);
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    let take_limit = limit.unwrap_or(50);
    if ext == "xlsx" || ext == "xls" {
        let mut workbook = open_workbook_auto(path).map_err(|e| e.to_string())?;
        if let Some((_name, range)) = workbook.worksheets().first() {
            let mut preview = Vec::new();
            for row in range.rows().take(if take_limit == 0 { 1000 } else { take_limit }) {
                preview.push(row.iter().map(|c| c.to_string()).collect());
            }
            return Ok(preview);
        }
    }
    if let Ok(content) = read_any_file(path, &ext) {
        let mut preview = Vec::new();
        for (i, line) in content.lines().enumerate() {
            if take_limit > 0 && i >= take_limit { break; }
            if line.contains('\t') { preview.push(line.split('\t').map(|s| s.to_string()).collect()); }
            else if line.contains(',') && (ext == "csv" || ext == "log") { preview.push(line.split(',').map(|s| s.to_string()).collect()); }
            else { preview.push(vec![line.to_string()]); }
        }
        Ok(preview)
    } else {
        Ok(vec![vec!["미리보기를 지원하지 않는 형식입니다.".into()]])
    }
}

#[tauri::command]
pub fn get_all_scenarios(app_handle: AppHandle) -> Result<Vec<Value>, String> {
    let mut scenarios: Vec<Value> = Vec::new();
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    if let Ok(conn) = Connection::open(db_path) {
        if let Ok(mut stmt) = conn.prepare("SELECT id, category, name, risk_level, description, origin_audit_type, origin_department, detected_date, is_ai_generated FROM custom_scenarios ORDER BY id ASC") {
            let rows = stmt.query_map(params![], |row| Ok(json!({ "id": format!("MASTER-{}", row.get::<_, i64>(0)?), "category": row.get::<_, String>(1).unwrap_or("ETC".to_string()), "name": row.get::<_, String>(2).unwrap_or("Untitled".to_string()), "risk_level": row.get::<_, String>(3).unwrap_or("Medium".to_string()), "description": row.get::<_, String>(4).unwrap_or("".to_string()), "origin_audit_type": row.get::<_, Option<String>>(5)?.unwrap_or("미분류".to_string()), "origin_department": row.get::<_, Option<String>>(6)?.unwrap_or("시스템 제공".to_string()), "detected_date": row.get::<_, Option<String>>(7)?.unwrap_or("-".to_string()), "is_ai_generated": row.get::<_, i32>(8).unwrap_or(0) != 0 })));
            if let Ok(rows) = rows { for r in rows { if let Ok(s) = r { scenarios.push(s); } } }
        }
    }
    Ok(scenarios)
}

#[tauri::command]
pub fn get_audit_projects(app_handle: AppHandle) -> Result<Vec<AuditProject>, String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, title, status, progress_pct, start_date, end_date, lead_auditor FROM audit_projects ORDER BY start_date DESC").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |r| Ok(AuditProject { id: r.get(0)?, title: r.get(1)?, status: r.get(2)?, progress_pct: r.get(3)?, start_date: r.get(4)?, end_date: r.get(5)?, lead_auditor: r.get(6)? })).map_err(|e| e.to_string())?;
    let mut list = Vec::new(); for r in rows { if let Ok(p) = r { list.push(p); } }
    Ok(list)
}

#[tauri::command]
pub fn create_audit_project(app_handle: AppHandle, mut project: AuditProject) -> Result<String, String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let now = Local::now();
    let yyyymm = now.format("%Y%m").to_string();
    let seq = now.format("%H%M%S").to_string();
    let dept = if project.title.to_lowercase().contains("marketing") { "MKT" } else if project.title.to_lowercase().contains("sales") { "SAL" } else if project.title.to_lowercase().contains("factory") { "FACT" } else { "HQ" };
    if project.id == "new" || project.id.is_empty() { project.id = format!("REG_{}_{}_{}", yyyymm, dept, seq); }
    project.status = "Planning".to_string(); project.progress_pct = 0;
    conn.execute("INSERT INTO audit_projects (id, title, status, progress_pct, start_date, end_date, lead_auditor) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)", params![project.id, project.title, project.status, project.progress_pct, project.start_date, project.end_date, project.lead_auditor]).map_err(|e| e.to_string())?;
    Ok(project.id)
}

#[tauri::command]
pub async fn execute_project_analysis(app_handle: AppHandle, project_id: String, department: String) -> Result<Value, String> {
    let db_path = app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db");
    {
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        conn.execute("UPDATE audit_projects SET status = 'Fieldwork', progress_pct = 10 WHERE id = ?1", params![&project_id]).map_err(|e| e.to_string())?;
    }
    run_audit_analysis(app_handle.clone(), project_id.clone(), Some(false)).await?;
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    let findings_count: i64 = conn.query_row("SELECT COUNT(*) FROM audit_issues WHERE audit_id = ?1", params![&project_id], |r| r.get(0)).unwrap_or(0);
    let high_count: i64 = conn.query_row("SELECT COUNT(*) FROM audit_issues WHERE audit_id = ?1 AND severity = 'High'", params![&project_id], |r| r.get(0)).unwrap_or(0);
    let crit_count: i64 = conn.query_row("SELECT COUNT(*) FROM audit_issues WHERE audit_id = ?1 AND severity = 'Critical'", params![&project_id], |r| r.get(0)).unwrap_or(0);
    let risk_score = std::cmp::min(100, (crit_count * 40) + (high_count * 15) + (findings_count * 5) + 20);
    if department.contains("Marketing") || department.contains("Sales") || department.contains("Factory") {
        let _ = conn.execute("UPDATE audit_universe SET impact_score = ?1, likelihood_score = ?2, ai_analysis_data = ?3 WHERE unit_name LIKE ?4", params![if risk_score > 80 { 10 } else { 8 }, if risk_score > 60 { 9 } else { 6 }, format!("LIVE: {} findings. Risk: {}.", findings_count, risk_score), format!("%{}%", department)]);
    }
    conn.execute("UPDATE audit_projects SET progress_pct = 100, risk_score = ?1, findings_count = ?2, status = 'Reporting' WHERE id = ?3", params![risk_score as i64, findings_count, project_id]).map_err(|e| e.to_string())?;
    Ok(json!({ "findings_count": findings_count, "risk_score": risk_score, "status": "Success" }))
}
"""
    
    with open(r'c:\Users\user\.gemini\antigravity\scratch\auditflow\src-tauri\src\commands.rs', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Reconstruction successful.")

if __name__ == "__main__":
    reconstruct_commands()
