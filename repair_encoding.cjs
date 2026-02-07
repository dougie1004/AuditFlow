const fs = require('fs');
const path = require('path');

const srcDir = 'src-tauri/src';

const repairs = {
    'file_utils.rs': [
        { search: '"??,"??,"?좎깮","援먯닔","蹂€?몄궗","?뚭퀎??,"?€??,"?ъ옣","遺€?ъ옣","?꾨Т","?곷Т","?댁궗",', replace: '"사장","부사장","선생","교수","변호사","회계사","대표","사장","부사장","전무","상무","이사",' },
        { search: '"蹂몃???,"?ㅼ옣","?€??,"遺€??,"李⑥옣","怨쇱옣","?€由?,"?ъ썝","CEO","CFO","COO","CTO","怨꾩옣","二쇱엫",', replace: '"본부장","실장","팀장","부장","차장","과장","대리","사원","CEO","CFO","COO","CTO","계장","주임",' },
        { search: '"?묒꽦??,"寃€?좎옄","?뱀씤??,"?대떦??,"蹂닿퀬??,"?붿껌??,"寃곗옱","?섏떊","李몄“","?뱀씤","湲곗븞"', replace: '"작성자","검토자","승인자","담당자","보고자","요청자","결재","수신","참조","승인","기안"' },
        { search: 'Regex::new(r"\\b[媛€-??{2,4}\\b").unwrap()', replace: 'Regex::new(r"\\b[가-힣]{2,4}\\b").unwrap()' },
        { search: '([媛€-??{2,4})', replace: '([가-힣]{2,4})' },
        { search: '(?????좎깮|援먯닔|蹂€?몄궗|?뚭퀎???€???ъ옣|遺€?ъ옣|?꾨Т|?곷Т|?댁궗|蹂몃????ㅼ옣|?€??遺€??李⑥옣|怨쇱옣|?€由??ъ썝|怨꾩옣|二쇱엫|CEO|CFO|COO|CTO|Manager|Director)', replace: '(선생|교수|변호사|회계사|대표|사장|부사장|전무|상무|이사|본부장|실장|팀장|부장|차장|과장|대리|사원|계장|주임|CEO|CFO|COO|CTO|Manager|Director)' },
        { search: 'around.contains("?щ쾲")', replace: 'around.contains("사번")' },
        { search: 'name.starts_with("?④턿") || name.starts_with("?낃퀬") || name.starts_with("?쒓컝") || name.starts_with("?ш공") || name.starts_with("?⑸낫")', replace: 'name.starts_with("독고") || name.starts_with("남궁") || name.starts_with("제갈") || name.starts_with("사공") || name.starts_with("황보")' },
        { search: '"?꾨왂","?꾪몴","湲됱뿬","?몄궗","媛먯궗","?댁궗??,"寃곗옱","蹂닿퀬","?뚯쓽","踰뺤씤移대뱶","利앸튃","由ъ뒪??,"?듭젣","?대??듭젣","?꾨줈?몄뒪","?쒕굹由ъ삤","?꾨Т","?곷Т","?댁궗","吏€異?,"?섏엯","吏€湲?, "誘명똿", "移대뱶", "?꾧툑", "湲덉븸", "?곸슂", "?댁뿭", "?멸툑",', replace: '"전략","대표","급여","인사","감사","이사회","결재","보고","회의","법인카드","증빙","리스트","통제","내부통제","프로세스","시나리오","전무","상무","이사","지출","수입","지급", "미팅", "카드", "송금", "금액", "적요", "내역", "임금",' }
    ],
    'commands.rs': [
        { search: '?좏깮???곗씠?곗뿉 ?€??利앸텇 遺꾩꽍 以€鍮?以?..', replace: '선택된 데이터에 대한 증분 분석 준비 중...' },
        { search: '?꾩껜 ?곗씠???ъ꽕??諛?遺꾩꽍 以€鍮?以?..', replace: '전체 데이터 재설정 및 분석 준비 중...' },
        { search: '嫄곕쾭?뚯뒪', replace: '거버넌스' },
        { search: '而댄뵆?쇱씠?몄뒪', replace: '컴플라이언스' },
        { search: '由ъ뒪??', replace: '리스크' },
        { search: '?좊ː', replace: '윤리' },
        { search: '臾명솕', replace: '문화' },
        { search: '?ㅻ━', replace: '비리' },
        { search: '?고쉶', replace: '우회' },
        { search: '遺꾪븷', replace: '분할' },
        { search: '履쇨컻湲?', replace: '쪼개기' },
        { search: '?몄궗', replace: '인사' },
        { search: '?뱀떊?€', replace: '당신은' },
        { search: '湲곗뾽??', replace: '기업의' },
        { search: '理쒓퀬 媛먯궗 梨낆엫??', replace: '최고 감사 책임자' },
        { search: '?묒꽦?섏떗?쒖삤', replace: '작성하십시오' },
        { search: '?듦퀎', replace: '통계' },
        { search: '諛쒓껄', replace: '발견' },
        { search: '怨좎쐞??', replace: '고위험' },
        { search: '?꾨찓??', replace: '도메인' },
        { search: '遺꾩꽍???깃납?곸쑝濡??꾨즺?섏뿀?듬땲??', replace: '분석이 성공적으로 완료되었습니다.' }
    ]
};

function repairFile(fileName) {
    const filePath = path.join(srcDir, fileName);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    const fileRepairs = repairs[fileName];

    if (fileRepairs) {
        fileRepairs.forEach(r => {
            // Global replace using split/join for safety with special chars
            content = content.split(r.search).join(r.replace);
        });
    }

    // Cleanup potential non-printable or corrupt bytes that cause Rust errors
    // We'll replace \u80-\uFF range if it seems out of place, but that's risky for Korean.
    // Instead, let's just write back the content which Node has successfully decoded as UTF8.

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Repaired ${fileName}`);
}

Object.keys(repairs).forEach(repairFile);
console.log('Repair complete.');
