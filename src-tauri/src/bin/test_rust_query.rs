use rusqlite::{params, Connection};
use std::collections::{HashMap, BTreeMap};

fn test_rust_query(project_id: Option<String>) {
    let db_path = "C:\\Users\\user\\AppData\\Roaming\\com.auditflow.app\\audit_data_v4.db";
    let conn = Connection::open(db_path).unwrap();

    let sql = "
        SELECT 
            COALESCE(e.account_name, json_extract(e.metadata, '$.account')) as account,
            strftime('%Y', e.event_date) as year,
            SUM(e.amount) as total
        FROM entity_event e
        LEFT JOIN audit_object o ON e.source_object_id = o.id
        WHERE e.source_type = 'LEDGER' 
          AND (e.account_name IS NOT NULL OR json_extract(e.metadata, '$.account') IS NOT NULL)
          AND (?1 IS NULL OR ?1 = '' OR o.project_id = ?1)
        GROUP BY account, year
        ORDER BY account, year;
    ";

    let mut stmt = conn.prepare(sql).unwrap();
    let rows = stmt.query_map(params![project_id], |row| {
        let account: String = row.get(0)?;
        let year_str: Option<String> = row.get(1)?;
        let total: f64 = row.get::<_, Option<f64>>(2)?.unwrap_or(0.0);
        Ok((account, year_str, total))
    }).unwrap();

    let mut account_map: HashMap<String, BTreeMap<i32, f64>> = HashMap::new();

    let mut count = 0;
    for row_res in rows {
        count += 1;
        let (account, year_str, total) = row_res.unwrap();
        if let Some(ys) = year_str {
            if let Ok(year) = ys.parse::<i32>() {
                account_map.entry(account).or_default().insert(year, total);
            }
        }
    }

    println!("[TEST RUST] Project ID: {:?} -> Rows returned: {}, Account map entries: {}", project_id, count, account_map.len());
}

fn main() {
    test_rust_query(None);
    test_rust_query(Some("".to_string()));
    test_rust_query(Some("PRJ-2023-국내영업본부".to_string()));
}
