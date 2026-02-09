use crate::domain_map::normalize_term;

/// 회계 데이터 전용 파서: 인용구(") 내부의 쉼표를 보존하며 파싱합니다. (예: "1,200,000")
pub fn parse_csv_line(line: &str) -> Vec<String> {
    if line.contains('\t') {
        return line.split('\t').map(|s| s.to_string()).collect();
    }

    let mut result = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let chars: Vec<char> = line.chars().collect();

    let mut i = 0;
    while i < chars.len() {
        match chars[i] {
            '"' => in_quotes = !in_quotes,
            ',' if !in_quotes => {
                result.push(current.trim().to_string());
                current = String::new();
            }
            _ => current.push(chars[i]),
        }
        i += 1;
    }
    // 마지막 잔여 데이터 처리
    result.push(current.trim().to_string());
    result
}

/// 특정 '금액' 관련 컬럼의 총합을 계산합니다.
pub fn calculate_total_amount(rows: &[Vec<String>], amount_idx: usize) -> f64 {
    let mut total_sum = 0.0;
    for (i, row) in rows.iter().enumerate().skip(1) {
        if row.len() > amount_idx {
            // 인용구 및 쉼표 제거 후 파싱
            let val_str = row[amount_idx].replace(',', "").replace('\"', "").replace('"', "");
            if let Ok(val) = val_str.trim().parse::<f64>() {
                total_sum += val;
            } else if !val_str.trim().is_empty() {
                if i < 5 { 
                    println!(">>> [Parser] Warning: Failed to parse amount at row {}: '{}'", i, val_str);
                }
            }
        }
    }
    total_sum
}

/// 헤더 행에서 '금액' 개념에 해당하는 컬럼 인덱스를 찾습니다.
pub fn find_amount_column(headers: &[String]) -> Option<usize> {
    for (i, h) in headers.iter().enumerate() {
        let normalized = normalize_term(h);
        if normalized == "amount" {
            println!(">>> [Parser] Determined 'amount' column: '{}' (index {})", h, i);
            return Some(i);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_complex_csv_parsing() {
        let line = "2024-01-01,\"삼성전자, 반도체\", \"1,200,500\", 비고";
        let parsed = parse_csv_line(line);
        assert_eq!(parsed.len(), 4);
        assert_eq!(parsed[1], "삼성전자, 반도체");
        assert_eq!(parsed[2], "1,200,500");
    }

    #[test]
    fn test_find_amount_column() {
        let headers = vec!["날짜".to_string(), "공급가액".to_string(), "비고".to_string()];
        assert_eq!(find_amount_column(&headers), Some(1));
    }

    #[test]
    fn test_parse_csv_line_simple() {
        let line = "2024-01-01,식대,15000,법인카드";
        let parsed = parse_csv_line(line);
        assert_eq!(parsed.len(), 4);
        assert_eq!(parsed[2], "15000");
    }

    #[test]
    fn test_find_amount_column_shorthand() {
        let headers = vec!["날짜".to_string(), "단가".to_string(), "비고".to_string()];
        assert_eq!(find_amount_column(&headers), Some(1));
    }

    #[test]
    fn test_calculate_total_amount() {
        let rows = vec![
            vec!["날짜".to_string(), "금액".to_string()],
            vec!["2024-01-01".to_string(), "1,000".to_string()],
            vec!["2024-01-02".to_string(), "2000".to_string()],
        ];
        let sum = calculate_total_amount(&rows, 1);
        assert_eq!(sum, 3000.0);
    }
}
