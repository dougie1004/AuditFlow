use serde::{Deserialize, Serialize};
use crate::ai::{call_gemini_flash, extract_json};

#[derive(Serialize, Deserialize, Debug)]
pub struct AccountMappingRequest {
    pub description: String,
    pub vendor: String,
    pub amount: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AccountMappingResult {
    pub account_code: String,
    pub account_name: String,
    pub confidence: i32,
    pub reason: String,
}

pub async fn map_expense_account(req: AccountMappingRequest) -> Result<AccountMappingResult, String> {
    let system_prompt = r#"
    You are a senior accountant in Korea (K-GAAP expert). 
    Your task is to classify the transaction description into the most appropriate Standard General Ledger Account.

    [Target Chart of Accounts (Korean/English)]
    - 복리후생비 (Welfare/Meals): Staff meals, coffee, team events.
    - 여비교통비 (Travel/Transport): Taxi, flight, train, hotel, fuel (business trip).
    - 접대비 (Entertainment): Client meals, gifts, bars (Risk!).
    - 소모품비 (Supplies): Office supplies, stationery, small electronics.
    - 교육훈련비 (Education/Training): Seminars, books, courses.
    - 세금과공과 (Taxes/Dues): VAT not refundable, government fees, stamp duty.
    - 수도광열비 (Utilities): Water, electricity, heating.
    - 임차료 (Rent): Office rent, equipment rental.
    - 지급수수료 (Service Fees/Commission): Consulting, professional services, platform fees, agent fees.
    - 통신비 (Communication): Phone bill, internet, postal.
    - 차량유지비 (Vehicle Maint): Fuel (regular), repairs, parking.
    - 도서인쇄비 (Books/Printing): Business cards, brochures, books.
    - 수선비 (Repairs): Office repairs.
    - 비품 (Equipment): Assets > 1M KRW (Computers, Furniture) -> Capitalize.
    - 소프트웨어 (Software): Licenses, SaaS subscriptions.

    [Instructions]
    1. Analyze the Vendor and Description carefully.
    2. If the amount is very large (> 1,000,000 KRW) for 'Supplies', consider 'Equipment' or 'Investigation Needed'.
    3. If the vendor is 'Starbucks' or 'Restaurant', it's usually 'Welfare' (if for staff) or 'Entertainment' (if for clients). Check description keywords like 'Client', '고객'.
    4. If 'Advisory' or 'Consulting', map to 'Service Fees' but check risk reason.
    5. Return JSON format strictly.

    [Input Data]
    Vendor: {VENDOR}
    Description: {DESC}
    Amount: {AMT} KRW
    "#;

    let final_prompt = system_prompt
        .replace("{VENDOR}", &req.vendor)
        .replace("{DESC}", &req.description)
        .replace("{AMT}", &req.amount.to_string());

    let response = call_gemini_flash(&format!("{}\n\nOutput JSON:", final_prompt)).await?;
    let cleaned = extract_json(&response);

    match serde_json::from_str::<AccountMappingResult>(&cleaned) {
        Ok(res) => Ok(res),
        Err(e) => {
             // Fallback logic if AI JSON is malformed
             println!(">>> [Mapper] JSON Parse Failed: {}. Raw: {}", e, cleaned);
             Ok(AccountMappingResult {
                 account_code: "9999".to_string(),
                 account_name: "미분류 (Parse Error)".to_string(),
                 confidence: 0,
                 reason: "AI Response Malformed".to_string()
             })
        }
    }
}
