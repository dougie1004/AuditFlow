use tauri::AppHandle;
use tauri::Manager;
use rusqlite::{params, Connection};

pub fn initialize_database(app_handle: &AppHandle) -> Result<(), String> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    if !app_dir.exists() { std::fs::create_dir_all(&app_dir).ok(); }
    
    let db_path = app_dir.join("audit_data_v4.db");
    let mut conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // 파일 메타데이터 테이블
    conn.execute(
        "CREATE TABLE IF NOT EXISTS audit_data (id INTEGER PRIMARY KEY, project_type TEXT NOT NULL, file_name TEXT NOT NULL, file_type TEXT NOT NULL, file_path TEXT NOT NULL, upload_date TEXT DEFAULT CURRENT_TIMESTAMP)", 
        params![]
    ).map_err(|e| e.to_string())?;

    // 발견된 이슈 테이블
    conn.execute(
        "CREATE TABLE IF NOT EXISTS audit_issues (
            id INTEGER PRIMARY KEY, 
            project_type TEXT NOT NULL, 
            issue_title TEXT NOT NULL, 
            description TEXT NOT NULL, 
            severity TEXT NOT NULL, 
            raw_row_data TEXT, 
            row_index INTEGER, 
            recommendations TEXT,
            evidence_quote TEXT,
            audit_id TEXT,
            evidence_image TEXT,
            status TEXT DEFAULT 'Open',
            assignee TEXT,
            due_date TEXT,
            remediation_plan TEXT,
            manager_comment TEXT,
            detected_at TEXT DEFAULT CURRENT_TIMESTAMP
        )", 
        params![]
    ).map_err(|e| e.to_string())?;

    let _ = conn.execute("ALTER TABLE audit_issues ADD COLUMN recommendations TEXT", params![]);
    let _ = conn.execute("ALTER TABLE audit_issues ADD COLUMN evidence_quote TEXT", params![]);
    let _ = conn.execute("ALTER TABLE audit_issues ADD COLUMN audit_id TEXT", params![]);
    let _ = conn.execute("ALTER TABLE audit_issues ADD COLUMN evidence_image TEXT", params![]);
    let _ = conn.execute("ALTER TABLE audit_issues ADD COLUMN status TEXT DEFAULT 'Open'", params![]);
    let _ = conn.execute("ALTER TABLE audit_issues ADD COLUMN assignee TEXT", params![]);
    let _ = conn.execute("ALTER TABLE audit_issues ADD COLUMN due_date TEXT", params![]);
    let _ = conn.execute("ALTER TABLE audit_issues ADD COLUMN remediation_plan TEXT", params![]);
    let _ = conn.execute("ALTER TABLE audit_issues ADD COLUMN manager_comment TEXT", params![]);

    // 1. Audit Projects (Renovated for Command Center)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS audit_projects (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            status TEXT NOT NULL,
            progress_pct INTEGER DEFAULT 0,
            start_date TEXT,
            end_date TEXT,
            lead_auditor TEXT,
            risk_score INTEGER DEFAULT 0,
            findings_count INTEGER DEFAULT 0,
            planning_start TEXT,
            planning_end TEXT,
            fieldwork_start TEXT,
            fieldwork_end TEXT,
            reporting_start TEXT,
            reporting_end TEXT,
            audit_scope TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )",
        params![]
    ).map_err(|e| e.to_string())?;
    
    // Migration: Add created_at to audit_projects if missing
    let _ = conn.execute("ALTER TABLE audit_projects ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP", params![]);

    // 2. Audit Findings (Structured Issue Tracking)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS audit_findings (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            entity_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            severity TEXT NOT NULL,
            status TEXT DEFAULT 'Open',
            detected_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(project_id) REFERENCES audit_projects(id),
            FOREIGN KEY(entity_id) REFERENCES audit_universe(id)
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    // 3. System Events (AI Feed Intelligence)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS system_events (
            id TEXT PRIMARY KEY,
            timestamp TEXT DEFAULT (datetime('now','localtime')),
            event_type TEXT NOT NULL,
            description TEXT NOT NULL,
            related_entity_id INTEGER,
            audit_id TEXT
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    let _ = conn.execute("ALTER TABLE system_events ADD COLUMN audit_id TEXT", params![]);

    // Seed Initial Anchor Projects - DISABLED for ZERO-BASE
    /* 
    let _ = conn.execute("INSERT OR IGNORE INTO audit_projects (id, title, status, progress_pct, start_date, end_date, lead_auditor) VALUES 
        ('proj-01', 'FY2025 Global Revenue Recognition Review', 'Fieldwork', 35, '2025-01-05', '2025-04-30', 'Audit Lead'),
        ('proj-02', 'Strategic Vendor Risk Assessment', 'Planning', 10, '2025-02-01', '2025-06-15', 'Unassigned'),
        ('proj-03', 'Compliance Monitoring: Vietnam Operations', 'Reporting', 95, '2024-11-01', '2025-01-20', 'Compliance Officer')", 
    params![]);

    let _ = conn.execute("INSERT OR IGNORE INTO system_events (id, event_type, description) VALUES 
        ('evt-anchor-1', 'SYSTEM_INFO', '📡 AuditFlow Intelligence Engine Online. Monitoring real-time anomalies.')",
    params![]);
    */

    // 사용자 추가 시나리오 테이블
    conn.execute(
        "CREATE TABLE IF NOT EXISTS custom_scenarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            category TEXT NOT NULL, 
            name TEXT NOT NULL, 
            risk_level TEXT NOT NULL, 
            description TEXT NOT NULL, 
            origin_audit_type TEXT, 
            origin_department TEXT, 
            is_ai_generated INTEGER DEFAULT 0,
            detected_date TEXT DEFAULT CURRENT_TIMESTAMP
        )", 
        params![]
    ).map_err(|e| e.to_string())?;
    
    let _ = conn.execute("ALTER TABLE custom_scenarios ADD COLUMN is_ai_generated INTEGER DEFAULT 0", params![]);

    // 연간 감사 계획 테이블
    conn.execute(
        "CREATE TABLE IF NOT EXISTS audit_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year INTEGER NOT NULL,
            audit_domain TEXT NOT NULL,
            risk_score INTEGER DEFAULT 3,
            strategic_importance TEXT DEFAULT 'Medium',
            resource_days INTEGER DEFAULT 0,
            status TEXT DEFAULT 'Draft',
            description TEXT
        )",
        params![]
    ).map_err(|e| e.to_string())?;

    // Audit Universe 테이블
    conn.execute("DROP TABLE IF EXISTS audit_universe", params![]).map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS audit_universe (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            unit_name TEXT NOT NULL,
            category TEXT NOT NULL,
            impact_score INTEGER DEFAULT 0,
            likelihood_score INTEGER DEFAULT 0,
            last_audit_year INTEGER DEFAULT 2024,
            budget_size TEXT DEFAULT 'N/A',
            headcount INTEGER DEFAULT 0,
            last_audit_rating TEXT DEFAULT 'Not Rated',
            key_systems TEXT DEFAULT 'None',
            ai_analysis_data TEXT
        )",
        params![]
    ).map_err(|e| e.to_string())?;


    seed_master_scenarios(&mut conn).ok();
    
    // Run modular adaptive seeder with dynamic column mapping - DISABLED for ZERO-BASE
    // AuditUniverseSeeder::seed(&mut conn).ok();

    Ok(())
}


