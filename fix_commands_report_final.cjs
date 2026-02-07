const fs = require('fs');

const filePath = 'src-tauri/src/commands.rs';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

// Find the start line of the function
let startLineIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('fn generate_fallback_report(project_id: &str, findings: &[AuditIssue], high: i32, medium: i32, low: i32) -> String {')) {
        startLineIndex = i;
        break;
    }
}

if (startLineIndex === -1) {
    console.error('Could not find function start line');
    process.exit(1);
}

// Find the end line of the function (simple heuristic: look for "report" and "}" at column 0 somewhat later)
// Based on view_file, it ends around line 1024 (0-indexed 1023)
// We will look for the closing brace at the start of the line after finding "report"
let endLineIndex = -1;
for (let i = startLineIndex + 10; i < lines.length; i++) {
    if (lines[i].trim() === 'report') {
        if (lines[i + 1].trim() === '}') {
            endLineIndex = i + 1;
            break;
        }
    }
}

if (endLineIndex === -1) {
    console.error('Could not find function end line');
    // Fallback: use the known line number from previous view (approx 1024) if heuristic fails, 
    // but heuristic is safer if correct. Let's trust the structure: "    report\n}"
}

if (startLineIndex !== -1 && endLineIndex !== -1) {
    const newFunction = `fn generate_fallback_report(project_id: &str, findings: &[AuditIssue], high: i32, medium: i32, low: i32) -> String {
    let total = findings.len();
    let total_float = total as f32;
    let high_pct = if total > 0 { (high as f32 / total_float * 100.0) as i32 } else { 0 };
    let medium_pct = if total > 0 { (medium as f32 / total_float * 100.0) as i32 } else { 0 };
    let low_pct = if total > 0 { (low as f32 / total_float * 100.0) as i32 } else { 0 };

    let mut report = format!(r#"[감사/실사 결과 보고서]

[1. 요약 (Executive Summary)]

본 보고서는 {} 프로젝트에 대한 데이터 기반 추론 분석 결과를 담고 있습니다.

- 조사 대상 도출 건수: {}건
- 도출된 분포: High {}건, Medium {}건, Low {}건
- 전반적 소견: {}

[2. 조사 결과 총계]

통계:
High: {}건 ({}%)
Medium: {}건 ({}%)
Low: {}건 ({}%)
합계: {}건 (100%)

[3. 주요 발견사항 상세]

"#, 
        project_id,
        total,
        high,
        medium,
        low,
        if high > 5 { "추가 소명이 필요한 다수의 고위험 신호가 식별되었습니다." } 
        else if high > 0 { "일부 고위험 신호가 발견되었으나 일반적인 범위 내에 있습니다." }
        else { "특이 패턴은 발견되지 않았으나 지속적인 모니터링을 권고합니다." },
        high,
        high_pct,
        medium,
        medium_pct,
        low,
        low_pct,
        total
    );

    // Add detailed findings
    for (idx, finding) in findings.iter().enumerate() {
        report.push_str(&format!(
            "\\n[{}. {}]\\n??ぉ: {}\\n?몄텧?? {}\\n?몄텧: {}\\n?쒖뼵: {}\\n\\n---\\n\\n",
            (idx / 10) + 1,
            (idx % 10) + 1,
            finding.issue_title,
            finding.severity,
            finding.description,
            finding.recommendations
        ));
    }

    report.push_str(&format!(r#"
[4. 권고사항 및 가치 조정 제언]

구체적인 확인 필요 사항:
{}

단기 과제:
- 식별된 High 등급 신호에 대한 대조 확인 완료
- 관련 내부 통제 거버넌스 보완

장기 과제:
- 전사적 통합 모니터링 시스템 구축

[5. 결론]

본 조사를 통해 총 {}건의 데이터 특이점이 식별되었습니다. 특히 High 등급 {}건에 대해서는 인수 등 소명 절차를 거칠 것을 제언합니다.

보고서 작성일: {}
작성자: AuditFlow AI Engine (Fallback Mode)
"#,
        if high > 0 { "- High 등급 신호에 대한 현장 실사 및 질의\\n- 관련 소명 자료(SOP, 증빙) 확보" } else { "현재 즉시 조치가 필요한 사항은 없으나, 데이터 건전성 유지가 필요합니다." },
        total,
        high,
        chrono::Local::now().format("%Y-%m-%d").to_string()
    ));

    report
}`;

    // Replace the lines
    lines.splice(startLineIndex, endLineIndex - startLineIndex + 1, newFunction);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log('Successfully replaced generate_fallback_report function.');
} else {
    console.error('Failed to locate function boundaries.');
}
