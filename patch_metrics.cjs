const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\user\\.gemini\\antigravity\\playground\\AuditFlow\\src-tauri\\src\\audit_engine.rs';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Logic to calculate CV, CR1, HHI
const metricsLogic = `
            // 2. Calculate Concentration Metrics (CV, CR1, HHI)
            let (cv, cr1, hhi): (f64, f64, f64) = conn.query_row(
                "SELECT 
                    CASE WHEN AVG(ABS(net_amount)) > 0 THEN (SQRT(AVG(net_amount * net_amount) - AVG(net_amount) * AVG(net_amount)) / AVG(ABS(net_amount))) ELSE 0 END,
                    CASE WHEN SUM(ABS(net_amount)) > 0 THEN (MAX(ABS(net_amount)) / SUM(ABS(net_amount))) ELSE 0 END,
                    CASE WHEN SUM(ABS(net_amount)) > 0 THEN SUM((net_amount * net_amount) / ( (SELECT SUM(ABS(net_amount)) FROM entity_event WHERE source_object_id = ?1 AND account_code = ?2) * (SELECT SUM(ABS(net_amount)) FROM entity_event WHERE source_object_id = ?1 AND account_code = ?2) )) ELSE 0 END
                 FROM entity_event WHERE source_object_id = ?1 AND account_code = ?2",
                params![new_obj_id, acc],
                |r| Ok((r.get(0).unwrap_or(0.0), r.get(1).unwrap_or(0.0), r.get(2).unwrap_or(0.0)))
            ).unwrap_or((0.0, 0.0, 0.0));

            // 3. Update Yearly Profile
            conn.execute(
                "INSERT INTO account_year_profile (account_code, fiscal_year, avg_structural_score, avg_cv, avg_cr1, avg_hhi, transaction_count) 
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                 ON CONFLICT(account_code, fiscal_year) DO UPDATE SET 
                 avg_structural_score = (avg_structural_score + ?3) / 2.0,
                 avg_cv = (avg_cv + ?4) / 2.0,
                 avg_cr1 = (avg_cr1 + ?5) / 2.0,
                 avg_hhi = (avg_hhi + ?6) / 2.0,
                 transaction_count = transaction_count + ?7",
                params![acc, year, avg_score, cv, cr1, hhi, count]
            ).ok();`;

// 2. Target the old update logic
const oldInsert = /            \/\/ 2\. Update Yearly Profile\s+conn\.execute\([\s\S]+?avg_structural_score = \(avg_structural_score \+ \?3\) \/ 2\.0,\s+transaction_count = transaction_count \+ \?4",\s+params!\[acc, year, avg_score, count\]\s+\)\.ok\(\);/g;

if (content.match(oldInsert)) {
    content = content.replace(oldInsert, metricsLogic);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Successfully updated audit_engine.rs with CV, CR1, HHI metrics calculation.");
} else {
    console.error("Could not find old yearly profile update logic.");
    process.exit(1);
}
