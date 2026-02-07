const fs = require('fs');

const filePath = 'src-tauri/src/audit_engine.rs';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

let startLine = -1;
let endLine = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('// [PHASE 1] Prosecutor Mode Prompts')) {
        startLine = i; // This matches the first line (485)
        // Check for duplicate line
        if (lines[i + 1].includes('// [PHASE 1] Prosecutor Mode Prompts')) {
            startLine = i; // keep 485, overwrite 486
        }
    }
    if (startLine !== -1 && i > startLine) {
        if (lines[i].includes('call_gemini_flash(&format!')) {
            // This is line 519 in view, so the block ends before this.
            // In view, line 517 was the bad closing line. 518 was empty.
            if (lines[i - 1].trim() === '' && lines[i - 2].includes('total_chunks);')) {
                endLine = i - 2;
            } else if (lines[i - 2].trim() === '' && lines[i - 3].includes('total_chunks);')) {
                endLine = i - 3;
            } else {
                // Fallback: search for the broken line
                for (let j = i; j > startLine; j--) {
                    if (lines[j].includes('total_chunks);')) {
                        endLine = j;
                        break;
                    }
                }
            }
            break;
        }
    }
}

if (startLine !== -1 && endLine !== -1) {
    const newBlock = `                // [PHASE 1] Prosecutor Mode Prompts
                let detection_prompt = r#"
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

[분석 지침]
- 위반 사항이 발견되면 즉시 기소 의견으로 보고서를 작성하십시오.
- 증거가 불충분하더라도 정황증거만으로 강력한 경고를 날리십시오.

반환 포맷 (JSON):
[
  {
    "category": "위반 유형 (예: 횡령, 규정 위반, 배임)",
    "severity": "Critical" | "High",
    "description": "위반 내용 상세 (육하원칙, 독설적 어조)",
    "evidence": "증거 데이터 (가맹점, 금액, 시간)",
    "recommendation": "처분 권고 (예: 즉시 해고, 형사 고발, 전액 환수)",
    "risk_score": 90-100
  }
]
"#.to_string();`;

    lines.splice(startLine, endLine - startLine + 1, newBlock);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`Fixed Prosecutor Prompt block in audit_engine.rs (lines ${startLine}-${endLine}).`);
} else {
    console.error('Failed to locate prompt block boundaries.');
}
