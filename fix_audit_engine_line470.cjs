const fs = require('fs');

const filePath = 'src-tauri/src/audit_engine.rs';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('candidate_rows.join("\\n")')) {
        console.log('Found problematic line 470 at index ' + i);
        console.log('Original content:', lines[i]);
        // Replace with clean version, removing any trailing garbage comment
        lines[i] = '                let mut chunk_data = candidate_rows.join("\\n");';
    }
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Cleaned line 470 in audit_engine.rs');
