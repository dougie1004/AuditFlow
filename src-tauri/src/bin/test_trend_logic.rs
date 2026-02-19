use rusqlite::{params, Connection};
use std::collections::{HashMap, BTreeMap};
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AccountTrendSummary {
    pub account: String,
    pub yearly_totals: BTreeMap<i32, f64>,
    pub yoy: BTreeMap<i32, f64>,
    pub max_abs_yoy: f64,
}

fn main() {
    let db_path = "C:\\Users\\user\\AppData\\Roaming\\com.auditflow.app\\audit_data_v4.db";
    let conn = Connection::open(db_path).expect("Failed to open DB");

    let sql = "
        SELECT 
            json_extract(metadata, '$.account') as account,
            strftime('%Y', json_extract(metadata, '$.date')) as year,
            SUM(json_extract(metadata, '$.amount')) as total
        FROM entity_event
        WHERE json_extract(metadata, '$.account') IS NOT NULL
        GROUP BY account, year
        ORDER BY account, year;
    ";

    let mut stmt = conn.prepare(sql).unwrap();
    let rows = stmt.query_map([], |row| {
        let account: String = row.get(0)?;
        let year_str: Option<String> = row.get(1)?;
        let total: f64 = row.get::<_, Option<f64>>(2)?.unwrap_or(0.0);
        Ok((account, year_str, total))
    }).unwrap();

    let mut account_map: HashMap<String, BTreeMap<i32, f64>> = HashMap::new();

    for row_res in rows {
        let (account, year_str, total) = row_res.unwrap();
        if let Some(ys) = year_str {
            if let Ok(year) = ys.parse::<i32>() {
                account_map.entry(account).or_default().insert(year, total);
            }
        }
    }

    println!("[TEST] Total accounts found: {}", account_map.len());

    let mut summaries = Vec::new();

    for (account, yearly_totals) in account_map {
        // [Logic duplication from commands.rs]
        if yearly_totals.len() < 2 {
            println!("[SKIP] {} - only {} years", account, yearly_totals.len());
            continue;
        }

        let mut yoy = BTreeMap::new();
        let mut max_abs_yoy = 0.0;
        
        let years: Vec<i32> = yearly_totals.keys().cloned().collect();

        for i in 1..years.len() {
            let prev_year = years[i-1];
            let curr_year = years[i];
            
            let prev_total = *yearly_totals.get(&prev_year).unwrap_or(&0.0);
            let curr_total = *yearly_totals.get(&curr_year).unwrap_or(&0.0);

            if prev_total != 0.0 {
                let change = (curr_total - prev_total) / prev_total;
                yoy.insert(curr_year, change);
                if change.abs() > max_abs_yoy {
                    max_abs_yoy = change.abs();
                }
            }
        }

        if max_abs_yoy == 0.0 || max_abs_yoy > 10.0 {
            println!("[SKIP] {} - max_abs_yoy: {:.2}% (exceeds 1000% or is 0)", account, max_abs_yoy * 100.0);
            continue;
        }

        summaries.push(AccountTrendSummary {
            account,
            yearly_totals,
            yoy,
            max_abs_yoy,
        });
    }

    summaries.sort_by(|a, b| b.max_abs_yoy.partial_cmp(&a.max_abs_yoy).unwrap_or(std::cmp::Ordering::Equal));

    println!("--------------------------------------------------");
    println!("FINAL TEST RESULTS:");
    for (i, s) in summaries.iter().enumerate() {
        println!("{}. {} | Max YoY: {:.2}% | Years: {:?}", i+1, s.account, s.max_abs_yoy * 100.0, s.yearly_totals.keys());
    }
    println!("--------------------------------------------------");
}
