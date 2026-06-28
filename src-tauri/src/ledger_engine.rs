use rusqlite::{params, Connection};
use std::path::PathBuf;
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
            month TEXT,
            project_id TEXT,
            project_code TEXT
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
                // We need to unpack metadata to get account/dept/project_id/project_code
                let meta_json: serde_json::Value = serde_json::from_str(&event.metadata.unwrap_or_else(|| "{}".to_string())).unwrap_or(serde_json::json!({}));
                let account = meta_json["account"].as_str().unwrap_or_default();
                let dept = meta_json["dept"].as_str().unwrap_or_default();
                let project_id_val = meta_json["project_id"].as_str().unwrap_or_default();
                let project_code_val = meta_json["project_code"].as_str().unwrap_or_default();

                tx.execute(
                    "INSERT INTO ldg_temp_scan (id, date_str, account, vendor, description, amount, dept, entity_id, month, project_id, project_code) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                    params![
                        event.id,
                        event.event_date,
                        account,
                        event.entity_id, // Vendor Name (Raw)
                        event.description,
                        event.amount.unwrap_or(0.0),
                        dept,
                        entity_id, // Resolved ID
                        month,
                        project_id_val,
                        project_code_val
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
                    format!("계정 '{}'의 {}월 집행액(₩{}원)이 평균(₩{}원) 대비 300% 이상 급증했습니다.", acc, mon, format_num(total), format_num(avg)),
                    "Medium".to_string(), "해당 부서의 사업 계획 변경이나 예산 추가 전용 여부를 확인하세요.".to_string(), None).ok();
                
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
            let mut stmt = conn.prepare("SELECT id, date_str, account, vendor, description, amount, entity_id FROM ldg_temp_scan ORDER BY amount DESC LIMIT ?1").map_err(|e| e.to_string())?;
            let rows = stmt.query_map([limit], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, String>(2)?, r.get::<_, String>(3)?, r.get::<_, String>(4)?, r.get::<_, f64>(5)?, r.get::<_, Option<String>>(6)?))).map_err(|e| e.to_string())?;
            for r in rows {
                if let Ok((ev_id, d, a, v, desc, amt, ent_id_str)) = r {
                    let ent_id = ent_id_str.and_then(|s| s.parse::<i64>().ok());
                    save_issue(&conn, project_type.to_string(), "LDG-01".to_string(), "고액 상위 1% 전표".to_string(),
                        format!("금액: ₩{}원, 계정: {}, 거래처: {}, 적요: {}, 일자: {}", format_num(amt), a, v, desc, d),
                        "High".to_string(), "해당 전표의 승인 문서 및 계약서를 요청하세요.".to_string(), ent_id).ok();
                    
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
                    format!("금액 ₩{}원 이(가) {}회 반복 발생했습니다. 인위적 금액 설정 가능성이 있습니다.", format_num(amt), c),
                    "Medium".to_string(), "해당 금액 기준 승인 한도 정책을 확인하세요.".to_string(), None).ok();
                 
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
            if let Ok((v, d, total, ent_id_str)) = r {
                let ent_id = ent_id_str.parse::<i64>().ok();
                save_issue(&conn, project_type.to_string(), "LDG-06".to_string(), "특정 부서 집중 거래 (Departmental Outlier)".to_string(),
                    format!("거래처 '{}'에 대한 지출의 90% 이상(₩{}원)이 부서 '{}'에서 발생했습니다.", v, format_num(total), d),
                    "Medium".to_string(), "해당 벤더와 부서 담당자 간의 유착 가능성을 검토하세요.".to_string(), ent_id).ok();
                
                conn.execute(
                    "UPDATE entity_event SET is_flagged = 1, risk_delta = risk_delta + 20.0, rule_flags = COALESCE(rule_flags || ',', '') || 'LDG-06' 
                     WHERE entity_id = ?1 AND id IN (SELECT id FROM ldg_temp_scan WHERE dept = ?2)",
                    params![ent_id_str, d]
                ).ok();
                total_findings += 1;
            }
        }
    }

    // [LDG-07] Keyword Search
    {
        let danger_keywords = vec!["상품권", "자문료", "정산", "기타", "선지급", "임시", "gift", "consultant"];
        for kw in danger_keywords {
            let mut stmt = conn.prepare("SELECT id, description, amount, entity_id FROM ldg_temp_scan WHERE description LIKE ?1").map_err(|e| e.to_string())?;
            let rows = stmt.query_map([format!("%{}%", kw)], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, f64>(2)?, r.get::<_, Option<String>>(3)?))).map_err(|e| e.to_string())?;
            for r in rows {
                if let Ok((ev_id, desc, amt, ent_id_str)) = r {
                     let ent_id = ent_id_str.and_then(|s| s.parse::<i64>().ok());
                     save_issue(&conn, project_type.to_string(), "LDG-07".to_string(), "적요 키워드 위험 탐지".to_string(),
                        format!("위찰 키워드 '{}'이(가) 포함된 전표가 발견되었습니다. (₩{}원, 적요: {})", kw, format_num(amt), desc),
                        "High".to_string(), "실제 수령자 증빙 및 자문 결과물 등의 실질 증거를 요청하세요.".to_string(), ent_id).ok();
                     
                     conn.execute("UPDATE entity_event SET is_flagged = 1, risk_delta = risk_delta + 25.0, rule_flags = COALESCE(rule_flags || ',', '') || 'LDG-07' WHERE id = ?1", [ev_id]).ok();
                     total_findings += 1;
                }
            }
        }
    }

    // [LDG-03] Short-interval Double Payments (same vendor, same amount, within 3 days, >= 2 occurrences)
    {
        // 1. Identify all duplicate transactions that are not exceptions (Rent, Subscription, Lease, Insurance, Maintenance)
        // Note: julianday calculations in SQLite allow floating point subtraction to get difference in fractional days.
        let mut stmt = conn.prepare("
            WITH non_exceptions AS (
                SELECT id, date_str, account, vendor, description, amount, entity_id
                FROM ldg_temp_scan
                WHERE NOT (
                    description LIKE '%임차료%' OR description LIKE '%구독료%' OR description LIKE '%리스료%' OR description LIKE '%보험료%' OR description LIKE '%유지보수%'
                    OR account LIKE '%임차료%' OR account LIKE '%구독료%' OR account LIKE '%리스료%' OR account LIKE '%보험료%' OR account LIKE '%유지보수%'
                )
            )
            SELECT t1.id, t1.date_str, t1.account, t1.vendor, t1.description, t1.amount, t1.entity_id
            FROM non_exceptions t1
            WHERE EXISTS (
                SELECT 1 
                FROM non_exceptions t2
                WHERE ((t1.entity_id = t2.entity_id AND t1.entity_id != 'UNKNOWN') OR t1.vendor = t2.vendor)
                  AND t1.amount = t2.amount
                  AND t1.id != t2.id
                  AND ABS(julianday(t1.date_str) - julianday(t2.date_str)) <= 3.0
            )
            ORDER BY t1.vendor, t1.amount, t1.date_str
        ").map_err(|e| e.to_string())?;

        let rows = stmt.query_map([], |r| {
            Ok((
                r.get::<_, String>(0)?,       // id
                r.get::<_, String>(1)?,       // date_str
                r.get::<_, String>(2)?,       // account
                r.get::<_, String>(3)?,       // vendor
                r.get::<_, String>(4)?,       // description
                r.get::<_, f64>(5)?,          // amount
                r.get::<_, Option<String>>(6)?, // entity_id (resolved vendor id)
            ))
        }).map_err(|e| e.to_string())?;

        for r in rows {
            if let Ok((ev_id, date_str, _account, vendor, desc, amt, ent_id_str)) = r {
                let ent_id = ent_id_str.and_then(|s| s.parse::<i64>().ok());
                
                save_issue(
                    &conn,
                    project_type.to_string(),
                    "LDG-03".to_string(),
                    "단기 중복 전표 발생".to_string(),
                    format!(
                        "거래처 '{}'에 대해 동일 금액(₩{}원)의 전표가 3일 이내에 중복 발생했습니다. (일자: {}, 적요: {})",
                        vendor,
                        format_num(amt),
                        date_str,
                        desc
                    ),
                    "Medium".to_string(),
                    "이중 지급 여부를 확인하기 위해 세금계산서와 대금 지급 내역을 대조하세요.".to_string(),
                    ent_id,
                ).ok();

                conn.execute(
                    "UPDATE entity_event 
                     SET is_flagged = 1, 
                         risk_delta = risk_delta + 20.0, 
                         rule_flags = COALESCE(rule_flags || ',', '') || 'LDG-03' 
                     WHERE id = ?1",
                    [ev_id],
                ).ok();
                
                total_findings += 1;
            }
        }
    }

    // [LDG-08] Threshold Pattern (승인 한도 경계선 거래 후보, same vendor, same account, same threshold limit, within 7 days, >= 2 occurrences)
    {
        // Define Threshold Configuration inside the function
        struct ThresholdConfig {
            limit: f64,
            lower_bound: f64,
        }
        let thresholds = vec![
            ThresholdConfig { limit: 3_000_000.0, lower_bound: 2_900_000.0 },
            ThresholdConfig { limit: 5_000_000.0, lower_bound: 4_800_000.0 },
            ThresholdConfig { limit: 10_000_000.0, lower_bound: 9_500_000.0 },
        ];

        let mut case_branches = Vec::new();
        for tc in &thresholds {
            case_branches.push(format!(
                "WHEN amount >= {} AND amount < {} THEN {}",
                tc.lower_bound, tc.limit, tc.limit
            ));
        }
        let case_sql = format!(
            "CASE {} ELSE NULL END",
            case_branches.join(" ")
        );

        let query_sql = format!(
            "WITH boundary_tx AS (
                 SELECT id, date_str, account, vendor, description, amount, entity_id, project_id, project_code,
                        {} AS threshold_limit
                 FROM ldg_temp_scan
             )
             SELECT t1.id, t1.date_str, t1.account, t1.vendor, t1.description, t1.amount, t1.entity_id, t1.threshold_limit
             FROM boundary_tx t1
             WHERE t1.threshold_limit IS NOT NULL
               AND EXISTS (
                   SELECT 1
                   FROM boundary_tx t2
                   WHERE t1.id != t2.id
                     AND ((t1.entity_id = t2.entity_id AND t1.entity_id != 'UNKNOWN') OR t1.vendor = t2.vendor)
                     AND t1.account = t2.account
                     AND t1.threshold_limit = t2.threshold_limit
                     AND COALESCE(t1.project_id, '') = COALESCE(t2.project_id, '')
                     AND COALESCE(t1.project_code, '') = COALESCE(t2.project_code, '')
                     AND ABS(julianday(t1.date_str) - julianday(t2.date_str)) <= 7.0
               )
             ORDER BY t1.vendor, t1.threshold_limit, t1.date_str",
            case_sql
        );

        let mut stmt = conn.prepare(&query_sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |r| {
            Ok((
                r.get::<_, String>(0)?,       // id
                r.get::<_, String>(1)?,       // date_str
                r.get::<_, String>(2)?,       // account (code)
                r.get::<_, String>(3)?,       // vendor
                r.get::<_, String>(4)?,       // description
                r.get::<_, f64>(5)?,          // amount
                r.get::<_, Option<String>>(6)?, // entity_id (resolved vendor id)
                r.get::<_, f64>(7)?,          // threshold_limit
            ))
        }).map_err(|e| e.to_string())?;

        for r in rows {
            if let Ok((ev_id, date_str, account_code, vendor, desc, amt, ent_id_str, limit_amt)) = r {
                let ent_id = ent_id_str.and_then(|s| s.parse::<i64>().ok());
                
                save_issue(
                    &conn,
                    project_type.to_string(),
                    "LDG-08".to_string(),
                    "승인 한도 경계선 거래 후보".to_string(),
                    format!(
                        "전결 한도 직전 금액대 거래가 동일 거래처/동일 계정에서 반복 발생했습니다. (거래처: '{}', 금액: ₩{}원, 한도: ₩{}원, 일자: {}, 계정: {}, 적요: {})",
                        vendor,
                        format_num(amt),
                        format_num(limit_amt),
                        date_str,
                        account_code,
                        desc
                    ),
                    "High".to_string(),
                    "승인 권한 매트릭스(LoA)를 확인하고 고의적 우회 여부를 검토하세요.".to_string(),
                    ent_id,
                ).ok();

                conn.execute(
                    "UPDATE entity_event 
                     SET is_flagged = 1, 
                         risk_delta = risk_delta + 25.0, 
                         rule_flags = COALESCE(rule_flags || ',', '') || 'LDG-08' 
                     WHERE id = ?1",
                    [ev_id],
                ).ok();
                
                total_findings += 1;
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
    recom: String,
    entity_id: Option<i64>
) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO audit_issues (project_type, issue_title, description, severity, status, verdict_mode, recommendations, detected_at, entity_id) 
         VALUES (?1, ?2, ?3, ?4, 'Open', 'STATISTICAL', ?5, CURRENT_TIMESTAMP, ?6)",
        params![project_type, format!("[{}] {}", scenario_id, title), desc, severity, recom, entity_id]
    )?;
    Ok(())
}

fn format_num(n: f64) -> String {
    use num_format::{Locale, ToFormattedString};
    (n as i64).to_formatted_string(&Locale::en)
}
