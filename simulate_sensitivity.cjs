function calculateScore(cv, cr1, hhi) {
    const norm_cv = Math.min(cv / 2.0, 1.0);
    return Math.min(norm_cv * 0.4 + cr1 * 0.3 + hhi * 0.3, 1.0);
}

console.log(">>> [SIMULATION] Structural Score Sensitivity Analysis");
console.log("Fixed CR1=0.5, HHI=0.5");
const cvs = [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
console.log("+------+---------+");
console.log("| CV   | S-Scr   |");
console.log("+------+---------+");
cvs.forEach(cv => {
    const score = calculateScore(cv, 0.5, 0.5);
    console.log(`| ${cv.toFixed(1)}  | ${score.toFixed(4)}  |`);
});
console.log("+------+---------+");

console.log("\n>>> [INTERACTION] Risk Matrix Definition Proposal");
const matrix = [
    { A: "Low", S: "Low", Interpretation: "Clean/Safe - Routine Monitoring" },
    { A: "Low", S: "High", Interpretation: "Structural Anomaly - Policy Check (Unusual but consistent)" },
    { A: "High", S: "Low", Interpretation: "Fragmented Fraud - Individual Player Audit" },
    { A: "High", S: "High", Interpretation: "Systemic Fraud - Immediate Critical Investigation" }
];
console.table(matrix);
