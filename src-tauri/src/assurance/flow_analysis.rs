
use rusqlite::{params, Connection};
use serde::{Serialize, Deserialize};
use serde_json;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MonthlySummary {
    pub account: String,
    pub month: String,
    pub start_balance: f64,
    pub total_increase: f64,
    pub total_decrease: f64,
    pub end_balance: f64,
    pub activity_count: i64,
    pub variance_pct: f64,         // 전월 대비 변동률
    pub momentum_indicator: f64,   // 최근 추세 (3m avg / 6m avg)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FlowNode {
    pub id: String,
    pub label: String,
    pub value: f64,
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StructuralInsight {
    pub account: String,
    pub volatility: f64,            // CV
    pub concentration_ratio_1: f64,  // CR1
    pub concentration_ratio_3: f64,  // CR3
    pub hhi_index: f64,             // HHI
    pub distribution_shift: f64,
    pub structural_score: f64,      // 0~1
    pub status: String,             // "Stable", "Watch", "Critical" 등
    pub reasons: Vec<String>,       // 사람이 읽는 이유
    pub recommended_focus: bool,
    pub is_statistically_significant: bool,
}

pub fn get_monthly_account_summary_impl(db_path: &std::path::Path, account_name: Option<String>, year: Option<i32>) -> Result<Vec<MonthlySummary>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    
    // SQLite query to get monthly aggregates
    // Note: We use json_extract to get the account from metadata if not present in a direct column
    let mut query = "
        SELECT 
            COALESCE(json_extract(metadata, '$.account'), 'Uncategorized') as acc,
            strftime('%Y-%m', event_date) as mon,
            SUM(amount) as total_amt,
            COUNT(*) as cnt
        FROM entity_event
        WHERE 1=1
    ".to_string();

    if let Some(ref a) = account_name {
        query.push_str(&format!(" AND json_extract(metadata, '$.account') = '{}'", a.replace("'", "''")));
    }
    if let Some(y) = year {
        query.push_str(&format!(" AND strftime('%Y', event_date) = '{}'", y));
    }

    query.push_str(" GROUP BY acc, mon ORDER BY mon ASC, acc ASC");

    let mut account_balances: std::collections::HashMap<String, f64> = std::collections::HashMap::new();

    // [DYNAMIC BALANCE] If a year is specified, calculate the opening balance for all accounts before that year
    if let Some(y) = year {
        let op_query = "SELECT COALESCE(json_extract(metadata, '$.account'), 'Uncategorized') as acc, SUM(amount) FROM entity_event WHERE strftime('%Y', event_date) < ?1 GROUP BY acc";
        let mut op_stmt = conn.prepare(op_query).map_err(|e| e.to_string())?;
        let op_rows = op_stmt.query_map([y.to_string()], |r| Ok((r.get::<_, String>(0)?, r.get::<_, f64>(1)?))).map_err(|e| e.to_string())?;
        for r in op_rows { if let Ok((acc, amt)) = r { account_balances.insert(acc, amt); } }
    }

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, f64>(2)?, r.get::<_, i64>(3)?))).map_err(|e| e.to_string())?;

    let mut summaries = Vec::new();
    let mut prev_amt: Option<f64> = None;
    let mut recent_amounts: Vec<f64> = Vec::new();

    for r in rows {
        if let Ok((acc, mon, amt, cnt)) = r {
            let start_bal = *account_balances.get(&acc).unwrap_or(&0.0);
            
            // For now, we treat all transactions as 'increase' (activity volume)
            // In a more complex model, we'd check if it's a Debit or Credit based on account type.
            let end_bal = start_bal + amt;

            let variance = match prev_amt {
                Some(p) if p.abs() > 0.001 => (amt - p) / p.abs(),
                _ => 0.0,
            };

            // Momentum calculation (3m / 6m)
            recent_amounts.push(amt);
            if recent_amounts.len() > 12 { recent_amounts.remove(0); }
            
            let m_3: f64 = recent_amounts.iter().rev().take(3).sum::<f64>() / recent_amounts.iter().rev().take(3).count().max(1) as f64;
            let m_6: f64 = recent_amounts.iter().rev().take(6).sum::<f64>() / recent_amounts.iter().rev().take(6).count().max(1) as f64;
            let momentum = if m_6.abs() > 0.001 { m_3 / m_6.abs() } else { 1.0 };

            summaries.push(MonthlySummary {
                account: acc.clone(),
                month: mon,
                start_balance: start_bal,
                total_increase: amt,
                total_decrease: 0.0,
                end_balance: end_bal,
                activity_count: cnt,
                variance_pct: variance,
                momentum_indicator: momentum,
            });

            account_balances.insert(acc, end_bal);
            prev_amt = Some(amt);
        }
    }

    Ok(summaries)
}

