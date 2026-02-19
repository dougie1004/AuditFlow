const fs = require('fs');
const content = fs.readFileSync('c:/Users/user/.gemini/antigravity/playground/AuditFlow/src/pages/AuditWorkspace.tsx', 'utf8');
const lines = content.split('\n');

let divStack = 0;
let parenStack = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const opens = (line.match(/<div/g) || []).length;
    const closes = (line.match(/<\/div>/g) || []).length;
    const pOpens = (line.match(/\(/g) || []).length;
    const pCloses = (line.match(/\)/g) || []).length;

    divStack += opens - closes;
    parenStack += pOpens - pCloses;

    if (i > 1090) {
        console.log(`${i + 1}: [Div:${divStack}] [Paren:${parenStack}] ${line.trim()}`);
    }
}
