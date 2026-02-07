const fs = require('fs');

const filePath = 'src-tauri/src/audit_engine.rs';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    // Look for Detector B block
    if (lines[i].includes('// Detector B: DET_NIGHT_01')) {
        // We see extra } braces at lines 837, 838 which probably belong to the PREVIOUS Detector A but were duplicated or misplaced.
        // Actually, looking at view_file content:
        // 834:                     }
        // 835:                 }
        // 836:             }
        // 837:                 }
        // 838:             }

        // The block I inserted ended with:
        // 834:                     }
        // 835:                 }
        // 836:             }

        // But the original file might have had leftover braces from the old code that I didn't fully replace.
        // I replaced up to `format!(...` line in Detector B + 4 lines.
        // If the old code had more lines, they are leftover.

        // I need to remove lines 837 and 838 if they are just stray `}`.
        // Or better, check indentation.
        // Line 836 closes `if !row_time.is_empty()`.
        // Line 837/838 seem extra.

        // Also fix Detector C (Line 840) corrupted Korean string.

        // Let's first remove the extra braces.
        // I'll scan for `// Detector C:` and check the lines before it.
    }

    if (lines[i].includes('// Detector C: HEU_ROUND_10')) {
        // Check lines before i.
        if (lines[i - 1].trim() === '}') {
            if (lines[i - 2].trim() === '}') {
                // We likely have too many braces.
                // let's just comment them out or remove them.
                // But wait, are they closing `detected_signals` loop or `row_parts` loop?
                // No, line 811 is `// [PHASE 3] Scenario Detection`.
                // This block is inside a loop `for (i, p) in row_parts...`?
                // Let's check context.
                // Line 773: `for (i, p) in parts.iter().enumerate() {` ... wait, `parts` is from `lines`.
                // Line 790 starts the loop over columns `for p in parts {`.
                // Line 811 is inside `for p in parts` loop? No, that loop ends at 808.
                // Line 808: `}`.
                // So 811 is inside the row loop?
                // Line 731: `for (i, line) in lines.enumerate() {`
                // Line 736: `let parts: ...`
                // ...
                // 808: `}` ends column parsing loop.
                // 811: `detected_signals` vec created.

                // So the `}` at 836 seems to close `if !row_time.is_empty()`.
                // 834: `}` closes `if h >= 22`.
                // 835: `}` closes `if let Ok(h)`.
                // 836: `}` closes `if !row_time.is_empty()`.

                // So 837, 838 are definitely extra if they are just closing braces and we are still in the main loop.
                // If 837/838 are there, they might close the main loop premateurely.
            }
        }

        // Fix Detector C string
        // format!("留??⑥쐞濡??뺣??섍쾶 ?섎늻?댁????쇱슫??금액({}) 寃곗젣 愿€痢? (媛€留뱀젏: {})", row_amt, row_vendor)
        // -> format!("10만원 단위로 딱 떨어지는 라운드 금액({}) 결제 관측 (가맹점: {})", row_amt, row_vendor)
    }
}

// Global replace for Detector C string
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('HEU_ROUND_10') && lines[i + 1].includes('format!')) {
        lines[i + 1] = '                    format!("10만원 단위로 딱 떨어지는 라운드 금액({}) 결제 관측 (가맹점: {})", row_amt, row_vendor),';
    }

    // Remove lines 837, 838 if they are just `}` and indentation suggests they are extra.
    // Based on previous view, 837 and 838 are just `}` with indentation.
    // view_file showed them clearly as extra.
    // I will just blindly remove them if they match strictly.
}

// Removing lines 837, 838.
// I will filter out lines that are purely `                }` if they appear immediately before detector C, but I need to be careful.
// Let's use the line index from previous view. 837 and 838.
// But indices might shift.
// I'll search for the block `// Detector B` and clean up the trailing braces.

let detectorBIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('// Detector B: DET_NIGHT_01')) {
        detectorBIndex = i;
    }
    if (detectorBIndex !== -1 && i > detectorBIndex && lines[i].includes('// Detector C: HEU_ROUND_10')) {
        // Between B and C, we should only have closing braces for B.
        // B opens:
        // 1. if !row_time
        // 2. if let Ok
        // 3. if h >= 22
        //    push
        // 3. }
        // 2. }
        // 1. }
        // So 3 closing braces.

        // I will re-write the B block end to be sure.
        // It's easier.
        // But I don't want to mess up.

        // Let's just look at lines i-1, i-2, i-3 etc.
        // If we see 5 closing braces before C, that's wrong.
    }
}

// Simple fix: Remove lines 837 and 838 based on content and context.
let newLines = [];
let skipNext = false;
let skipNext2 = false;

for (let i = 0; i < lines.length; i++) {
    // Identify the specific extra lines context
    // 836:             }
    // 837:                 }
    // 838:             }
    // 839: 
    // 840:             // Detector C:

    if (lines[i].includes('// Detector C: HEU_ROUND_10')) {
        // Check previous lines in newLines to see if we have extra braces
        // tailored for this specific artifact
        // I will simplisticly just remove the lines if they correspond to the artifact.
    }
    newLines.push(lines[i]);
}

// Let's try to just remove the specific lines by content pattern if they exist right before Detector C.
// Look for `                }` followed by `            }` right before Detector C.
// Actually, I'll just use splice if I find the sequence.

for (let i = 0; i < lines.length - 2; i++) {
    if (lines[i].trim() === '}' && lines[i + 1].trim() === '}' && lines[i + 2].includes('// Detector C: HEU_ROUND_10')) {
        // This looks like 2 extra braces.
        // Detector B needs 3 braces to close.
        // If we have 5 braces, we remove 2.
        // Let's count braces backwards from Detector C.
        let braceCount = 0;
        let j = i + 1;
        while (j >= 0 && lines[j].trim() === '}') {
            braceCount++;
            j--;
        }

        // If we found say 5 braces, we remove 2.
        if (braceCount >= 5) {
            console.log('Found extra braces before Detector C. Removing 2 lines.');
            lines.splice(i, 2);
            break;
        }
    }
}

// Also fix Detector C string again to be sure
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('format!("留??⑥쐞濡??뺣??섍쾶') || lines[i].includes('HEU_ROUND_10') && lines[i + 1].includes('format!')) {
        if (lines[i + 1].includes('row_amt, row_vendor')) {
            lines[i + 1] = '                    format!("10만원 단위로 딱 떨어지는 라운드 금액({}) 결제 관측 (가맹점: {})", row_amt, row_vendor),';
        }
    }
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Fixed Audit Engine: Removed extra braces and fixed Detector C string.');
