use rusqlite::{params, Connection};
use std::path::PathBuf;
use crate::file_loader::load_file_rows;
// use uuid::Uuid; // Removed as it is now handled in LedgerBuilder

pub async fn run_ledger_only_scan(
    target_files: Vec<(String, String)>,
    project_type: &str,
    db_path: &PathBuf,
) -> Result<usize, String> {
    let mut conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let mut total_findings = 0;

    // 1. Setup Temporary Aggregation Table
    conn.execute("DROP TABLE IF EXISTS ldg_temp_scan", []).ok();
    conn.execute(
        "CREATE TABLE ldg_temp_scan (
            id TEXT PRIMARY KEY,            -- Event ID (UUID)
            date_str TEXT,
            account TEXT,
            vendor TEXT,
            description TEXT,
            amount REAL,
            dept TEXT,
            entity_id TEXT,
            month TEXT
        )",
        []
    ).map_err(|e| e.to_string())?;

    // 2. Efficient Batch Ingestion with Entity Resolution & Event Memory (Refactored Phase 1)
    {
        for (path, _) in &target_files {
            use crate::ingestion::ledger_builder::LedgerBuilder;
            use crate::ingestion::EventBuilder;
            
            // Phase 1: Use the Unified Builder
            let builder = LedgerBuilder { file_path: path.clone() };
            let events = builder.build_events(); // Standardized events

            let tx = conn.transaction().map_err(|e| e.to_string())?;
            
            for event in events {
                // Resolution Logic (Keeping legacy engine logic alive for safety)
                let entity_id = crate::entity_resolver::resolve_entity(&tx, &event.entity_id, "VENDOR").unwrap_or("UNKNOWN".to_string());
                let month = if event.event_date.len() >= 7 { &event.event_date[0..7] } else { "2025-01" };
                
                // [Event Memory] Insert into persistent timeline (Unified Table)
                tx.execute(
                    "INSERT INTO entity_event (id, entity_id, event_type, amount, event_date, description, is_flagged, risk_delta, source_type, metadata) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 0.0, ?7, ?8)",
                    params![
                        event.id, 
                        entity_id, 
                        event.event_type, 
                        event.amount.unwrap_or(0.0), 
                        event.event_date, 
                        event.description,
                        event.source_type,
                        event.metadata
                    ]
                ).ok();

                // [Scan Engine] Insert into temp table for set-based analysis (Legacy Logic Support)
                // We need to unpack metadata to get account/dept
                let meta_json: serde_json::Value = serde_json::from_str(&event.metadata.unwrap_or_else(|| "{}".to_string())).unwrap_or(serde_json::json!({}));
                let account = meta_json["account"].as_str().unwrap_or_default();
                let dept = meta_json["dept"].as_str().unwrap_or_default();

                tx.execute(
                    "INSERT INTO ldg_temp_scan (id, date_str, account, vendor, description, amount, dept, entity_id, month) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                    params![
                        event.id,
                        event.event_date,
                        account,
                        event.entity_id, // Vendor Name (Raw)
                        event.description,
                        event.amount.unwrap_or(0.0),
                        dept,
                        entity_id, // Resolved ID
                        month
                    ]
                ).ok();
            }
            
            tx.commit().map_err(|e| e.to_string())?;
        }
    }

    // 3. 🎯 Set-Based Analysis (Aggregated Processing)
    
    // [LDG-05] Account Volatility (3x Average Increase)
    {
        let mut stmt = conn.prepare("
            WITH monthly_sums AS (
                SELECT account, month, SUM(amount) as m_total
                FROM ldg_temp_scan
                GROUP BY account, month
            ),
            account_avg AS (
                SELECT account, AVG(m_total) as avg_monthly
                FROM monthly_sums
                GROUP BY account
            )
            SELECT s.account, s.month, s.m_total, a.avg_monthly
            FROM monthly_sums s
            JOIN account_avg a ON s.account = a.account
            WHERE s.m_total > a.avg_monthly * 3.0 AND a.avg_monthly > 0
        ").map_err(|e| e.to_string())?;
        
        let rows = stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, f64>(2)?, r.get::<_, f64>(3)?))).map_err(|e| e.to_string())?;
        for r in rows {
            if let Ok((acc, mon, total, avg)) = r {
                save_issue(&conn, project_type.to_string(), "LDG-05".to_string(), "계정 사용 액티비티 변동 (Account Volatility)".to_string(),
                    format!("계정 '{}'의 {}월 집행액(₩{})이 평균(₩{}) 대비 300% 이상 급증했습니다.", acc, mon, format_num(total), format_num(avg)),
                    "Medium".to_string(), "해당 부서의 사업 계획 변경이나 예산 추가 전용 여부를 확인하세요.".to_string()).ok();
                
                conn.execute(
                    "UPDATE entity_event SET is_flagged = 1, risk_delta = risk_delta + 10.0, rule_flags = COALESCE(rule_flags || ',', '') || 'LDG-05' 
                     WHERE id IN (SELECT id FROM ldg_temp_scan WHERE account = ?1 AND month = ?2)",
                    params![acc, mon]
                ).ok();
                total_findings += 1;
            }
        }
    }

    // [LDG-01] Top 1% High Value
    {
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM ldg_temp_scan", [], |r| r.get(0)).unwrap_or(0);
        if count > 0 {
            let limit = (count as f64 * 0.01).max(1.0) as i64;
            let mut stmt = conn.prepare("SELECT id, date_str, account, vendor, description, amount FROM ldg_temp_scan ORDER BY amount DESC LIMIT ?1").map_err(|e| e.to_string())?;
            let rows = stmt.query_map([limit], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, String>(2)?, r.get::<_, String>(3)?, r.get::<_, String>(4)?, r.get::<_, f64>(5)?))).map_err(|e| e.to_string())?;
            for r in rows {
                if let Ok((ev_id, d, a, v, desc, amt)) = r {
                    save_issue(&conn, project_type.to_string(), "LDG-01".to_string(), "고액 상위 1% 전표".to_string(),
                        format!("금액: ₩{}, 계정: {}, 거래처: {}, 적요: {}, 일자: {}", format_num(amt), a, v, desc, d),
                        "High".to_string(), "해당 전표의 승인 문서 및 계약서를 요청하세요.".to_string()).ok();
                    
                    conn.execute("UPDATE entity_event SET is_flagged = 1, risk_delta = risk_delta + 30.0, rule_flags = COALESCE(rule_flags || ',', '') || 'LDG-01' WHERE id = ?1", [ev_id]).ok();
                    total_findings += 1;
                }
            }
        }
    }

    // [LDG-02] Round Number Repetition
    {
        let mut stmt = conn.prepare("
            SELECT amount, COUNT(*) as cnt 
            FROM ldg_temp_scan 
            WHERE CAST(amount AS INTEGER) % 100000 = 0 AND amount > 0
            GROUP BY amount HAVING cnt >= 3
        ").map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |r| Ok((r.get::<_, f64>(0)?, r.get::<_, i64>(1)?))).map_err(|e| e.to_string())?;
        for r in rows {
            if let Ok((amt, c)) = r {
                 save_issue(&conn, project_type.to_string(), "LDG-02".to_string(), "라운드 금액 반복 패턴".to_string(),
                    format!("금액 ₩{} 이(가) {}회 반복 발생했습니다. 인위적 금액 설정 가능성이 있습니다.", format_num(amt), c),
                    "Medium".to_string(), "해당 금액 기준 승인 한도 정책을 확인하세요.".to_string()).ok();
                 
                 conn.execute(
                    "UPDATE entity_event SET is_flagged = 1, risk_delta = risk_delta + 15.0, rule_flags = COALESCE(rule_flags || ',', '') || 'LDG-02' 
                     WHERE id IN (SELECT id FROM ldg_temp_scan WHERE amount = ?1)",
                    params![amt]
                 ).ok();
                 total_findings += 1;
            }
        }
    }

    // [LDG-06] Departmental Concentration (Outlier)
    {
        let mut stmt = conn.prepare("
            SELECT vendor, dept, COUNT(*) as cnt, SUM(amount) as total, entity_id
            FROM ldg_temp_scan
            GROUP BY vendor, dept
            HAVING total > (SELECT SUM(amount) * 0.9 FROM ldg_temp_scan t2 WHERE t2.vendor = ldg_temp_scan.vendor)
            AND COUNT(*) > 2
        ").map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, f64>(3)?, r.get::<_, String>(4)?))).map_err(|e| e.to_string())?;
        for r in rows {
            if let Ok((v, d, total, ent_id)) = r {
                save_issue(&conn, project_type.to_string(), "LDG-06".to_string(), "특정 부서 집중 거래 (Departmental Outlier)".to_string(),
                    format!("거래처 '{}'에 대한 지출의 90% 이상(₩{})이 부서 '{}'에서 발생했습니다.", v, format_num(total), d),
                    "Medium".to_string(), "해당 벤더와 부서 담당자 간의 유착 가능성을 검토하세요.".to_string()).ok();
                
                conn.execute(
                    "UPDATE entity_event SET is_flagged = 1, risk_delta = risk_delta + 20.0, rule_flags = COALESCE(rule_flags || ',', '') || 'LDG-06' 
                     WHERE entity_id = ?1 AND id IN (SELECT id FROM ldg_temp_scan WHERE dept = ?2)",
                    params![ent_id, d]
                ).ok();
                total_findings += 1;
            }
        }
    }

    // [LDG-07] Keyword Search
    {
        let danger_keywords = vec!["상품권", "자문료", "정산", "기타", "선지급", "임시", "gift", "consultant"];
        for kw in danger_keywords {
            let mut stmt = conn.prepare("SELECT id, description, amount FROM ldg_temp_scan WHERE description LIKE ?1").map_err(|e| e.to_string())?;
            let rows = stmt.query_map([format!("%{}%", kw)], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, f64>(2)?))).map_err(|e| e.to_string())?;
            for r in rows {
                if let Ok((ev_id, desc, amt)) = r {
                     save_issue(&conn, project_type.to_string(), "LDG-07".to_string(), "적요 키워드 위험 탐지".to_string(),
                        format!("위찰 키워드 '{}'이(가) 포함된 전표가 발견되었습니다. (₩{}, 적요: {})", kw, format_num(amt), desc),
                        "High".to_string(), "실제 수령자 증빙 및 자문 결과물 등의 실질 증거를 요청하세요.".to_string()).ok();
                     
                     conn.execute("UPDATE entity_event SET is_flagged = 1, risk_delta = risk_delta + 25.0, rule_flags = COALESCE(rule_flags || ',', '') || 'LDG-07' WHERE id = ?1", [ev_id]).ok();
                     total_findings += 1;
                }
            }
        }
    }

    // Cleanup
    conn.execute("DROP TABLE ldg_temp_scan", []).ok();

    Ok(total_findings)
}

fn save_issue(
    conn: &Connection, 
    project_type: String, 
    scenario_id: String, 
    title: String, 
    desc: String, 
    severity: String, 
    recom: String
) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO audit_issues (project_type, issue_title, description, severity, status, verdict_mode, recommendations, detected_at) 
         VALUES (?1, ?2, ?3, ?4, 'Open', 'STATISTICAL', ?5, CURRENT_TIMESTAMP)",
        params![project_type, format!("[{}] {}", scenario_id, title), desc, severity, recom]
    )?;
    Ok(())
}

fn format_num(n: f64) -> String {
    use num_format::{Locale, ToFormattedString};
    (n as i64).to_formatted_string(&Locale::en)
}
