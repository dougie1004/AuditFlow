use tauri::{AppHandle, Manager};
use rusqlite::{params, Connection};
use serde_json::json;
use serde::Serialize; // Ensure derive works
use rand;
use crate::ai_detection::{SuspicionSignal, SignalScope};
use crate::compliance_dd_flow::{Adjudicator, AdjudicationOutcome};

fn get_db_path(app_handle: &AppHandle) -> std::path::PathBuf {
    app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db")
}

#[tauri::command]
pub fn debug_reset_inbox(app_handle: AppHandle) -> Result<String, String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    
    // [FULL PURGE] Clear all Phase 2 transparency tables in correct FK order
    conn.execute("DELETE FROM adjudication_log", []).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM suspicion_inbox", []).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM engine_metrics", []).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM audit_issues", []).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM system_events", []).map_err(|e| e.to_string())?;
    
    Ok("System State Purged (Transparency Logs + Issues Cleared)".to_string())
}

#[tauri::command]
pub fn debug_inject_signals(app_handle: AppHandle, count: i32, scenario: String) -> Result<String, String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    
    let mut injected = 0;
    
    for i in 0..count {
        // [PHASE 4] RAW CHAOS GENERATOR
        // We inject facts, NOT outcomes. The Adjudicator must earn its' verdict.
        let merchants = vec![
            "스타벅스 강남", "미드나잇 라운지", "AWS Cloud", "에이스 컨설팅", 
            "김밥천국", "쉐라톤 호텔", "골든 멤버스 클럽", "쿠팡", "카카오택시",
            "청담동 일식", "법무법인 리걸", "현대카드", "올리브영", "파리바게뜨"
        ];
        let accounts = vec!["복리후생비", "접대비", "소모품비", "여비교통비", "지급수수료"];
        
        let m_idx = rand::random::<usize>() % merchants.len();
        let a_idx = rand::random::<usize>() % accounts.len();
        let merchant = merchants[m_idx].to_string();
        let account = accounts[a_idx].to_string();
        
        // Randomize amount and hour for pattern detection
        let amount = if rand::random::<bool>() { 
            (rand::random::<u32>() % 30000) + 5000 // Small
        } else {
            (rand::random::<u32>() % 2000000) + 100000 // Large
        };
        
        let hour = rand::random::<u32>() % 24;
        let is_weekend = rand::random::<bool>();
        
        let observation = format!("{} 에서 {} 집행 (금액: {}원)", merchant, account, amount);
        let anomaly_score = (amount as f64 / 2000000.0).min(1.0); // Simple statistical bias
        
        let metadata = json!({
            "amount": amount,
            "merchant": merchant,
            "account": account,
            "exec_hour": hour,
            "is_weekend": is_weekend,
            "actor_id": format!("USR-{:03}", rand::random::<u32>() % 100),
            "raw_timestamp": format!("2024-02-01T{:02}:00:00Z", hour)
        });

        conn.execute(
            "INSERT INTO suspicion_inbox (signal_id, observation, anomaly_score, source, scope, related_tx_ids, metadata, status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'Pending')",
            params![
                format!("SIG-{:05}-{}", i, uuid::Uuid::new_v4().to_string().split('-').next().unwrap()),
                observation,
                anomaly_score,
                "RAW_FEED",
                "Transaction",
                "[]",
                metadata.to_string()
            ]
        ).map_err(|e| e.to_string())?;
        injected += 1;
    }
    
    Ok(format!("Injected {} signals (Scenario: {})", injected, scenario))
}

#[tauri::command]
pub fn debug_get_inbox_stats(app_handle: AppHandle) -> Result<serde_json::Value, String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    
    let total_inbox: i32 = conn.query_row("SELECT COUNT(*) FROM suspicion_inbox", [], |r| r.get(0)).unwrap_or(0);
    let pending: i32 = conn.query_row("SELECT COUNT(*) FROM suspicion_inbox WHERE status = 'Pending'", [], |r| r.get(0)).unwrap_or(0);
    
    Ok(json!({ "total": total_inbox, "pending": pending }))
}

