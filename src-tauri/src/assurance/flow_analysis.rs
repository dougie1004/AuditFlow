
use rusqlite::{Connection, ToSql};
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

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq)]
pub enum AccountBehavior {
    StructuralConcentrationAllowed,   // 구조적 집중 허용 (예: 보증금)
    DistributionExpected,             // 분산 기대 계정 (예: 비용)
    VolatilityObserved,               // 변동성 관찰 (예: 매출)
    AdjustmentSensitive,              // 조정성/쓰레기통 (예: 가수금)
    EarningsManagementSensitive,      // 이익조정 민감 (예: 충당금)
    Normal,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StructuralInsight {
    pub account: String,
    pub behavior: AccountBehavior,
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MultiYearAccountSummary {
    pub account: String,
    pub balances_by_year: std::collections::HashMap<i32, f64>,
    pub variance_pcts: std::collections::HashMap<i32, f64>,  // YoY variance
    pub max_risk_score: f64,
}

pub fn get_multi_year_financial_summary_impl(db_path: &std::path::Path) -> Result<Vec<MultiYearAccountSummary>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    
    // 1. Group all ledger entries by account and fiscal year
    let mut stmt = conn.prepare("
        SELECT 
            COALESCE(account_name, 'Uncategorized') as acc,
            strftime('%Y', event_date) as yr,
            SUM(amount) as total
        FROM entity_event
        WHERE source_type = 'LEDGER'
        GROUP BY acc, yr
        ORDER BY acc, yr ASC
    ").map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |r| {
        Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?.parse::<i32>().unwrap_or(0), r.get::<_, f64>(2)?))
    }).map_err(|e| e.to_string())?;

    let mut account_data: std::collections::HashMap<String, MultiYearAccountSummary> = std::collections::HashMap::new();

    for r in rows {
        if let Ok((acc, yr, amt)) = r {
            let entry = account_data.entry(acc.clone()).or_insert_with(|| MultiYearAccountSummary {
                account: acc,
                balances_by_year: std::collections::HashMap::new(),
                variance_pcts: std::collections::HashMap::new(),
                max_risk_score: 0.0,
            });
            entry.balances_by_year.insert(yr, amt);
        }
    }

    // 2. Calculate YoY Variances
    for summary in account_data.values_mut() {
        let mut years: Vec<i32> = summary.balances_by_year.keys().cloned().collect();
        years.sort();

        for i in 1..years.len() {
            let prev_yr = years[i-1];
            let curr_yr = years[i];
            let prev_bal = summary.balances_by_year[&prev_yr];
            let curr_bal = summary.balances_by_year[&curr_yr];

            if prev_bal.abs() > 0.01 {
                let var = (curr_bal - prev_bal) / prev_bal.abs();
                summary.variance_pcts.insert(curr_yr, var);
            }
        }
    }

    // 3. Attach Risk Context (from account_year_profile if available)
    let mut risk_stmt = conn.prepare("SELECT account_code, MAX(structural_score) FROM account_year_profile GROUP BY account_code").map_err(|e| e.to_string())?;
    let risk_rows = risk_stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, f64>(1)?))).map_err(|e| e.to_string())?;
    for r in risk_rows {
        if let Ok((acc, score)) = r {
            if let Some(summary) = account_data.get_mut(&acc) {
                summary.max_risk_score = score;
            }
        }
    }

    let mut result: Vec<MultiYearAccountSummary> = account_data.into_values().collect();
    result.sort_by(|a, b| b.max_risk_score.partial_cmp(&a.max_risk_score).unwrap_or(std::cmp::Ordering::Equal));

    Ok(result)
}

