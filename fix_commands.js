const fs = require('fs');
const path = 'src-tauri/src/commands.rs';
let content = fs.readFileSync(path, 'utf8');

// Replacement map
const fixes = [
    { search: /"message": if is_incremental \{ ".*?" \} else \{ ".*?" \}/, replace: '"message": if is_incremental { "Analyzing selected files..." } else { "Resetting and analyzing all files..." }' },
    { search: /if name\.contains\(".*?"\) \|\| name\.contains\(".*?"\) \|\| name\.contains\("regulation"\)/, replace: 'if name.contains("regulation") || name.contains("manual")' },
    { search: /if \(name\.contains\(".*?"\) \|\| name\.contains\(".*?"\) \|\| name\.contains\("employee"\)\)/, replace: 'if (name.contains("employee") || name.contains("인사"))' }
];

fixes.forEach(f => {
    content = content.replace(f.search, f.replace);
});

fs.writeFileSync(path, content, 'utf8');
