use rusqlite::{params, Connection};
use uuid::Uuid;

pub fn normalize_key(name: &str) -> String {
    name.chars()
        .filter(|c| c.is_alphanumeric())
        .collect::<String>()
        .to_uppercase()
}

pub fn resolve_entity(
    conn: &Connection,
    raw_name: &str,
    entity_type: &str,
) -> Result<String, String> {
    if raw_name.trim().is_empty() {
        return Ok("UNKNOWN".to_string());
    }

    let key = normalize_key(raw_name);
    
    // 1. Check exact alias match
    let existing_id: Option<String> = conn.query_row(
        "SELECT entity_id FROM entity_alias WHERE alias = ?1",
        [raw_name],
        |r| r.get(0)
    ).ok();

    if let Some(id) = existing_id {
        return Ok(id);
    }

    // 2. Check normalized key match in entity_master
    let existing_id: Option<String> = conn.query_row(
        "SELECT id FROM entity_master WHERE normalized_key = ?1",
        [&key],
        |r| r.get(0)
    ).ok();

    if let Some(id) = existing_id {
        return Ok(id);
    }

    // 3. Create new entity if not found
    let new_id = format!("ENT-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    conn.execute(
        "INSERT INTO entity_master (id, entity_type, canonical_name, normalized_key) VALUES (?1, ?2, ?3, ?4)",
        params![new_id, entity_type, raw_name, key]
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO entity_alias (alias, entity_id) VALUES (?1, ?2)",
        params![raw_name, new_id]
    ).map_err(|e| e.to_string())?;

    Ok(new_id)
}

pub fn get_entity_timeline(
    conn: &Connection,
    entity_id: &str,
) -> Result<crate::models::EntityTimelineResponse, String> {
    // 1. Fetch Entity Info
    let canonical_name: String = conn.query_row(
        "SELECT canonical_name FROM entity_master WHERE id = ?1",
        [entity_id],
        |r| r.get(0)
    ).map_err(|e| e.to_string())?;

    // 2. Aggregate Summary
    let summary: crate::models::EntitySummary = conn.query_row(
        "SELECT 
            COUNT(*), 
            SUM(amount), 
            SUM(risk_delta),
            (SELECT COUNT(*) FROM (SELECT DISTINCT event_date FROM entity_event WHERE entity_id = ?1)),
            MIN(event_date),
            MAX(event_date)
         FROM entity_event WHERE entity_id = ?1",
        [entity_id],
        |r| {
            let total_events: i64 = r.get(0)?;
            let total_exposure: f64 = r.get::<_, Option<f64>>(1)?.unwrap_or(0.0);
            let risk_score: f64 = r.get::<_, Option<f64>>(2)?.unwrap_or(0.0);
            let distinct_days: i64 = r.get(3)?;
            let repetition_index = if distinct_days > 0 { total_events as f64 / distinct_days as f64 } else { 0.0 };
            
            Ok(crate::models::EntitySummary {
                total_events,
                total_exposure,
                risk_score,
                repetition_index,
                first_seen: r.get::<_, Option<String>>(4)?.unwrap_or_default(),
                last_seen: r.get::<_, Option<String>>(5)?.unwrap_or_default(),
            })
        }
    ).map_err(|e| e.to_string())?;

    // 3. Fetch Detailed Events
    let mut stmt = conn.prepare(
        "SELECT id, entity_id, event_type, amount, event_date, description, source_object_id, is_flagged, risk_delta, rule_flags, stat_flags, source_type, metadata, account_code, account_name, debit, credit, net_amount 
         FROM entity_event 
         WHERE entity_id = ?1 
         ORDER BY event_date DESC"
    ).map_err(|e| e.to_string())?;

    let event_rows = stmt.query_map([entity_id], |r| {
        Ok(crate::models::EntityEvent {
            id: r.get(0)?,
            entity_id: r.get(1)?,
            event_type: r.get(2)?,
            amount: r.get(3)?,
            event_date: r.get(4)?,
            description: r.get(5)?,
            source_object_id: r.get(6)?,
            is_flagged: r.get::<_, i32>(7)? == 1,
            risk_delta: r.get(8)?,
            rule_flags: r.get(9)?,
            stat_flags: r.get(10)?,
            source_type: r.get(11)?,
            metadata: r.get(12)?,
            account_code: r.get(13)?,
            account_name: r.get(14)?,
            debit: r.get(15)?,
            credit: r.get(16)?,
            net_amount: r.get(17)?,
        })
    }).map_err(|e| e.to_string())?;


    let mut events = Vec::new();
    for row in event_rows {
        events.push(row.map_err(|e| e.to_string())?);
    }

    Ok(crate::models::EntityTimelineResponse {
        entity_id: entity_id.to_string(),
        canonical_name,
        summary,
        events,
    })
}
