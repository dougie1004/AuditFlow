use crate::models::EntityEvent;
use crate::ingestion::EventBuilder;
use crate::file_loader::load_file_rows;
use uuid::Uuid;

pub struct CardBuilder {
    pub file_path: String,
}

impl EventBuilder for CardBuilder {
    fn build_events(&self) -> Vec<EntityEvent> {
        let mut events = Vec::new();
        
        if let Ok(rows) = load_file_rows(&self.file_path) {
             for row in rows {
                 // Card CSV usually has specific columns: Date, Time, Store, Amount, ApprNo
                 // Heuristic: If row has "승인번호" or "Appr"
                 if row.len() >= 5 {
                     let amount_str = row[4].replace(",", "").replace("원", "");
                     let amount = amount_str.trim().parse::<f64>().unwrap_or(0.0);
                     
                     if amount > 0.0 {
                        let date_raw = row.get(0).cloned().unwrap_or_else(|| "2025-01-01".to_string());
                        let store_name = row.get(2).cloned().unwrap_or_default();
                        
                        events.push(EntityEvent {
                             id: Uuid::new_v4().to_string(),
                             entity_id: store_name.clone(), 
                             event_type: "CARD_APPROVAL".to_string(),
                             amount: Some(amount),
                             event_date: date_raw,
                             description: format!("Card Usage at {}", store_name),
                             source_object_id: row.get(5).cloned(), // Approval No
                             is_flagged: false,
                             risk_delta: 0.0,
                             rule_flags: None,
                             stat_flags: None,
                            source_type: Some("CARD".to_string()),
                            metadata: Some(format!(r#"{{"card_num": "{}", "owner": "{}"}}"#, 
                               row.get(1).unwrap_or(&"".to_string()), // Card Num placeholder
                               row.get(3).unwrap_or(&"Unknown".to_string()) // Owner placeholder
                            )),
                            account_code: None,
                            account_name: None,
                            debit: None,
                            credit: None,
                            net_amount: Some(amount),
                        });
                     }
                 }
             }
        }
        events
    }
}
