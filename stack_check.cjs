const fs = require('fs');
const content = fs.readFileSync('c:/Users/user/.gemini/antigravity/playground/AuditFlow/src/pages/AuditWorkspace.tsx', 'utf8');

let stack = [];
let i = 0;
while (i < content.length) {
    if (content.substr(i, 4) === '<div') {
        stack.push('div');
        i += 4;
    } else if (content.substr(i, 6) === '</div>') {
        if (stack.length === 0) {
            console.log(`Extra </div> at position ${i}`);
        } else {
            stack.pop();
        }
        i += 6;
    } else {
        i++;
    }
}
console.log(`Remaining open tags: ${stack.length}`);
