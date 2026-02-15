use rusqlite::{params, Connection};
use std::env;
use std::path::PathBuf;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let app_data_dir = env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
    let db_path = PathBuf::from(&app_data_dir).join("com.auditflow.app").join("audit_data_v4.db");
    
    let conn = Connection::open(&db_path)?;

    println!(">>> [CRITICAL DIAGNOSIS] Checking structural metrics data flow.");

    // Select 3 sample accounts
    let mut stmt = conn.prepare("SELECT account_code, COUNT(*) as c FROM entity_event GROUP BY account_code ORDER BY c DESC LIMIT 3")?;
    let accounts: Vec<String> = stmt.query_map([], |r| r.get(0))?.filter_map(|r| r.ok()).collect();

    for acc in accounts {
        println!("\n==================================================");
        println!("ACCOUNT: {}", acc);

        // 1. Monthly aggregated amounts
        println!("1. Monthly Aggregated Amounts (account_month_profile):");
        let mut stmt_amp = conn.prepare("SELECT year_month, net_change, transaction_count FROM account_month_profile WHERE account_code = ?1 ORDER BY year_month")?;
        let amp_rows = stmt_amp.query_map([&acc], |r| Ok((r.get::<_, String>(0)?, r.get::<_, f64>(1)?, r.get::<_, i64>(2)?)))?;
        let mut monthly_amounts = Vec::new();
        for r in amp_rows {
            let (ym, amt, count) = r?;
            println!("   - {}: amt={:.2}, count={}", ym, amt, count);
            monthly_amounts.push(amt.abs());
        }

        // 2. Raw monthly vector
        println!("2. Raw Monthly Vector for CV:");
        println!("{:?}", monthly_amounts);

        // 3. Counterparty distribution
        println!("3. Counterparty Distribution Vector (entity_id, absolute sum):");
        let mut stmt_cp = conn.prepare("SELECT entity_id, SUM(ABS(net_amount)) as s FROM entity_event WHERE account_code = ?1 GROUP BY entity_id ORDER BY s DESC LIMIT 10")?;
        let cp_rows = stmt_cp.query_map([&acc], |r| Ok((r.get::<_, String>(0)?, r.get::<_, f64>(1)?)))?;
        let mut cp_vector = Vec::new();
        for r in cp_rows {
            let (eid, s) = r?;
            println!("   - {}: {:.2}", eid, s);
            cp_vector.push(s);
        }
        
        // 4. Intermediate normalized values (Simulated from actual data)
        let n = monthly_amounts.len() as f64;
        if n > 1.0 {
            let sum: f64 = monthly_amounts.iter().sum();
            let mean = sum / n;
            let variance = monthly_amounts.iter().map(|&v| (v - mean).powi(2)).sum::<f64>() / n;
            let std_dev = variance.sqrt();
            let cv = if mean > 0.0 { std_dev / mean } else { 0.0 };

            let cp_sum: f64 = cp_vector.iter().sum();
            let cr1 = if cp_sum > 0.0 { cp_vector[0] / cp_sum } else { 0.0 };
            let hhi = if cp_sum > 0.0 { cp_vector.iter().map(|&v| (v / cp_sum).powi(2)).sum::<f64>() } else { 0.0 };

            println!("4. Intermediate Calculations:");
            println!("   - Calculated CV: {:.4}", cv);
            println!("   - Calculated CR1: {:.4}", cr1);
            println!("   - Calculated HHI: {:.4}", hhi);

            // 5. Final structural_score formula components
            println!("5. Structural Score Model Prediction:");
            let score = (cv * 0.4 + cr1 * 0.3 + hhi * 0.3).min(1.0);
            println!("   - Score Logic: (CV*0.4 + CR1*0.3 + HHI*0.3) = {:.4}", score);
        } else {
            println!("   - Insufficient monthly periodicity for CV/Structural analysis.");
        }
    }

    Ok(())
}
