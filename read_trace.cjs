const fs = require('fs');
const content = fs.readFileSync('c:/Users/user/.gemini/antigravity/playground/AuditFlow/div_trace.txt', 'ucs2');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('384:')) {
        for (let j = Math.max(0, i - 10); j < Math.min(lines.length, i + 100); j++) {
            console.log(lines[j]);
        }
        break;
    }
}