pub fn get_account_flow_graph_impl(db_path: &std::path::Path, account_name: String) -> Result<Vec<FlowNode>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    
    // Find all entities (vendors/customers) that interacted with this account
    let query = "
        SELECT 
            entity_id,
            SUM(amount) as total_val
        FROM entity_event
        WHERE json_extract(metadata, '$.account') = ?1
        GROUP BY entity_id
        ORDER BY total_val DESC
    ";

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([account_name], |r| {
        Ok((
            r.get::<_, String>(0)?, // entity_id
            r.get::<_, f64>(1)?,    // total_val
        ))
    }).map_err(|e| e.to_string())?;

    let mut nodes = Vec::new();
    let mut total_all = 0.0;

    for r in rows {
        if let Ok((id, val)) = r {
            total_all += val;
            nodes.push((id, val));
        }
    }

    let result = nodes.into_iter().map(|(id, val)| {
        let pct = if total_all > 0.0 { (val / total_all) * 100.0 } else { 0.0 };
        FlowNode {
            id: id.clone(),
            label: id, // In a real app, we might join with entity_master for canonical_name
            value: val,
            percentage: pct,
        }
    }).collect();

    Ok(result)
}

pub fn get_structural_insight_impl(db_path: &std::path::Path, account_name: String) -> Result<StructuralInsight, String> {
    let summaries = get_monthly_account_summary_impl(db_path, Some(account_name.clone()), None)?;
    let flow_nodes = get_account_flow_graph_impl(db_path, account_name.clone())?;
    
    Ok(calculate_structural_insight(account_name, &summaries, &flow_nodes))
}

