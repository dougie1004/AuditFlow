use std::path::Path;
use std::fs;
use calamine::{Reader, open_workbook_auto};

/// 파일을 로드하고 기본적인 유효성을 검증합니다. (원칙 1, 2, 4 준수)
pub fn load_file_rows(path_str: &str) -> Result<Vec<Vec<String>>, String> {
    let path = Path::new(path_str);
    if !path.exists() {
        return Err(format!("File not found: {}", path_str));
    }

    let file_size = fs::metadata(path).map(|m| m.len()).unwrap_or(0);
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    
    let mut all_rows = Vec::new();

    if ext == "xlsx" || ext == "xls" {
        println!(">>> [FileLoader] Detected Excel format. Parsing workbook...");
        if let Ok(mut workbook) = open_workbook_auto(path) {
            if let Some(Ok(range)) = workbook.worksheet_range_at(0) {
                for row in range.rows() {
                    let row_vec: Vec<String> = row.iter().map(|c| c.to_string()).collect();
                    all_rows.push(row_vec);
                }
            }
        }
    } else {
        // text/csv 계열 처리
        println!(">>> [FileLoader] Detected text/csv format. Checking encoding...");
        
        // 원칙 4: 인코딩 판별 근거 로깅
        let content = crate::file_utils::read_file_with_encoding(path)
            .map_err(|e| format!("Encoding Error: {}", e))?;
        
        // 간단한 인코딩 확인 로그 (UTF-8 vs EUC-KR)
        let is_utf8 = std::fs::read(path).map(|b| std::str::from_utf8(&b).is_ok()).unwrap_or(false);
        println!(">>> [FileLoader] Encoding assumed: {}", if is_utf8 { "UTF-8" } else { "EUC-KR (Fallback)" });

        for line in content.lines() {
            if !line.trim().is_empty() {
                all_rows.push(crate::parser::parse_csv_line(line));
            }
        }
    }

    // 원칙 2: Fail-Safe Entry 검증
    if file_size > 0 && all_rows.is_empty() {
        return Err(format!(
            "CRITICAL: File size is {} bytes but 0 rows were parsed. Engine failure or corrupted data assumed at: {}", 
            file_size, path_str
        ));
    }

    println!(">>> [FileLoader] Success: {} rows loaded from {}", all_rows.len(), path_str);
    if !all_rows.is_empty() {
        println!(">>> [FileLoader] Header Preview: {:?}", all_rows[0]);
    }

    Ok(all_rows)
}
