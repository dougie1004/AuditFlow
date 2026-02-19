const fs = require('fs');
const content = fs.readFileSync('c:/Users/user/.gemini/antigravity/playground/AuditFlow/src/pages/AuditWorkspace.tsx', 'utf8');
const lines = content.split('\n');

let openDivs = 0;
let inReturn = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('return (')) inReturn = true;
    if (!inReturn) continue;

    const opens = (line.match(/<div/g) || []).length;
    const closes = (line.match(/<\/div>/g) || []).length;
    openDivs += opens - closes;

    if (i % 50 === 0 || i > 380 && i < 550 || i > 1050) {
        console.log(`${i + 1}: [${openDivs}] ${line.trim()}`);
    }
}
