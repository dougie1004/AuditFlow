const fs = require('fs');

const filePath = 'src-tauri/src/file_utils.rs';
let content = fs.readFileSync(filePath, 'utf8');

// Simple replace
const newContent = content.replace('.with("황보")', '.starts_with("황보")')
    .replace('.with("?⑸낫")', '.starts_with("황보")');

if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Fixed file_utils.rs:98 syntax error.');
} else {
    console.log('No replacement made.');
}
