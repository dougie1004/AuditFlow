use rusqlite::Connection;
use std::env;
use std::path::PathBuf;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let app_data_dir = env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
    // Correct Roaming Path for Tauri app
    let db_path = PathBuf::from(&app_data_dir).join("com.auditflow.app").join("audit_data_v4.db");
    
    println!(">>> [DEBUG] Connecting to: {:?}", db_path);
    if !db_path.exists() {
        println!("Database not found.");
        return Ok(());
    }

    let conn = Connection::open(&db_path)?;

    // Check if table exists and has data
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM account_year_profile", [], |r| r.get(0)).unwrap_or(0);
    println!(">>> [DEBUG] account_year_profile has {} rows.", count);

    let years_to_report = vec![vec![2007], vec![2008], vec![2007, 2008]];
    let labels = vec!["2007 Only", "2008 Only", "Combined 2007+2008"];

    for (i, years) in years_to_report.iter().enumerate() {
        println!("\n>>> [REPORT] Structural Top 10 - {}", labels[i]);
        
        let year_filter = if years.len() == 1 {
            format!("fiscal_year = {}", years[0])
        } else {
            format!("fiscal_year IN ({})", years.iter().map(|y| y.to_string()).collect::<Vec<_>>().join(","))
        };

        let query = format!(r#"
            SELECT 
                ayp.account_code,
                (SELECT account_name FROM entity_event WHERE account_code = ayp.account_code AND account_name IS NOT NULL LIMIT 1) as name,
                AVG(structural_score) as s_score,
                AVG(avg_anomaly_score) as a_score,
                AVG(avg_cv) as CV,
                AVG(avg_cr1) as CR1,
                AVG(avg_hhi) as HHI,
                (
                    SELECT (last.structural_score - first.structural_score) / NULLIF(CAST(last.fiscal_year - first.fiscal_year AS REAL), 0)
                    FROM account_year_profile first
                    JOIN account_year_profile last ON first.account_code = last.account_code
                    WHERE first.account_code = ayp.account_code
                      AND first.fiscal_year = (SELECT MIN(fiscal_year) FROM account_year_profile WHERE account_code = ayp.account_code)
                      AND last.fiscal_year = (SELECT MAX(fiscal_year) FROM account_year_profile WHERE account_code = ayp.account_code)
                ) as trend
            FROM account_year_profile ayp
            WHERE {}
            GROUP BY ayp.account_code
            ORDER BY s_score DESC
            LIMIT 10
        "#, year_filter);

        let mut stmt = match conn.prepare(&query) {
            Ok(s) => s,
            Err(e) => {
                println!("SQL Error: {}", e);
                continue;
            }
        };

        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<String>>(1)?,
                row.get::<_, f64>(2).unwrap_or(0.0),
                row.get::<_, f64>(3).unwrap_or(0.0),
                row.get::<_, f64>(4).unwrap_or(0.0),
                row.get::<_, f64>(5).unwrap_or(0.0),
                row.get::<_, f64>(6).unwrap_or(0.0),
                row.get::<_, Option<f64>>(7).unwrap_or(None),
            ))
        });

        match rows {
            Ok(r_set) => {
                println!("+--------------+----------------------+-------+-------+------+-------+------------+----------------------+");
                println!("| Account Code | Account Name         | S-Scr | A-Scr | CV   | HHI   | Risk Label | Context              |");
                println!("+--------------+----------------------+-------+-------+------+-------+------------+----------------------+");
                let mut found = false;
                for r in r_set {
                    let (code, name, s_score, a_score, cv, cr1, hhi, trend) = r?;
                    let name_str = name.unwrap_or_else(|| "N/A".to_string());
                    let trend_str = trend.map(|t| format!("{:>5.2}", t)).unwrap_or_else(|| "N/A".to_string());
                    
                    let display_name = if name_str.chars().count() > 20 {
                        name_str.chars().take(17).collect::<String>() + "..."
                    } else {
                        name_str
                    };

                    let s_label = if s_score < 0.3 { "STABLE" } 
                                  else if s_score < 0.6 { "OBSERVE" } 
                                  else if s_score <= 0.8 { "WARNING" } 
                                  else { "STRUCTURAL" };
                    
                    let context = if s_score > 0.8 && a_score > 0.8 { "SYSTEMIC_ANOMALY" }
                                  else if s_score > 0.8 && a_score < 0.3 { "STRUCTURAL_DEPENDENCY" }
                                  else if s_score < 0.3 && a_score > 0.8 { "TRANSACTIONAL_SPIKE" }
                                  else if s_score < 0.3 && a_score < 0.3 { "NORMAL" }
                                  else { "MONITOR" };

                    println!(
                        "| {:<12} | {:<20} | {:>5.2} | {:>5.2} | {:>4.2} | {:>5.3} | {:<10} | {:<20} |",
                        code, display_name, s_score, a_score, cv, hhi, s_label, context
                    );
                    found = true;
                }
                if !found {
                    println!("| {:^77} |", "No data available.");
                }
                println!("+--------------+----------------------+-------+-------+------+------+-------+-------+");
            },
            Err(e) => println!("ErrorExecuting: {}", e)
        }
    }

    Ok(())
}
