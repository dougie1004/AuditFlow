const fs = require('fs');

const filePath = 'src-tauri/src/audit_engine.rs';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

// Target lines 837 and 838 (1-based) -> indices 836 and 837
// Check content to be safe.
if (lines.length > 838) {
    console.log('Line 837: ' + lines[836]);
    console.log('Line 838: ' + lines[837]);

    if (lines[836].trim() === '}' && lines[837].trim() === '}') {
        console.log('Removing extra braces at 837, 838');
        lines.splice(836, 2);
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
        console.log('Success.');
    } else {
        console.log('Lines do not match expected simple braces. Checking nearby.');
        // Fallback search around 830-850
        for (let i = 830; i < 850; i++) {
            if (lines[i].includes('// Detector C: HEU_ROUND_10')) {
                // Check 2 lines before
                if (lines[i - 1].trim() === '}' && lines[i - 2].trim() === '}') {
                    console.log('Found extra braces before Detector C at ' + (i - 2));
                    lines.splice(i - 2, 2);
                    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
                    console.log('Success (fallback).');
                    break;
                }
            }
        }
    }
}
