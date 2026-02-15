const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.env.APPDATA, 'AuditFlow', 'audit_data_v4.db');
if (!fs.existsSync(dbPath)) {
    console.log("Database not found at expected path.");
    process.exit(0);
}

const db = new sqlite3.Database(dbPath);

console.log(">>> Checking AuditFlow Health & Phase 4/5/6 Results");

db.serialize(() => {
    // 1. Check Year Profile (Phase 4)
    db.all("SELECT * FROM account_year_profile LIMIT 5", (err, rows) => {
        if (err) console.error("Error checked account_year_profile:", err.message);
        else {
            console.log("--- Account Year Profile (Phase 4) ---");
            console.table(rows);
        }
    });

    // 2. Check Risk Signals (Phase 2/4/6)
    db.all("SELECT signal_type, COUNT(*) as count FROM risk_signal GROUP BY signal_type", (err, rows) => {
        if (err) console.error("Error checking risk signals:", err.message);
        else {
            console.log("--- Risk Signal Summary ---");
            console.table(rows);
        }
    });

    // 3. Check Contextual Events (Phase 5)
    db.get("SELECT COUNT(*) as count FROM entity_event WHERE source_type IN ('EMAIL', 'DOC')", (err, row) => {
        if (err) console.error(err.message);
        else console.log(`--- Contextual Events (Phase 5): ${row.count} entries ---`);
    });
});

db.close();
