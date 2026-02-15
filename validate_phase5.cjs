const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.env.APPDATA, 'AuditFlow', 'audit_data_v4.db');
const db = new sqlite3.Database(dbPath);

console.log(">>> Validating Phase 5: Contextual Event Expansion");

db.serialize(() => {
    // 1. Insert mock email event directly to simulate ingestion
    const emailId = 'MOCK_EMAIL_001';
    db.run(`INSERT INTO entity_event (id, entity_id, event_type, event_date, description, source_object_id, source_type, metadata) 
            VALUES (?, 'SYSTEM_CONTEXT', 'COMMUNICATION', datetime('now'), 'Mock Email for Phase 5 Validation', 'MOCK_OBJ_EMAIL', 'EMAIL', ?)`,
        [emailId, JSON.stringify({ subject: 'Phase 5 Test', sender: 'tester@audit.com' })], (err) => {
            if (err) console.error("Error inserting mock email:", err.message);
            else console.log("Successfully inserted mock EMAIL event.");
        });

    // 2. Check if it exists
    db.get("SELECT source_type, event_type FROM entity_event WHERE id = ?", [emailId], (err, row) => {
        if (err) console.error(err.message);
        console.log("Verified store state:", row);
    });

    // 3. Confirm context_signal table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='context_signal'", (err, row) => {
        if (err) console.error(err.message);
        if (row) console.log("Confirmed context_signal table exists.");
        else console.error("context_signal table NOT FOUND.");
    });
});

db.close();
