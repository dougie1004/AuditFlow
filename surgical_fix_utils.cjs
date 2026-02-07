const fs = require('fs');

const filePath = 'src-tauri/src/file_utils.rs';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

// Line 166 (0-indexed 165)
if (lines[165].includes('Samsung') || lines[165].includes('?')) {
    lines[165] = '        "삼성전자", "LG전자", "연구소", "컨설팅", "갈비", "일식", "맛집", "가든", "식당", "병원", "약국",';
}

// Line 165
if (lines[164].includes('Office') || lines[164].includes('?')) {
    lines[164] = '        "오피스디포", "하이마트", "이마트", "홈플러스", "스타벅스", "쿠팡", "네이버", "카카오",';
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Surgical repair of file_utils.rs complete.');
