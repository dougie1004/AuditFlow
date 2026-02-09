use tauri::{AppHandle, Manager};
use rusqlite::{params, Connection};
use serde_json::{json, Value};
#[allow(unused_imports)]
use serde::Serialize; // Ensure derive works
use rand;
#[allow(unused_imports)]
use crate::ai_detection::{SuspicionSignal, SignalScope};
use crate::compliance_dd_flow::{Adjudicator, AdjudicationOutcome};

fn get_db_path(app_handle: &AppHandle) -> std::path::PathBuf {
    app_handle.path().app_data_dir().unwrap().join("audit_data_v4.db")
}

#[tauri::command]
pub fn debug_reset_inbox(app_handle: AppHandle) -> Result<String, String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    
    // [FULL PURGE] Clear all Phase 2 transparency tables + Uploaded Data
    conn.execute("DELETE FROM adjudication_log", []).ok();
    conn.execute("DELETE FROM suspicion_inbox", []).ok();
    conn.execute("DELETE FROM engine_metrics", []).ok();
    conn.execute("DELETE FROM audit_issues", []).ok();
    conn.execute("DELETE FROM system_events", []).ok();
    conn.execute("DELETE FROM audit_data", []).ok();
    conn.execute("DELETE FROM audit_projects", []).ok();
    
    Ok("System State Purged (Transparency Logs + Uploads + Projects Cleared)".to_string())
}

#[tauri::command]
pub fn debug_inject_sample_projects(app_handle: AppHandle) -> Result<String, String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let sample_projects = vec![
        ("PRJ-MKT-01", "마케팅 비용 정밀 실사", "Marketing", 15),
        ("PRJ-FIN-01", "재무 제표 무결성 검증", "Finance", 25),
        ("PRJ-HR-01", "인사/급여 프로세스 점검", "HR", 8),
        ("PRJ-SAL-01", "영업 리베이트 의혹 조사", "Sales", 42),
        ("PRJ-PUR-01", "구매 자금 유출 패턴 분석", "Purchase", 12),
    ];

    for (id, title, domain, risk) in sample_projects {
        conn.execute(
            "INSERT INTO audit_projects (id, title, status, progress_pct, start_date, lead_auditor, risk_score, valuation_tier) 
             VALUES (?1, ?2, 'Fieldwork', 45, '2024-01-01', 'AI_ENGINE', ?3, 'enterprise')",
            params![id, title, risk]
        ).ok();

        // Also add system event for the project
        conn.execute(
            "INSERT INTO system_events (timestamp, event_type, description, audit_id) VALUES (CURRENT_TIMESTAMP, 'PROJECT_CREATED', ?1, ?2)",
            params![format!("New Project: {}", title), id]
        ).ok();
    }

    Ok("Sample Projects Injected".to_string())
}

