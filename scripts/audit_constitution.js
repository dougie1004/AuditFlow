import fs from 'fs';
import path from 'path';

const FORBIDDEN_LITERALS = [
    '15420',
    'TEMP_VALUE'
];

const FORBIDDEN_PATTERNS = [
    /\.unwrap_or_default\(\)/,
    /\.unwrap_or\((['"])[^'"]+\1\)/,
];

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let violations = [];

    lines.forEach((line, index) => {
        if (line.trim().startsWith('//') || line.includes('ALLOW_MOCK')) return;

        // 1. Literal Check (Must be quoted to count as a hardcoded value)
        FORBIDDEN_LITERALS.forEach(lit => {
            if (line.includes(`"${lit}"`)) {
                violations.push(`Line ${index + 1}: Forbidden literal found: "${lit}"`);
            }
        });

        // 2. Pattern Check (Focus on critical business fields)
        FORBIDDEN_PATTERNS.forEach(pattern => {
            if (pattern.test(line)) {
                const isCritical = ['amount', 'severity', 'title', 'id', 'user', 'project', 'audit'].some(f => line.toLowerCase().includes(f));
                if (isCritical) {
                    violations.push(`Line ${index + 1}: Forbidden pattern found: ${pattern}`);
                }
            }
        });
    });

    return violations;
}

function runAudit() {
    const srcDir = path.resolve('src-tauri/src');
    const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.rs'));
    let totalViolations = 0;

    files.forEach(file => {
        if (file === 'constitution.rs' || file === 'audit_constitution.js') return;
        const filePath = path.join(srcDir, file);
        const violations = checkFile(filePath);
        if (violations.length > 0) {
            console.error(`\n[CONSTITUTIONAL VIOLATION] In ${file}:`);
            violations.forEach(v => console.error(`  - ${v}`));
            totalViolations += violations.length;
        }
    });

    if (totalViolations > 0) {
        console.error(`\nTotal violations found: ${totalViolations}`);
        process.exit(1);
    } else {
        console.log('Constitutional check passed. No forbidden patterns detected.');
        process.exit(0);
    }
}

runAudit();
