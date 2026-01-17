import fs from 'fs';
import path from 'path';

const TARGET_DIR = './src-tauri/src';
const BANNED_PATTERNS = ['gemini-1.5', 'gemini-1.0', 'gemini-pro'];
const ALLOWED_EXCEPTION = 'gemini-2.0-flash-exp';

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    let errorCount = 0;

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            errorCount += scanDirectory(fullPath);
        } else if (file.endsWith('.rs') || file.endsWith('.ts') || file.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            BANNED_PATTERNS.forEach(pattern => {
                if (content.includes(pattern)) {
                    // Check if it's already guarded or replaced in code (heuristic)
                    // But for this script, we want ZERO occurrences of raw strings
                    console.error(`[VIOLATION] Found legacy model '${pattern}' in ${fullPath}`);
                    errorCount++;
                }
            });
        }
    });
    return errorCount;
}

console.log("Starting AuditFlow AI Model Guardrail Scan...");
const errors = scanDirectory(TARGET_DIR);

if (errors > 0) {
    console.error(`\nFAILED: Found ${errors} violations. Legacy models must be removed.`);
    process.exit(1);
} else {
    console.log("\nSUCCESS: No legacy Gemini models found. System is clean.");
}