pub fn get_monthly_account_summary_impl(db_path: &std::path::Path, account_name: Option<String>, year: Option<i32>) -> Result<Vec<MonthlySummary>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    
    // SQLite query to get monthly aggregates
    // Note: We use json_extract to get the account from metadata if not present in a direct column
    let mut query = "
        SELECT 
            COALESCE(account_name, 'Uncategorized') as acc,
            strftime('%Y-%m', event_date) as mon,
            SUM(amount) as total_amt,
            COUNT(*) as cnt
        FROM entity_event
        WHERE 1=1
    ".to_string();

    if let Some(ref a) = account_name {
        query.push_str(&format!(" AND account_name = '{}'", a.replace("'", "''")));
    }
    if let Some(y) = year {
        query.push_str(&format!(" AND strftime('%Y', event_date) = '{}'", y));
    }

    query.push_str(" GROUP BY acc, mon ORDER BY mon ASC, acc ASC");

    let mut account_balances: std::collections::HashMap<String, f64> = std::collections::HashMap::new();

    // [DYNAMIC BALANCE] If a year is specified, calculate the opening balance for all accounts before that year
    if let Some(y) = year {
        let op_query = "SELECT COALESCE(account_name, 'Uncategorized') as acc, SUM(amount) FROM entity_event WHERE strftime('%Y', event_date) < ?1 GROUP BY acc";
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
        WHERE account_name = ?1
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
    let mut stmt = conn.prepare("SELECT entity_id, amount, event_date, account_name FROM entity_event").map_err(|e| e.to_string())?;
    let event_rows = stmt.query_map([], |r| {
        Ok((
            r.get::<_, String>(0)?, // entity_id
            r.get::<_, f64>(1)?,    // amount
            r.get::<_, String>(2)?, // event_date
            r.get::<_, Option<String>>(3)?, // account_name
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
    
    for (entity_id, amount, date, account_name) in events {
        let account = account_name.unwrap_or_else(|| "Unknown".to_string());
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
    // [FILTER] Only return insights with at least some risk (Score > 0.3)
    // This prevents the "Everything is Red" panic by hiding perfectly normal accounts.
    let meaningful_insights: Vec<StructuralInsight> = insights.into_iter()
        .filter(|i| i.structural_score > 0.3)
        .collect();

    let mut final_insights = meaningful_insights;
    final_insights.sort_by(|a, b| b.structural_score.partial_cmp(&a.structural_score).unwrap_or(std::cmp::Ordering::Equal));
    
    let total_elapsed = start_total.elapsed();
    println!(">>> [PERF] TOTAL Structural Top Accounts Engine: {}ms", total_elapsed.as_millis());

    if final_insights.is_empty() {
        // [HELPFUL FEEDBACK] If database is empty but objects exist, provide a hint.
        let obj_count: i64 = conn.query_row("SELECT COUNT(*) FROM audit_object WHERE object_type = 'LEDGER'", [], |r| r.get(0)).unwrap_or(0);
        if obj_count > 0 {
             let mut fail_reasons = vec![
                 format!("저장소에 {}개의 원장 파일이 있으나, 유의미한 위험(Score > 0.3)이 식별되지 않았습니다.", obj_count),
                 "모든 계정이 정상 범위(Stable) 내에서 운용되고 있습니다.".to_string(),
             ];
             
             if month_distribution.is_empty() {
                 fail_reasons.push("CRITICAL: 월 단위 그룹핑 결과가 0건입니다 (날짜 파싱 실패 유력).".to_string());
             }

             return Ok(vec![StructuralInsight {
                 account: "특이사항 없음".to_string(),
                 behavior: AccountBehavior::Normal,
                 volatility: 0.0,
                 concentration_ratio_1: 0.0,
                 concentration_ratio_3: 0.0,
                 hhi_index: 0.0,
                 distribution_shift: 0.0,
                 structural_score: 0.0,
                 status: "Clean".to_string(),
                 reasons: fail_reasons,
                 recommended_focus: false,
                 is_statistically_significant: false,
             }]);
        }
    }

    Ok(final_insights.into_iter().take(15).collect())
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

    // 3. Classification Layer
    let behavior = classify_account(&account_name);

    // 4. Branching Analysis Logic (The "Audit Junction")
    let (structural_score, status, mut reasons) = match behavior {
        AccountBehavior::StructuralConcentrationAllowed => {
            // [BRANCH] Structural Accounts: focus is allowed.
            let score = (cv / 3.0).min(0.3); 
            let mut reason_list = vec!["구조적 집중 허용 계정: 거래처 집중도를 리스크 산정에서 제외합니다 (분할 분석 건너뜀)".to_string()];
            if cr1 > 0.99 { reason_list.push("경고: 단일 거래처 의존도가 99%인 극단적 집중 상태입니다 (검증 필요)".to_string()); }
            
            let status_str = if score > 0.2 { "관찰 (Watch)" } else { "정상 (Stable)" };
            (score, status_str.to_string(), reason_list)
        },
        
        AccountBehavior::DistributionExpected => {
            // [BRANCH] Expenses: Strict fragmentation expected.
            let score = (cv.min(1.0) + hhi + cr1) / 3.0;
            let mut reason_list = Vec::new();
            if cr1 > 0.5 { reason_list.push(format!("비용 계정 이상 집중: 특정 업체 비중이 {:.0}%에 달합니다", cr1 * 100.0)); }
            if hhi > 0.4 { reason_list.push("거래처 파편화가 기대를 크게 하회합니다 (소수 업체 몰아주기 의심)".to_string()); }
            
            let status_str = if score > 0.6 { "우선검토 (Critical)" } else if score > 0.4 { "주의 (Elevated)" } else { "정상 (Stable)" };
            (score, status_str.to_string(), reason_list)
        },

        AccountBehavior::AdjustmentSensitive | AccountBehavior::EarningsManagementSensitive => {
            // [BRANCH] Year-End / Adjustment: Detection of Window Dressing.
            let mut spike_detected = false;
            let dec_total: f64 = summaries.iter().filter(|s| s.month.ends_with("-12")).map(|s| s.total_increase).sum();
            let other_months: Vec<f64> = summaries.iter().filter(|s| !s.month.ends_with("-12")).map(|s| s.total_increase).collect();
            let avg_others: f64 = if !other_months.is_empty() {
                other_months.iter().sum::<f64>() / other_months.len() as f64
            } else { 0.0 };

            if dec_total > avg_others * 3.0 && dec_total > 500.0 {
                spike_detected = true;
            }

            let score = if spike_detected { 0.85 } else { (cv / 2.0).min(0.4) };
            let mut reason_list = vec![format!("{:?} 계정: 결산 조정 및 기말 변동성 중심 분석을 수행했습니다", behavior)];
            if spike_detected { 
                reason_list.push("⚠️ 결산 기말(12월)에 평소 대비 300% 이상의 급격한 자금 흐름이 탐지되었습니다".to_string());
            }

            let status_str = if score > 0.7 { "우선검토 (Critical)" } else { "관찰 (Watch)" };
            (score, status_str.to_string(), reason_list)
        },

        AccountBehavior::VolatilityObserved => {
            // [BRANCH] Growth/Volatility: Focused on variance.
            let score = (cv / 1.5).min(1.0);
            let mut reason_list = vec!["변동성 관찰 계정: 월별 집행 주기의 불규칙성을 정밀 진단했습니다".to_string()];
            if cv > 1.2 { reason_list.push("비경상적 거래로 인한 통계적 변동계수가 임계값을 초과했습니다".to_string()); }
            
            let status_str = if score > 0.6 { "주의 (Elevated)" } else { "정상 (Stable)" };
            (score, status_str.to_string(), reason_list)
        },

        _ => {
            // Default Logic
            let score = (cv.min(1.0) + hhi + cr1) / 3.0;
            let status_str = if score > 0.7 { "우선검토 (Critical)" } else { "정상 (Stable)" };
            (score, status_str.to_string(), vec!["일반 계정: 표준 통계 엔진을 적용했습니다".to_string()])
        }
    };
    
    let shift_score = 0.0;
    
    if is_significant && cv > 2.0 { reasons.push("통계적 임계치를 상회하는 비정기적 거액 거래가 반복됩니다".to_string()); }

    StructuralInsight {
        account: account_name,
        behavior, // Now implements Copy
        volatility: cv,
        concentration_ratio_1: cr1,
        concentration_ratio_3: cr3,
        hhi_index: hhi,
        distribution_shift: shift_score,
        structural_score,
        status,
        reasons,
        recommended_focus: structural_score > 0.5,
        is_statistically_significant: is_significant,
    }
}



#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum RiskCategory {
    Liquidity,
    Debt,
    Revenue,
    Expense,
    Tax,
    Equity,
    Capital,
    Receivable,
    FixedAsset,
    Other,
}

#[derive(Debug, Clone)]
pub struct AccountMeta {
    pub risk_category: RiskCategory,
    pub concentration_expected: bool,
    pub earnings_sensitive: bool,
    pub liquidity_sensitive: bool,
    pub materiality_weight: f64,
}

// ─────────────────────────────────────────────────────────────────────────────
// Pattern-based account nature inference (ChatGPT approach)
// Uses actual debit/credit/volatility data from DB — no hardcoding needed
// ─────────────────────────────────────────────────────────────────────────────
pub struct AccountPattern {
    pub debit_sum: f64,
    pub credit_sum: f64,
    pub month_count: i64,
    pub active_months: i64,  // months with non-zero activity
    pub avg_monthly_change: f64,
}

pub fn infer_account_nature(pattern: &AccountPattern, keyword_hint: &AccountMeta) -> AccountMeta {
    let debit_dominant = pattern.debit_sum > pattern.credit_sum * 1.2;
    let credit_dominant = pattern.credit_sum > pattern.debit_sum * 1.2;
    let low_activity = pattern.active_months <= 2; // barely moves → capital/long-term
    let high_volatility = pattern.avg_monthly_change > 0.5;

    // 1. Credit-dominant + low activity → Capital or Long-term Debt
    if credit_dominant && low_activity {
        return AccountMeta {
            risk_category: RiskCategory::Capital,
            concentration_expected: true,
            earnings_sensitive: false,
            liquidity_sensitive: false,
            materiality_weight: 0.5,
        };
    }

    // 2. Debit-dominant + low activity → Fixed Asset or Long-term Receivable
    if debit_dominant && low_activity {
        return AccountMeta {
            risk_category: RiskCategory::FixedAsset,
            concentration_expected: true,
            earnings_sensitive: false,
            liquidity_sensitive: false,
            materiality_weight: 0.6,
        };
    }

    // 3. High volatility + credit-dominant → Revenue or Accrual
    if high_volatility && credit_dominant {
        return AccountMeta {
            risk_category: RiskCategory::Revenue,
            concentration_expected: false,
            earnings_sensitive: true,
            liquidity_sensitive: false,
            materiality_weight: 1.0,
        };
    }

    // 4. High volatility + debit-dominant → Expense or Receivable
    if high_volatility && debit_dominant {
        return AccountMeta {
            risk_category: RiskCategory::Expense,
            concentration_expected: false,
            earnings_sensitive: true,
            liquidity_sensitive: false,
            materiality_weight: 0.8,
        };
    }

    // 5. Balanced debit/credit + high activity → Liquidity (cash-like)
    if !debit_dominant && !credit_dominant && pattern.active_months > 8 {
        return AccountMeta {
            risk_category: RiskCategory::Liquidity,
            concentration_expected: false,
            earnings_sensitive: false,
            liquidity_sensitive: true,
            materiality_weight: 0.8,
        };
    }

    // Fallback → use keyword hint
    keyword_hint.clone()
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyword-based fallback (보조 수단)
// Covers common Korean account names as a safety net
// ─────────────────────────────────────────────────────────────────────────────
pub fn get_account_meta(name: &str) -> AccountMeta {
    let n = name.to_lowercase();

    // ── 수익 계정 ──────────────────────────────────────────────────────────
    if n.contains("매출") || n.contains("수익") || n.contains("이자수익")
        || n.contains("임대수익") || n.contains("배당") || n.contains("잡이익") {
        return AccountMeta {
            risk_category: RiskCategory::Revenue,
            concentration_expected: false,
            earnings_sensitive: true,
            liquidity_sensitive: false,
            materiality_weight: 1.0,
        };
    }

    // ── 현금/예금/유동성 ───────────────────────────────────────────────────
    if n.contains("현금") || n.contains("보통예금") || n.contains("당좌예금")
        || n.contains("정기예") || n.contains("적금") || n.contains("단기금융") {
        return AccountMeta {
            risk_category: RiskCategory::Liquidity,
            concentration_expected: true,
            earnings_sensitive: false,
            liquidity_sensitive: true,
            materiality_weight: 0.8,
        };
    }

    // ── 채권/미수금/대여금 ─────────────────────────────────────────────────
    if n.contains("미수") || n.contains("대여") || n.contains("선급")
        || n.contains("받을어음") || n.contains("매출채권") {
        return AccountMeta {
            risk_category: RiskCategory::Receivable,
            concentration_expected: false,
            earnings_sensitive: true,
            liquidity_sensitive: true,
            materiality_weight: 0.9,
        };
    }

    // ── 차입금/부채 ────────────────────────────────────────────────────────
    if n.contains("차입") || n.contains("사채") || n.contains("대출")
        || n.contains("단기차입") || n.contains("장기차입") || n.contains("미지급") {
        return AccountMeta {
            risk_category: RiskCategory::Debt,
            concentration_expected: true,
            earnings_sensitive: false,
            liquidity_sensitive: true,
            materiality_weight: 0.9,
        };
    }

    // ── 자본 계정 (주식, 잉여금, 결손금, 우선주) ──────────────────────────
    if n.contains("자본") || n.contains("주식") || n.contains("잉여금")
        || n.contains("결손금") || n.contains("우선주") || n.contains("전환")
        || n.contains("발행초과") || n.contains("이익준비") {
        return AccountMeta {
            risk_category: RiskCategory::Capital,
            concentration_expected: true,
            earnings_sensitive: false,
            liquidity_sensitive: false,
            materiality_weight: 0.5,
        };
    }

    // ── 고정자산/투자자산 ──────────────────────────────────────────────────
    if n.contains("토지") || n.contains("건물") || n.contains("기계")
        || n.contains("차량") || n.contains("비품") || n.contains("투자")
        || n.contains("무형") || n.contains("영업권") || n.contains("개발비") {
        return AccountMeta {
            risk_category: RiskCategory::FixedAsset,
            concentration_expected: true,
            earnings_sensitive: false,
            liquidity_sensitive: false,
            materiality_weight: 0.6,
        };
    }

    // ── 세금/공과금 ────────────────────────────────────────────────────────
    if n.contains("세금") || n.contains("공과") || n.contains("부가세")
        || n.contains("법인세") || n.contains("예수금") || n.contains("원천") {
        return AccountMeta {
            risk_category: RiskCategory::Tax,
            concentration_expected: true,
            earnings_sensitive: false,
            liquidity_sensitive: false,
            materiality_weight: 0.3,
        };
    }

    // ── 손익/비용 (감가상각, 충당금, 판관비) ──────────────────────────────
    if n.contains("상각") || n.contains("충당") || n.contains("평가") || n.contains("손상")
        || n.contains("손익") || n.contains("비용") || n.contains("판매비")
        || n.contains("관리비") || n.contains("급여") || n.contains("임금")
        || n.contains("복리") || n.contains("여비") || n.contains("소모품")
        || n.contains("통신") || n.contains("임차") || n.contains("보험")
        || n.contains("광고") || n.contains("접대") || n.contains("수선") {
        return AccountMeta {
            risk_category: RiskCategory::Expense,
            concentration_expected: false,
            earnings_sensitive: true,
            liquidity_sensitive: false,
            materiality_weight: 0.7,
        };
    }

    // ── Default: OTHER → 중간 위험으로 처리 ───────────────────────────────
    AccountMeta {
        risk_category: RiskCategory::Other,
        concentration_expected: false,
        earnings_sensitive: false,
        liquidity_sensitive: false,
        materiality_weight: 0.6,  // 0.7 → 0.6으로 낮춤 (OTHER 과대평가 방지)
    }
}



#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StrategicDeviation {
    pub account_code: String,
    pub account_name: String,
    pub total_volume: f64,       // Materiality (Absolute)
    
    // [Layer 1] Statistical Signal
    pub statistical_signature: f64, 
    
    // [Layer 2] Audit Severity & Context
    pub audit_score: f64,        // Final Calculated Score
    pub audit_severity: String,  // Label: Critical, High, Watch, Monitor, Stable
    pub risk_category_label: String, // e.g. "TAX"
    pub nature_context: String,  // e.g. "Concentration Expected"
    
    pub delta_magnitude: f64,
    pub detection_reason: String, 
    pub recommended_action: String,
    pub score_formula: String,     // e.g. "0.97 × 0.30 × 0.40 × 1.00 = 0.12"
}

pub fn get_strategic_deviations_impl(db_path: &std::path::Path) -> Result<Vec<StrategicDeviation>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    
    // 1. Load Insights (Layer 1)
    let insights = get_structural_top_accounts_impl(db_path)?;
    let mut deviations = Vec::new();

    for insight in insights {
        let total_volume: f64 = conn.query_row(
            "SELECT COALESCE(SUM(ABS(net_amount)), 0.0) FROM entity_event WHERE account_name = ?1",
            &[&insight.account as &dyn ToSql],
            |r| r.get(0)
        ).unwrap_or(0.0);

        // Fetch Human Name
        let acc_human_name: String = conn.query_row(
            "SELECT account_name FROM entity_event WHERE account_name = ?1 LIMIT 1",
            &[&insight.account as &dyn ToSql],
            |r| r.get(0)
        ).unwrap_or(insight.account.clone());

        // [Layer 2] Step 1: keyword-based hint
        let keyword_meta = get_account_meta(&acc_human_name);

        // [Layer 2] Step 2: pattern-based inference from actual DB data
        let pattern: AccountPattern = {
            let debit_sum: f64 = conn.query_row(
                "SELECT COALESCE(SUM(debit), 0.0) FROM entity_event WHERE account_name = ?1",
                &[&insight.account as &dyn ToSql],
                |r| r.get(0)
            ).unwrap_or(0.0);
            let credit_sum: f64 = conn.query_row(
                "SELECT COALESCE(SUM(credit), 0.0) FROM entity_event WHERE account_name = ?1",
                &[&insight.account as &dyn ToSql],
                |r| r.get(0)
            ).unwrap_or(0.0);
            let active_months: i64 = conn.query_row(
                "SELECT COUNT(DISTINCT substr(event_date,1,7)) FROM entity_event WHERE account_name = ?1 AND ABS(net_amount) > 0",
                &[&insight.account as &dyn ToSql],
                |r| r.get(0)
            ).unwrap_or(0);
            AccountPattern {
                debit_sum,
                credit_sum,
                month_count: 60, // 5-year window
                active_months,
                avg_monthly_change: insight.volatility,
            }
        };

        // Pattern takes priority; keyword is fallback
        let meta = infer_account_nature(&pattern, &keyword_meta);

        
        let statistical_signal = insight.structural_score; // 0.0 ~ 1.0 (from Layer 1)
        
        // Nature Adjustment
        let mut nature_adj = 1.0;
        if meta.concentration_expected {
            // If concentration is naturally expected, high HHI/CR1 is less risky.
            // Dampen the signal (e.g. by 60%)
            nature_adj = 0.4; 
        }
        
        // Multiplier
        let mut multiplier = 1.0;
        if meta.earnings_sensitive { multiplier *= 1.3; } // Higher scrutiny
        if meta.liquidity_sensitive { multiplier *= 1.2; }

        // [CORE FORMULA] — normalized to [0.0, 1.0]
        let audit_score = (statistical_signal * meta.materiality_weight * nature_adj * multiplier).min(1.0);
        
        // Define Severity Label
        let severity_label = if audit_score > 0.7 { "CRITICAL" }
                             else if audit_score > 0.4 { "HIGH" }
                             else if audit_score > 0.15 { "WATCH" } 
                             else { "STABLE" };
        
        // Filter out immaterial noise unless user specifically requested ALL
        if audit_score < 0.1 && total_volume < 1_000_000.0 {
            continue;
        }

        let cat_label = format!("{:?}", meta.risk_category).to_uppercase();
        let context_note = if meta.concentration_expected { "Concentration Expected" } 
                           else if meta.earnings_sensitive { "Earnings Sensitive" }
                           else { "General Category" };

        let rec_action = if severity_label == "CRITICAL" { "Immediate Forensic Review" }
                         else if severity_label == "HIGH" { "Detail Testing Required" }
                         else { "Analytical Review" };

        let formula_str = format!(
            "{:.2} × {:.2} × {:.2} × {:.2} = {:.2}",
            statistical_signal,
            meta.materiality_weight,
            nature_adj,
            multiplier,
            audit_score
        );

        deviations.push(StrategicDeviation {
            account_code: insight.account.clone(),
            account_name: acc_human_name,
            total_volume,
            statistical_signature: statistical_signal,
            audit_score,
            audit_severity: severity_label.to_string(),
            risk_category_label: cat_label,
            nature_context: context_note.to_string(),
            delta_magnitude: insight.volatility,
            detection_reason: insight.reasons.first().cloned().unwrap_or("Unknown Structural Shift".to_string()),
            recommended_action: rec_action.to_string(),
            score_formula: formula_str,
        });
    }

    // Sort by Audit Severity Score
    deviations.sort_by(|a, b| b.audit_score.partial_cmp(&a.audit_score).unwrap_or(std::cmp::Ordering::Equal));

    Ok(deviations)
}

pub fn classify_account(name: &str) -> AccountBehavior {
    let meta = get_account_meta(name);
    // Backward compatibility mapping for Layer 1
    if meta.concentration_expected {
        return AccountBehavior::StructuralConcentrationAllowed;
    }
    if meta.risk_category == RiskCategory::Expense && meta.materiality_weight < 0.6 {
        return AccountBehavior::DistributionExpected;
    }
    if meta.risk_category == RiskCategory::Revenue {
        return AccountBehavior::VolatilityObserved;
    }
    if meta.earnings_sensitive {
        return AccountBehavior::EarningsManagementSensitive;
    }
    AccountBehavior::Normal
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
