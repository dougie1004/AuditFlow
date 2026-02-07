const fs = require('fs');

const filePath = 'src-tauri/src/audit_engine.rs';
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
    { from: /"message": "踰뺤씤移대뱶 \?ъ슜 \?댁뿭 \?뺣\? 遺꾩꽍 \?쒖옉\.\.\."/g, to: '"message": "법인카드 사용 내역 정밀 분석 시작..."' },

    // Headers
    { from: /\?깅챸/g, to: "성명" },
    { from: /二쇱냼/g, to: "주소" },
    { from: /嫄곗＜吏€/g, to: "거주지" },
    { from: /\?꾨룄/g, to: "위도" },
    { from: /寃쎈룄/g, to: "경도" },
    { from: /媛€留뱀젏/g, to: "가맹점" },
    { from: /\?곹샇/g, to: "상호" },
    { from: /\?쇱떆/g, to: "일시" },
    { from: /\?쇱옄/g, to: "일자" },
    { from: /\?뱀씤\?\?/g, to: "승인일" },
    { from: /\?꾩튂/g, to: "위치" },
    { from: /湲덉븸/g, to: "금액" },
    { from: /\?뱀씤湲\?/g, to: "승인금액" },
    { from: /\?⑷퀎/g, to: "합계" },
    { from: /\?ъ슜\?\?/g, to: "사용자" },
    { from: /\?뚯쑀\?\?/g, to: "소유자" },
    { from: /\?깊븿/g, to: "성함" },
    { from: /\?낆쥌/g, to: "업종" },

    // Values
    { from: /二쇱냼誘몄긽/g, to: "주소미상" },
    { from: /誘명솗\?\?\?ъ슜\?\?/g, to: "미확인 사용자" },
    { from: /\?먰깮 二쇱냼/g, to: "자택 주소" },

    // Rule A
    { from: /\[Rule A\] \?먰깮 \?멸렐 \?ъ슜/g, to: "[Rule A] 자택 인근 사용" },
    { from: /嫄곗＜吏€ 諛섍꼍 \{\:\.2\}km \?대궡 寃곗젣 \?먯\?/g, to: "거주지 반경 {:.2}km 이내 결제 포착" },
    { from: /\?낅Т 愿€\?⑥꽦 \?뚮챸 \?붿껌/g, to: "업무 관련성 소명 요청" },

    // Rule B
    { from: /\[Critical\] 遺꾪븷 寃곗젣 \?섏떖\(Split Payment\)/g, to: "[Critical] 분할 결제 의심(Split Payment)" },
    { from: /\?숈씪 媛€留뱀젏\(\{\}\) \?⑥떆媛\?\?\?\?뺤젙\?\?履쇨컻湲\?吏뺥썑 \(\?⑹궛 \{\}\?\?/g, to: "동일 가맹점({}) 단시간 내 의심 쪼개기 징후 (합산 {})" },
    { from: /\?곸꽭 \?곸닔利\?諛\?寃곗젣 \?ъ쑀\?\?\?쒖텧 \?붿껌/g, to: "상세 영수증 및 결제 사유 제출 요청" },

    // SQL
    { from: /origin_audit_type = '\?쒖뒪\?\?留덉뒪\?\?'/g, to: "origin_audit_type = '시스템 마스터'" },

    // Fallback Guidelines
    { from: /\[湲곕낯 媛먯궗 媛€\?대뱶\?쇱씤 \(Fallback\)\]:/g, to: "[기본 감사 가이드라인 (Fallback)]:" },
    { from: /1\. 怨듯쑕\?\?二쇰쭚 嫄곕옒 以\?怨좎븸 \?먮뒗 鍮꾩젙\?\?\?낆쥌 \?먯\?\./g, to: "1. 공휴일/주말 거래 중 고액 또는 비정상 업종 포착." },
    { from: /2\. \?숈씪 湲덉븸\?\?諛섎났 寃곗젣 \(履쇨컻湲\?寃곗젣\)\./g, to: "2. 동일 금액의 반복 결제 (쪼개기 결제)." },
    { from: /3\. \?ъ빞 \?쒓컙\?€\(22\?\?\?댄썑\) \?좏씎\/二쇱젏 嫄곕옒\./g, to: "3. 심야 시간대(22시 이후) 유흥/주점 거래." },
    { from: /4\. \?덉쓽 寃곗옱 \?녿뒗 怨좎븸 \?먯궛 援ъ엯 \?섏떖\./g, to: "4. 사전 결재 없는 고액 자산 구입 의심." },
    { from: /5\. 嫄곕옒泥섏\?\?꾩뭏\?\?媛꾩쓽 \?좉났\/\?좎갑 吏뺥썑 \?먯\?\./g, to: "5. 거래처와 임직원 간의 유착/청탁 징후 포착." }
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

fs.writeFileSync(filePath, modifiedContent, 'utf8');
console.log(`Replaced ${matchCount} patterns in audit_engine.rs.`);
