const fs = require('fs');

const filePath = 'src-tauri/src/audit_engine.rs';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    // 137: "승인일) -> "승인일")
    if (lines[i].includes('h.contains("승인일)')) {
        lines[i] = lines[i].replace('h.contains("승인일)', 'h.contains("승인일")');
    }
    // 139: "승인금액) -> "승인금액")
    if (lines[i].includes('h.contains("승인금액)')) {
        lines[i] = lines[i].replace('h.contains("승인금액)', 'h.contains("승인금액")');
    }
    // 140: "사용자), "소유자)
    if (lines[i].includes('h.contains("사용자)')) {
        lines[i] = lines[i].replace('h.contains("사용자)', 'h.contains("사용자")');
    }
    if (lines[i].includes('h.contains("소유자)')) {
        lines[i] = lines[i].replace('h.contains("소유자)', 'h.contains("소유자")');
    }
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
