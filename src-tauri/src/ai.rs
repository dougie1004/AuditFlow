use serde_json::{Value, json};
use reqwest::Client;
pub use crate::file_utils::extract_json;

#[derive(Clone, Debug)]
pub enum TaskType {
    Analysis,
    Report,
    Chat,
    Summarize,
}

#[derive(Clone, Debug)]
pub struct AiConfig {
    pub api_key: String,
    pub base_url: String,
    pub model_pro: String,
    pub model_fast: String,
}

impl AiConfig {
    pub fn from_env() -> Result<Self, String> {
        let api_key = std::env::var("GOOGLE_API_KEY")
            .or_else(|_| std::env::var("GEMINI_API_KEY"))
            .map_err(|_| "Missing GEMINI_API_KEY Environment Variable".to_string())?;
        
        let base_url = std::env::var("GEMINI_BASE_URL")
            .unwrap_or_else(|_| "https://generativelanguage.googleapis.com".to_string());
        
        let model_pro = std::env::var("GEMINI_MODEL_PRO")
            .unwrap_or_else(|_| "gemini-2.0-flash-exp".to_string());
        
        let model_fast = std::env::var("GEMINI_MODEL_FAST")
            .unwrap_or_else(|_| "gemini-2.0-flash-exp".to_string());

        Ok(Self {
            api_key,
            base_url,
            model_pro: sanitize_model_or_default(&model_pro),
            model_fast: sanitize_model_or_default(&model_fast),
        })
    }
}

/// [MODEL GUARD] Prevents legacy model strings (gemini-1.5, etc) from leaking into runtime.
fn sanitize_model_or_default(input: &str) -> String {
    let m = input.trim();

    // [GUARDRAIL] Force upgrade legacy 1.5 models to 2.0
    if m.contains("1.5") {
        return "gemini-2.0-flash-exp".to_string();
    }

    // 1) Handle variant standardizations
    let corrected = m.replace("gemini-3.0-", "gemini-3-");

    // 2) Allowlist check
    match corrected.as_str() {
        "gemini-2.0-flash-exp" | "gemini-3-pro" | "gemini-3-flash" => corrected,
        _ => "gemini-2.0-flash-exp".to_string()
    }
}

fn choose_model(cfg: &AiConfig, task: TaskType) -> String {
    match task {
        TaskType::Analysis | TaskType::Report => cfg.model_pro.clone(),
        TaskType::Chat | TaskType::Summarize => cfg.model_fast.clone(),
    }
}

pub fn get_api_key() -> String {
    AiConfig::from_env().map(|c| c.api_key).unwrap_or_default()
}

pub async fn call_gemini_api(data: String, system_prompt: &str) -> Result<Value, String> {
    let cfg = AiConfig::from_env()?;
    let model = choose_model(&cfg, TaskType::Analysis);
    
    println!(">>> [AI Engine] Initiating Real-Time {} Analysis...", model);

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("{}/v1beta/models/{}:generateContent?key={}", cfg.base_url.trim_end_matches('/'), model, cfg.api_key);
    
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
    
    let cleaned_text = extract_json(raw_text);
    increment_pro_call();

    match serde_json::from_str(&cleaned_text) {
        Ok(v) => Ok(v),
        Err(e) => Err(format!("JSON Parsing Error: {}. Raw: {}", e, cleaned_text))
    }
}

pub async fn call_gemini_direct(prompt: &str) -> Result<String, String> {
    let cfg = AiConfig::from_env()?;
    let model = choose_model(&cfg, TaskType::Report);
    
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("{}/v1beta/models/{}:generateContent?key={}", cfg.base_url.trim_end_matches('/'), model, cfg.api_key);
    
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
    increment_pro_call();
    Ok(json_res["candidates"][0]["content"]["parts"][0]["text"].as_str().map(|s| s.to_string()).unwrap_or_default())
}

pub async fn call_gemini_chat(message: String, system_prompt: &str) -> Result<String, String> {
    let cfg = AiConfig::from_env()?;
    let model = choose_model(&cfg, TaskType::Chat);
    
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("{}/v1beta/models/{}:generateContent?key={}", cfg.base_url.trim_end_matches('/'), model, cfg.api_key);
    
    let prompt = format!("System context: {}\n\nUser: {}", system_prompt, message);
    let body = json!({
        "contents": [{ "parts": [{ "text": prompt }] }],
        "generationConfig": { "temperature": 0.5, "topP": 0.9 },
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
        return Err(format!("Chat API Error ({}): {}", status, err_body));
    }

    let json_res: Value = res.json().await.map_err(|e| e.to_string())?;
    increment_pro_call(); // Pro for chat seems correct based on current mapping
    Ok(json_res["candidates"][0]["content"]["parts"][0]["text"].as_str().map(|s| s.to_string()).unwrap_or_default())
}

pub async fn call_gemini_flash(prompt: &str) -> Result<String, String> {
    let cfg = AiConfig::from_env()?;
    let model = choose_model(&cfg, TaskType::Summarize);

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("{}/v1beta/models/{}:generateContent?key={}", cfg.base_url.trim_end_matches('/'), model, cfg.api_key);
    
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
    increment_flash_call();
    Ok(json_res["candidates"][0]["content"]["parts"][0]["text"].as_str().map(|s| s.to_string()).unwrap_or_default())
}

// [PERMANENT] Cost Tracking - Thread-safe Atomic counters
use std::sync::atomic::{AtomicU64, Ordering};
static TOTAL_API_CALLS: AtomicU64 = AtomicU64::new(0);
static FLASH_CALLS: AtomicU64 = AtomicU64::new(0);
static PRO_CALLS: AtomicU64 = AtomicU64::new(0);

pub fn get_api_stats() -> (u64, u64, u64, f64) {
    let flash = FLASH_CALLS.load(Ordering::Relaxed);
    let pro = PRO_CALLS.load(Ordering::Relaxed);
    let total = TOTAL_API_CALLS.load(Ordering::Relaxed);
    
    let flash_cost = flash as f64 * 0.000075; // $0.000075 per 1K tokens (Flash)
    let pro_cost = pro as f64 * 0.00125;      // $0.00125 per 1K tokens (Pro)
    let total_cost = flash_cost + pro_cost;
    
    (total, flash, pro, total_cost)
}

pub fn increment_flash_call() {
    FLASH_CALLS.fetch_add(1, Ordering::Relaxed);
    TOTAL_API_CALLS.fetch_add(1, Ordering::Relaxed);
}

pub fn increment_pro_call() {
    PRO_CALLS.fetch_add(1, Ordering::Relaxed);
    TOTAL_API_CALLS.fetch_add(1, Ordering::Relaxed);
}