pub fn get_structural_top_accounts_impl(db_path: &std::path::Path) -> Result<Vec<StructuralInsight>, String> {
    let start_total = std::time::Instant::now();
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // 1. Data Loading (Single Scan)
    let start_load = std::time::Instant::now();
    let mut stmt = conn.prepare("SELECT entity_id, amount, event_date, metadata FROM entity_event").map_err(|e| e.to_string())?;
    let event_rows = stmt.query_map([], |r| {
        Ok((
            r.get::<_, String>(0)?, // entity_id
            r.get::<_, f64>(1)?,    // amount
            r.get::<_, String>(2)?, // event_date
            r.get::<_, Option<String>>(3)?, // metadata
        ))
    }).map_err(|e| e.to_string())?;

    let mut events = Vec::new();
    for r in event_rows {
        if let Ok(row) = r { events.push(row); }
    }
    let elapsed_load = start_load.elapsed();
    println!(">>> [PERF] Loaded {} events: {}ms", events.len(), elapsed_load.as_millis());

    // 2. In-Memory Grouping by Account
    let start_group = std::time::Instant::now();
    let mut account_events: std::collections::HashMap<String, Vec<(String, f64, String)>> = std::collections::HashMap::new();
    let mut month_distribution: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    
    for (entity_id, amount, date, metadata) in events {
        let account = if let Some(meta_str) = metadata {
            let meta: serde_json::Value = serde_json::from_str(&meta_str).unwrap_or(serde_json::json!({}));
            meta["account"].as_str().unwrap_or("Unknown").to_string()
        } else {
            "Unknown".to_string()
        };
        let month = if date.len() >= 7 { &date[0..7] } else { "Unknown" };
        *month_distribution.entry(month.to_string()).or_default() += 1;
        account_events.entry(account).or_default().push((entity_id, amount, month.to_string()));
    }
    let elapsed_group = start_group.elapsed();
    println!("--------------------------------------------------");
    println!(">>> [STRUCTURAL ENGINE] Monthly Aggregation Stats:");
    println!("- Target Account Count: {}", account_events.len());
    println!("- Monthly Data Points Found: {}", month_distribution.len());
    for (mo, count) in month_distribution.iter() {
        println!("  * {}: {} rows", mo, count);
    }
    println!("--------------------------------------------------");
    println!(">>> [PERF] Grouping Complete: {}ms", elapsed_group.as_millis());

    // 3. Batch Calculation
    let start_calc = std::time::Instant::now();
    let mut insights = Vec::new();

    for (acc_name, ev_list) in account_events {
        if acc_name == "Unknown" { continue; }

        let mut month_map: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
        let mut entity_map: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
        let mut total_val = 0.0;

        for (entity, amt, mon) in ev_list {
            *month_map.entry(mon).or_default() += amt;
            *entity_map.entry(entity).or_default() += amt;
            total_val += amt;
        }

        // Convert to MonthlySummary
        let mut sorted_months: Vec<String> = month_map.keys().cloned().collect();
        sorted_months.sort();
        let summaries: Vec<MonthlySummary> = sorted_months.into_iter().map(|m| {
            MonthlySummary {
                account: acc_name.clone(),
                month: m.clone(),
                start_balance: 0.0,
                total_increase: *month_map.get(&m).unwrap_or(&0.0),
                total_decrease: 0.0,
                end_balance: 0.0,
                activity_count: 0,
                variance_pct: 0.0,
                momentum_indicator: 1.0,
            }
        }).collect();

        // Convert to FlowNode
        let flow_nodes: Vec<FlowNode> = entity_map.into_iter().map(|(ent, val)| {
            FlowNode {
                id: ent.clone(),
                label: ent,
                value: val,
                percentage: if total_val > 0.0 { (val / total_val) * 100.0 } else { 0.0 },
            }
        }).collect();

        insights.push(calculate_structural_insight(acc_name, &summaries, &flow_nodes));
    }
    let elapsed_calc = start_calc.elapsed();
    println!(">>> [PERF] Analysis Complete: {}ms", elapsed_calc.as_millis());

    // 4. Sort and Return
    insights.sort_by(|a, b| b.structural_score.partial_cmp(&a.structural_score).unwrap_or(std::cmp::Ordering::Equal));
    
    let total_elapsed = start_total.elapsed();
    println!(">>> [PERF] TOTAL Structural Top Accounts Engine: {}ms", total_elapsed.as_millis());

    if insights.is_empty() {
        // [HELPFUL FEEDBACK] If database is empty but objects exist, provide a hint.
        let obj_count: i64 = conn.query_row("SELECT COUNT(*) FROM audit_object WHERE object_type = 'LEDGER'", [], |r| r.get(0)).unwrap_or(0);
        if obj_count > 0 {
             let mut fail_reasons = vec![
                 format!("저장소에 {}개의 원장 파일이 있으나, 분석용 트랜잭션이 추출되지 않았습니다.", obj_count),
                 "파일의 날짜/금액 형식이 맞지 않거나 인코딩 문제일 수 있습니다.".to_string(),
             ];
             
             if month_distribution.is_empty() {
                 fail_reasons.push("CRITICAL: 월 단위 그룹핑 결과가 0건입니다 (날짜 파싱 실패 유력).".to_string());
             }

             fail_reasons.push("자료를 다시 업로드하거나 엔진 업데이트를 확인하세요.".to_string());

             return Ok(vec![StructuralInsight {
                 account: "분석 데이터 없음".to_string(),
                 volatility: 0.0,
                 concentration_ratio_1: 0.0,
                 concentration_ratio_3: 0.0,
                 hhi_index: 0.0,
                 distribution_shift: 0.0,
                 structural_score: 0.0,
                 status: "Ingestion Required".to_string(),
                 reasons: fail_reasons,
                 recommended_focus: true,
                 is_statistically_significant: false,
             }]);
        }
    }

    Ok(insights.into_iter().take(15).collect())
}



