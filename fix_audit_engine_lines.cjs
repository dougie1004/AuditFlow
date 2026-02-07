const fs = require('fs');

const filePath = 'src-tauri/src/audit_engine.rs';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    // Line 152: store_addr logic
    if (lines[i].includes('let store_addr = if addr_idx >= 0 && p_len > addr_idx')) {
        lines[i] = '                let store_addr = if addr_idx >= 0 && p_len > addr_idx { parts[addr_idx as usize].trim().to_string() } else { "주소미상".to_string() };';
    }

    // Line 153: amt_str logic (dangerous quotes)
    if (lines[i].includes('let amt_str = parts[amt_idx as usize]')) {
        lines[i] = '                let amt_str = parts[amt_idx as usize].trim().replace(",", "").replace("원", "").replace("\\"", "");';
    }

    // Line 155: user_name logic
    if (lines[i].includes('let user_name = if user_idx >= 0 && p_len > user_idx')) {
        lines[i] = '                let user_name = if user_idx >= 0 && p_len > user_idx { parts[user_idx as usize].trim().to_string() } else { "미확인 사용자".to_string() };';
    }

    // Line 160: query_addr logic
    if (lines[i].includes('let query_addr = if store_addr ==')) {
        lines[i] = '                    let query_addr = if store_addr == "주소미상" || store_addr.is_empty() { &store_name } else { &store_addr };';
    }

    // Line 180: clean_raw with "자택 주소" (looks fine in view but verify)
    if (lines[i].includes('let clean_raw = format!') && lines[i].includes('date_str')) {
        // Just enforce clean line to be sure
        if (lines[i].includes('"?먰깮 二쇱냼"')) {
            lines[i] = lines[i].replace('"?먰깮 二쇱냼"', '"자택 주소"');
        }
    }
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Fixed audit_engine.rs critical logic lines.');