#[tauri::command]
pub fn debug_process_next(app_handle: AppHandle) -> Result<String, String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    
    // 1. Fetch one pending signal
    let signal_id: String = conn.query_row(
        "SELECT signal_id FROM suspicion_inbox WHERE status = 'Pending' LIMIT 1",
        [],
        |r| r.get(0)
    ).map_err(|_| "No Pending Signals".to_string())?;
    
    // 2. Adjudicate
    // [CONSTITUTION RESTORED] No hacks. We trust the Adjudicator.
    let outcome = Adjudicator::adjudicate_signal(&conn, &signal_id)?;

    // 3. Update Status & Promote if Confirmed
    let status = match &outcome {
        AdjudicationOutcome::Confirmed(finding) => {
            // [PROMOTION] Confirmed signals become Official Audit Issues
            // Generate simulated mapping data for UI (Latitude/Longitude for maps)
            let lat = 37.56 + (rand::random::<f64>() * 0.05);
            let lng = 126.97 + (rand::random::<f64>() * 0.05);
            let raw_data = format!("2024-02-01|Simulated Merchant|Location Data|{}|Tester|{}|{}", finding.severity, lat, lng);

            conn.execute(
                "INSERT INTO audit_issues (
                    project_type, issue_title, description, severity, 
                    raw_row_data, detected_at, evidence_quote, status, recommendations,
                    verdict_mode, logic_chain, grade
                ) VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP, ?6, 'Open', ?7, ?8, ?9, ?10)",
                params![
                    "Corporate Card",
                    finding.violation_type,
                    finding.evidence.join("\n"), 
                    finding.severity,
                    raw_data, 
                    finding.evidence.join(" | "),
                    format!("Regulation Ref: {}", finding.regulation_ref),
                    finding.verdict_mode,
                    serde_json::to_string(&finding.logic_chain).unwrap_or_else(|_| "[]".to_string()),
                    finding.grade
                ]
            ).map_err(|e| format!("Failed to promote issue: {}", e))?;
            
            if finding.verdict_mode == "AUTOMATED" {
                "Processed (Auto-Confirmed)"
            } else {
                "Processed (NeedsReview)"
            }
        },
        AdjudicationOutcome::Dismissed { .. } => "Processed (Auto-Dismissed)",
        AdjudicationOutcome::Investigation { .. } => "Processed (Investigation)",
        AdjudicationOutcome::Unclassified { reason, .. } => {
            match reason {
                crate::compliance_dd_flow::JudicialInabilityReason::NoApplicableRule => "Processed (Unclassified:NoRule)",
                crate::compliance_dd_flow::JudicialInabilityReason::InsufficientFields => "Processed (Unclassified:NoData)",
                _ => "Processed (Unclassified)",
            }
        },
        AdjudicationOutcome::NeedsMoreEvidence(_) => "Processed (NeedsEvidence)",
    };
    
    conn.execute(
        "UPDATE suspicion_inbox SET status = ?1 WHERE signal_id = ?2",
        params![status, signal_id]
    ).map_err(|e| e.to_string())?;
    
    // 4. Return Log
    let log = match outcome {
        AdjudicationOutcome::Confirmed(f) => format!("🚨 CONFIRMED: {} (Ref: {})", f.violation_type, f.regulation_ref),
        AdjudicationOutcome::Dismissed { reason, .. } => format!("📉 DISMISSED: {}", reason),
        AdjudicationOutcome::Investigation { .. } => "🔍 INVESTIGATION: Unknown anomaly detected".to_string(),
        AdjudicationOutcome::Unclassified { message, .. } => format!("⚪ UNCLASSIFIED: {}", message),
        AdjudicationOutcome::NeedsMoreEvidence(req) => format!("✋ HOLD: {}", req),
    };
    
    Ok(log)
}