pub fn seed_master_scenarios(conn: &mut Connection) -> Result<(), String> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM custom_scenarios WHERE origin_audit_type = '시스템 마스터'", [], |r| r.get(0)).unwrap_or(0);
    if count >= 90 { return Ok(()); }
    
    // Clear existing system master records to avoid duplicates during partial re-seed
    let _ = conn.execute("DELETE FROM custom_scenarios WHERE origin_audit_type = '시스템 마스터'", []);

    let mut scenarios = Vec::new();

    // --- Category A: 법인카드/비용 (EXP) - 30 items ---
    let exp = vec![
        ("법인카드 분할 결제 의심", "High", "동일 가맹점, 동일 날짜, 10분 이내 연속 결제 건 탐지. 전결 규정 회피 및 접대비 한도 우회 의심."),
        ("휴일/심야 시간대 사적 사용", "Medium", "공휴일 또는 23시 이후 주점, 마트 등 업무 외 시간대 결제 내역 추출."),
        ("원거리 가맹점 결제 (출장 미등록)", "High", "근무지 또는 주거지 반경 50km 외부 결제이나 출장 신청 기록이 없는 사례."),
        ("상품권 대량 구매 및 현금화 의심", "High", "백화점, 대형마트 등에서 상품권 성격의 고액 결제 반복 발생."),
        ("동일 일자 인근 가맹점 중복 결제", "Medium", "식사 후 인근 카페 또는 마트에서 짧은 간격으로 결제하여 소액 횡령 의심."),
        ("유가증권 및 고가 사치품 구매", "High", "귀금속, 명품 매장, 면세점 등 법인카드 정책 위반 가맹점 이용."),
        ("취소 전표 발생 후 재결제 미발생", "High", "결제 취소 후 실제 환급 여부와 장부상 잔액 불일치 패턴."),
        ("동일 메뉴/인원 대비 단가 과다", "Medium", "통상적인 식대 기준(인당 3만원)을 초과하는 고가 일식/중식당 이용."),
        ("개인 차량 주유비 중복 청구", "Medium", "법인 차량 외 개인 소유 차량에 대한 주유비 반복 청구."),
        ("온라인 쇼핑몰 개인 물품 구매", "High", "쿠팡, 네이버페이 등 온라인 쇼핑몰에서 배송지가 주거지인 내역."),
        ("학원/교육비 사적 이용", "Low", "직무와 무관한 어학원, 예체능 학원 등 개인 자기개발비 전용."),
        ("항공권/호텔 취소 환불금 개인 수령", "High", "법인 결제 후 취소 시 환불금이 개인 계좌로 입금되도록 조작."),
        ("가공 가맹점(위장 부당업소) 결제", "High", "간판과 사업자 등록 종목이 다른 유흥업소 계열의 위장 가맹점 이용."),
        ("골프장 및 관련 시설 이용", "Medium", "주말 또는 주중 근무시간 내 골프장, 골프연습장 이용 내역."),
        ("가족 명의 식당 등 이해관계자 거래", "High", "임직원 친인척이 운영하는 가맹점에서의 반복적인 비용 집행."),
        ("해외 원격지 현지 통화 결제 (해외출장 미등록)", "High", "국내 근무 중인 인원의 해외 지역 현지 통화 결제 발생."),
        ("하이패스/통행료 허위 청구", "Low", "실제 이동 경로와 상이한 통행료 이력 매칭."),
        ("택시비 중복 청구 (법인택시 플랫폼)", "Low", "법인 계정 이용 후 별도 영수증으로 이중 청구."),
        ("업무추진비 대상자 중복 기재", "Medium", "동일 장소에서 결제 시 참석자를 여러 부서 인원으로 허위 기재."),
        ("고액 접대비 사후 정산 미흡", "Medium", "고액 집행 건에 대한 상세 보고서 및 영수증 증빙 누락."),
        ("의료기기 및 건강기능식품 구매", "Low", "약국, 병원 등 개인 의료비 성격의 지출."),
        ("통신비/인터넷 요금 개인 대납", "Low", "개인 명의 요금제를 법인 비용으로 자동이체 처리."),
        ("가구 및 인테리어 소품 매입", "Medium", "사무실 비치 목적이 아닌 개인 주거용 가구 매입 의심."),
        ("배달 앱 대량 주문 (사적 모임)", "Medium", "야근 목적이 아닌 주말 시간대 대량 배달 음식 주문."),
        ("반복적인 소액 현금 영수증 발행", "Low", "법인카드 외 현금 결제 후 자사 사업자로 현금영수증 발행 유도."),
        ("동일 거래처에 대한 정기적 고액 송금", "High", "증빙 없는 서비스 피(Fee) 성격의 고액 정기 집행."),
        ("회의비 명목의 사적 식사", "Medium", "단일 인원의 식사를 회의비로 분산 처리."),
        ("포인트/마일리지 개인 적립", "Low", "법인 비용 집행 시 발생하는 포인트를 개인 계단으로 적립."),
        ("상품권 실물 관리 대장 불일치", "High", "구매 이력은 있으나 배부 처 및 재고가 확인되지 않는 경우."),
        ("연간 한도 임박 시 집중 집행 (Spending Spree)", "Medium", "회계연도 말 예산 소진 목적의 불필요한 비용 집행.")
    ];
    for (name, risk, desc) in exp {
        scenarios.push(("EXP", name, risk, desc));
    }

    // --- Category B: 인사/급여 (HR) - 20 items ---
    let hr = vec![
        ("퇴사자 급여 지속 지급 (Ghost Employee)", "High", "퇴사 처리된 인원에게 퇴사일 이후 급여가 이체되는 패턴."),
        ("신규 입사자 허위 등록 (가족 명의)", "High", "실제 근무하지 않는 임직원의 가족을 명부상 등록하여 급여 수령."),
        ("초과근무 수당 허위 신청 (부당 수령)", "Medium", "출퇴근 기록과 초과근무 신청 내역 간 불일치(Badge log 매칭)."),
        ("근속 연수 조작을 통한 퇴직금 과다 산정", "High", "입사일을 임의로 앞당겨 퇴직금을 부풀리는 조작."),
        ("비가세 수당 요건 미충족 지급", "Low", "차량유지비, 식대 등 비과세 요건 미달 인원에 대한 일괄 적용."),
        ("임직원 대출금 상환 연체 방치", "Medium", "사내 대출 이자 및 원금 상환이 이루어지지 않음에도 조치 미흡."),
        ("연차 휴가 보상금 허위 청구", "Medium", "실제 연차 소진일과 시스템상 잔여 연차 기록 불일치."),
        ("임금 피크제 적용 누락 및 과다 지급", "Low", "대상 연령 도달 시 급여 삭감이 이루어지지 않는 오류."),
        ("인센티브 산정 실적 데이터 부풀리기", "High", "성과급 계산의 기초가 되는 영업 실적의 임의 조작."),
        ("사대보험 상실 신고 지연 및 보험료 과부담", "Low", "퇴사자 명단을 공단에 늦게 신고하여 발생하는 비용 손실."),
        ("사내 교육 훈련비 개인 편취", "Medium", "외부 교육 미이수 후 위조 영수증으로 교육비 환급."),
        ("채용 청탁 및 면접 점수 사후 수정", "High", "특정 후보자의 합격을 위해 평가 점수를 사후에 변경한 흔적."),
        ("중도 입사자 일할 계산 오류", "Low", "입사 일자별 급여 산정 로직 오류로 인한 과다 지급."),
        ("장기 근속 포상금 중복 수령", "Low", "포상 이력을 관리하지 않아 동일 인물에게 재지급."),
        ("파견 근로자 인건비 이중 청구", "High", "파견 업체와 담합하여 실제 투입 인원보다 많은 비용 청구."),
        ("승진 누락자에 대한 위로금 명목 가공 지급", "Medium", "정식 절차 없는 가공 수당 지급으로 사규 위반."),
        ("해외 주재원 주거비 지원 한도 초과", "Medium", "규정된 한도를 초과하는 고급 주택 임차료 전액 지원."),
        ("임원 비서실 운영비 개인 전용", "High", "비서실 명목의 법인카드 및 비용을 임원 개인 용도로 사용."),
        ("사내 동호회 지원금 증빙 누락", "Low", "활동 기록 없이 지원금만 매달 정기적으로 집행."),
        ("직무 발명 보상금 산정 근거 미흡", "Medium", "기여도가 확인되지 않는 특허에 대해 특정인에게 거액 보상.")
    ];
    for (name, risk, desc) in hr {
        scenarios.push(("HR", name, risk, desc));
    }

    // --- Category C: 구매/조달 (STP) - 20 items ---
    let stp = vec![
        ("신규 등록 업체 집중 매입 (Kickback)", "High", "업체 등록 후 3개월 내에 매입액이 급증하는 업체 추출."),
        ("단일 응찰 및 수의 계약 비중 과다", "High", "경쟁 입찰 없이 특정 업체와 지속적으로 수의 계약 체결."),
        ("입찰 담합 및 들러리 업체 정황", "High", "IP 주소가 동일하거나 제안서 형식이 유사한 업체들이 동시 응찰."),
        ("분할 발주를 통한 전결권 우회", "Medium", "단일 계약을 쪼개서 실무자 전결 범위 내로 낮추어 결재."),
        ("원자재 매입 단가 급증 (시장가 괴리)", "High", "LME 등 국제 시세 대비 비정상적으로 높게 설정된 매입 단가."),
        ("미납 및 불량 발생 업체의 등록 유지", "Medium", "품질 평가 점수가 극히 낮음에도 불구하고 지속 거래."),
        ("임직원 이해관계자 업체 등록", "High", "구매 담당자의 지인이 운영하는 업체가 협력사로 등록된 경우."),
        ("금액 변동이 잦은 추가 견적 (Variation Clause)", "Medium", "최초 계약 낮은 금액 낙찰 후 사후 변경을 통해 금액 증액."),
        ("대금 지불 기일 비정상 단축 (특혜)", "Medium", "타 업체 대비 특정 업체에 대해서만 어음 발행 없이 급액 송금."),
        ("가동 중단 설비 유지 보수비 발생", "High", "이미 폐기되거나 매각된 자산에 대해 유지보수비 정기 집행."),
        ("재고 자산 실사 미흡 및 장부상 차이", "High", "전산상 재고는 존재하나 실물이 없어 손실 은폐 의심."),
        ("해외 수입 관세 환급금 누락", "Low", "관세청 환급 통지서와 회계 처리된 리베이트 금액 불일치."),
        ("샘플 및 시제품 대량 구매 (불요불급)", "Low", "연구에 필요한 수량보다 과다하게 구매하여 외부 반출 의심."),
        ("MRO 소모품 단가 정기 인상 묵인", "Low", "시장가는 하락하나 계약가는 고정되거나 인상되는 패턴."),
        ("특수관계자 거래 미공시", "High", "계열사 간 거래에 대해 적정한 이사회 승인 및 공시 누락."),
        ("선급금 지급 후 이행 미확인", "High", "고액 선급금을 지급했으나 프로젝트 진행률 0% 인 사례."),
        ("부실 채권 업체에 대한 선제적 대금 지급", "High", "파산 직전 업체에 대금을 미리 지급하여 자산 유출."),
        ("구매 시스템 외부 결제 처리 (Shadow Purchasing)", "Medium", "정식 ERP 구매 요청 없이 팀 내 비용으로 물품 직접 매입."),
        ("동일 품목 번호에 대한 복수 단가", "Medium", "같은 규격의 자재를 업체마다 다른 단가로 매입하는 비효율."),
        ("부품 교체 주기 조작 및 과다 교체", "Medium", "멀쩡한 소모성 자재를 조기에 교체하여 비용을 부풀리는 행위.")
    ];
    for (name, risk, desc) in stp {
        scenarios.push(("STP", name, risk, desc));
    }

    // --- Category D: 매출/채권 (OTC) - 20 items ---
    let otc = vec![
        ("분기 말 밀어내기 매출 (Channel Stuffing)", "High", "분기 마지막 3일에 분기 매출의 40% 이상 집중 발생."),
        ("반복적인 고액 반품 및 매출 취소", "High", "매출 계상 후 다음 분기 초에 전량 반품 처리되는 패턴."),
        ("특정 거래처 미수금 회수 지연 및 방치", "High", "담보 범위를 초과하는 미수금이 있음에도 신규 매출 지속."),
        ("가공 매출 생성 및 허위 세금계산서", "High", "물품 인도 증빙 없이 장부상 매출만 계상한 징후."),
        ("대리점 리베이트/판매장려금 과다 산정", "Medium", "매출액 대비 리베이트 비율이 비정상적으로 높은 사례."),
        ("채권 연령(Aging) 조작 및 채권 재편성", "High", "오래된 연체 채권을 신규 채권으로 전환하여 충당금 설정 회피."),
        ("임의 할인 (Manual Rebate) 남발", "Medium", "승인권자 허가 없이 마케팅 담당자가 직접 적용한 특별 할인."),
        ("수출 채권 회수금 환율 조작 편취", "High", "외화 입금 시 고정 환율 적용으로 발생하는 차액을 별도 적립."),
        ("장기 미회수 채권의 대손 처리 미흡", "Medium", "회수 불가능한 채권을 상각 처리하지 않아 자산 과대 계상."),
        ("비용 인식 시점 이연을 통한 이익 부풀리기", "High", "당기에 발생한 비용을 다음 기로 넘겨 영업이익을 조절."),
        ("거래처 신용 등급 강제 상향 조정", "Medium", "부실 업체와의 거래 유지를 위해 시스템상 등급을 인위적으로 조정."),
        ("가공의 반품 비용 계상을 통한 횡령", "High", "실제 반품이 없었으나 반품 비용으로 회계 처리 후 현금 인출."),
        ("매출 할부 이자 수익 과다 인식", "Low", "미래 수익을 당기로 당겨 인식하는 회계 원칙 위반."),
        ("판매 중개 수수료 과다 지급 (Fee Manipulation)", "High", "통상적인 요율(3~5%)을 벗어난 고액 수수료 집행."),
        ("주요 고객에 대한 특혜 공급 (가격 차별)", "Medium", "공식 단가표와 상이하게 낮은 가격으로 특정인에게 공급."),
        ("매출 선선적 (Ship-before-Order) 패턴", "High", "주문서(PO) 날짜보다 선적(Invoice) 날짜가 빠른 경우."),
        ("프로세스 무시 단가 (Price Override) 발생건수", "Medium", "ERP 가격 기준을 수동으로 덮어쓴 매출 전체 리스트."),
        ("동일 IP 접속 고객의 대량 구매 (자전거래)", "High", "직원이나 관계자가 허위 ID로 매출을 일으키는 정황."),
        ("마케팅 이벤트 기간 외 경품 지급", "Low", "이벤트 종료 후 특정 거래처인에게 상품권 등 경품 추가 발송."),
        ("채권 회수 시 현금 수령 후 유용", "High", "현금으로 회수한 대금을 회사 계좌 입금 전 일시적으로 개인 사용.")
    ];
    for (name, risk, desc) in otc {
        scenarios.push(("OTC", name, risk, desc));
    }

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for (cat, name, risk, desc) in scenarios {
        tx.execute(
            "INSERT INTO custom_scenarios (category, name, risk_level, description, origin_audit_type, is_ai_generated) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![cat, name, risk, desc, "시스템 마스터", 0]
        ).map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;

    println!(">>> [SUCCESS] Seeded 90 Master Audit Scenarios into custom_scenarios.");
    Ok(())
}

