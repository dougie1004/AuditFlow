const fs = require('fs');
const path = require('path');

const appData = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + "/.local/share");
const dbPath = path.join(appData, 'com.auditflow.app', 'audit_data_v4.db');

console.log(`>>> [DB RESET] Target Database: ${dbPath}`);

if (fs.existsSync(dbPath)) {
    try {
        fs.unlinkSync(dbPath);
        console.log(">>> [SUCCESS] Database file deleted. The application will create a fresh one on next launch.");
    } catch (e) {
        console.error(">>> [ERROR] Failed to delete database:", e);
    }
} else {
    console.log(">>> [INFO] Database file does not exist. Nothing to delete.");
}
