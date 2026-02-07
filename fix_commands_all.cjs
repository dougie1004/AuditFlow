const fs = require('fs');

const filePath = 'src-tauri/src/commands.rs';
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
    {
        // Line 747: unwrap_or("誘몃텇瑜?.to_string())
        // Pattern: look for unwrap_or(" followed by corrupted chars ending with .to_string()) inside the map logic
        // Safer to just replace the specific garbage string if possible.
        // "誘몃텇瑜?" -> "미분류"
        from: /unwrap_or\("誘몃텇瑜\?"\.to_string\(\)\)/g,
        to: 'unwrap_or("미분류".to_string())'
    },
    {
        // Line 748: unwrap_or("?쒖뒪???쒓났".to_string())
        // "?쒖뒪???쒓났" -> "시스템 제공"
        from: /unwrap_or\("\?쒖뒪\?\?\?쒓났"\.to_string\(\)\)/g,
        to: 'unwrap_or("시스템 제공".to_string())'
    },
    {
        // Line 1220: unwrap_or("遺꾩꽍???꾨즺?섏뿀?듬땲??")
        from: /unwrap_or\("遺꾩꽍\?\?\?꾨즺\?섏뿀\?듬땲\?\?"\)/g,
        to: 'unwrap_or("분석이 완료되었습니다.")'
    },
    {
        // Line 1230: unwrap_or("湲고?")
        from: /unwrap_or\("湲고\?"\)/g,
        to: 'unwrap_or("기타")'
    },
    {
        // Line 1712: Err("?먯젙???쒓렇?먯씠 ?놁뒿?덈떎.".to_string())
        from: /Err\("\?먯젙\?\?\?쒓렇\?먯씠 \?놁뒿\?덈떎\."\.to_string\(\)\)/g,
        to: 'Err("판정할 시그널이 없습니다.".to_string())'
    },
    {
        // Line 1701: println!(">>> [GOVERNANCE] Starting Phase 4 ??Constitutional ...")
        from: /Starting Phase 4 \?\?Constitutional/g,
        to: 'Starting Phase 4 Constitutional'
    },
    {
        // Prompt at 1463
        from: /\?뱀떊\?€ '媛먯궗 寃곌낵 \?붿빟 蹂닿퀬\?\?\?묒꽦湲\?\?낅땲\?\? \?꾨옒\?\?吏€移⑥쓣 \?꾧꺽\?\?以€\?섑븯\?\?蹂닿퀬\?쒕\? 작성하십시오\./g,
        to: "당신은 '감사 결과 요약 보고서 작성기'입니다. 아래의 지침을 엄격히 준수하여 보고서를 작성하십시오."
    },
    {
        // Prompt detail 1467
        from: /1\. 異쒕젰 \?몄뼱\?\?諛섎뱶\?\?100% \?쒓뎅\?댁뿬\?\?\?\?/g,
        to: "1. 출력 언어는 반드시 100% 한국어여야 합니다."
    },
    {
        // Prompt detail 1468
        from: /2\. 'AI', '紐⑤뜽', 'Gemini', 'LLM' \?\?湲곗닠\?\?\?⑹뼱\?\?AI媛€ \?묒꽦\?덈떎\?\?\?쒗쁽\?\?\?덈\? 湲덉\?\?\?/g,
        to: "2. 'AI', '모델', 'Gemini', 'LLM' 등 기술적 용어나 AI가 작성했다는 표현은 엄격히 금지합니다."
    },
    {
        // Prompt detail 1469
        from: /3\. 媛먯궗 二쇱껜\?\?\?\?긽 '蹂\?媛먯궗 寃곌낵' \?먮뒗 '蹂\?\?녆궗 寃곌낵'濡\?\?쒗쁽\?\?/g,
        to: "3. 감사 주체는 항상 '본 감사 결과' 또는 '본 실사 결과'로 표현."
    },
    {
        // Prompt detail 1470
        from: /4\. 臾몄껜\?\?\?뺤쨷\?섏\?留\?\?⑦샇\?\?\?대\? 媛먯궗蹂닿퀬\?\?臾몄껜瑜\?\?ъ슜\?\?\(~\?\? ~\?\? ~諛붾엺\)\./g,
        to: "4. 문체는 정중하되 단호하고 엄격한 감사보고서 문체를 사용 (~함, ~임, ~바람)."
    },
    {
        // Prompt detail 1471
        from: /5\. \?곷Ц 怨좎쑀紐낆궗 \?ъ슜\?\?吏€\?묓븯怨\?媛€湲됱쟻 \?쒓뎅\?\?\?⑹뼱濡\?\?€泥댄븿 \(\?\?Split Payment -> 분할 寃곗젣\)\./g,
        to: "5. 영문 고유명사 사용은 지양하고 가급적 한국어 용어로 대체함 (예: Split Payment -> 분할 결제)."
    },
    {
        // Prompt detail 1474
        from: /- \?뺤씤\?\?洹쒖젙 \?꾨컲 嫄댁닔: \{\}嫄\?/g,
        to: "- 확인된 규정 위반 건수: {}건"
    },
    {
        // Prompt detail 1475
        from: /- 寃€異쒕맂 리스크\?좏삎: \{\}/g,
        to: "- 검출된 리스크유형: {}"
    },
    {
        // Prompt detail 1478
        from: /\[寃쎌쁺吏\?\?붿빟 蹂닿퀬\]/g,
        to: "[경영진 요약 보고]"
    },
    {
        // Prompt detail 1480
        from: /1\. 媛먯궗 媛쒖슂/g,
        to: "1. 감사 개요"
    }
];

let modifiedContent = content;
let matchCount = 0;

for (const rep of replacements) {
    if (modifiedContent.match(rep.from)) {
        modifiedContent = modifiedContent.replace(rep.from, rep.to);
        matchCount++;
    } else {
        console.log('Pattern not found:', rep.from);
    }
}

// Special case for line 1253: status: "Pending".to_string() in AuditFinding struct init.
// The garbage characters might be affecting the surrounding lines if they are comments or strings.
// Just a general check.

fs.writeFileSync(filePath, modifiedContent, 'utf8');
console.log(`Replaced ${matchCount} patterns in commands.rs.`);

