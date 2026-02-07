const fs = require('fs');
const path = require('path');

const filePath = 'src-tauri/src/audit_engine.rs';
let content = fs.readFileSync(filePath, 'utf8');

const repairs = [
    { search: /\?뱀떊\?€ '?댁궗\?\? 吏곸냽 媛먯궗\?ㅼ옣'\?낅땲\?\? 諛쒓껄\?\?\?댁긽 吏뺥썑\?ㅼ뿉 \?€\?\? \*\*\"\?닿\?\?\? \?먯튃\(Zero Tolerance\)\"\*\* \?쇰줈 泥섎텇 \?깃툒\?\?\?\?먯젙\?섏떗\?쒖삤\./, replace: "당신은 '이사회 직속 감사실장'입니다. 발견된 이상 징후들에 대해 **'무관용 원칙(Zero Tolerance)'**으로 처분 등급을 판정하십시오." },
    { search: /\[\?먯젙 吏€移?/, replace: "[판정 지침]" },
    { search: /1\. \*\*High \(Critical - 利됱떆 媛먯궗 李⑹닔\)\*\*/, replace: "1. **High (Critical - 즉시 감사 착수)**" },
    { search: /- \*\*'Advisory Fee\(\?먮Ц猷\?\)', 'Consulting'\*\*: \?ㅼ껜 \?뚮챸 \?놁쑝硫\? 100% 鍮꾩옄湲\? 議곗꽦\?\?\?\?섏씠\?\? 而댄띁\?\? 嫄곕옒濡\? 媛꾩\?./, replace: "- **'Advisory Fee(자문료)', 'Consulting'**: 실제 소명 없으면 100% 비자금 조성용 페이퍼 컴퍼니 거래로 간주." },
    { search: /- \*\*'Lounge', 'Club', 'Bar'\*\*: \?ъ빞\/二쇰쭚 寃곗젣 \?\?\?\?낅땲 \?곌\?\?\? 諛쳗젣\?섍퀬 '\?ъ쟻 \?좎슜'\?쇰줈 \?뺤젙\./, replace: "- **'Lounge', 'Club', 'Bar'**: 심야/주말 결제 시 업무 연관성 배제하고 '사적 유용'으로 확정." },
    { search: /- \*\*'Management', 'Solution'\*\*: 援ъ껜\?\?\?\?⑹뿭 \?댁슜 \?녿뒗 \?뺤븸 寃곗젣\?\?\?\?덉쐞 嫄곕옒濡\? 遺꾨쪟\./, replace: "- **'Management', 'Solution'**: 구체적인 용역 내용 없는 정액 결제는 허위 거래로 분류." },
    { search: /- \*\*履쇨컻湲\?\?\?섏떖\*\*: \?숈씪泥\? \?숈씪\?\? 遺꾪븷 寃곗젣\?\? '\怨좎쓽\?\?\?\?뵾 \?쒕룄'\?쇰줈 \?꾨쾶\./, replace: "- **쪼개기 의심**: 동일처 동일날 분할 결제는 '고의적 회피 시도'로 판명." },
    { search: /2\. \*\*Medium \(Warning - \?뚮챸 \?붽뎄\)\*\*/, replace: "2. **Medium (Warning - 소명 요구)**" },
    { search: /- \?⑥닚 \?앸\? 珥덇낵, 二쇰쭚 \?쇰컲 \?앸떦 \?댁슜 \?\?/, replace: "- 단순 식대 초과, 주말 일반 식당 이용 등" },
    { search: /\[\?€\?\?\?\?댁뒋\]/, replace: "[판단 대상 이슈]" },
    { search: /諛섑솚 \?щ㎎ \(JSON 諛곗뿴\)\: \["High", \"High\", \"Medium\", \.\.\.\]/, replace: '반환 포맷 (JSON 배열): ["High", "High", "Medium", ...]' },
    { search: /\?곸꽭 議곗궗 諛\?\?\?쒖젙 議곗튂 沅뚭퀬/, replace: "상세 조사 및 시정 조치 권고" },
    { search: /寃€\?\?\?\?멩슂/, replace: "검토 필요" }
];

repairs.forEach(r => {
    content = content.replace(r.search, r.replace);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Repair of audit_engine.rs complete.');
