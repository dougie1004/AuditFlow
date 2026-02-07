const fs = require('fs');
const path = require('path');

const filePath = 'src-tauri/src/commands.rs';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Line 78 (1-indexed is 77 in 0-indexed)
if (lines[77].includes('regulation')) {
    lines[77] = '        if name.contains("규정") || name.contains("매뉴얼") || name.contains("regulation") || name.contains("manual") {';
}

// Line 98 (97 in 0-indexed)
if (lines[97].includes('employee')) {
    lines[97] = '        if (name.contains("인사") || name.contains("직원") || name.contains("employee")) && (name.ends_with(".csv") || name.ends_with(".xlsx")) {';
}

// Line 106
if (lines[105].includes('card')) {
    lines[105] = '        if n.contains("법인카드") || n.contains("card") || n.contains("거래") || n.contains("데이터") {';
}

// Line 239
if (lines[238].includes('100')) {
    lines[238] = '    app_handle.emit("analysis-progress", json!({ "progress": 100, "message": "분석이 성공적으로 완료되었습니다.", "step": 5 })).ok();';
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Line-by-line repair of commands.rs complete.');
