use serde_json::{Value, json};
use reqwest::Client;
pub use crate::file_utils::extract_json;
use std::sync::{OnceLock, Mutex};

static GLOBAL_CLIENT: OnceLock<Client> = OnceLock::new();
static CUSTOM_API_KEY: Mutex<Option<String>> = Mutex::new(None);

fn credential_header(key: &str) -> Result<reqwest::header::HeaderValue, String> {
    let mut header = reqwest::header::HeaderValue::from_str(key)
        .map_err(|_| "Invalid AI credential format".to_string())?;
    header.set_sensitive(true);
    Ok(header)
}

pub fn set_api_key(key: String) {
    if let Ok(mut guard) = CUSTOM_API_KEY.lock() {
        *guard = Some(key);
    }
}

fn get_client() -> &'static Client {
    GLOBAL_CLIENT.get_or_init(|| {
        Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .pool_max_idle_per_host(10)
            .build()
            .expect("Failed to create Global AI Client")
    })
}

#[derive(Clone, Debug)]
pub enum TaskType {
    Analysis,
    Report,
    Chat,
    Summarize,
}

#[derive(Clone)]
pub struct AiConfig {
    pub api_key: String,
    pub base_url: String,
    pub model_pro: String,
    pub model_fast: String,
}

impl AiConfig {
    pub fn from_env() -> Result<Self, String> {
        let api_key = CUSTOM_API_KEY.lock().ok()
            .and_then(|guard| guard.clone())
            .filter(|s| !s.trim().is_empty())
            .or_else(|| std::env::var("GOOGLE_API_KEY").ok().filter(|s| !s.trim().is_empty()))
            .or_else(|| std::env::var("GEMINI_API_KEY").ok().filter(|s| !s.trim().is_empty()))
            .ok_or_else(|| "Missing GEMINI_API_KEY Environment Variable".to_string())?;
        
        let app_cfg = crate::config::get_config();
        
        let base_url = std::env::var("GEMINI_BASE_URL")
            .ok()
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| app_cfg.ai.base_url.clone());
        
        let model_pro = std::env::var("GEMINI_MODEL_PRO")
            .ok()
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| app_cfg.ai.model_pro.clone());
        
        let model_fast = std::env::var("GEMINI_MODEL_FAST")
            .ok()
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| app_cfg.ai.model_fast.clone());

        Ok(Self {
            api_key,
            base_url,
            model_pro: sanitize_model_or_default(&model_pro),
            model_fast: sanitize_model_or_default(&model_fast),
        })
    }
}

/// Reject retired model families before selecting an allowed runtime model.
fn sanitize_model_or_default(input: &str) -> String {
    let m = input.trim();

    // [GUARDRAIL] Force upgrade legacy/retired models (1.5, 2.0) to stable 2.5
    if m.contains("1.5") || m.contains("2.0") {
        if m.contains("pro") {
            return "gemini-2.5-pro".to_string();
        } else {
            return "gemini-2.5-flash".to_string();
        }
    }

    // 1) Handle variant standardizations
    let corrected = m.replace("gemini-3.0-", "gemini-3-");

    // 2) Allowlist check
    match corrected.as_str() {
        "gemini-2.5-pro" | "gemini-2.5-flash" => corrected,
        _ => "gemini-2.5-flash".to_string()
    }
}

fn choose_model(cfg: &AiConfig, task: TaskType) -> String {
    match task {
        TaskType::Analysis | TaskType::Report => cfg.model_pro.clone(),
        TaskType::Chat | TaskType::Summarize => cfg.model_fast.clone(),
    }
}

pub fn get_api_key() -> String {
    AiConfig::from_env().map(|c| c.api_key).unwrap_or_else(|e| {
        println!(">>> [CONSTITUTIONAL_ERROR] API KEY MISSING: {}", e);
        String::new() 
    })
}

pub async fn call_gemini_api(data: String, system_prompt: &str) -> Result<Value, String> {
    let cfg = AiConfig::from_env()?;
    let model = choose_model(&cfg, TaskType::Analysis);
    
    println!(">>> [AI Engine] Initiating Real-Time {} Analysis...", model);

    let client = get_client();

    let url = format!("{}/v1/models/{}:generateContent", cfg.base_url.trim_end_matches('/'), model);
    
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
    
    let res = client.post(url)
        .header("x-goog-api-key", credential_header(&cfg.api_key)?)
        .header("Referer", "http://localhost:5174/")
        .header("Origin", "http://localhost:5174/")
        .json(&body)
        .send()
        .await
        .map_err(|_| "AI network request failed".to_string())?;
    
    if !res.status().is_success() {
        let status = res.status();
        return Err(format!("AI provider request failed (HTTP {})", status.as_u16()));
    }

    let json_res: Value = res.json().await.map_err(|_| "Invalid AI provider response".to_string())?;
    let raw_text = json_res["candidates"][0]["content"]["parts"][0]["text"].as_str().ok_or("No content in AI response")?;
    
    let cleaned_text = extract_json(raw_text);
    increment_pro_call();

    match serde_json::from_str(&cleaned_text) {
        Ok(v) => Ok(v),
        Err(_) => Err("AI response did not match the expected JSON format".to_string())
    }
}