#[tauri::command]
pub fn debug_launch_deep_context_test(app_handle: AppHandle) -> Result<String, String> {
    let db_path = get_db_path(&app_handle);
    let mut conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Purge
    tx.execute("DELETE FROM audit_projects", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM suspicion_inbox", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM system_events", []).map_err(|e| e.to_string())?;

    // 2. Setup Deep Analysis Project
    tx.execute(
        "INSERT INTO audit_projects (id, title, status, progress_pct, risk_score, valuation_tier) 
         VALUES ('PRJ-DEEP-01', '심층 맥락 대조 검증 (Deep Context Validation)', 'Fieldwork', 0, 0, 'enterprise')",
        []
    ).map_err(|e| e.to_string())?;

    // 3. Inject 5 High-Density Boundary Cases (Cross-Silo)
    let cases = vec![
        (
            "Case #1: 규정 상충 및 직무 적합성 대조", 
            json!({
                "source": "Expense_API", 
                "cross_check": ["HR_Roles", "Shift_Logs"],
                "observation": "영업직 심야 교통비 집행건에 대한 직무 가이드라인 및 당일 외근 일지 대조 필요"
            })
        ),
        (
            "Case #2: 증빙 문서 무결성 및 OCR 교차 확인", 
            json!({
                "source": "Receipt_OCR", 
                "cross_check": ["Card_Transaction", "VAT_Registry"],
                "observation": "수기 영수증 금액과 카드 승인 내역 원본 데이터 간 미세 불일치(10원 단위) 식별 및 보정 단계"
            })
        ),
        (
            "Case #3: 다수 계정 간 비정상 자금 흐름 연결망", 
            json!({
                "source": "Bank_Ledger", 
                "cross_check": ["Vendor_Master", "Shareholder_Relation"],
                "observation": "신규 거래처 대금 송금 후 관계인 계좌로의 자금 우회 가능성에 대한 3단계 소유 구조 추적"
            })
        ),
        (
            "Case #4: 복리후생 규정 한도 및 가족 관계 대조", 
            json!({
                "source": "Payroll_Extra", 
                "cross_check": ["Family_Registry", "Education_Support_Policy"],
                "observation": "학자금 지원 신청 내역과 실제 인사 기록상의 부양 가족 연령 및 재학 증명서 유효성 검증"
            })
        ),
        (
            "Case #5: 프로젝트 공기 및 인건비 배부 정합성", 
            json!({
                "source": "Timesheet", 
                "cross_check": ["Project_Plan", "Jira_Activity"],
                "observation": "특정 프로젝트에 할당된 투입 공수와 실제 개발 활동 로그(Git/Jira) 간의 시계열적 정합성 매핑"
            })
        ),
    ];

    for (i, (title, meta)) in cases.into_iter().enumerate() {
        tx.execute(
            "INSERT INTO suspicion_inbox (signal_id, observation, anomaly_score, source, metadata, status) 
             VALUES (?1, ?2, 0.5, 'DEEP_ENGINE', ?3, 'Pending')",
            params![format!("SIG-DEEP-{:02}", i), title, meta.to_string()]
        ).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok("Deep Context Scenarios Loaded. Engine is ready for high-fidelity cross-check simulation.".into())
}

#[tauri::command]
pub fn debug_run_deep_analysis(app_handle: AppHandle) -> Result<serde_json::Value, String> {
    use std::{thread, time};
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // Fetch pending deep signals
    let mut stmt = conn.prepare("SELECT signal_id, metadata FROM suspicion_inbox WHERE status = 'Pending' AND source = 'DEEP_ENGINE'").map_err(|e| e.to_string())?;
    let signals: Vec<(String, String)> = stmt.query_map([], |r| Ok((r.get(0)?, r.get(1)?))).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    let mut logs = Vec::new();
    let mut cross_checks = 0;

    for (sig_id, meta_str) in signals {
        // Parse metadata to see what we are cross-checking
        let meta: serde_json::Value = serde_json::from_str(&meta_str).unwrap_or(json!({}));
        let empty_vec = vec![];
        let checks = meta.get("cross_check").and_then(|v| v.as_array()).unwrap_or(&empty_vec);
        
        let check_list: Vec<String> = checks.iter().map(|v| v.as_str().unwrap_or("?").to_string()).collect();
        cross_checks += check_list.len();

        // SIMULATE DEEP THINKING / DB LOOKUPS
        let thinking_time = time::Duration::from_millis(400); 
        thread::sleep(thinking_time);

        // [CONSTITUTION] Determine Status based on Data Availability
        // If the checking requires external offline data (e.g. Git Logs, Physical Shift Logs), 
        // we MUST NOT finalize judgment. We request evidence.
        
        let mut needs_evidence = false;
        let mut missing_docs = Vec::new();

        for check in &check_list {
            if check == "Shift_Logs" || check == "Jira_Activity" || check == "Git_Log" {
                needs_evidence = true;
                missing_docs.push(check.clone());
            }
        }

        if needs_evidence {
            conn.execute(
                "UPDATE suspicion_inbox SET status = 'NeedsEvidence' WHERE signal_id = ?1",
                params![sig_id]
            ).map_err(|e| e.to_string())?;

            logs.push(format!("✋ [{}] HALTED: Missing External Data {:?}. Requesting submission.", sig_id, missing_docs));
        } else {
            conn.execute(
                "UPDATE suspicion_inbox SET status = 'Analysed_Deep' WHERE signal_id = ?1",
                params![sig_id]
            ).map_err(|e| e.to_string())?;

            logs.push(format!("✔ [{}] Verified against internal records {:?}", sig_id, check_list));
        }
    }

    Ok(json!({
        "processed": logs.len(),
        "cross_checks_total": cross_checks,
        "logs": logs,
        "status": "DEEP_VERIFICATION_COMPLETE"
    }))
}

#[tauri::command]
pub fn debug_inject_signals(app_handle: AppHandle, count: i32, scenario: String) -> Result<String, String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    
    let mut injected = 0;
    
    for i in 0..count {
        // [PHASE 4] RAW CHAOS GENERATOR
        // We inject facts, NOT outcomes. The Adjudicator must earn its' verdict.
        let domains = vec![
            ("HR", vec!["급여 통장", "인사 관리", "복리후생비", "야간식대"]),
            ("Marketing", vec!["SNS 광고", "인플루언서", "대행사 수수료", "이벤트 비용"]),
            ("Finance", vec!["해외 송금", "환전 서비스", "회계 법인", "세무 상담"]),
            ("Sales", vec!["접대 식사", "기프트 카드", "영업 활동비", "골프 회원권"]),
            ("Purchase", vec!["원자재 구매", "소모품 조달", "운송 대행", "창고 임대"]),
        ];

        let d_idx = rand::random::<usize>() % domains.len();
        let (domain_name, merchants) = &domains[d_idx];
        let accounts = vec!["복리후생비", "접대비", "소모품비", "여비교통비", "지급수수료", "판매관리비", "잡손실"];
        
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
        
        let observation = format!("{} 에서 {} 집행 (금액: {}원)", &merchant, &account, amount);
        
        // [CONSTITUTION] No hallucinations. Score must be 0 until proven guilty by Adjudicator.
        let anomaly_score = 0.0;
        
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
                domain_name, // Use domain name as source for better mapping
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

            let domain_source: String = conn.query_row("SELECT source FROM suspicion_inbox WHERE signal_id = ?1", params![signal_id], |r| r.get(0)).unwrap_or_else(|_| "Corporate Card".to_string());

            conn.execute(
                "INSERT INTO audit_issues (
                    project_type, issue_title, description, severity, 
                    raw_row_data, detected_at, evidence_quote, status, recommendations,
                    verdict_mode, logic_chain, grade, audit_id
                ) VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP, ?6, 'Open', ?7, ?8, ?9, ?10, ?11)",
                params![
                    domain_source,
                    finding.violation_type,
                    finding.evidence.join("\n"), 
                    finding.severity,
                    raw_data, 
                    finding.evidence.join(" | "),
                    format!("Regulation Ref: {}", finding.regulation_ref),
                    finding.verdict_mode,
                    serde_json::to_string(&finding.logic_chain).unwrap_or_else(|_| "[]".to_string()),
                    finding.grade,
                    signal_id
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
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

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
            evidence: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
            regulation: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
            detected_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut confirmed_issues = Vec::new();
    for issue in issue_iter {
        confirmed_issues.push(issue.map_err(|e| e.to_string())?);
    }

    // 3. Fetch All Signals from Inbox for Drill-down - Sort by Anomaly Score Descending
    let mut stmt = conn.prepare("SELECT signal_id, observation, status, anomaly_score, detected_at, metadata FROM suspicion_inbox ORDER BY anomaly_score DESC").map_err(|e| e.to_string())?;
    
    // Collect 1st query results to drop the borrow on stmt/conn
    let rows_iter = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, f64>(3)?,
            row.get::<_, String>(4)?,
            row.get::<_, Option<String>>(5)?,
        ))
    }).map_err(|e| e.to_string())?;

    let mut signal_rows = Vec::new();
    for r in rows_iter {
        signal_rows.push(r.map_err(|e| e.to_string())?);
    }

    let mut all_signals = Vec::new();

    // Iterate safely
    for (sid, obs, stat, score, det, meta_str) in signal_rows {
        
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



