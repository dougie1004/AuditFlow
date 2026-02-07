const fs = require('fs');

const filePath = 'src-tauri/src/commands.rs';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

let replaced = 0;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('analyze_process_mining')) {
        // Next line or same line has the JSON
        if (lines[i + 1].includes('official_flow')) {
            lines[i + 1] = '    Ok(json!({ "official_flow": ["구매 요청", "본부 전결", "발주", "입고", "결제"], "shadow_flow": ["자산 선구매", "임의 사용", "사후 품의"], "violation_rate": 15.5 }))';
            replaced++;
        }
    }
}

// Also check for "fixeady" or other weird stuff
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('fixeady')) {
        console.log('Found fixready at line ' + i);
        lines[i] = lines[i].replace('fixeady', 'Ready');
        replaced++;
    }
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log(`Replaced mining flow in commands.rs. Count: ${replaced}`);