pub fn calculate_structural_insight(account_name: String, summaries: &[MonthlySummary], flow_nodes: &[FlowNode]) -> StructuralInsight {
    let is_significant = summaries.len() >= 6;

    // 1. Normalized Volatility (Coefficient of Variation)
    let net_changes: Vec<f64> = summaries.iter().map(|s| s.total_increase).collect();
    let n = net_changes.len() as f64;
    let mean_abs = if n > 0.0 { net_changes.iter().map(|v| v.abs()).sum::<f64>() / n } else { 0.0 };
    let std_dev = if n > 1.0 {
        let mean = net_changes.iter().sum::<f64>() / n;
        (net_changes.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / (n - 1.0)).sqrt()
    } else { 0.0 };
    let cv = if mean_abs > 0.001 { (std_dev / mean_abs).min(10.0) } else { 0.0 };

    // 2. Concentration (HHI, CR1, CR3)
    let mut shares: Vec<f64> = flow_nodes.iter().map(|n| n.percentage / 100.0).collect();
    shares.sort_by(|a, b| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal));
    
    let cr1 = shares.get(0).cloned().unwrap_or(0.0);
    let cr3 = shares.iter().take(3).sum::<f64>();
    let hhi = shares.iter().map(|s| s.powi(2)).sum::<f64>();

    // 3. Distribution Shift (Option A: Placeholder)
    let shift_score = 0.0; 

    // 4. Normalized Scoring
    let norm_vol = (cv / 1.0).min(1.0); // CV 1.0 is high volatility
    let norm_hhi = hhi; 
    let norm_cr1 = cr1; 
    
    let total_score = if is_significant {
        (norm_vol + norm_hhi + norm_cr1) / 3.0
    } else {
        (norm_hhi + norm_cr1) / 2.0
    };

    // [HUMANIZER] Translate numbers into Audit Language
    let mut reasons = Vec::new();
    if cv > 1.2 { reasons.push("최근 자금 집행 변동성이 매우 큽니다 (이상 징후)".to_string()); }
    if cr1 > 0.8 { reasons.push("특정 업체/계정으로의 자금 쏠림이 80%를 초과합니다".to_string()); }
    if hhi > 0.6 { reasons.push("거래처 분포가 부자연스럽게 집중되어 있습니다".to_string()); }
    if is_significant && norm_vol > 0.8 { reasons.push("비정기적인 거액 거래가 반복되고 있습니다".to_string()); }

    let status = match total_score {
        s if s > 0.7 => "우선검토 (Critical)".to_string(),
        s if s > 0.5 => "주의 (Elevated)".to_string(),
        s if s > 0.3 => "관찰 (Watch)".to_string(),
        _ => "정상 (Stable)".to_string(),
    };

    StructuralInsight {
        account: account_name,
        volatility: cv,
        concentration_ratio_1: cr1,
        concentration_ratio_3: cr3,
        hhi_index: hhi,
        distribution_shift: shift_score,
        structural_score: total_score,
        status,
        reasons,
        recommended_focus: total_score > 0.5 || cr1 > 0.8 || cv > 1.5,
        is_statistically_significant: is_significant,
    }
}



#[cfg(test)]
mod tests {
    use super::*;

