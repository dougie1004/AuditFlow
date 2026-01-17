
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
// Patterns to search for and block. 
// Specifically looking for direct string literals of legacy models.
const BAN_PATTERNS = [/gemini-1\.5/gi];

const SKIP_DIRS = new Set(["node_modules", "target", ".git", ".next", "dist", "build", ".tauri"]);
const SKIP_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".ico", ".pdf", ".zip", ".exe", ".dll", ".db"]);

function walk(dir, files = []) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (!SKIP_DIRS.has(ent.name)) walk(p, files);
        } else {
            if (!SKIP_EXT.has(path.extname(ent.name).toLowerCase())) files.push(p);
        }
    }
    return files;
}

let hits = [];
console.log("🔍 Scanning repository for legacy Gemini model strings...");

for (const f of walk(ROOT)) {
    // Skip this script itself
    if (f.endsWith("ban-legacy-gemini-models.mjs")) continue;

    try {
        const content = fs.readFileSync(f, "utf8");
        for (const re of BAN_PATTERNS) {
            if (re.test(content)) {
                hits.push({ file: f, pattern: String(re) });
            }
        }
    } catch (e) {
        // Ignore read errors for binary or protected files
    }
}

if (hits.length > 0) {
    console.error("❌ Error: Legacy Gemini model strings found. Build blocked to prevent regression.");
    for (const h of hits) {
        console.error(`  - ${path.relative(ROOT, h.file)} matches pattern: ${h.pattern}`);
    }
    console.error("\n💡 Please use GEMINI_MODEL_PRO and GEMINI_MODEL_FAST environment variables instead of hardcoding model names.");
    process.exit(1);
}

console.log("✅ Success: No legacy Gemini model strings found.");
process.exit(0);
