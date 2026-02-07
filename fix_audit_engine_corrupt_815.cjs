const fs = require('fs');

const filePath = 'src-tauri/src/audit_engine.rs';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('s("?〓졊")') || (lines[i].includes('row_vendor.contains("Club"))') && lines[i].includes('{') && lines[i].includes('weit'))) {
        console.log('Found corrupted line 815 at index ' + i);
        console.log('Original: ' + lines[i]);

        // We will insert multiple lines here.
        // Since we are iterating, modifying array length is tricky.
        // We will replace the current line with the first line, and splice in the rest.

        lines[i] = '            if row_amt >= 500_000 && (row_vendor.contains("Ace") || row_vendor.contains("Club")) {';
        lines.splice(i + 1, 0,
            '                detected_signals.push(SuspicionSignal::from_scenario(',
            '                    "DET_SPLIT_01",',
            '                    format!("동일 가맹점({}) - 단시간(30분 이내) 반복 결제 패턴 관측. 개별 금액 {}원", row_vendor, row_amt),',
            '                    0.95,',
            '                    vec![(i + 1) as i64]',
            '                ));',
            '            }'
        );
        // We added 7 lines.
        // The original corrupted line was one line that seemingly mashed multiple lines.
        // If there are subsequent lines that are also garbage (like `weit >= 3`), we should check.
        // But the corrupted line ended with `weit >= 3`. It seems it was a single line holding garbage.
        // So just replacing it and inserting the rest is fine.
        break; // Stop after fixing match
    }
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Fixed audit_engine.rs line 815 corruption.');