pub struct AuditUniverseSeeder;

impl AuditUniverseSeeder {
    pub fn seed(conn: &mut Connection) -> Result<(), String> {
        let entities = vec![
            (
                "Procurement Team", "Support", 9, 8, 2023, "$45M", 12, "Unsatisfactory", "Oracle ERP, Ariba",
                r#"{"reason": "Suspected bid-rigging in IT outsourcing contracts. High dependency on a single vendor (80% spend).", "impact_score": 9, "likelihood_score": 8, "impact_breakdown": {"financial_loss": 9, "strategic_impact": 7, "reputation_risk": 9}, "likelihood_breakdown": {"historical_frequency": 6, "control_weakness": 9, "process_complexity": 5}, "audit_approach": "Conduct forensic data analysis on bid logs and perform conflict of interest checks on top 10 vendors.", "reference_standard": "ISO 37001 (Anti-Bribery), COSO Principle 8 (Fraud Risk)"}"#
            ),
            (
                "IT Division (Security)", "Support", 9, 7, 2023, "$18M", 45, "Needs Improvement", "AWS, Azure, Splunk",
                r#"{"reason": "Shadow IT usage found in R&D. Delayed patching of critical servers (>90 days). Ransomware vulnerability high.", "impact_score": 9, "likelihood_score": 7, "impact_breakdown": {"financial_loss": 9, "strategic_impact": 9, "reputation_risk": 9}, "likelihood_breakdown": {"historical_frequency": 4, "control_weakness": 8, "process_complexity": 8}, "audit_approach": "Scan network for unmanaged assets (Nmap/Tenable) and review patch management logs in Splunk.", "reference_standard": "NIST CSF (Detect/Protect), ISO 27001 A.12.6"}"#
            ),
            (
                "HR Division (Payroll)", "Support", 6, 5, 2024, "$150M (Payroll)", 1200, "Satisfactory", "Workday, SAP HCM",
                r#"{"reason": "Discrepancies in overtime payments for factory workers. Ghost employee risk in remote branches.", "impact_score": 6, "likelihood_score": 5, "impact_breakdown": {"financial_loss": 6, "strategic_impact": 4, "reputation_risk": 7}, "likelihood_breakdown": {"historical_frequency": 5, "control_weakness": 4, "process_complexity": 6}, "audit_approach": "Reconcile active employee list with payroll disbursements and physical badge access logs.", "reference_standard": "COSO Control Activities (Payroll Cycle), Labor Standards Act"}"#
            ),
            (
                "Treasury Dept", "Support", 9, 6, 2024, "$500M (AUM)", 8, "Needs Improvement", "Kyriba, Bloomberg",
                r#"{"reason": "FX hedging strategy deviated from policy during recent volatility. Authorization limits for transfers override frequently.", "impact_score": 9, "likelihood_score": 6, "impact_breakdown": {"financial_loss": 9, "strategic_impact": 7, "reputation_risk": 4}, "likelihood_breakdown": {"historical_frequency": 3, "control_weakness": 6, "process_complexity": 9}, "audit_approach": "Review all FX trade tickets against daily treasury policy limits and check approval timestamps.", "reference_standard": "IIA GTAG (Treasury Management), COSO Principle 10 (Control Activities)"}"#
            ),
            (
                "Logistics Center (Busan)", "Operations", 7, 6, 2023, "$8M (Opex)", 45, "Unsatisfactory", "WMS (Legacy)",
                r#"{"reason": "Inventory shrinkage rate increased by 2.5%. Physical security controls at loading docks found deficient.", "impact_score": 7, "likelihood_score": 6, "impact_breakdown": {"financial_loss": 7, "strategic_impact": 5, "reputation_risk": 5}, "likelihood_breakdown": {"historical_frequency": 6, "control_weakness": 8, "process_complexity": 5}, "audit_approach": "Conduct surprise inventory count at Busan hub and review CCTV coverage of loading zones.", "reference_standard": "COSO Principle 11 (General Controls over Technology), Inventory Management Best Practices"}"#
            ),
            (
                "Sales HQ (Domestic)", "Business Unit", 8, 7, 2022, "$220M (Rev)", 150, "Satisfactory", "Salesforce",
                r#"{"reason": "Channel stuffing indications near quarter-end. Aggressive rebate schemes applied without proper approval workflow.", "impact_score": 8, "likelihood_score": 7, "impact_breakdown": {"financial_loss": 8, "strategic_impact": 7, "reputation_risk": 6}, "likelihood_breakdown": {"historical_frequency": 4, "control_weakness": 5, "process_complexity": 6}, "audit_approach": "Analyze sales return rates post-quarter-end and verify customer acceptance dates.", "reference_standard": "IFRS 15 (Revenue Recognition), COSO Principle 8 (Fraud Risk)"}"#
            ),
            (
                "R&D Center (Seongnam)", "Business Unit", 8, 4, 2024, "$65M", 200, "Needs Improvement", "Jira, Git",
                r#"{"reason": "IP leakage risks. Proprietary code committed to public repositories. Lack of DLP (Data Loss Prevention) on endpoints.", "impact_score": 8, "likelihood_score": 4, "impact_breakdown": {"financial_loss": 9, "strategic_impact": 9, "reputation_risk": 5}, "likelihood_breakdown": {"historical_frequency": 2, "control_weakness": 6, "process_complexity": 7}, "audit_approach": "Scan public GitHub Repos for company secrets and audit DLP agent coverage.", "reference_standard": "ISO 27001 (Asset Management), NIST SP 800-53 (System and Information Integrity)"}"#
            ),
            (
                "Global Compliance Team", "Support", 4, 2, 2023, "$2M", 5, "Satisfactory", "ServiceNow GRC",
                r#"{"reason": "GDPR compliance audit pending. Minor gaps in whistleblower hotline anonymity protocols.", "impact_score": 4, "likelihood_score": 2, "impact_breakdown": {"financial_loss": 5, "strategic_impact": 3, "reputation_risk": 7}, "likelihood_breakdown": {"historical_frequency": 1, "control_weakness": 3, "process_complexity": 4}, "audit_approach": "Test whistleblower hotline anonymity by simulating a report and tracing access logs.", "reference_standard": "GDPR Articles, ISO 37002 (Whistleblowing Management Systems)"}"#
            ),
            (
                "US Subsidiary (Sales)", "Subsidiary", 7, 5, 2022, "$80M (Rev)", 30, "Needs Improvement", "NetSuite",
                r#"{"reason": "Nexus tax compliance issues in 3 new states. High travel & entertainment expenses for local sales reps.", "impact_score": 7, "likelihood_score": 5, "impact_breakdown": {"financial_loss": 6, "strategic_impact": 5, "reputation_risk": 6}, "likelihood_breakdown": {"historical_frequency": 3, "control_weakness": 5, "process_complexity": 8}, "audit_approach": "Review nexus thresholds for CA/NY/TX and audit T&E receipts > $200.", "reference_standard": "US GAAP (Tax), IRS Guidelines"}"#
            ),
            (
                "EU Branch (Frankfurt)", "Subsidiary", 6, 4, 2023, "$45M (Rev)", 15, "Satisfactory", "SAP Business One",
                r#"{"reason": "VAT triangulation errors in cross-border trade. Transfer pricing documentation needs update for BEPS compliance.", "impact_score": 6, "likelihood_score": 4, "impact_breakdown": {"financial_loss": 5, "strategic_impact": 4, "reputation_risk": 5}, "likelihood_breakdown": {"historical_frequency": 4, "control_weakness": 3, "process_complexity": 9}, "audit_approach": "Sample 20 cross-border invoices for correct VAT codes and review TP master file.", "reference_standard": "EU VAT Directive, OECD Transfer Pricing Guidelines"}"#
            ),
            (
                "General Affairs", "Support", 3, 3, 2024, "$5M", 10, "Satisfactory", "Groupware",
                r#"{"reason": "Corporate vehicle usage log discrepancies. Facility maintenance contracts auto-renewed without competitive bidding.", "impact_score": 3, "likelihood_score": 3, "impact_breakdown": {"financial_loss": 2, "strategic_impact": 1, "reputation_risk": 3}, "likelihood_breakdown": {"historical_frequency": 3, "control_weakness": 4, "process_complexity": 2}, "audit_approach": "Compare vehicle mileage logs with fuel card usage data and review contract renewal approvals.", "reference_standard": "Internal Procurement Policy, Corporate Asset Management Guide"}"#
            ),
            (
                "Legal Team", "Support", 5, 2, 2023, "$4M", 8, "Satisfactory", "Legal Tech",
                r#"{"reason": "Contract lifecycle management is manual using Excel, leading to missed renewal notices. Litigation reserves adequacy review needed.", "impact_score": 5, "likelihood_score": 2, "impact_breakdown": {"financial_loss": 4, "strategic_impact": 6, "reputation_risk": 3}, "likelihood_breakdown": {"historical_frequency": 1, "control_weakness": 3, "process_complexity": 4}, "audit_approach": "Audit Excel tracking sheet against actual signed contracts and check reserve calculations.", "reference_standard": "IAS 37 (Provisions), COSO Principle 10 (Control Activities)"}"#
            ),
            (
                "Marketing Team", "Business Unit", 5, 5, 2024, "$35M", 25, "Satisfactory", "HubSpot, Google Ads",
                r#"{"reason": "Ad spend efficiency and vendor kickback risks. High volume of manual payments to digital agencies.", "impact_score": 5, "likelihood_score": 5, "impact_breakdown": {"financial_loss": 5, "strategic_impact": 4, "reputation_risk": 6}, "likelihood_breakdown": {"historical_frequency": 3, "control_weakness": 4, "process_complexity": 7}, "audit_approach": "Analyze vendor payment correlations and media placement logs.", "reference_standard": "Anti-Bribery Policy, Marketing Spend Guidelines"}"#
            )
        ];

        let tx = conn.transaction().map_err(|e| e.to_string())?;
        for (name, cat, impact, likelihood, year, budget, head, rating, sys, ai_json) in &entities {
            tx.execute(
                "INSERT INTO audit_universe (unit_name, category, impact_score, likelihood_score, last_audit_year, budget_size, headcount, last_audit_rating, key_systems, ai_analysis_data) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![name, cat, impact, likelihood, year, budget, head, rating, sys, ai_json]
            ).map_err(|e| format!("Failed to insert entity [{}]: {}", name, e))?;
        }
        tx.commit().map_err(|e| format!("Seeding transaction commit failed: {}", e))?;
        println!(">>> [SUCCESS] Seeded/Synced {} entities into audit_universe with AI scenarios.", entities.len());
        Ok(())
    }
}

// pub fn seed_audit_universe(...) // Removed unused legacy wrapper

pub fn get_active_universe_column(conn: &Connection) -> Result<String, String> {
    conn.query_row(
        "SELECT name FROM pragma_table_info('audit_universe') WHERE name IN ('entity_name', 'unit_name') LIMIT 1",
        [],
        |row| row.get::<_, String>(0)
    ).map_err(|_| "Neither 'entity_name' nor 'unit_name' column found in audit_universe.".to_string())
}
