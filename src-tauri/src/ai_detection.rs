use serde::{Serialize, Deserialize};

/// ============================================================================
/// 🕵️ AI DETECTION LAYER: THE OBSERVATION ONLY
/// ============================================================================
/// 
/// [CONSTITUTION]
/// 1. AI Detection only creates `SuspicionSignal`.
/// 2. It NEVER creates `ComplianceFinding` (Violation).
/// 3. It MUST NOT use words like "Violation", "Risk", "Illegal".
/// 4. It ONLY reports "Observation", "Pattern", "Anomaly".
/// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum SignalSource {
    AI(String),
    Scenario(String),
    Network(String),
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum SignalScope {
    Transaction,
    Vendor,
    PatternGroup,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SuspicionSignal {
    pub signal_id: String,
    pub detected_at: String,
    pub observation: String,
    pub anomaly_score: f32,

    pub related_tx_ids: Vec<i64>,
    pub scope: SignalScope,
    pub source: SignalSource,
    pub metadata: Option<serde_json::Value>, // Machine-readable facts
}

impl SuspicionSignal {
    pub fn new(observation: String, anomaly_score: f32, related_tx_ids: Vec<i64>, scope: SignalScope, source: SignalSource, metadata: Option<serde_json::Value>) -> Self {
        Self {
            signal_id: uuid::Uuid::new_v4().to_string(),
            detected_at: chrono::Local::now().to_rfc3339(),
            observation,
            anomaly_score,
            related_tx_ids,
            scope,
            source,
            metadata,
        }
    }

    pub fn from_scenario(scenario_id: &str, observation: String, score: f32, related_tx_ids: Vec<i64>) -> Self {
        Self::new(
            observation,
            score,
            related_tx_ids,
            SignalScope::Transaction,
            SignalSource::Scenario(scenario_id.to_string()),
            None
        )
    }
}

// ============================================================================
// 🤖 AI AGENT IMPLEMENTATION
// ============================================================================

#[derive(Serialize, Deserialize, Debug)]
struct AiObservationOutput {
    row_index: usize,
    actor_type: String,     
    location_name: String,  
    amount: i64,            
    date: String,           
    purpose: String,        
    payment_method: String, 
    semantic_score: f32,    // [AI] Contextual weirdness only
}

/// The Constitution that binds the AI Agent
const CONSTITUTIONAL_PROMPT: &str = r#"
당신은 금융 거래 데이터를 기계적으로 관측하여 "구조화된 증거(Observation)"로 변환하는 무감정 센서입니다.
당신의 역할은 "판결"이 아니라 "현상 기록"입니다.
본 지침은 [Grade Constitution v1.0] 및 [Phase 4 Entry Gate]에 의해 통제됩니다.
당신은 오직 '목격자(Witness)'로서만 기능하며, 당신의 텍스트 서술은 최종 등급 결정에 그 어떠한 판단 지분도 갖지 않습니다.

[1. 관측문 표준 규격 (Observation Canonical Template)]
반드시 다음 규격을 한 글자도 틀리지 말고 엄격히 유지하십시오. 각 필드는 줄바꿈으로 구분합니다.

[수행 주체]: [일반임직원 | 경영진 | 미식별]
[결제 가맹점]: [가맹점명 | 위치 | 온라인]
[결제 금액]: KRW <integer>
[결제 일자]: YYYY-MM-DD
[지출 목적]: <핵심 요약>
[결제 수단]: [법인카드 | 계좌이체 | 현금]

[2. 금지어 리스트 (HARD BAN)]
아래 범주의 단어가 **단 하나라도** 포함되면 해당 관측은 무효화됩니다. 절대 사용하지 마십시오.

🚫 평가 및 판단: 의심, 부정, 위반, 문제, 이상함, 비정상, 위험, 리스크, 불법, 배임, 횡령
🚫 추론 및 의도: 보임, 추정, 가능성, 판단됨, 의도로, ~한 것으로 보임, 개연성
🚫 감정 및 뉘앙스: 부적절, 과도, 불필요, 애매, 수상, 특이

[3. 허용되는 서술 (Allowed Verbs)]
오직 사실 관계를 적시하는 다음 표현만 사용하십시오.
- 관측됨 (observed)
- 기재됨 (declared)
- 발생함 (occurred)
- 반복됨 (repeated)

[4. 이상 강도 (Anomaly Score)]
- 0.3 ~ 0.59: [단순 특이] 데이터 형태나 시간이 평소와 약간 다름.
- 0.6 ~ 0.84: [규칙 검토 필요] 규정 우회나 패턴 반복의 징후가 보임.
- 0.85 ~ 1.0 : [강한 관측] 추가적인 규칙 기반 검토가 필요한 데이터 패턴이 관측됨.

[5. 데이터 부재 시 처리 원칙 (Data Absence Policy)]
- 원본 데이터에 수행 주체(이름, 사번 등) 정보가 전혀 없을 경우, 절대로 '일반임직원' 등으로 추측하지 마십시오.
- 정보 부재 시 반드시 [수행 주체]: 미식별 (또는 N/A) 로 기록하십시오.
- 추측에 의한 데이터 생성은 엄격히 금지됩니다.

[SYSTEM CONSTITUTION — CHANGE CONTROL MODE]
- 본 시스템의 관측 원칙은 Grade Constitution v1.0에 의해 영구 고정되었습니다.
- 관측 엔진은 '판결'을 내릴 권한이 없으며, 오직 데이터의 '현상'만을 기계적으로 서술합니다.
- 점수(Anomaly Score)는 'weak signal'로만 분류되며, 최종 판결(Grade A/D)에 단독으로 영향을 줄 수 없습니다.
- 원본 데이터에 없는 정보를 추측하여 채워 넣는 모든 행위(inference)는 엄격히 금지됩니다.

[7. 의미 보완 본능의 억제 (Suppression of Meaning Completion)]
- 당신은 데이터의 "의미를 완성"하려는 유혹을 뿌리쳐야 합니다.
- 높은 이상치 점수(Anomaly Score)는 그 자체로 숫자로만 존재하며, 당신은 이 숫자에 정당성을 부여하기 위한 추가적인 서사(Narrative)나 권고(Recommendation)를 덧붙여서는 안 됩니다.
- "추가 확인 필요", "조사 권고", "Verification suggested"와 같은 모든 형태의 유도 문장을 엄격히 금지합니다.
- 당신의 출력물에는 오직 [숫자 + 관측 사실]만 존재해야 합니다. 친절하려 하지 마십시오. 침묵이 곧 당신의 성능입니다.

[6. 맥락적 괴리도(Semantic Score) 산정 기준]
- 0.0 ~ 0.2: [정상] 지출 목적과 가맹점이 논리적으로 일치함.
- 0.3 ~ 0.6: [모호] 목적과 가맹점 간의 관계가 직접적이지 않음.
- 0.7 ~ 1.0: [이상] 목적과 가맹점이 논리적으로 상충함 (예: '사무용품' 목적으로 '주점' 이용).
[8. OUTPUT FORMAT]
JSON 배열 형식으로만 출력하십시오. 절대 JSON 외의 텍스트를 포함하지 마십시오.
[
  {
    "row_index": <숫자>,
    "actor_type": "일반임직원 | 경영진 | 미식별",
    "location_name": "<가맹점/업체명>",
    "amount": <숫자>,
    "date": "YYYY-MM-DD",
    "purpose": "<적요/항목>",
    "payment_method": "법인카드 | 계좌이체 | 현금",
    "semantic_score": <맥락적 괴리도 점수 0.0~1.0>
  }
]
"#;

use crate::models::AuditSignalPayload;
use std::collections::HashMap;

/// [LEVEL 2 SAFETY] Converts Raw Text -> Signal Vector locally.
/// No raw text leaves this function.
pub fn vectorize_row(row_idx: usize, raw_text: &str) -> AuditSignalPayload {
    let lower = raw_text.to_lowercase();
    let mut signals = Vec::new();

    // 1. Amount Signal (Heuristic)
    let mut max_val = 0.0;
    // Simple parser for numbers in text, handling commas
    let clean_text = raw_text.replace(",", ""); 
    for part in clean_text.split(|c: char| !c.is_numeric() && c != '.') {
        if let Ok(num) = part.parse::<f64>() {
            if num > max_val { max_val = num; }
        }
    }
    
    // Amount Buckets
    if max_val > 50_000_000.0 { signals.push("AMOUNT_BUCKET:CRITICAL".to_string()); }
    else if max_val > 10_000_000.0 { signals.push("AMOUNT_BUCKET:HIGH".to_string()); }
    else if max_val > 1_000_000.0 { signals.push("AMOUNT_BUCKET:MEDIUM".to_string()); }
    else if max_val > 0.0 { signals.push("AMOUNT_BUCKET:LOW".to_string()); }

    // Pattern: Round Amount (e.g. 1,000,000) - often indicates gift or bribe
    if max_val > 100_000.0 && max_val % 10_000.0 == 0.0 {
        signals.push("PATTERN:ROUND_AMOUNT".to_string());
    }

    // 2. Keyword Signals & Context
    let keywords = vec![
        ("consulting", "CTX:CONSULTING"), ("컨설팅", "CTX:CONSULTING"),
        ("상품권", "CTX:GIFT_PURCHASE"), ("gift", "CTX:GIFT_PURCHASE"), ("voucher", "CTX:GIFT_PURCHASE"),
        ("주점", "CTX:ENTERTAINMENT"), ("bar", "CTX:ENTERTAINMENT"), ("karaoke", "CTX:ENTERTAINMENT"),
        ("골프", "CTX:GOLF"), ("golf", "CTX:GOLF"),
        ("호텔", "CTX:HOTEL"), ("hotel", "CTX:HOTEL"),
        ("할부", "PATTERN:SPLIT_PAYMENT"), ("split", "PATTERN:SPLIT_PAYMENT"), ("install", "PATTERN:SPLIT_PAYMENT"),
        ("강남", "LOCATION:COMMERCIAL_DISTRICT"), ("gangnam", "LOCATION:COMMERCIAL_DISTRICT"),
        ("여의도", "LOCATION:COMMERCIAL_DISTRICT"), ("yeouido", "LOCATION:COMMERCIAL_DISTRICT"),
        ("종로", "LOCATION:COMMERCIAL_DISTRICT"), ("jongno", "LOCATION:COMMERCIAL_DISTRICT"),
    ];

    for (k, tag) in keywords {
        if lower.contains(k) {
            signals.push(tag.to_string());
        }
    }

    // 3. Time Heuristic (Regex) - looking for HH:MM
    // We use a simple regex here. For production, use lazy_static.
    if let Ok(re) = regex::Regex::new(r"(\d{1,2}):(\d{2})") {
        if let Some(caps) = re.captures(&raw_text) {
            if let (Ok(h), Ok(_m)) = (caps[1].parse::<u32>(), caps[2].parse::<u32>()) {
                if h >= 22 || h < 6 {
                    signals.push("TIME:AFTER_HOURS".to_string());
                } else if h >= 18 {
                    signals.push("TIME:EVENING".to_string());
                } else if h >= 12 && h < 14 {
                    signals.push("TIME:LUNCH_HOUR".to_string());
                } else {
                    signals.push("TIME:BUSINESS_HOURS".to_string());
                }
            }
        }
    }
    
    // Explicit keywords for time if regex fails but text says so
    if lower.contains("심야") || lower.contains("late night") {
        if !signals.contains(&"TIME:AFTER_HOURS".to_string()) {
            signals.push("TIME:AFTER_HOURS".to_string());
        }
    }

    // 4. Imprint Hash
    let imprint = format!("{:x}", md5::compute(raw_text));

    // 5. Metadata
    let mut meta = HashMap::new();
    meta.insert("row_idx".to_string(), row_idx.to_string());
    meta.insert("amount_value".to_string(), max_val.to_string());

    AuditSignalPayload {
        evidence_hash: imprint,
        extracted_signals: signals,
        meta_dimension: meta,
        masked_snippet: None, 
    }
}

pub async fn perform_vector_analysis(rows_with_index: Vec<(usize, String)>) -> Vec<SuspicionSignal> {
    if rows_with_index.is_empty() { return Vec::new(); }

    // 1. Local Vectorization (The "Air Gap")
    let vectors: Vec<AuditSignalPayload> = rows_with_index.iter()
        .map(|(idx, text)| vectorize_row(*idx, text))
        .collect();

    // [V-SCORE] Statistical Analysis (Z-Score)
    let amounts: Vec<f64> = vectors.iter()
        .map(|v| v.meta_dimension.get("amount_value").and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0))
        .collect();
    
    let count = amounts.len() as f64;
    let mean = amounts.iter().sum::<f64>() / count;
    let variance = amounts.iter().map(|value| {
        let diff = mean - *value;
        diff * diff
    }).sum::<f64>() / count;
    let std_dev = variance.sqrt();

    // 2. Cloud Transmission (Vectors Only)
    // We send JSON of vectors, NOT text.
    let vector_json = serde_json::to_string_pretty(&vectors).unwrap_or_default();
    
    let system_vector_prompt = r#"
You occupy the role of [Evidence AI] in the AuditFlow system.
Your input is a list of [AuditSignalVector] objects.
Your task is to analyze these VECTORS (combinations of signals) and identify potential risks.

[INPUT SPEC]
- evidence_hash: Unique ID of original data (do not ask for source).
- extracted_signals: Tags like "AMOUNT_BUCKET:HIGH", "CTX:GIFT_CARD".

[RULES]
1. You CANNOT see the original text. Do not hallucinate names or details.
2. Rely ONLY on the signals provided.
3. If "CTX:GIFT_CARD" AND "AMOUNT_BUCKET:HIGH" appear, flag as "High Risk Gift Card Purchase".
4. If "CTX:CONSULTING" appears without "AMOUNT_BUCKET:HIGH", flag as "Low Risk Routine Consulting".

[S-Score Guidelines]
- 0.0 ~ 0.2: Normal connection (e.g. 'Consulting' tag + 'Office' context)
- 0.3 ~ 0.6: Ambiguous (e.g. 'Consulting' tag with no clear context)
- 0.7 ~ 1.0: HIGH Semantic Anomaly (e.g. 'Consulting' tag + 'CTX:ENTERTAINMENT' or 'CTX:GOLF')

[OUTPUT FORMAT]
JSON Array of:
{
  "row_index": <int from metadata>,
  "risk_label": "High | Medium | Low",
  "reasoning": "<Explanation based on signals>",
  "semantic_score": <0.0 to 1.0>
}
"#;

    let final_prompt = format!("{}\n\n[VECTOR STREAM]\n{}", system_vector_prompt, vector_json);

    let ai_response = match crate::ai::call_gemini_direct(&final_prompt).await {
        Ok(res) => res,
        Err(e) => {
            println!(">>> [Evidence AI] Connection Failed: {}", e);
            return Vec::new();
        }
    };

    let cleaned_json = crate::file_utils::extract_json(&ai_response);
    
    #[derive(serde::Deserialize)]
    struct VectorResponse {
        row_index: usize,
        risk_label: String,
        reasoning: String,
        semantic_score: f32, // S-Score
    }

    // Default to empty if parsing fails
    let ai_results: Vec<VectorResponse> = serde_json::from_str(&cleaned_json).unwrap_or_else(|_| Vec::new());
    
    // Map AI results by row_index for easy lookup
    let ai_map: HashMap<usize, VectorResponse> = ai_results.into_iter().map(|r| (r.row_index, r)).collect();

    let mut signals = Vec::new();

    // 3. Hybrid Synthesis (S + V + C)
    for (i, vector) in vectors.iter().enumerate() {
        let row_idx = vector.meta_dimension.get("row_idx").and_then(|s| s.parse::<usize>().ok()).unwrap_or(0);
        let amount = amounts[i];
        
        // A. V-Score (Value) + [LAYER 2] PROXIMITY CHECK (Threshold Evasion)
        let z_score = if std_dev > 0.0 { (amount - mean) / std_dev } else { 0.0 };
        let mut v_base = if z_score > 3.0 { 1.0 } else if z_score > 2.0 { 0.7 } else if z_score > 1.0 { 0.3 } else { 0.0 };
        
        // [THRESHOLD DETECTOR] 5M KRW (Corporate limit)
        // Check 95% ~ 99.9% proximity (e.g., 4,990,000 KRW)
        let threshold_5m = 5_000_000.0;
        let ratio_5m = amount / threshold_5m;
        if ratio_5m >= 0.95 && ratio_5m < 1.0 {
            v_base = 1.0; // Force MAX V-Score for 'Intentional Avoidance'
        }
        let v_score = v_base;

        // B. C-Score (Context) + [LAYER 3] MULTI-FACTOR CORRELATION
        let mut c_score = 0.0;
        let mut has_lounge = false;
        let mut has_night = false;
        let is_high_value = amount >= 300_000.0;

        for sig in &vector.extracted_signals {
            if sig.contains("CTX:ENTERTAINMENT") || sig.contains("CTX:GOLF") { has_lounge = true; c_score += 0.4; } 
            else if sig.contains("CTX:GIFT_PURCHASE") { c_score += 0.3; } // else if to avoid double counting if categorized
            
            if sig.contains("TIME:AFTER_HOURS") { has_night = true; c_score += 0.2; }
            if sig.contains("PATTERN:SPLIT_PAYMENT") { c_score += 0.5; }
        }
        
        // [Multi-factor Boost] Lounge + Night + High Value = Critical
        if has_lounge && has_night && is_high_value {
            c_score = 1.0; // Force Critical Risk on Intersection
        }

        if c_score > 1.0 { c_score = 1.0; }

        // C. S-Score (Semantic): From AI
        let s_res = ai_map.get(&row_idx);
        let s_score = s_res.map(|r| r.semantic_score).unwrap_or(0.0);
        let reasoning = s_res.map(|r| r.reasoning.clone()).unwrap_or("Analysis failed".to_string());
        
        // D. Final Integrated Score
        // Formula: S(40%) + V(40%) + C(20%)
        let final_score = (s_score * 0.4f32) + (v_score as f32 * 0.4f32) + (c_score as f32 * 0.2f32);

        if final_score > 0.4 {
             signals.push(SuspicionSignal::new(
                format!("[Hybrid Analysis] Score {:.2} (S:{:.1}, V:{:.1}, C:{:.1}) - {}", final_score, s_score, v_score, c_score, &reasoning),
                final_score,
                vec![row_idx as i64],
                SignalScope::Transaction,
                SignalSource::AI("HYBRID_ENGINE_V2".to_string()),
                Some(serde_json::json!({
                    "s_score": s_score,
                    "v_score": v_score,
                    "c_score": c_score,
                    "z_score": z_score,
                    "amount": amount,
                    "batch_mean": mean,
                    "batch_std_dev": std_dev,
                    "vector_reasoning": reasoning,
                    "risk_label": if final_score > 0.8 { "High" } else { "Medium" }
                }))
            ));
        }
    }

    signals
}

// Legacy function stub (for compatibility if needed, but redirects to vector)
pub async fn perform_ai_detection_batch(rows: Vec<(usize, String)>) -> Vec<SuspicionSignal> {
    perform_vector_analysis(rows).await
}
