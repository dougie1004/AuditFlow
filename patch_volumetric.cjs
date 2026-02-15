const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\user\\.gemini\\antigravity\\playground\\AuditFlow\\src-tauri\\src\\audit_engine.rs';
let content = fs.readFileSync(filePath, 'utf8');

const targetPart = `        // C. ACCOUNT ANOMALY (e.g. Unusual Account Code Usage)
        for e in &events {
             if let Some(code) = &e.account_code {
                 if code == "999" || code == "SUSPENSE" {
                    conn.execute(
                        "INSERT INTO risk_signal (id, object_id, project_id, signal_type, description, score, related_ids, metadata) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                        params![
                            uuid::Uuid::new_v4().to_string(),
                            new_obj_id,
                            project_id,
                            "ACCOUNT_ANOMALY",
                            format!("[임시계정] 의심스러운 계정 코드({}) 사용", code),
                            0.6,
                            serde_json::json!([e.id]).to_string(),
                            serde_json::json!({ "account_code": code, "amount": e.net_amount }).to_string()
                        ]
                    ).ok();
                 }
             }
        }
    }`;

const volAnomaly = `        // C. ACCOUNT ANOMALY (e.g. Unusual Account Code Usage)
        for e in &events {
             if let Some(code) = &e.account_code {
                 if code == "999" || code == "SUSPENSE" {
                    conn.execute(
                        "INSERT INTO risk_signal (id, object_id, project_id, signal_type, description, score, related_ids, metadata) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                        params![
                            uuid::Uuid::new_v4().to_string(),
                            new_obj_id,
                            project_id,
                            "ACCOUNT_ANOMALY",
                            format!("[임시계정] 의심스러운 계정 코드({}) 사용", code),
                            0.6,
                            serde_json::json!([e.id]).to_string(),
                            serde_json::json!({ "account_code": code, "amount": e.net_amount }).to_string()
                        ]
                    ).ok();
                 }
             }
        }

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
    }`;

if (content.indexOf(targetPart) !== -1) {
    content = content.replace(targetPart, volAnomaly);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Successfully patched audit_engine.rs with Volumetric Anomaly");
} else {
    // Try without the extra closing brace in case it's different
    const targetPart2 = `        // C. ACCOUNT ANOMALY (e.g. Unusual Account Code Usage)
        for e in &events {
             if let Some(code) = &e.account_code {
                 if code == "999" || code == "SUSPENSE" {
                    conn.execute(
                        "INSERT INTO risk_signal (id, object_id, project_id, signal_type, description, score, related_ids, metadata) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                        params![
                            uuid::Uuid::new_v4().to_string(),
                            new_obj_id,
                            project_id,
                            "ACCOUNT_ANOMALY",
                            format!("[임시계정] 의심스러운 계정 코드({}) 사용", code),
                            0.6,
                            serde_json::json!([e.id]).to_string(),
                            serde_json::json!({ "account_code": code, "amount": e.net_amount }).to_string()
                        ]
                    ).ok();
                 }
             }
        }
    }`;
    if (content.indexOf(targetPart2) !== -1) {
        // We'll replace up to the block end
        content = content.replace(targetPart2, volAnomaly);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log("Successfully patched audit_engine.rs with Volumetric Anomaly (alt match)");
    } else {
        console.error("Could not find TargetContent in audit_engine.rs");
        process.exit(1);
    }
}