pub async fn call_gemini_direct(prompt: &str) -> Result<String, String> {
    let cfg = AiConfig::from_env()?;
    let model = choose_model(&cfg, TaskType::Report);
    
    let client = get_client();

    let url = format!("{}/v1/models/{}:generateContent", cfg.base_url.trim_end_matches('/'), model);
    
    let body = json!({
        "contents": [{ "parts": [{ "text": prompt }] }],
        "generationConfig": { "temperature": 0.0, "topP": 0.95 },
        "safetySettings": [
            { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
        ]
    });
    
    // [HEADER INJECTION] Mimic localhost:5174 to satisfy Google Console Website Restriction
    let res = client.post(url)
        .header("x-goog-api-key", credential_header(&cfg.api_key)?)
        .header("Referer", "http://localhost:5174/")
        .header("Origin", "http://localhost:5174/")
        .json(&body)
        .send()
        .await
        .map_err(|_| "AI network request failed".to_string())?;
    
    if !res.status().is_success() {
        let status = res.status();
        return Err(format!("AI provider request failed (HTTP {})", status.as_u16()));
    }

    let json_res: Value = res.json().await.map_err(|_| "Invalid AI provider response".to_string())?;
    increment_pro_call();
    let out_text = json_res["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .ok_or_else(|| "AI response incomplete or blocked".to_string())?;
    Ok(out_text.to_string())
}

pub async fn call_gemini_chat(message: String, system_prompt: &str) -> Result<String, String> {
    let cfg = AiConfig::from_env()?;
    let model = choose_model(&cfg, TaskType::Chat);
    
    let client = get_client();

    let url = format!("{}/v1/models/{}:generateContent", cfg.base_url.trim_end_matches('/'), model);
    
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
    
    let res = client.post(url)
        .header("x-goog-api-key", credential_header(&cfg.api_key)?)
        .header("Referer", "http://localhost:5174/")
        .header("Origin", "http://localhost:5174/")
        .json(&body)
        .send()
        .await
        .map_err(|_| "AI network request failed".to_string())?;
    
    if !res.status().is_success() {
        let status = res.status();
        return Err(format!("AI provider request failed (HTTP {})", status.as_u16()));
    }

    let json_res: Value = res.json().await.map_err(|_| "Invalid AI provider response".to_string())?;
    increment_pro_call(); // Pro for chat seems correct based on current mapping
    let out_text = json_res["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .ok_or_else(|| "AI response incomplete or blocked".to_string())?;
    Ok(out_text.to_string())
}

pub async fn call_gemini_flash(prompt: &str) -> Result<String, String> {
    let cfg = AiConfig::from_env()?;
    let model = choose_model(&cfg, TaskType::Summarize);

    let client = get_client();

    let url = format!("{}/v1/models/{}:generateContent", cfg.base_url.trim_end_matches('/'), model);
    
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
    
    let res = client.post(url)
        .header("x-goog-api-key", credential_header(&cfg.api_key)?)
        .header("Referer", "http://localhost:5174/")
        .header("Origin", "http://localhost:5174/")
        .json(&body)
        .send()
        .await
        .map_err(|_| "AI network request failed".to_string())?;
    
    if !res.status().is_success() {
        let status = res.status();
        return Err(format!("AI provider request failed (HTTP {})", status.as_u16()));
    }

    let json_res: Value = res.json().await.map_err(|_| "Invalid AI provider response".to_string())?;
    increment_flash_call();
    let out_text = json_res["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .ok_or_else(|| "AI response incomplete or blocked".to_string())?;
    Ok(out_text.to_string())
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

#[cfg(test)]
mod credential_tests {
    use super::credential_header;

    #[test]
    fn credential_is_sensitive_and_absent_from_debug_output() {
        let fixture = "test-credential-for-local-verification";
        let header = credential_header(fixture).expect("valid test header");
        assert!(header.is_sensitive());
        assert_eq!(header.to_str().expect("header text"), fixture);
        assert!(!format!("{:?}", header).contains(fixture));
    }

    #[test]
    fn invalid_credential_is_rejected_without_echoing_input() {
        let fixture = "test-credential\nInjected-Header: value";
        let error = credential_header(fixture).expect_err("newline must fail");
        assert!(!error.contains(fixture));
        assert_eq!(error, "Invalid AI credential format");
    }
}