#[tauri::command]
pub fn debug_run_calibration_test(app_handle: AppHandle) -> Result<serde_json::Value, String> {
    let db_path = get_db_path(&app_handle);
    let mut conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // [INTELLIGENT ADJUDICATION] Check if user has already injected custom data
    let pending_count: i32 = conn.query_row("SELECT COUNT(*) FROM suspicion_inbox WHERE status = 'Pending'", [], |r| r.get(0)).unwrap_or(0);

    if pending_count == 0 {
        // [PHASE 4] Upgrade to 1,000 Diverse Signals for Constitutional Stress Test
        let _ = conn.execute("DELETE FROM adjudication_log", []);
        let _ = conn.execute("DELETE FROM suspicion_inbox", []);
        let _ = conn.execute("DELETE FROM audit_issues", []);

        let scenarios = vec![
            ("harmless", 750),   // Target Grade D
            ("ambiguous", 200),  // Target Grade B/C
            ("violation", 40),   // Target Grade A
            ("advisory", 10)     // High Risk Manual
        ];
        for (name, count) in scenarios {
            debug_inject_signals(app_handle.clone(), count, name.to_string())?;
        }
    }

    // 3. Process All (Adjudication) - Processes CURRENT inbox content
    let mut results = Vec::new();
    loop {
        match debug_process_next(app_handle.clone()) {
            Ok(log) => results.push(log),
            Err(_) => break, // No more signals
        }
    }

    // 4. Calculate Stats (Phase 4.0 KPI)
    let total: i32 = conn.query_row("SELECT COUNT(*) FROM suspicion_inbox", [], |r| r.get(0)).unwrap_or(0);
    let dismissed: i32 = conn.query_row("SELECT COUNT(*) FROM suspicion_inbox WHERE status LIKE '%Dismissed%'", [], |r| r.get(0)).unwrap_or(0);
    let auto_confirmed: i32 = conn.query_row("SELECT COUNT(*) FROM suspicion_inbox WHERE status LIKE '%Auto-Confirmed%'", [], |r| r.get(0)).unwrap_or(0);
    let needs_review: i32 = conn.query_row("SELECT COUNT(*) FROM suspicion_inbox WHERE status LIKE '%NeedsReview%'", [], |r| r.get(0)).unwrap_or(0);
    let investigation: i32 = conn.query_row("SELECT COUNT(*) FROM suspicion_inbox WHERE status LIKE '%Investigation%'", [], |r| r.get(0)).unwrap_or(0);
    let pending_evidence: i32 = conn.query_row("SELECT COUNT(*) FROM suspicion_inbox WHERE status LIKE '%Unclassified%' OR status LIKE '%NeedsEvidence%'", [], |r| r.get(0)).unwrap_or(0);

    // KPI: Funnel Integrity = (Dismissed + NeedsReview + NeedsEvidence) / Total
    let hold_total = needs_review + pending_evidence;
    let funnel_integrity = ((dismissed + hold_total) as f32 / total as f32) * 100.0;
    let auto_confirmed_ratio = (auto_confirmed as f32 / total as f32) * 100.0;

    Ok(json!({
        "total_funnel": total,
        "dismissed": dismissed,
        "confirmed": auto_confirmed,
        "hold_needs_review": needs_review,
        "investigation_needed": investigation,
        "funnel_integrity_ratio": format!("{:.1}%", funnel_integrity),
        "confirmed_ratio": format!("{:.1}%", auto_confirmed_ratio),
        "status": if funnel_integrity >= 90.0 { 
            "PASS (Phase 4 Calibration Locked)" 
        } else { 
            "REVIEW REQUIRED (Potential Calibration Drift)" 
        }
    }))
}

#[derive(serde::Serialize)]
pub struct RiskReportData {
    pub total_scanned: i32,
    pub dismissed_count: i32,
    pub confirmed_count: i32,
    pub confirmed_issues: Vec<ComplianceFindingDisplay>,
    pub all_signals: Vec<SignalDetailDisplay>,
}

