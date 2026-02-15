const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\user\\.gemini\\antigravity\\playground\\AuditFlow\\src-tauri\\src\\audit_engine.rs';
let content = fs.readFileSync(filePath, 'utf8');

const correlationLogic = `
    // [PHASE 6] Risk Correlation Engine (Cross-Modal Intelligence)
    println!(">>> [PHASE 6] Executing Risk Correlation Engine...");
    
    // 1. Fetch high-score structural signals for correlation
    let structural_signals = {
        let mut stmt = conn.prepare("SELECT id, description, score, metadata FROM risk_signal WHERE object_id = ?1 AND score > 0.7").map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![new_obj_id], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, f64>(2)?, r.get::<_, String>(3)?))
        }).map_err(|e| e.to_string())?;
        let mut v = Vec::new();
        for r in rows { if let Ok(s) = r { v.push(s); } }
        v
    };

    // 2. Identify relevant communications (Emails)
    let communications: Vec<&crate::models::EntityEvent> = all_events.iter()
        .filter(|e| e.source_type.as_ref().map(|s| s == "EMAIL" || s == "DOC").unwrap_or(false))
        .collect();

    let risk_keywords = vec!["urgent", "emergency", "bypass", "manual", "cash", "confidential", "delete", "긴급", "우회", "현금", "삭제"];

    for (sig_id, desc, score, meta_str) in structural_signals {
        let mut found_context = false;
        let mut evidence = String::new();

        // Check if any email correlates with this structural risk
        for comm in &communications {
            let comm_body = comm.description.to_lowercase();
            let comm_meta = comm.metadata.as_ref().map(|m| m.to_lowercase()).unwrap_or_default();
            
            // Heuristic: Does email mention the structural risk description or risk keywords?
            let has_keyword = risk_keywords.iter().any(|&k| comm_body.contains(k) || comm_meta.contains(k));
            
            if has_keyword {
                found_context = true;
                evidence = format!("Correlated with event '{}' ({})", comm.id, comm.description);
                break;
            }
        }

        if found_context {
            println!(">>> [PHASE 6] Hybrid Correlation Found for signal: {}", sig_id);
            
            // A. Create Correlation Signal
            let corr_id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO correlation_signal (id, object_id, account_code, structural_score, contextual_flag, final_priority, evidence_summary) 
                 VALUES (?1, ?2, 'N/A', ?3, 1, ?4, ?5)",
                params![corr_id, new_obj_id, score, score + 0.2, evidence]
            ).ok();

            // B. Adjust RiskSignal priority (Bump score in metadata but don't auto-confirm)
            let mut meta_v: serde_json::Value = serde_json::from_str(&meta_str).unwrap_or(serde_json::json!({}));
            meta_v["correlation_escalated"] = serde_json::json!(true);
            meta_v["correlation_evidence"] = serde_json::json!(evidence);
            meta_v["final_priority_score"] = serde_json::json!(score + 0.2);

            conn.execute(
                "UPDATE risk_signal SET score = MIN(1.0, score + 0.15), metadata = ?1 WHERE id = ?2",
                params![meta_v.to_string(), sig_id]
            ).ok();
        }
    }
`;

const insertionMarker = '// [INTELLIGENCE Final] Case Elevation Trigger';
const parts = content.split(insertionMarker);

if (parts.length === 2) {
    const finalContent = parts[0] + correlationLogic + "\n    " + insertionMarker + parts[1];
    fs.writeFileSync(filePath, finalContent, 'utf8');
    console.log("Successfully patched audit_engine.rs with Risk Correlation Engine (Phase 6)");
} else {
    console.error("Could not find insertion marker in audit_engine.rs");
    process.exit(1);
}
