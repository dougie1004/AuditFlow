const fs = require('fs');

const filePath = 'src-tauri/src/audit_engine.rs';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('ns("')) {
        console.log(`Line ${i + 1}: ${lines[i]}`);
    }
    if (lines[i].includes('ns (')) {
        console.log(`Line ${i + 1}: ${lines[i]}`);
    }
    // Check for broken "contains"
    if (lines[i].includes('contai') && !lines[i].includes('contains')) {
        console.log(`Line ${i + 1} (broken contains?): ${lines[i]}`);
    }
}
