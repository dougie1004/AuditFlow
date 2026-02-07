const fs = require('fs');
const path = 'src-tauri/src/commands.rs';
let content = fs.readFileSync(path, 'utf8');

// Simple fix for the most broken lines
content = content.replace(/if t\.contains\("marketing"\) \|\| t\.contains\(".*?\)/g, 'if t.contains("marketing") || t.contains("마케팅")');
content = content.replace(/else if t\.contains\("sales"\) \|\| t\.contains\(".*?\)/g, 'else if t.contains("sales") || t.contains("영업")');
// ... more replacements ...

fs.writeFileSync(path, content, 'utf8');
