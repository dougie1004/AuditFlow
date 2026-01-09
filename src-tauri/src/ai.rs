use serde_json::{Value, json};
use reqwest::Client;
pub use crate::file_utils::extract_json;

pub fn get_api_key() -> String {
    std::env::var("GOOGLE_API_KEY").unwrap_or_default()
}

pub async fn call_gemini_api(data: String, system_prompt: &str) -> Result<Value, String> {
    println!(">>> [AI Engine] Initiating Real-Time Gemini 3.0 Analysis...");

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;

    let api_key = get_api_key();
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-pro:generateContent?key={}", api_key);
    
    let truncated_data = if data.len() > 500_000 { &data[..500_000] } else { &data };
    let prompt = format!("{}\n\n[TARGET DATA]:\n{}", system_prompt, truncated_data);
    
    let body = json!({
        "contents": [{ "parts": [{ "text": prompt }] }],
        "generationConfig": { "temperature": 0.1, "topP": 0.95, "maxOutputTokens": 8192 },
        "safetySettings": [
            { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
        ]
    });
    
    let res = client.post(url).json(&body).send().await.map_err(|e| format!("Network Connection Error: {}", e))?;
    
    if !res.status().is_success() {
        let status = res.status();
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("Gemini API Error ({}): {}", status, err_body));
    }

    let json_res: Value = res.json().await.map_err(|e| e.to_string())?;
    let raw_text = json_res["candidates"][0]["content"]["parts"][0]["text"].as_str().ok_or("No content in AI response")?;
    println!(">>> [AI Engine] Raw Response: {}", raw_text);
    
    let cleaned_text = extract_json(raw_text);
    println!(">>> [AI Engine] Cleaned JSON: {}", cleaned_text);
    
    match serde_json::from_str(&cleaned_text) {
        Ok(v) => Ok(v),
        Err(e) => {
            println!(">>> [AI Engine] JSON Parsing FAILED: {}", e);
            println!(">>> [AI Engine] Failed Text: {}", cleaned_text);
            Err(format!("JSON Parsing Error: {}. Raw: {}", e, cleaned_text))
        }
    }
}

pub async fn call_gemini_direct(prompt: &str) -> Result<String, String> {
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let api_key = get_api_key();
    // [FIXED] Correct Gemini API model identifier
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={}", api_key);
    
    let body = json!({
        "contents": [{ "parts": [{ "text": prompt }] }],
        "generationConfig": { "temperature": 0.2, "topP": 0.95 },
        "safetySettings": [
            { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
        ]
    });
    
    let res = client.post(url).json(&body).send().await.map_err(|e| format!("Network Error: {}", e))?;
    
    if !res.status().is_success() {
        let status = res.status();
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("API Error ({}): {}", status, err_body));
    }

    let json_res: Value = res.json().await.map_err(|e| e.to_string())?;
    Ok(json_res["candidates"][0]["content"]["parts"][0]["text"].as_str().map(|s| s.to_string()).unwrap_or_default())
}

pub async fn call_gemini_chat(message: String, system_prompt: &str) -> Result<String, String> {
    let prompt = format!("System context: {}\n\nUser: {}", system_prompt, message);
    call_gemini_direct(&prompt).await
}

// [PERMANENT] Dual-Model Routing System
// Flash (1.5) for data cleaning/validation - LOW COST
// Pro (1.5) for complex reports/analysis - HIGH QUALITY

pub async fn call_gemini_flash(prompt: &str) -> Result<String, String> {
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())?;

    let api_key = get_api_key();
    // [FIXED] Correct Gemini API model identifier
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={}", api_key);
    
    let body = json!({
        "contents": [{ "parts": [{ "text": prompt }] }],
        "generationConfig": { "temperature": 0.1, "topP": 0.9, "maxOutputTokens": 2048 },
        "safetySettings": [
            { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
        ]
    });
    
    let res = client.post(url).json(&body).send().await.map_err(|e| format!("Network Error: {}", e))?;
    
    if !res.status().is_success() {
        let status = res.status();
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("Flash API Error ({}): {}", status, err_body));
    }

    let json_res: Value = res.json().await.map_err(|e| e.to_string())?;
    Ok(json_res["candidates"][0]["content"]["parts"][0]["text"].as_str().map(|s| s.to_string()).unwrap_or_default())
}

// [PERMANENT] Cost Tracking
static mut TOTAL_API_CALLS: u64 = 0;
static mut FLASH_CALLS: u64 = 0;
static mut PRO_CALLS: u64 = 0;

pub fn get_api_stats() -> (u64, u64, u64, f64) {
    unsafe {
        let flash_cost = FLASH_CALLS as f64 * 0.000075; // $0.000075 per 1K tokens (Flash)
        let pro_cost = PRO_CALLS as f64 * 0.00125;      // $0.00125 per 1K tokens (Pro)
        let total_cost = flash_cost + pro_cost;
        (TOTAL_API_CALLS, FLASH_CALLS, PRO_CALLS, total_cost)
    }
}

pub fn increment_flash_call() {
    unsafe {
        FLASH_CALLS += 1;
        TOTAL_API_CALLS += 1;
    }
}

pub fn increment_pro_call() {
    unsafe {
        PRO_CALLS += 1;
        TOTAL_API_CALLS += 1;
    }
}

