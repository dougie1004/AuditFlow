const fs = require('fs');

const filePath = 'src-tauri/src/audit_engine.rs';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

let startLineIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('// Rule A: Home Vicinity')) {
        startLineIndex = i;
        break;
    }
}

let endLineIndex = -1;
if (startLineIndex !== -1) {
    for (let i = startLineIndex; i < lines.length; i++) {
        // Look for the Ok(()) that closes the function run_specialized_card_rules
        // It should be followed by a closing brace for the function on next line or same line logic
        if (lines[i].trim() === 'Ok(())') {
            endLineIndex = i;
            break;
        }
    }
}

if (startLineIndex !== -1 && endLineIndex !== -1) {
    const newBlock = `                    // Rule A: Home Vicinity
                    if let Some(home_coords) = emp_home_map.get(&user_name) {
                        let dist = calculate_distance(home_coords.0, home_coords.1, lat, lng);
                        if dist < 1.0 {
                            let (hl, hg) = home_coords;
                            let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
                            let clean_raw = format!("{}|{}|{}|{}|{}|{}|{}|{}|{}|{}", date_str, store_name, store_addr, amount, user_name, lat, lng, hl, hg, "자택 주소");
                            let _ = conn.execute(
                                "INSERT INTO audit_issues (project_type, issue_title, description, severity, raw_row_data, row_index, recommendations, evidence_quote, audit_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)", 
                                params![&project_type, "[Rule A] 자택 인근 사용", format!("거주지 반경 {:.2}km 이내 결제 포착", dist), "High", clean_raw, i as i64, "업무 관련성 소명 요청", store_addr, &project_type]
                            );
                        }
                    }
                    transactions.push((store_name, date_str, amount, i, store_addr, user_name, lat, lng));
                }
            }
        }
    }

    // Rule B: Split Payment
    let mut map: std::collections::HashMap<(String, String), (i64, f64, f64, String, String)> = std::collections::HashMap::new();
    for (store, date, amt, _idx, addr, user, lat, lng) in &transactions {
        let day = if date.len() >= 10 { &date[0..10] } else { date };
        let entry = map.entry((store.clone(), day.to_string())).or_insert((0, *lat, *lng, addr.clone(), user.clone()));
        entry.0 += amt;
    }
    
    for ((store, day), (total, lat, lng, s_addr, s_user)) in map {
        if total >= 100000 {
            let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
            let clean_raw = format!("{}|{}|{}|{}|{}|{}|{}", day, store, s_addr, total, s_user, lat, lng);
            let _ = conn.execute(
                "INSERT INTO audit_issues (project_type, issue_title, description, severity, raw_row_data, row_index, recommendations, evidence_quote, audit_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)", 
                params![&project_type, "[Critical] 분할 결제 의심(Split Payment)", format!("동일 가맹점({}) 단시간 내 의심 쪼개기 징후 (합산 {})", store, total), "High", clean_raw, 0, "상세 영수증 및 결제 사유 제출 요청", "N/A", &project_type]
            );
        }
    }

    Ok(())`;

    lines.splice(startLineIndex, endLineIndex - startLineIndex + 1, newBlock);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log('Successfully replaced audit_engine.rs rules block.');
} else {
    console.error('Failed to locate Rule A start or Ok(()) end.');
}
