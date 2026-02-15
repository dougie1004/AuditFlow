const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\user\\.gemini\\antigravity\\playground\\AuditFlow\\src-tauri\\src\\audit_engine.rs';
let content = fs.readFileSync(filePath, 'utf8');

const marker = '// C. ACCOUNT ANOMALY';
const insertionPoint = content.indexOf('// 3. Execution of Cross-Object Semantic Relations');

if (insertionPoint === -1) {
    console.error("Could not find insertion point");
    process.exit(1);
}

const volAnomaly = `
        // D. VOLUMETRIC ANOMALY (Using Phase 3 Cached Aggregates)
        let mut agg_stmt = conn.prepare(
            "SELECT account_code, year_month, transaction_count, net_change 
             FROM account_month_profile WHERE object_id = ?1 AND transaction_count > 1000"
        ).map_err(|e| e.to_string())?;

        let agg_rows = agg_stmt.query_map(params![new_obj_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, i64>(2)?, row.get::<_, f64>(3)?))
        }).map_err(|e| e.to_string())?;

        for r in agg_rows {
            if let Ok((code, ym, count, net)) = r {
                let observation = format!("[대량 거래 신호] 계정 {}에서 {}월에 {}건의 거래 발생 (순변동: {}원)", code, ym, count, net);
                conn.execute(
                    "INSERT INTO risk_signal (id, object_id, project_id, signal_type, description, score, related_ids, metadata) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                    params![
                        uuid::Uuid::new_v4().to_string(),
                        new_obj_id,
                        project_id,
                        "VOLUMETRIC_ANOMALY",
                        observation,
                        0.5,
                        "[]",
                        serde_json::json!({ "account": code, "month": ym, "count": count, "net_change": net }).to_string()
                    ]
                ).ok();
            }
        }
    }

`;

// We need to replace the last brace of the main loop before insertionPoint
const lastBraceBefore = content.lastIndexOf('}', insertionPoint);
const beforePart = content.substring(0, lastBraceBefore);
const afterPart = content.substring(insertionPoint);

const finalContent = beforePart + volAnomaly + afterPart;

fs.writeFileSync(filePath, finalContent, 'utf8');
console.log("Successfully patched audit_engine.rs with Volumetric Anomaly via relative injection.");
