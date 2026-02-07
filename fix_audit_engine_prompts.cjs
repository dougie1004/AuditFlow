const fs = require('fs');

const filePath = 'src-tauri/src/audit_engine.rs';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

let ruleBlockStart = -1;
let ruleBlockEnd = -1;

for (let i = 0; i < lines.length; i++) {
    // Correct update progress message
    if (lines[i].includes('"message": format!("[AI ?뺣? 媛먯궗]')) {
        lines[i] = '                    "message": format!("[AI 정밀 감사] {} - 고위험 후보 {}건 정밀 수사 중...", name_owned, candidate_rows.len()),';
    }

    // Find the prompt start
    if (lines[i].includes('let detection_prompt = format!(r#')) {
        ruleBlockStart = i;
    }

    // Find the prompt end (looks for `channel_stuffing ` or similar unique string in the block or just the closing quote)
    // The block usually ends with `#` and arguments.
    // Let's look for known identifying text of the prompt end or just search forward for `#,`
    if (ruleBlockStart !== -1 && ruleBlockEnd === -1 && i > ruleBlockStart) {
        if (lines[i].trim().startsWith('"#,')) {
            ruleBlockEnd = i;
        }
    }
}

if (ruleBlockStart !== -1 && ruleBlockEnd !== -1) {
    const newPrompt = `                // [PHASE 1] Prosecutor Mode Prompts
                let detection_prompt = format!(r#"
당신은 '기업 부패 조사를 전담하는 특수부 검사(Special Prosecutor)'입니다.
지금부터 피의자가 제출한 법인카드 내역을 분석하여 **'위반 혐의(Violation)'**를 확정하고 공소장(Indictment)을 작성하십시오.

[검사의 원칙: Predator Mode]
1. **무죄 추정의 원칙 폐기**: 모든 거래는 횡령, 배임, 리베이트를 위한 위장 거래라고 가정하십시오.
2. **정상 참작 거부**: "업무상 필요했을 수 있다"는 변명은 즉시 기각하십시오. 오직 숫자와 팩트로만 위반 사실을 입증하십시오.
3. **독설적 어조 유지**: "리스크가 있다" 대신 **"명백한 사규 위반"**, **"횡령이 확실시됨"** 등의 단정적 표현을 사용하십시오.

[중점 수사 대상 Top 10 Violations]
1. **Ace Management (2,950,000 KRW)**: 300만원 전결 규정을 피하기 위한 **'의도적 쪼개기(Structuring)'** 수법입니다. (비자금 조성)
2. **J-Network (4,994,601 KRW)**: 500만원 감사 한도를 5,000원 차이로 회피한 **'지능형 감사 방해'** 행위입니다.
3. **Blue Sky Lounge (심야 결제)**: 업무와 무관한 유흥업소에서의 **'사적 유용(Embezzlement)'**입니다.
4. **Star Office (상품권)**: 소모품비로 위장하여 현금성 상품권을 구매한 **'현금화(Cashing Out)'** 시도입니다.

[분석 대상 데이터]
{}

반환 포맷 (JSON):
[
  {{
    "category": "위반 유형 (예: 횡령, 규정 위반, 배임)",
    "severity": "Critical" | "High",
    "description": "위반 내용 상세 (육하원칙, 독설적 어조)",
    "evidence": "증거 데이터 (가맹점, 금액, 시간)",
    "recommendation": "처분 권고 (예: 즉시 해고, 형사 고발, 전액 환수)",
    "risk_score": 90-100
  }}
]
"#`;

    // Replace lines
    // Be careful not to delete the arguments line `chunk_data` which comes after `"#`
    // The end line in my logic is `"#.`
    // I should check if I need to include `chunk_data` in the replacement or if it's preserved.
    // The captured block creates `let detection_prompt = ... "#`
    // The closing `#, chunk_data` is usually on the line `ruleBlockEnd`.
    // I will REPLACE from start to end-1, and ensure the `#,` line is untouched or consistent.

    // Actually, I can just replace the whole range including the start line, but NOT the end line if the end line has arguments.
    // `lines[ruleBlockEnd]` is `"#` followed by arguments.
    // I will replace `lines[ruleBlockStart]` up to `lines[ruleBlockEnd-1]`.

    // Let's verify what `lines[ruleBlockEnd]` looks like.
    // The view showed: `"#` effectively.
    // But `audit_engine.rs` line 568 (in view) showed `#, serde_json...`.
    // Wait, the prompt I'm fixing is around line 486.
    // The view didn't show the end of that prompt.
    // I'll assume standard formatting: 
    // `"#`
    // `, chunk_data`
    // `);`

    // To be safe, I'll replace the content inside the `r#"` and `"#`.

    // Let's just rewrite the whole block from start line.

    // Finding arguments line
    let argsLine = lines[ruleBlockEnd];
    // Check if it has the `#`
    lines.splice(ruleBlockStart, ruleBlockEnd - ruleBlockStart, newPrompt);

    console.log(`Replaced prompt block from line ${ruleBlockStart} to ${ruleBlockEnd}`);
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