    fn mock_summary(month: &str, amt: f64, prev_amt: f64) -> MonthlySummary {
        let var = if prev_amt > 0.0 { (amt - prev_amt) / prev_amt } else { 0.0 };
        MonthlySummary {
            account: "TEST".to_string(),
            month: month.to_string(),
            start_balance: 0.0,
            total_increase: amt,
            total_decrease: 0.0,
            end_balance: amt,
            activity_count: 1,
            variance_pct: var,
            momentum_indicator: 1.0,
        }
    }

    #[test]
    fn test_scenario_1_normal_data() {
        let mut summaries = Vec::new();
        for i in 1..=12 {
            summaries.push(mock_summary(&format!("2025-{:02}", i), 1000.0 + (i as f64 * 10.0), 1000.0));
        }
        let flow_nodes = vec![
            FlowNode { id: "V1".into(), label: "V1".into(), value: 100.0, percentage: 10.0 },
            FlowNode { id: "V2".into(), label: "V2".into(), value: 100.0, percentage: 10.0 },
            FlowNode { id: "V3".into(), label: "V3".into(), value: 100.0, percentage: 10.0 },
        ];
        
        let insight = calculate_structural_insight("Normal".into(), &summaries, &flow_nodes);
        println!(">>> [NORMAL] Score: {:.4}, Vol: {:.4}, HHI: {:.4}", insight.structural_score, insight.volatility, insight.hhi_index);
        
        assert!(insight.structural_score < 0.4, "Normal data should have low score");
        assert!(!insight.recommended_focus, "Normal data should not be recommended for focus");
    }

    #[test]
    fn test_scenario_2_volatility_spike() {
        let mut summaries = Vec::new();
        for i in 1..=10 {
            summaries.push(mock_summary(&format!("2025-{:02}", i), 1000.0, 1000.0));
        }
        // Sudden spikes in last 2 months
        summaries.push(mock_summary("2025-11", 5000.0, 1000.0));
        summaries.push(mock_summary("2025-12", 8000.0, 5000.0));

        let flow_nodes = vec![
            FlowNode { id: "V1".into(), label: "V1".into(), value: 100.0, percentage: 33.3 },
            FlowNode { id: "V2".into(), label: "V2".into(), value: 100.0, percentage: 33.3 },
            FlowNode { id: "V3".into(), label: "V3".into(), value: 100.0, percentage: 33.3 },
        ];

        let insight = calculate_structural_insight("Spiky".into(), &summaries, &flow_nodes);
        println!(">>> [SPIKY] Score: {:.4}, Vol: {:.4}, HHI: {:.4}", insight.structural_score, insight.volatility, insight.hhi_index);
        
        assert!(insight.volatility > 1.0, "Volatility should be high");
        assert!(insight.structural_score > 0.5, "Spiky data should have elevated score");
    }

    #[test]
    fn test_scenario_3_concentration_distortion() {
        let mut summaries = Vec::new();
        for i in 1..=12 {
            summaries.push(mock_summary(&format!("2025-{:02}", i), 1000.0, 1000.0));
        }
        
        // Highly concentrated flow
        let flow_nodes = vec![
            FlowNode { id: "SUSP_V1".into(), label: "V1".into(), value: 900.0, percentage: 90.0 },
            FlowNode { id: "V2".into(), label: "V2".into(), value: 50.0, percentage: 5.0 },
            FlowNode { id: "V3".into(), label: "V3".into(), value: 50.0, percentage: 5.0 },
        ];

        let insight = calculate_structural_insight("Concentrated".into(), &summaries, &flow_nodes);
        println!(">>> [CONCENTRATED] Score: {:.4}, HHI: {:.4}, CR1: {:.4}", insight.structural_score, insight.hhi_index, insight.concentration_ratio_1);
        
        assert!(insight.hhi_index > 0.8, "HHI should be very high");
        assert!(insight.concentration_ratio_1 >= 0.9, "CR1 should be 0.9");
        assert!(insight.recommended_focus, "Concentrated account should be flagged");
    }
}
