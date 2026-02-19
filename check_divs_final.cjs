const fs = require('fs');
const content = fs.readFileSync('c:/Users/user/.gemini/antigravity/playground/AuditFlow/src/pages/AuditWorkspace.tsx', 'utf8');
const lines = content.split('\n');

let openDivs = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const openTags = (line.match(/<div/g) || []).length;
    const closeTags = (line.match(/<\/div>/g) || []).length;

    openDivs += openTags - closeTags;

    if (openTags !== 0 || closeTags !== 0) {
        // console.log(`${i+1}: [${openDivs}] ${line.trim()}`);
    }
}
console.log(`Final open divs: ${openDivs}`);
