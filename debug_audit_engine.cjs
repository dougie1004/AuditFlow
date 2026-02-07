const fs = require('fs');

const filePath = 'src-tauri/src/audit_engine.rs';
const buffer = fs.readFileSync(filePath);

// Search for sequence "contains" (c=63, o=6F, n=6E, t=74, a=61, i=69, n=6E, s=73)
// Or just decode as utf8 and search
const content = buffer.toString('utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('contains')) {
        console.log(`Line ${i + 1}: ${lines[i]}`);
        // Check for suspicious chars
        if (lines[i].includes('??')) {
            console.log(`  -> SUSPICIOUS '??' found!`);
        }
        // Check for Geta mark
        if (lines[i].includes('\u3013')) {
            console.log(`  -> Geta mark found!`);
        }
    }
}
