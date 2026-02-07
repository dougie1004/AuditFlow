const fs = require('fs');

const filePath = 'src-tauri/src/audit_engine.rs';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    // Detect the start of the inserted Detector A block
    if (lines[i].includes('// 3. Keyword Triggers')) {
        // The block should follow immediately.
        // It starts with `if row_amt >= 500_000 ...`
        // And ends with `})` or `}` around line i+8.

        let endBlockIndex = -1;
        // Search for the end of the block (the closing brace of the if)
        for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
            if (lines[j].trim() === '}') {
                endBlockIndex = j;
                break;
            }
        }

        if (endBlockIndex !== -1) {
            // Found the block. Replace it.
            // i is comment line
            // i+1 to endBlockIndex is the code to replace.

            // We want to KEEP line i "3. Keyword Triggers"
            // REPLACE lines i+1 to endBlockIndex with the correct logic.

            lines.splice(i + 1, endBlockIndex - i,
                '                    if row_str.contains("Advisory") || row_str.contains("Consulting") || row_str.contains("비자금") { weight += 5; }'
            );
            console.log('Fixed weighting logic at line ' + (i + 1));
            break;
        }
    }
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
