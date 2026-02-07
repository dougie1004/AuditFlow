const fs = require('fs');

const filePath = 'src-tauri/src/audit_engine.rs';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

let startLine = -1;
let endLine = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('// Detector A: DET_SPLIT_01')) {
        startLine = i;
    }

    // Find where Detector B ends (roughly)
    // Detector B block looks like it spans 10-15 lines.
    // Let's look for the closing brace of Detector B if possible, or just look for next block.
    if (startLine !== -1 && i > startLine) {
        if (lines[i].includes('detected_signals.push(SuspicionSignal::from_scenario(') && lines[i].includes('DET_NIGHT_01')) {
            // This is inside Detector B
        }

        // If we see the end of the detector block (usually closed by `}`)
        // And maybe the start of something else?
        // Let's rely on line count or context.
        // Detector A ~ 8 lines. Detector B ~ 10 lines.
        // Let's replace until we see "Recap" or something else, or just fixed formatting.

        // Actually, let's just target the specific corrupted lines if we can.
        // But the corruption on line 815 spans lines.

        // Let's assume Detector A starts at startLine.
        // We will rewrite Detector A and B completely given the corruption.
        if (lines[i].includes('format!("?ъ빞 鍮꾩뾽臾')) {
            // This is the corrupted line in Detector B
            endLine = i + 5; // Give some buffer to replace closing braces
        }
    }
}

// Hardcoded logic to find the closing brace of the second if block
// We will look for 2 closing braces after the startLine with some indentation
if (startLine !== -1) {
    // We will blindly replace a chunk of lines (say 25 lines) and hope we cover it?
    // Safer: Read until we find the end of the `if !row_time.is_empty()` block.
    // That block starts Detector B.

    // Let's just reconstruct the whole file section using the startLine as anchor.
    // We know what the code should be.

    // Detector A logic:
    // if row_amt >= 500_000 && ... { push }

    // Detector B logic:
    // if !row_time.is_empty() { ... }

    // We will replace from `// Detector A...` to `// End of Detectors` or just replace the known corrupted lines by matching the corrupted strings?

    // No, line 815 is `if ... {{ ...`. Replacing just that line is risky if it swallowed newline.
    // I will replace from `// Detector A` down to the line that contains `format!(... row_time, row_vendor, row_amt),` closure.

    let current = startLine;
    while (current < lines.length) {
        if (lines[current].includes('row_time, row_vendor, row_amt),')) {
            // This is likely the end of the format! call in Detector B
            // We need to include the closing `));` and `}` lines.
            endLine = current + 4;
            break;
        }
        current++;
    }
}

if (startLine !== -1 && endLine !== -1) {
    const newBlock = `            // Detector A: DET_SPLIT_01 (Textbook Baseline)
            if row_amt >= 500_000 && (row_vendor.contains("Ace") || row_vendor.contains("Club")) {
                detected_signals.push(SuspicionSignal::from_scenario(
                    "DET_SPLIT_01",
                    format!("동일 가맹점({}) - 단시간(30분 이내) 반복 결제 패턴 관측. 개별 금액 {}원", row_vendor, row_amt),
                    0.95,
                    vec![(i + 1) as i64]
                ));
            }

            // Detector B: DET_NIGHT_01 (Textbook Baseline)
            if !row_time.is_empty() {
                if let Ok(h) = row_time[0..2].parse::<i32>() {
                    if h >= 22 || h < 6 {
                        detected_signals.push(SuspicionSignal::from_scenario(
                            "DET_NIGHT_01",
                            format!("심야 비업무 시간대({}) 이용 내역 관측. 가맹점: {}, 금액: {}원", row_time, row_vendor, row_amt),
                            0.90,
                            vec![(i + 1) as i64]
                        ));
                    }
                }
            }`;

    lines.splice(startLine, endLine - startLine + 1, newBlock);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`Fixed Audit Detectors A/B in audit_engine.rs (lines ${startLine}-${endLine}).`);
} else {
    console.error('Failed to locate Detector block boundaries.');
}
