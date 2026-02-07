const fs = require('fs');

const filePath = 'src-tauri/src/commands.rs';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

let found = false;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('println!(">>> [Ingestion] Loading file: {}, Total Rows: {}", path, rows.len());')) {
        // We found the line 146.
        // We need to insert total_available and row_cursor initialization after it.
        lines.splice(i + 1, 0,
            '             let total_available = rows.len();',
            '             let mut row_cursor = 0;'
        );
        console.log('Fixed commands.rs missing variable definitions at line ' + i);
        found = true;
        break;
    }
}

if (found) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
} else {
    console.log('Target line not found in commands.rs');
}
