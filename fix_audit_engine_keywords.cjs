const fs = require('fs');

const filePath = 'src-tauri/src/audit_engine.rs';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    // 1. Fix blacklisted_keywords (Context around line 740)
    if (lines[i].includes('"Lounge", "Club", "Bar", "Night"')) {
        // We look backwards for the start of the vec!
        let start = i;
        while (start > 0 && !lines[start].includes('vec![')) {
            start--;
        }
        if (start > 0) {
            // Replace from start to i
            // We assume it's `let blacklisted_keywords = vec![` or similar. 
            // We will just replace the lines inside the vec! if possible, or the whole declaration.
            // Let's replace the whole block if we are strict.
            // But I don't know the exact lines count for the corrupted part.
            // Let's search for lines containing corrupted chars above this line.
            lines[i - 1] = '        "단란주점", "유흥", "주점", "안마", "상품권", "도박", "가라오케", "노래방", "룸살롱",';
        }
    }

    // 2. Fix critical_keywords (Line 745)
    if (lines[i].includes('let critical_keywords = vec![')) {
        // Replace known corrupted lines following this
        lines[i + 1] = '        "부패", "횡령", "배임", "비리", "뇌물", "리베이트", "금품수수",';
        lines[i + 2] = '        "구매부정", "담합", "청탁", "비자금", "착복", "유용",';
    }

    // 3. Fix high_risk_keywords (Line 752)
    if (lines[i].includes('let high_risk_keywords = vec![')) {
        lines[i + 1] = '        "급한 건", "Manual Adj", "Override", "Urgent Pay", "Wait list", "Exception", ';
        lines[i + 2] = '        "수기결재", "분기", "미승인", "긴급", "예외", "특별", "임의 조정", "긴급 출금",';
        lines[i + 3] = '        "제보", "투서", "내부고발", "성희롱", "갑질",';
        lines[i + 4] = '        "인사", "해고", "징계", "감봉", "경고", "시말서"';
    }

    // 4. Fix hr_risk_keywords (Line 759)
    if (lines[i].includes('let hr_risk_keywords = vec![')) {
        lines[i + 1] = '        "제보", "투서", "내부고발", "성희롱", "성추행", "갑질", ';
        lines[i + 2] = '        "직장내괴롭힘", "부당해고", "차별"';
    }

    // 5. Fix comment at 744
    if (lines[i].includes('// [CRITICAL] 援щℓ遺€?? ?〓졊 ??利됱떆 High濡?遺꾨쪟?댁빞 ?섎뒗 ?ㅼ썙??')) {
        lines[i] = '    // [CRITICAL] 구매부정, 횡령 등 즉시 High로 분류해야 하는 키워드';
    }
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Fixed audit_engine.rs keywords.');
