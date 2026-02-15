use rusqlite::Connection;
use std::env;
use std::path::PathBuf;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let app_data_dir = env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
    let db_path = PathBuf::from(&app_data_dir).join("com.auditflow.app").join("audit_data_v4.db");
    
    if !db_path.exists() {
        println!("Database not found.");
        return Ok(());
    }

    let conn = Connection::open(&db_path)?;

    println!(">>> [ANALYSIS] Anomaly Score (A-Scr) Distribution Report");
    println!("-----------------------------------------------------");

    // 1. Fetch all scores from risk_signal
    // We filter for "anomaly" type signals if possible, or just take all numerical scores 
    // that are driving the A-Scr. Based on previous context, risk_signal.score is the source.
    let mut stmt = conn.prepare("SELECT score FROM risk_signal")?;
    let mut scores: Vec<f64> = stmt.query_map([], |r| r.get(0))?.filter_map(|r| r.ok()).collect();

    if scores.is_empty() {
        println!("No risk signals found.");
        return Ok(());
    }

    // Sort for percentile calcs
    scores.sort_by(|a, b| a.partial_cmp(b).unwrap());

    // 2. Basic Statistics
    let count = scores.len() as f64;
    let sum: f64 = scores.iter().sum();
    let mean = sum / count;
    let variance = scores.iter().map(|s| (s - mean).powi(2)).sum::<f64>() / count;
    let std_dev = variance.sqrt();
    
    let min = scores.first().unwrap();
    let max = scores.last().unwrap();
    
    // 3. Percentiles
    let p10_idx = (count * 0.1) as usize;
    let p50_idx = (count * 0.5) as usize;
    let p90_idx = (count * 0.9) as usize; // Top 10% cutoff starts here
    let p95_idx = (count * 0.95) as usize;

    let p50 = scores[p50_idx];
    let p90 = scores[p90_idx];
    let p95 = scores[p95_idx];

    println!("Total Signals: {}", scores.len());
    println!("Mean:   {:.4}", mean);
    println!("StdDev: {:.4}", std_dev);
    println!("Min:    {:.4}", min);
    println!("Max:    {:.4}", max);
    println!("Median: {:.4}", p50);
    println!("Top 10% Cutoff: {:.4}", p90);
    println!("Top 5% Cutoff:  {:.4}", p95);

    // 4. Threshold Pass Rates
    println!("\n[Threshold Pass Rates]");
    let thresholds = [0.1, 0.3, 0.5, 0.6, 0.7, 0.8, 0.9];
    for &t in &thresholds {
        let passed = scores.iter().filter(|&&s| s >= t).count();
        let rate = (passed as f64 / count) * 100.0;
        println!(">= {:.1}: {:>4} signals ({:.1}%)", t, passed, rate);
    }

    // 5. Histogram (ASCII)
    println!("\n[Histogram]");
    let bins = 10;
    let mut bin_counts = vec![0; bins];
    for &s in &scores {
        let idx = ((s * bins as f64).floor() as usize).min(bins - 1);
        bin_counts[idx] += 1;
    }

    let max_bin_count = *bin_counts.iter().max().unwrap_or(&1) as f64;
    let bar_width = 50;

    for i in 0..bins {
        let range_start = i as f64 / bins as f64;
        let range_end = (i + 1) as f64 / bins as f64;
        let count_in_bin = bin_counts[i];
        
        let bar_len = ((count_in_bin as f64 / max_bin_count) * bar_width as f64).round() as usize;
        let bar: String = "=".repeat(bar_len);
        
        println!("{:3.1} - {:3.1} | {:<50} ({})", range_start, range_end, bar, count_in_bin);
    }

    Ok(())
}
