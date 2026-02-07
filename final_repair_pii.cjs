const fs = require('fs');
const path = require('path');

const srcDir = 'src-tauri/src';

const repairs = {
    'pii_config.rs': [
        { search: '二쇰?踰덊샇 - ?⑤룆?쇰줈??異⑸텇', replace: '주민번호 - 단독으로도 충분' },
        { search: '?꾪솕踰덊샇', replace: '전화번호' },
        { search: '?깅챸', replace: '성명' },
        { search: '?ъ썝踰덊샇', replace: '사원번호' },
        { search: '?곸꽭二쇱냼', replace: '상세주소' },
        { search: '遺€?쒕챸 (?⑤룆?쇰줈??PII ?꾨떂)', replace: '부서명 (단독으로는 PII 아님)' }
    ]
};

function repairFile(fileName) {
    const filePath = path.join(srcDir, fileName);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    const fileRepairs = repairs[fileName];

    if (fileRepairs) {
        fileRepairs.forEach(r => {
            content = content.split(r.search).join(r.replace);
        });
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Repaired ${fileName}`);
}

Object.keys(repairs).forEach(repairFile);
console.log('Final pass complete.');
