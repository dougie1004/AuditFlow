const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\user\\.gemini\\antigravity\\playground\\AuditFlow\\src-tauri\\src\\audit_engine.rs';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update SELECT query
content = content.replace(
    /SELECT id, entity_id, event_type, amount, event_date, description, account_name, account_code, debit, credit, net_amount, metadata \s+FROM entity_event/,
    `SELECT id, entity_id, event_type, amount, event_date, description, account_name, account_code, debit, credit, net_amount, metadata, source_type 
         FROM entity_event`
);

// 2. Update query_map closure
content = content.replace(
    /stat_flags: None,\s+source_type: None,\s+account_name: Some\(row\.get\(6\)\?\),/,
    `stat_flags: None,
            source_type: row.get(12)?,
            account_name: Some(row.get(6)?),`
);

// 3. Update events collection and structural filtering
const eventsCollectionStart = content.indexOf('let mut events = Vec::new();');
const riskEngineStart = content.indexOf('// A. SPLIT PAYMENT DETECTION');

if (eventsCollectionStart !== -1 && riskEngineStart !== -1) {
    const beforePart = content.substring(0, eventsCollectionStart);

    // We'll replace from let mut events until riskEngineStart
    const newLogic = `let mut all_events = Vec::new();
    for r in event_rows {
        if let Ok(e) = r { all_events.push(e); }
    }

    if all_events.is_empty() {
        println!(">>> [AUDIT ENGINE] Skip: No Canonical Events found for {}. Analysis terminated.", new_obj_id);
        return Ok(());
    }

    // Filter for Structural Engine (Ledger only)
    let ledger_events: Vec<&crate::models::EntityEvent> = all_events.iter()
        .filter(|e| e.source_type.as_ref().map(|s| s == "LEDGER").unwrap_or(false))
        .collect();

    if !ledger_events.is_empty() {
        println!(">>> [AUDIT ENGINE] Running Structural Risk-Engine on {} Ledger Events...", ledger_events.len());
        
        `;

    content = beforePart + newLogic + content.substring(riskEngineStart);
}

// 4. Update loops to use either ledger_events or all_events
// Structural Rules (A, B, C) -> ledger_events
content = content.replace(/for i in 0\.\.events\.len\(\) \{/g, 'for i in 0..ledger_events.len() {');
content = content.replace(/for j in \(i\+1\)\.\.std::cmp::min\(i\+50, events\.len\(\)\) \{/g, 'for j in (i+1)..std::cmp::min(i+50, ledger_events.len()) {');
content = content.replace(/let e1 = &events\[i\];/g, 'let e1 = ledger_events[i];');
content = content.replace(/let e2 = &events\[j\];/g, 'let e2 = ledger_events[j];');
content = content.replace(/for e in &events \{/g, 'for e in &ledger_events {');

// Intelligence / Semantic Matching (Phase 2/3 Intelligence) -> all_events
// We know line 326 (approximately) has "for e in &events {" which we just replaced with "for e in &ledger_events {"
// But semantic matching should use all_events.
// Let's find it after // Entity Resolution Match using Canonical Events
const entityResolutionMarker = '// Entity Resolution Match using Canonical Events';
const entityResIdx = content.indexOf(entityResolutionMarker);
if (entityResIdx !== -1) {
    const nextLoop = content.indexOf('for e in &ledger_events {', entityResIdx);
    if (nextLoop !== -1 && nextLoop < entityResIdx + 200) {
        content = content.substring(0, nextLoop) + 'for e in &all_events {' + content.substring(nextLoop + 'for e in &ledger_events {'.length);
    }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully patched audit_engine.rs for Contextual Event Expansion (Phase 5)");