#[derive(serde::Serialize)]
pub struct SignalDetailDisplay {
    pub signal_id: String,
    pub observation: String,
    pub status: String,
    pub anomaly_score: f64,
    pub detected_at: String,
    pub reasoning: Vec<AdjudicationStep>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(serde::Serialize)]
pub struct AdjudicationStep {
    pub rule_id: String,
    pub criterion: String,
    pub result: String,
    pub reasoning: String,
}

#[derive(serde::Serialize)]
pub struct ComplianceFindingDisplay {
    pub title: String,
    pub severity: String,
    pub evidence: String,
    pub regulation: String,
    pub detected_at: String,
}

#[tauri::command]
pub fn get_risk_report_data(app_handle: AppHandle) -> Result<RiskReportData, String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // 1. Stats from Suspicion Inbox (The Funnel)
    // Dynamic counting to maintain honesty. If inbox is empty, scanned is 0.
    let total_inbox: i32 = conn.query_row("SELECT COUNT(*) FROM suspicion_inbox", [], |r| r.get(0)).unwrap_or(0);
    let total_scanned = total_inbox; 
    // Any status other than Pending roughly means processed. We check 'Dismissed' explicitly.
    let dismissed_count: i32 = conn.query_row("SELECT COUNT(*) FROM suspicion_inbox WHERE status LIKE '%Dismissed%'", [], |r| r.get(0)).unwrap_or(0);

    // 2. Confirmed Issues from Audit Issues Table (The Result)
    // We select required columns.
    let mut stmt = conn.prepare("SELECT issue_title, severity, evidence_quote, recommendations, detected_at FROM audit_issues ORDER BY id DESC").map_err(|e| e.to_string())?;
    
    let issue_iter = stmt.query_map([], |row| {
        Ok(ComplianceFindingDisplay {
            title: row.get(0)?,
            severity: row.get(1)?,
            evidence: row.get(2)?,
            regulation: row.get(3)?,
            detected_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut confirmed_issues = Vec::new();
    for issue in issue_iter {
        confirmed_issues.push(issue.map_err(|e| e.to_string())?);
    }

    // 3. Fetch All Signals from Inbox for Drill-down - Sort by Anomaly Score Descending
    let mut stmt = conn.prepare("SELECT signal_id, observation, status, anomaly_score, detected_at, metadata FROM suspicion_inbox ORDER BY anomaly_score DESC").map_err(|e| e.to_string())?;
    let signal_rows = stmt.query_map([], |row| {
        let sid: String = row.get(0)?;
        let obs: String = row.get(1)?;
        let stat: String = row.get(2)?;
        let score: f64 = row.get(3)?;
        let det: String = row.get(4)?;
        let meta_str: Option<String> = row.get(5)?;
        
        Ok((sid, obs, stat, score, det, meta_str))
    }).map_err(|e| e.to_string())?;

    let mut all_signals = Vec::new();
    for row_res in signal_rows {
        let (sid, obs, stat, score, det, meta_str) = row_res.map_err(|e| e.to_string())?;
        
        // Fetch Adjudication Logs (Separate query to avoid borrow issues in closure)
        let mut adj_stmt = conn.prepare("SELECT rule_id, criterion, result, reasoning FROM adjudication_log WHERE signal_id = ?1").map_err(|e| e.to_string())?;
        let adj_logs = adj_stmt.query_map([&sid], |r| {
            Ok(AdjudicationStep {
                rule_id: r.get(0)?,
                criterion: r.get(1)?,
                result: r.get(2)?,
                reasoning: r.get(3)?,
            })
        }).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

        let metadata = meta_str.and_then(|s| serde_json::from_str(&s).ok());

        all_signals.push(SignalDetailDisplay {
            signal_id: sid,
            observation: obs,
            status: stat,
            anomaly_score: score,
            detected_at: det,
            reasoning: adj_logs,
            metadata,
        });
    }

    Ok(RiskReportData {
        total_scanned,
        dismissed_count,
        confirmed_count: confirmed_issues.len() as i32,
        confirmed_issues,
        all_signals,
    })
}
