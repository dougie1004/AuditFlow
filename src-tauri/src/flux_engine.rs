use rusqlite::Connection;
use rusqlite::params;
use serde_json::json;

pub struct FluxEngine;

impl FluxEngine {
    pub fn run_correlations(conn: &Connection) -> Result<usize, String> {
        let mut links_found = 0;
        
        // 1. Split Payment Detection (Same amount, same vendor, different timestamps but close)
        // Rule: If two transactions have the same amount and same vendor within 30 minutes, link them.
        {
            let mut stmt = conn.prepare(
                "SELECT e1.id, e2.id, e1.amount, e1.entity_id, e1.event_date, e2.event_date 
                 FROM entity_event e1
                 JOIN entity_event e2 ON e1.entity_id = e2.entity_id AND e1.amount = e2.amount AND e1.id != e2.id
                 WHERE ABS(JULIANDAY(e1.event_date) - JULIANDAY(e2.event_date)) * 24 * 60 < 30 -- Within 30 mins
                 AND e1.amount >= 50000 -- Ignore small amounts
                 AND e1.id < e2.id -- Avoid duplicates (A-B vs B-A)"
            ).map_err(|e| e.to_string())?;

            let rows = stmt.query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, f64>(2)?,
                    row.get::<_, String>(3)?
                ))
            }).map_err(|e| e.to_string())?;

            for r in rows {
                if let Ok((id1, id2, amt, vendor)) = r {
                    conn.execute(
                        "INSERT INTO event_relations (source_event_id, target_event_id, relation_type, strength, metadata)
                         VALUES (?1, ?2, 'SPLIT_PAYMENT', 0.85, ?3)",
                        params![
                            id1, 
                            id2, 
                            json!({
                                "reason": "Possible split payment to avoid approval limits",
                                "common_amount": amt,
                                "vendor": vendor
                            }).to_string()
                        ]
                    ).ok();
                    links_found += 1;
                    
                    // Escalation: Flag both events
                    conn.execute(
                        "UPDATE entity_event SET is_flagged = 1, risk_delta = risk_delta + 15.0, 
                         rule_flags = COALESCE(rule_flags || ',', '') || 'SPLIT_PAYMENT' 
                         WHERE id IN (?1, ?2)",
                        params![id1, id2]
                    ).ok();
                }
            }
        }

        // 2. Cross-Source Correlation (Ledger vs Other Sources)
        // Rule: If Ledger Amount equals Approval/Card Amount, link strongly.
        // This requires multi-source data. As a placeholder, we define the structure.
        /*
        {
            let mut stmt = conn.prepare(
                "SELECT l.id, c.id 
                 FROM entity_event l
                 JOIN entity_event c ON l.amount = c.amount AND l.event_date = c.event_date
                 WHERE l.source_type = 'LEDGER' AND c.source_type IN ('CARD', 'APPROVAL')"
            )...
        }
        */

        Ok(links_found)
    }
}
