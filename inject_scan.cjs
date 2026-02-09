const fs = require('fs');

const filePath = 'src-tauri/src/commands.rs';
let content = fs.readFileSync(filePath, 'utf8');

// Insert after ingestion logic
const anchor = 'println!(">>> [Ingestion] Complete. Check Inbox.");';
if (content.includes(anchor)) {
    const replacement = `${anchor}\n    \n    // [DETERMINISTIC SCAN] Choice 2: Recover strictly limited rules (Split/Vendor)\n    crate::compliance_dd_flow::run_compliance_check_flow(target_files.clone(), &project_type, &db_path, &app_handle).await.ok();`;
    content = content.replace(anchor, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully injected deterministic scan into commands.rs');
} else {
    console.error('Anchor not found in commands.rs');
}
