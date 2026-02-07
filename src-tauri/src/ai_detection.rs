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

pub async fn perform_ai_detection_batch(rows_with_index: Vec<(usize, String)>) -> Vec<SuspicionSignal> {
    if rows_with_index.is_empty() {
        return Vec::new();
    }

    // Format Input Data
    let mut data_block = String::new();
    for (idx, text) in &rows_with_index {
        data_block.push_str(&format!("Row {}: {}\n", idx, text));
    }

    let final_prompt = format!("{}\n\n[DATA TO OBSERVE]\n{}", CONSTITUTIONAL_PROMPT, data_block);

    // Call Gemini (Using generic call to avoid dependency cycle if possible, but we use crate::ai)
    // Note: ensure crate::ai::call_gemini_direct is public
    let ai_response = match crate::ai::call_gemini_direct(&final_prompt).await {
        Ok(res) => res,
        Err(e) => {
            println!(">>> [AI Driver] API Error: {}", e);
            return Vec::new(); // Fail safe
        }
    };

    // Clean Markdown if present
    let cleaned_json = crate::file_utils::extract_json(&ai_response);

    // Parse JSON
    let observations: Vec<AiObservationOutput> = match serde_json::from_str(&cleaned_json) {
        Ok(v) => v,
        Err(e) => {
            println!(">>> [AI Driver] JSON Parse Error: {}. Raw: {}", e, cleaned_json);
            return Vec::new();
        }
    };

    // ------------------------------------------------------------------------
    // [HYBRID SCORING ENGINE v1.0]
    // ------------------------------------------------------------------------
    
    // Step 1: Statistical Baseline (Batch-wide)
    let amounts: Vec<f64> = observations.iter().map(|o| o.amount as f64).collect();
    let mean = if !amounts.is_empty() { amounts.iter().sum::<f64>() / amounts.len() as f64 } else { 0.0 };
    let std_dev = if amounts.len() > 1 {
        let variance = amounts.iter().map(|&a| (a - mean).powi(2)).sum::<f64>() / (amounts.len() - 1) as f64;
        variance.sqrt()
    } else { 0.0 };

    let mut signals = Vec::new();
    for obs in observations {
        // [SAFETY CHECK] Forbidden Words Guardian
        let forbidden_words = vec!["의심", "부정", "위반", "문제", "비정상", "위험", "불법", "배임", "횡령"];
        if forbidden_words.iter().any(|&w| format!("{} {}", obs.purpose, obs.location_name).contains(w)) {
            continue;
        }

        // 1) S-Score (Semantic, 40%) - Directly from AI's contextual insight
        let s_score = obs.semantic_score;

        // 2) V-Score (Value, 40%) - Statistical outlier detection
        // Normalize Z-score to 0.0 ~ 1.0 range
        let v_score = if std_dev > 0.0 {
            let z = (obs.amount as f64 - mean) / std_dev;
            (z * 0.2).max(0.0).min(1.0) as f32 // 5 sigma starts at 1.0
        } else {
            0.0
        };

        // 3) C-Score (Context, 20%) - Hard flags
        let mut c_score: f32 = 0.0;
        let restricted_keywords = vec!["Bar", "Club", "유흥", "주점", "단란"];
        if restricted_keywords.iter().any(|&kw| obs.location_name.contains(kw) || obs.purpose.contains(kw)) {
            c_score += 0.5_f32; // High bump for restricted terms
        }
        // Weekend check (Simple)
        if obs.date.contains("Sat") || obs.date.contains("Sun") {
            c_score += 0.2_f32;
        }

        // Final Aggregate (Weighted Average)
        let final_score = (s_score * 0.4_f32) + (v_score * 0.4_f32) + (c_score.min(1.0) as f32 * 0.2_f32);
        let rounded_score = (final_score * 100.0_f32).round() / 100.0_f32;

        let observation_text = format!(
            "[수행 주체]: {}\n[결제 가맹점]: {}\n[결제 금액]: KRW {}\n[결제 일자]: {}\n[지출 목적]: {}\n[결제 수단]: {}",
            obs.actor_type, obs.location_name, obs.amount, obs.date, obs.purpose, obs.payment_method
        );

        let metadata = serde_json::json!({
            "actor_type": obs.actor_type,
            "location": obs.location_name,
            "amount": obs.amount,
            "date": obs.date,
            "purpose": obs.purpose,
            "semantic_score": s_score,
            "stats_score": v_score,
            "context_score": c_score,
            "final_hybrid_score": rounded_score
        });

        signals.push(SuspicionSignal::new(
            observation_text,
            rounded_score,
            vec![obs.row_index as i64],
            SignalScope::Transaction,
            SignalSource::AI("HYBRID_ENGINE_V1".to_string()),
            Some(metadata)
        ));
    }

    signals
}
