use lazy_static::lazy_static;
use std::collections::HashMap;

lazy_static! {
    /// 회계 도메인 용어 정규화 맵
    /// 다양한 형태의 컬럼명을 표준 도메인 개념으로 매핑합니다.
    pub static ref ACCOUNTING_TERM_MAP: HashMap<&'static str, &'static str> = {
        let mut m = HashMap::new();
        
        // 금액 관련 용어
        m.insert("금액", "amount");
        m.insert("가격", "amount");
        m.insert("단가", "amount");
        m.insert("공급가액", "amount");
        m.insert("합계", "amount");
        m.insert("결제금액", "amount");
        m.insert("거래금액", "amount");
        m.insert("amount", "amount");
        m.insert("price", "amount");
        m.insert("total", "amount");
        m.insert("value", "amount");
        
        // 날짜 관련 용어
        m.insert("날짜", "date");
        m.insert("일자", "date");
        m.insert("거래일", "date");
        m.insert("date", "date");
        
        // 적요/내용 관련 용어
        m.insert("적요", "description");
        m.insert("내용", "description");
        m.insert("거래내역", "description");
        m.insert("품명", "description");
        m.insert("description", "description");
        m.insert("memo", "description");
        
        m
    };
}

pub fn normalize_term(term: &str) -> String {
    let clean = term.trim().to_lowercase();
    ACCOUNTING_TERM_MAP.get(clean.as_str())
        .map(|&s| s.to_string())
        .unwrap_or(clean)
}
