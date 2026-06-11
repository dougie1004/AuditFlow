import sqlite3
import os
import csv

def get_scenario_metadata(sid, category, name, desc):
    # Default initializations
    data_class = ""
    rationale = ""
    fields = []
    evidence = "N/A"
    missing_reason = ""
    action = ""
    priority = "P2" # default

    # 7 Implemented rules
    if sid == "PR-02":
        data_class = "A"
        rationale = "GL의 분개 금액, 거래 일자, 거래처 정보만으로 단시간 내 PO 분할 탐지 가능"
        fields = ["debit_amount", "credit_amount", "event_date", "entity_id (vendor)", "description"]
        evidence = "src-tauri/src/flux_engine.rs (FluxEngine::run_correlations)"
        missing_reason = "None (Implemented)"
        action = "None (Monitor performance)"
        priority = "P1"
    elif sid == "EX-04":
        # Reclassified to C because corporate card details are required (cannot trust GL post date/description alone without false positives)
        data_class = "C"
        rationale = "법인카드 승인 내역의 실제 가맹점 정보가 필요하며, GL 전표 정보만으로는 적발 시 오탐 발생 위험이 높음"
        fields = ["amount", "event_date", "vendor (entity_id)", "description"]
        evidence = "src-tauri/src/compliance_dd_flow.rs (run_compliance_check_flow)"
        missing_reason = "None (Implemented)"
        action = "None (Monitor performance)"
        priority = "P1"
    elif sid == "LDG-01":
        data_class = "A"
        rationale = "GL의 분개 금액을 정렬하여 상위 1% 임계치 초과 여부 판단 가능"
        fields = ["amount", "event_date", "account_code", "entity_id (vendor)", "description"]
        evidence = "src-tauri/src/ledger_engine.rs (run_ledger_only_scan)"
        missing_reason = "None (Implemented)"
        action = "None (Monitor performance)"
        priority = "P1"
    elif sid == "LDG-02":
        data_class = "A"
        rationale = "GL의 분개 금액에 대해 100,000/1,000,000 등 라운드 금액의 반복 빈도수만으로 탐지 가능"
        fields = ["amount", "event_date", "account_code", "entity_id (vendor)", "description"]
        evidence = "src-tauri/src/ledger_engine.rs (run_ledger_only_scan)"
        missing_reason = "None (Implemented)"
        action = "None (Monitor performance)"
        priority = "P1"
    elif sid == "LDG-05":
        data_class = "A"
        rationale = "GL의 특정 계정별 월간 집행액 합계를 계산하여 이전 평균 대비 300% 급증 여부 판단 가능"
        fields = ["amount", "event_date", "account_code", "entity_id (vendor)", "description"]
        evidence = "src-tauri/src/ledger_engine.rs (run_ledger_only_scan)"
        missing_reason = "None (Implemented)"
        action = "None (Monitor performance)"
        priority = "P1"
    elif sid == "LDG-06":
        data_class = "A"
        rationale = "GL의 특정 부서 및 특정 거래처 간의 지출 점유율(90% 이상) 계산만으로 탐지 가능"
        fields = ["amount", "event_date", "account_code", "entity_id (vendor)", "dept"]
        evidence = "src-tauri/src/ledger_engine.rs (run_ledger_only_scan)"
        missing_reason = "None (Implemented)"
        action = "None (Monitor performance)"
        priority = "P1"
    elif sid == "LDG-07":
        data_class = "A"
        rationale = "GL의 전표 적요 텍스트 내 사전에 정의된 위험 키워드 포함 여부만으로 판단 가능"
        fields = ["amount", "event_date", "account_code", "entity_id (vendor)", "description"]
        evidence = "src-tauri/src/ledger_engine.rs (run_ledger_only_scan)"
        missing_reason = "None (Implemented)"
        action = "None (Monitor performance)"
        priority = "P1"

    # Rest of the rules (Unimplemented)
    else:
        # Category classification based on scenario ID prefix or details
        if sid.startswith("LDG"):
            # Ledger-only mode
            if sid in ["LDG-03", "LDG-04", "LDG-08", "LDG-10"]:
                data_class = "A"
                rationale = "GL의 일자, 금액, 계정코드, 거래처 정보만을 비교 분석하여 판단 가능"
                priority = "P0"
                action = "개발 계획 수립 및 Sprint 8 Rust 판정 로직 구현"
                if sid == "LDG-03":
                    fields = ["amount", "event_date", "entity_id (vendor)"]
                    missing_reason = "탐지 알고리즘(동일 거래처/금액 단기 반복 발생 탐지 루프) 미구현"
                elif sid == "LDG-04":
                    fields = ["amount", "event_date"]
                    missing_reason = "탐지 알고리즘(주말/공휴일 고액 전표 필터 및 달력 연동) 미구현"
                elif sid == "LDG-08":
                    fields = ["amount", "event_date", "account_code"]
                    missing_reason = "탐지 알고리즘(전결 권한 한도 직전 금액 경계선 거래 패턴 감지) 미구현"
                elif sid == "LDG-10":
                    fields = ["amount", "entity_id (vendor)"]
                    missing_reason = "탐지 알고리즘(특정 벤더 매입 집중도 HHI/CR1 계산 로직) 미구현"
            elif sid == "LDG-09":
                data_class = "B"
                rationale = "GL의 전표 거래 정보 외에 거래처 마스터의 신규 등록 정보 매핑 필요"
                fields = ["amount", "event_date", "entity_id (vendor)", "vendor_registration_date"]
                missing_reason = "보조 데이터 모델(거래처 마스터 내 신규 등록일자 속성) 부재"
                action = "거래처 마스터 업로드 데이터 모델 설계 및 UI 파이프라인 구축"
                priority = "P2"
        
        elif sid.startswith("EX") or sid.startswith("CC"):
            # All Card and Expense rules require Card transaction details (Category C)
            # except CC-10 which is D (API required)
            if sid == "CC-10":
                data_class = "D"
                rationale = "가맹점 사업자 등록번호 실시간 국세청/법원 등기부 상태 API 연동 없이는 신뢰도 있는 탐지 불가"
                fields = ["vendor_business_license_registry", "nts_business_status_api", "amount"]
                missing_reason = "가맹점 사업자 등록번호 실시간 국세청/법원 등기부 상태 API 연동 부재"
                action = "국세청 사업자 상태 조회 외부 API 연동 기능 개발"
                priority = "P3"
            else:
                data_class = "C"
                rationale = "실제 사용일자 및 승인시간 등은 GL 전표일자 및 기입시간과 상이하므로 카드 승인내역 원천 파일 매칭이 필수적임"
                priority = "P2"
                action = "추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발"
                
                # Assign specific fields/missing reasons
                if sid == "EX-01":
                    fields = ["amount", "event_timestamp", "card_number", "vendor"]
                    missing_reason = "카드 승인 내역의 초 단위 실시간 거래 타임스탬프 데이터 부재"
                elif sid == "EX-02":
                    fields = ["amount", "event_date", "event_time"]
                    missing_reason = "카드 승인 상세 일시(주말/심야 실제 사용 시간대) 대조 데이터 부재"
                elif sid == "EX-03":
                    fields = ["amount", "event_date", "vendor_location", "employee_office_location"]
                    missing_reason = "카드 실제 승인 가맹점 위치 정보 및 임직원 소속/근무지 마스터 부재"
                elif sid == "EX-05":
                    fields = ["flight_booking_details", "reimbursement_claims_ledger", "card_transactions"]
                    missing_reason = "개인 실비 청구 내역과 법인카드 승인 내역의 교차 대조용 원천 데이터 부재"
                elif sid == "EX-06":
                    fields = ["airline_travel_logs", "corporate_mileage_statements", "employee_id"]
                    missing_reason = "항공사 마일리지 적립 정보 및 임직원 마일리지 계정 원천 데이터 부재"
                elif sid == "EX-07":
                    fields = ["travel_agency_refund_notices", "card_refund_credits", "booking_id"]
                    missing_reason = "외부 여행사 환불 알림 데이터 및 취소 내역 원천 데이터 부재"
                elif sid == "EX-08":
                    fields = ["amount", "account_code", "description", "department_budget_policy"]
                    missing_reason = "카드 승인 원장 가맹점 상세 카테고리와 부서별 예산 통제 정책 테이블 부재"
                elif sid == "EX-09":
                    fields = ["fuel_card_receipts", "vehicle_gps_logs", "odometer_readings"]
                    missing_reason = "업무용 차량 운행 일지(GPS) 및 주유 카드 승인 상세 데이터 부재"
                elif sid == "EX-10":
                    fields = ["amount", "vendor (entity_id)", "approved_software_list"]
                    missing_reason = "허용된 IT 구독 서비스 화이트리스트 및 법인카드 매월 정기 결제 내역 부재"
                elif sid == "CC-01":
                    fields = ["amount", "mcc_code_mapping_table", "restricted_vendor_keywords"]
                    missing_reason = "카드 승인 제한 업종 분류 코드(MCC) 및 가맹점 매핑표 부재"
                elif sid == "CC-02":
                    fields = ["amount", "retailer_whitelist_blacklist", "vendor_keywords"]
                    missing_reason = "마트/grocery 가맹점 실사용 거래 세부 정보 부재"
                elif sid == "CC-03":
                    fields = ["amount", "event_date", "description (cash_withdrawal_mcc)"]
                    missing_reason = "카드 승인 내역 내 ATM 현금서비스 식별 인덱스 및 매핑 데이터 부재"
                elif sid == "CC-04":
                    fields = ["amount", "employee_personal_data", "chart_of_accounts"]
                    missing_reason = "개인 세금/공과금 가맹점 카드 결제 매핑 및 대조 테이블 부재"
                elif sid == "CC-05":
                    fields = ["amount", "employee_home_address_list", "corporate_office_addresses"]
                    missing_reason = "배달 가맹점 배송지 위치 데이터 및 임직원 주소지 정보 데이터베이스 부재"
                elif sid == "CC-06":
                    fields = ["card_receipt_upload_logs", "amount", "event_date"]
                    missing_reason = "법인카드 정산 시스템의 영수증 증빙 첨부 여부 로그 원천 데이터 부재"
                elif sid == "CC-07":
                    fields = ["amount", "employee_grade_master", "travel_policy_limits"]
                    missing_reason = "항공/철도 가맹점 승인 등급 상세 데이터 및 직급별 규정표 부재"
                elif sid == "CC-08":
                    fields = ["amount", "hotel_invoice_detail_parser", "card_itemization_rules"]
                    missing_reason = "호텔 인보이스 상세 항목(미니바/스파 등) 분리 파서 및 매핑표 부재"
                elif sid == "CC-09":
                    fields = ["amount", "vendor_classification_master", "giftcard_vendor_keywords"]
                    missing_reason = "편의점/백화점 등 상품권 유통 가능 가맹점의 상세 카드 승인 정보 부재"

        elif sid.startswith("FA"):
            # Finance/Accounting mode
            if sid in ["FA-01", "FA-02", "FA-04"]:
                data_class = "A"
                rationale = "GL 상의 임시 계정 코드, 일자, 적요, 수동 분개 구분값만으로 판단 가능"
                priority = "P0"
                action = "개발 계획 수립 및 Sprint 8 Rust 판정 로직 구현"
                if sid == "FA-01":
                    fields = ["account_code", "amount", "event_date", "clearance_status"]
                    missing_reason = "임시 계정(가지급금/가수금) 결산 연령 분석(90일 초과 방치) 탐지 로직 미구현"
                elif sid == "FA-02":
                    fields = ["account_code", "amount", "event_date", "posting_time", "is_manual_journal"]
                    missing_reason = "수동 분개 식별 필드 검증 및 비업무시간 수동 분개 탐지 로직 미구현"
                elif sid == "FA-04":
                    fields = ["account_code", "amount", "event_date", "description"]
                    missing_reason = "회계 기말 전후 전표 결산 컷오프(당기 비용 차기 이월) 검증 로직 미구현"
            elif sid in ["FA-03", "FA-05"]:
                data_class = "B"
                rationale = "GL 외에 고시 환율 테이블, 세액 환급 계정 매핑표 등 간단한 매핑 마스터 필요"
                priority = "P2"
                action = "보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발"
                if sid == "FA-03":
                    fields = ["amount", "account_code", "fx_rate_table", "intercompany_policy"]
                    missing_reason = "보조 데이터 모델(일자별 고시 환율 테이블 및 내부 정산 정책) 부재"
                elif sid == "FA-05":
                    fields = ["amount", "account_code", "vat_refund_mapping_table"]
                    missing_reason = "보조 데이터 모델(부가세 환급 대상 계정 매핑 및 대조 테이블) 부재"
            elif sid in ["FA-06", "FA-07", "FA-08", "FA-09"]:
                data_class = "A"
                rationale = "GL 계정 코드 분류 및 분개 차/대변 분석, 특정 적요 키워드 필터링만으로 판단 가능"
                priority = "P1"
                action = "차기 스프린트 개발 대상 등록 및 탐지 알고리즘 설계"
                if sid == "FA-06":
                    fields = ["account_code", "amount", "description"]
                    missing_reason = "수선비 등 비용 계정과 자산화 대상 계정 간의 금액 비율 비교 검증 로직 미구현"
                elif sid == "FA-07":
                    fields = ["account_code", "amount", "event_date"]
                    missing_reason = "배당금 지급 계정의 적격성 판단 및 기입 한도 검증 로직 미구현"
                elif sid == "FA-08":
                    fields = ["account_code", "amount", "event_date"]
                    missing_reason = "특정 제한 예치금 계정에서의 비정상 인출 거래 필터링 로직 미구현"
                elif sid == "FA-09":
                    fields = ["account_code", "amount", "entity_id (vendor)", "description"]
                    missing_reason = "특수관계자 거래 키워드 및 대조 리스트 탐지 로직 미구현"
            elif sid == "FA-10":
                data_class = "D"
                rationale = "ERP 시스템 접속 이력 또는 DB 감사 로그 원천 연동 없이는 검사 불가능"
                fields = ["db_audit_logs", "database_access_credentials_log"]
                missing_reason = "DBMS 시스템 감사 로그 및 DB 접근 이력 데이터 연동 파이프라인 부재"
                action = "시스템 감사 로그(Syslog/SIEM) API 연동 아키텍처 수립 및 연계 모듈 개발"
                priority = "P3"

        elif sid.startswith("PR"):
            # Procurement mode
            if sid == "PR-09":
                data_class = "B"
                rationale = "GL의 거래처 정보와 승인된 거래처 화이트리스트(Vendor Master) 간의 비교 매핑 필요"
                fields = ["amount", "entity_id (vendor)", "approved_vendor_list"]
                missing_reason = "보조 데이터 모델(승인 거래처 마스터 - Approved Vendor List) 부재"
                action = "승인 거래처 마스터 업로드 데이터 모델 설계 및 UI 파이프라인 구축"
                priority = "P0"
            elif sid in ["PR-04", "PR-05", "PR-07"]:
                data_class = "B"
                rationale = "GL 외에 임직원 관계 레지스트리, 단일 공급원 승인대장 등 보조 마스터 정보 매핑 필요"
                priority = "P2"
                action = "보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발"
                if sid == "PR-04":
                    fields = ["entity_id (vendor)", "vendor_address", "employee_address_master", "relatives_registry"]
                    missing_reason = "보조 데이터 모델(임직원 주소 정보 및 친인척 관계도 데이터베이스) 부재"
                elif sid == "PR-05":
                    fields = ["entity_id (vendor)", "approved_vendor_list", "sole_source_justification_log"]
                    missing_reason = "보조 데이터 모델(단일 공급원 예외 승인 이력 데이터베이스) 부재"
                elif sid == "PR-07":
                    fields = ["entity_id (vendor)", "approved_vendor_list", "kickback_vendor_watch_list"]
                    missing_reason = "보조 데이터 모델(집중 감시 거래처 블랙리스트/화이트리스트 정보) 부재"
            elif sid in ["PR-01", "PR-03", "PR-08", "PR-10"]:
                data_class = "C"
                rationale = "입찰 시스템 로그, 시장 단가 데이터베이스, 선급 계약서 진척 정보 등 추가 원천 데이터 적재 필요"
                priority = "P2"
                action = "추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발"
                if sid == "PR-01":
                    fields = ["bid_proposal_hashes", "rfq_portal_access_logs", "vendor_ip_addresses"]
                    missing_reason = "구매 입찰 시스템의 제안서 파일 해시값 및 접속 기기 정보(IP) 원천 데이터 부재"
                elif sid == "PR-03":
                    fields = ["purchase_items_catalog", "external_market_benchmark_prices", "amount"]
                    missing_reason = "외부 원자재/용역 시장 표준 단가표 및 마켓 벤치마크 데이터베이스 부재"
                elif sid == "PR-08":
                    fields = ["purchase_order_history", "contract_variation_agreement_docs"]
                    missing_reason = "계약 변경 합의서 문서 및 누적 단가 인상 이력 상세 원천 데이터 부재"
                elif sid == "PR-10":
                    fields = ["project_milestone_reports", "project_progress_logs", "advance_payments_ledger"]
                    missing_reason = "선급금 지급 대장과 연동할 실제 프로젝트 산출물/진척도 로그 원천 데이터 부재"
            elif sid == "PR-06":
                data_class = "D"
                rationale = "국세청 휴폐업 여부 검증용 외부 API 실시간 연동 없이는 정확한 판정 불가"
                fields = ["entity_id (vendor)", "nts_business_status_api", "vendor_master"]
                missing_reason = "국세청 휴폐업 여부 실시간 조회 API 및 연계 마스터 데이터베이스 부재"
                action = "국세청 사업자 등록 상태 조회 외부 API 연동 기능 개발"
                priority = "P2"

        elif sid.startswith("FF"):
            # Financial Integrity mode
            if sid in ["FF-01", "FF-02", "FF-03"]:
                data_class = "C"
                rationale = "실제 송금 수취인 실명 확인용 은행 거래 명세서 및 펌뱅킹 이체 거래 원천 정보 적재 필수"
                priority = "P2"
                action = "추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발"
                if sid == "FF-01":
                    fields = ["bank_transaction_logs", "counterparty_account_owner_mapping", "transfer_flow"]
                    missing_reason = "은행 계좌 실시간 송수금 상세 거래 내역 원천 데이터 부재"
                elif sid == "FF-02":
                    fields = ["bank_inflow_outflow_logs", "general_ledger_booking_dates", "cash_receipt_logs"]
                    missing_reason = "실제 은행 입출금 일자와 전표 기입 일자 크로스 매칭용 은행 원천 데이터 부재"
                elif sid == "FF-03":
                    fields = ["bank_transaction_recipient_names", "vendor_master_bank_details", "employee_bank_accounts"]
                    missing_reason = "은행 송금 수취인 실명(임직원 계좌 여부)과 전표 거래처 간 대조용 은행 원천 데이터 부재"
            elif sid == "FF-04":
                data_class = "A"
                rationale = "GL 분개 중 동일 거래처 대상 특정 단기 내 누적 금액 임계치 분석만으로 판단 가능"
                fields = ["amount", "event_date", "entity_id (vendor)"]
                missing_reason = "동일 거래처에 대해 기준 한도 직전 다중 거래 발생 탐지 로직 미구현"
                action = "개발 계획 수립 및 Rust 판정 로직 구현"
                priority = "P1"
            elif sid == "FF-05":
                data_class = "C"
                rationale = "프로젝트 예산 관리 명세 및 계좌별 실물 입출금 원천 데이터 대조 필요"
                fields = ["project_accounting_ledger", "bank_statements", "amount"]
                missing_reason = "개별 프로젝트 예산 대장 및 장기 미집행 계정의 은행 거래 상세 데이터 부재"
                action = "추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발"
                priority = "P2"

        elif sid.startswith("SA"):
            # Sales/AR mode
            if sid in ["SA-01", "SA-02", "SA-03", "SA-04", "SA-05", "SA-07", "SA-08", "SA-10"]:
                data_class = "C"
                rationale = "실제 출하/반품 물류 인도 로그, 여신 한도 결재 대장, 매출채권 Aging 원장 등 추가 원천 데이터 대조 필수"
                priority = "P2"
                action = "추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발"
                if sid == "SA-01":
                    fields = ["shipping_documents_delivery_dates", "sales_invoices", "amount"]
                    missing_reason = "실제 자재 출하/배송 완료 증빙 일자 원천 데이터 부재"
                elif sid == "SA-02":
                    fields = ["credit_notes_ledger", "return_shipping_logs", "amount"]
                    missing_reason = "회계기초 대규모 반품 전표와 실제 물류 센터 입고 일자 대조용 원천 데이터 부재"
                elif sid == "SA-03":
                    fields = ["credit_approval_logs", "credit_limit_master", "sales_invoices"]
                    missing_reason = "거래처별 여신 한도 한계값 및 임의 여신 승인 이력 원천 데이터 부재"
                elif sid == "SA-04":
                    fields = ["accounts_receivable_ledger_aging", "cash_receipt_allocation_logs"]
                    missing_reason = "매출채권 연령분석표(Aging Detail) 및 입금 대체 이력 원천 데이터 부재"
                elif sid == "SA-05":
                    fields = ["billing_adjustment_logs", "sales_orders_approval_history"]
                    missing_reason = "정규 결재 프로세스를 우회한 수동 매출 할인/조정 로그 원천 데이터 부재"
                elif sid == "SA-07":
                    fields = ["shipping_documents", "sales_invoice_dates"]
                    missing_reason = "매출 세금계산서 발행일과 실제 검수/인도 증빙 일자 대조용 원천 데이터 부재"
                elif sid == "SA-08":
                    fields = ["shipping_documents", "sales_invoice_sku_tracking"]
                    missing_reason = "동일한 출하 증빙 번호로 중복 매출이 계상되었는지 검증할 SKU 레벨 원천 데이터 부재"
                elif sid == "SA-10":
                    fields = ["customer_sales_contracts", "rebate_claims_logs", "amount"]
                    missing_reason = "대리점별 약정 할인율 및 판매 장려금 계산 원천 데이터 부재"
            elif sid == "SA-06":
                data_class = "D"
                rationale = "국세청 매출/매입 세금계산서 이력 데이터 전수 연동 없이는 가상의 순환 거래 고리 식별 불가능"
                fields = ["sales_ledger", "purchase_ledger", "tax_invoice_registry_loops"]
                missing_reason = "국세청 세금계산서 순환 흐름을 분석할 매입/매출 세금계산서 전수 대조 API 부재"
                action = "국세청 세금계산서 데이터 일괄 연동 모듈 설계"
                priority = "P2"
            elif sid == "SA-09":
                data_class = "D"
                rationale = "ERP 마스터 데이터 변경 이력 테이블 및 실시간 데이터베이스 감사 로그 연동 필수"
                fields = ["customer_master_change_logs", "sales_ledger"]
                missing_reason = "ERP 마스터 데이터 변경 이력 테이블 및 실시간 시스템 로그 연동 부재"
                action = "ERP 변경 감사 로그(System Audit Log) 연동"
                priority = "P3"

        elif sid.startswith("HR"):
            # HR/Payroll mode
            if sid in ["HR-01", "HR-02", "HR-04", "HR-05", "HR-07"]:
                data_class = "C"
                rationale = "인사 마스터 정보 외에 실제 출퇴근 카드 태깅 시간, 퇴직금 계산 대장, 외부 교육 이수증 정보 등 추가 원천 대조 필요"
                priority = "P2"
                action = "추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발"
                if sid == "HR-01":
                    fields = ["payroll_ledger", "employee_master", "time_attendance_badge_logs"]
                    missing_reason = "인사 마스터와 급여 대장, 그리고 출퇴근 카드 태깅 기록 간의 삼자 대조용 원천 데이터 부재"
                elif sid == "HR-02":
                    fields = ["overtime_claims_ledger", "time_attendance_badge_logs"]
                    missing_reason = "연장근로 신청 내역과 실제 게이트 출입 태깅 시간 대조용 원천 데이터 부재"
                elif sid == "HR-04":
                    fields = ["payroll_ledger", "employment_contracts", "severance_calc_sheets"]
                    missing_reason = "근로계약서상 입사일과 급여대장, 퇴직금 산정표 간의 이력 대조용 원천 데이터 부재"
                elif sid == "HR-05":
                    fields = ["training_expense_ledger", "training_attendance_lists", "certificates_registry"]
                    missing_reason = "교육비 지출 전표에 대응하는 외부 교육 이수증 및 교육 참석자 대장 원천 데이터 부재"
                elif sid == "HR-07":
                    fields = ["hr_salary_table_logs", "system_update_logs", "loa_approval_logs"]
                    missing_reason = "인사 급여 테이블 변경 내역 및 전결 승인 문서 원천 데이터 부재"
            elif sid in ["HR-03", "HR-06", "HR-08", "HR-09"]:
                data_class = "C"
                rationale = "수혜 자격 요건 테이블, 항공 임차 계약 상세 내역 등 추가 원천 데이터 대조 필요"
                priority = "P3"
                action = "추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발"
                if sid == "HR-03":
                    fields = ["payroll_ledger", "benefit_eligibility_rules"]
                    missing_reason = "복리후생 지급 규정표 및 수혜 자격 조건 데이터베이스 부재"
                elif sid == "HR-06":
                    fields = ["payroll_ledger", "bonus_payment_register"]
                    missing_reason = "동일 포상금 중복 지급 여부를 검증할 상세 성과급 원천 데이터 부재"
                elif sid == "HR-08":
                    fields = ["expat_housing_contracts", "rental_payments_ledger"]
                    missing_reason = "주외 주거 지원 계약서 정보 및 임차 대장 원천 데이터 부재"
                elif sid == "HR-09":
                    fields = ["employee_relatives_disclosure", "payroll_ledger"]
                    missing_reason = "친인척 관계 신고서 데이터베이스 및 임직원 신상 정보 원천 데이터 부재"
            elif sid == "HR-10":
                data_class = "E"
                rationale = "인사 시스템의 개인 정보 접근 감사 로그 등은 회계 데이터 기반 비즈니스 감사 범위 제외"
                fields = ["iam_dossier_access_logs", "employee_id"]
                missing_reason = "인사 시스템의 개인 정보 접근 상세 감사 로그 수집 범위 이탈"
                action = "보류"
                priority = "HOLD"

        elif sid.startswith("IN"):
            # Inventory mode
            data_class = "C"
            rationale = "SCM 물류센터 수불 원장, 이동 기록, 실물 실사 카운팅 시트 및 생산 BOM 등 대량의 SCM 추가 원천 데이터 필요"
            priority = "P2"
            action = "추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발"
            if sid == "IN-01":
                fields = ["inventory_ledger", "stock_movement_logs", "physical_count_sheets"]
                missing_reason = "물류센터별 재고수불부 및 실사 조사 원량 데이터 부재"
            elif sid == "IN-02":
                fields = ["inventory_ledger", "physical_count_sheets"]
                missing_reason = "전표상 재고 자산과 실제 물류센터 실사 조사 원천 데이터 부재"
            elif sid == "IN-03":
                fields = ["inventory_aging_report", "stock_movement_logs"]
                missing_reason = "장기 미이동 재고 평가 분석표(Inventory Aging) 원천 데이터 부재"
            elif sid == "IN-04":
                fields = ["inventory_cycle_count_logs", "physical_count_sheets"]
                missing_reason = "순환 실사 로그 및 실사 수량 정정 이력 상세 데이터 부재"
            elif sid == "IN-05":
                fields = ["scrap_logs", "physical_count_sheets", "scrapped_items_specs"]
                missing_reason = "자재 폐기 대장 및 폐기 심사 결재 원천 데이터 부재"
            elif sid == "IN-06":
                fields = ["inventory_valuation_ledger", "unit_cost_calculation_sheets"]
                missing_reason = "선입선출법(FIFO) 또는 가중평균법 계산식 세부 명세 원천 데이터 부재"
            elif sid == "IN-07":
                fields = ["scm_gate_pass_logs", "scm_shipping_logs"]
                missing_reason = "물류센터 정문 게이트 통과 차량 차량번호 및 화물 검수 원천 데이터 부재"
            elif sid == "IN-08":
                fields = ["inventory_stock_movement_transfer_logs"]
                missing_reason = "법인 내 지점/센터 간 재고 이전 상세 이력 원천 데이터 부재"
            elif sid == "IN-09":
                fields = ["sample_asset_tracking_logs"]
                missing_reason = "샘플 자재 반출 및 회수 내역 원장 데이터 부재"
            elif sid == "IN-10":
                fields = ["production_bom_master", "scm_stock_movements", "production_yield_reports"]
                missing_reason = "제품 구성비(BOM) 마스터 정보 및 실제 자재 투입 이력 원천 데이터 부재"

        elif sid.startswith("ITX"):
            # IT Security mode
            data_class = "E"
            rationale = "시스템 바이너리 위변조, 포트 포워딩, API Key 누출, 랜섬웨어 및 보안 로그 Wiping 검사는 사이버 보안(SIEM/EDR) 영역으로 제품 범위 외"
            priority = "HOLD"
            action = "보류 (제품 정체성 범위를 벗어난 보안 로그 감사 영역)"
            if sid == "ITX-01":
                fields = ["system_binary_file_metadata", "endpoint_file_integrity_logs"]
                missing_reason = "OS 시스템 실행 파일 변조 여부(Rootkit) 감지를 위한 보안 로그 데이터 획득 불가능"
            elif sid == "ITX-02":
                fields = ["network_traffic_analysis_logs", "packet_capture_files"]
                missing_reason = "네트워크 프록시 및 비인가 포트 포워딩 감지를 위한 원천 네트워크 로그 수집 불가"
            elif sid == "ITX-03":
                fields = ["source_code_repository_logs", "git_commit_diffs"]
                missing_reason = "코드 리포지토리(GitHub 등) 소스코드 스캐닝 및 API 키 누출 탐지 데이터 범위 이탈"
            elif sid == "ITX-04":
                fields = ["system_event_logs_1102", "security_event_log_cleared_events"]
                missing_reason = "윈도우 이벤트 로그 삭제(EventID 1102) 감지를 위한 OS 감사 로그 수집 불가"
            elif sid == "ITX-05":
                fields = ["edr_agent_logs", "endpoint_process_monitoring_logs", "network_beacon_signals"]
                missing_reason = "랜섬웨어 침투 전조(PsExec/CobaltStrike) 감지를 위한 호스트 보안 프로세스 로그 획득 불가"

        elif sid.startswith("IT"):
            # IT/Security mode
            if sid in ["IT-01", "IT-04", "IT-05", "IT-07", "IT-10"]:
                data_class = "D"
                rationale = "Active Directory 관리자 로그, VPN 로그, SIEM 이벤트 허브 및 GitLab 커밋 정보 등 실시간 시스템 API 연동 필요"
                priority = "P3"
                action = "IT/인프라 보안 시스템 API 연동 아키텍처 수립 및 연계 모듈 개발"
                if sid == "IT-01":
                    fields = ["iam_privilege_logs", "active_directory_api", "system_audit_trails"]
                    missing_reason = "계정 권한 관리(IAM) 및 Active Directory 계정 권한 부여 이력 API 연동 부재"
                elif sid == "IT-04":
                    fields = ["iam_active_accounts", "hr_employee_active_list_api"]
                    missing_reason = "퇴사자 명단과 IAM 계정 활성 상태 간의 실시간 대조용 API 연동 부재"
                elif sid == "IT-05":
                    fields = ["firewall_vpn_logs_api", "ip_geolocation_database"]
                    missing_reason = "사내 VPN 로그 및 방화벽 접속 IP 지오로케이션 조회 API 연동 부재"
                elif sid == "IT-07":
                    fields = ["siem_security_logs_api", "critical_db_syslog_streams"]
                    missing_reason = "보안 정보 이벤트 관리(SIEM) 시스템 및 critical DB syslog 스트림 API 연동 부재"
                elif sid == "IT-10":
                    fields = ["github_gitlab_repository_api", "cicd_deployment_access_logs_api"]
                    missing_reason = "개발 리포지토리 커밋 정보와 배포 시스템 전결 API 연동 부재"
            else: # IT-02, IT-03, IT-06, IT-08, IT-09
                data_class = "E"
                rationale = "네트워크 CASB 프록시, DLP 엔드포인트 로그, 자산 솔루션 데이터 등은 제품 정체성을 이탈하여 보류"
                priority = "HOLD"
                action = "보류"
                if sid == "IT-02":
                    fields = ["network_casb_logs", "dns_queries_log"]
                    missing_reason = "사내 비승인 SaaS 사용량 모니터링을 위한 CASB/DNS 로그 수집 불가"
                elif sid == "IT-03":
                    fields = ["dlp_agent_logs", "usb_storage_logs", "email_attachment_logs"]
                    missing_reason = "임직원 대량 다운로드 감지를 위한 정보유출방지(DLP) 시스템 로그 수집 불가"
                elif sid == "IT-06":
                    fields = ["backup_system_restore_logs", "backup_agent_configs"]
                    missing_reason = "백업 복구 테스트 주기 통제를 위한 백업 솔루션 데이터 획득 불가"
                elif sid == "IT-08":
                    fields = ["security_vulnerability_scanner_logs", "patch_management_logs"]
                    missing_reason = "취약점 스캐너 및 패치 관리 솔루션 데이터 수집 불가"
                elif sid == "IT-09":
                    fields = ["identity_monitoring_logs", "multi_factor_authentication_logs"]
                    missing_reason = "계정 동시 다발 접속 감지를 위한 인증 관리자 상세 데이터 획득 불가"

        elif sid.startswith("PC"):
            # Supply Chain mode
            if sid in ["PC-04", "PC-07"]:
                data_class = "E"
                rationale = "수의계약 정당성 평가 서본 텍스트에 대한 주관적 정성 분석이나 임직원과 벤더 간의 배임/리베이트 정밀 조사는 회계 감사 범위 제외"
                priority = "HOLD"
                action = "보류"
                if sid == "PC-04":
                    fields = ["sole_source_justification_letters_text"]
                    missing_reason = "단일 수의계약 정당성 평가 서신에 대한 비정형 텍스트 유사도 정성 평가 영역"
                elif sid == "PC-07":
                    fields = ["procurement_employee_relatives_master", "consulting_company_ownership_registry"]
                    missing_reason = "구매 담당자와 사외 자문 업체 간의 리베이트를 추적하기 위한 정밀 법률 조사/forensic 영역"
            else: # PC-01, PC-02, PC-03, PC-05, PC-06, PC-08
                data_class = "C"
                rationale = "구매 RFP 제안 이력, 들러리 제안서 해시, 단가 설계 변경 대장 등 추가 원천 SCM 데이터 필요"
                priority = "P2"
                action = "추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발"
                if sid == "PC-01":
                    fields = ["bid_logs_rfq_submissions_history"]
                    missing_reason = "입찰 시스템 내 제안 가격 및 낙찰 사이클 원천 데이터 부재"
                elif sid == "PC-02":
                    fields = ["bid_proposal_files", "bid_logs_registry"]
                    missing_reason = "들러리 입찰 식별용 입찰 제안서 문서 메타데이터 원천 데이터 부재"
                elif sid == "PC-03":
                    fields = ["change_order_logs", "contract_variations_history"]
                    missing_reason = "설계 변경 로그 및 계약 세부 단가 조정 내역 원천 데이터 부재"
                elif sid == "PC-05":
                    fields = ["supplier_inventory_reports", "scm_stock_movement_logs"]
                    missing_reason = "협력사 보관 재고 원장 및 SCM 재고 흐름 데이터 부재"
                elif sid == "PC-06":
                    fields = ["receiving_quality_control_logs", "purchase_specifications"]
                    missing_reason = "자재 검수 성적서 및 구매 사양서(스펙 정보) 원천 데이터 부재"
                elif sid == "PC-08":
                    fields = ["rfq_logs", "emergency_purchase_approvals_history"]
                    missing_reason = "긴급 구매 사유서 승인 결재선 및 일상 구매 RFQ 로그 원천 데이터 부재"

        elif sid.startswith("PQ"):
            # Production/Quality mode
            data_class = "C"
            rationale = "공장 에너지 검침 스마트 미터 로그, LIMS 실험실 감사 로그, 폐기물 배출량 보고서 등 비재무적 원천 제조 데이터 필수"
            priority = "P2"
            action = "추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발"
            if sid == "PQ-01":
                fields = ["production_yield_reports", "scrap_records"]
                missing_reason = "공장 설비별 실제 제품 수율 보고서 원천 데이터 부재"
            elif sid == "PQ-02":
                fields = ["shipping_records", "qa_defect_logs"]
                missing_reason = "QA 결함 검출 이력 및 출하 통제 로그 원천 데이터 부재"
            elif sid == "PQ-03":
                fields = ["maintenance_logs", "technician_badge_attendance_logs"]
                missing_reason = "장비 유지보수 작업 일지 및 기술자 게이트 출입 태깅 로그 원천 데이터 부재"
            elif sid == "PQ-04":
                fields = ["utility_bills", "smart_meter_logs", "production_output_volume"]
                missing_reason = "공장 스마트 미터기 전력 사용 로그 및 에너지 명세 데이터 부재"
            elif sid == "PQ-05":
                fields = ["production_spec_logs", "bom_master"]
                missing_reason = "실제 투입 자재 성분표 및 표준 BOM 배합 비율 데이터 부재"
            elif sid == "PQ-06":
                fields = ["insurance_claims_records", "internal_incident_logs"]
                missing_reason = "산재 보험 청구 내역 및 사내 안전 사고 대장 원천 데이터 부재"
            elif sid == "PQ-07":
                fields = ["lims_system_audit_logs", "qa_result_db_updates"]
                missing_reason = "연구소 실험정보관리시스템(LIMS) 변경 로그 원천 데이터 부재"
            elif sid == "PQ-08":
                fields = ["machine_downtime_logs", "production_run_logs"]
                missing_reason = "설비 비동작 시간 로그 및 생산 실적 대조 원천 데이터 부재"
            elif sid == "PQ-09":
                fields = ["subcontractor_work_logs", "outsourced_timesheets"]
                missing_reason = "외주 가공 업체 투입 공수 대장 및 작업 증빙 원천 데이터 부재"
            elif sid == "PQ-10":
                fields = ["warehouse_temperature_sensor_logs", "humidity_sensor_logs"]
                missing_reason = "보관 창고 온도/습도 IoT 센서 실시간 로그 데이터 부재"

        elif sid.startswith("RV"):
            # Revenue/Accounting mode
            if sid in ["RV-02", "RV-03", "RV-05", "RV-08", "RV-09"]:
                data_class = "E"
                rationale = "서신 내 이면 계약 주관적 정성 검토, 실질 지배력 판단(회계 기준 검토) 및 공정가치 평가는 정성 감사 영역"
                priority = "HOLD"
                action = "보류"
                if sid == "RV-02":
                    fields = ["sales_contracts_text", "side_letter_agreements_database"]
                    missing_reason = "계약 서신 내 수기로 작성된 이면 합의 조항(반품권 등)에 대한 정성적 비정형 법률 검증 영역"
                elif sid == "RV-03":
                    fields = ["sales_ledger", "purchase_ledger", "remittance_loops_forensic"]
                    missing_reason = "특수관계자 간 실질적 경제 가치 없는 세금계산서 순환 흐름에 대한 정밀 포렌식 감사 영역"
                elif sid == "RV-05":
                    fields = ["cookie_jar_provisions_analysis", "historical_accruals_judgment"]
                    missing_reason = "충당부채 설정액의 과대/과소 계상에 대한 회계 법인 수준의 회계 추정 적정성 정성 판단 영역"
                elif sid == "RV-08":
                    fields = ["principal_vs_agent_contracts_review"]
                    missing_reason = "총액 매출 vs 순액 매출 표시에 대한 실질 지배력 판단(회계 기준 검토) 정성 분석 영역"
                elif sid == "RV-09":
                    fields = ["non_monetary_barter_agreements_valuation"]
                    missing_reason = "이종 자산 간 교환 거래의 공정가치 평가에 대한 세무/감정평가 영역"
            elif sid == "RV-10":
                data_class = "B"
                rationale = "GL의 가격 정보 외에 특수관계자 마스터 리스트를 통한 매핑 및 비교 검증 필요"
                fields = ["amount", "account_code", "related_party_registry"]
                missing_reason = "보조 데이터 모델(특수관계자 리스트 매핑표) 부재"
                action = "보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발"
                priority = "P2"
            else: # RV-01, RV-04, RV-06, RV-07
                data_class = "C"
                rationale = "실제 출하 내역, 공정 진척 확인서, 고객 인수증 등 추가 원천 증빙 정보 적재 필요"
                priority = "P3"
                action = "추가 원천 데이터 업로드 테이블 설계 및 파이프라인 개발"
                if sid == "RV-01":
                    fields = ["shipping_logs", "sales_invoices"]
                    missing_reason = "매출 인식 전표와 실제 출하 일자 크로스 매칭용 원천 데이터 부재"
                elif sid == "RV-04":
                    fields = ["project_milestone_completion_reports", "engineering_specs"]
                    missing_reason = "건설/SI 용역의 실제 진행률 검증용 외부 공정률 확인 원천 데이터 부재"
                elif sid == "RV-06":
                    fields = ["consignment_inventories_ledger", "distributor_sales_reports"]
                    missing_reason = "위탁 대리점의 실제 실매출 확인원 및 위탁 재고 수량 원천 데이터 부재"
                elif sid == "RV-07":
                    fields = ["installation_acceptance_certificates"]
                    missing_reason = "설치 완료 및 고객 검수 합격서 원본 대조용 원천 데이터 부재"

        elif sid.startswith("AB"):
            # Anti-Bribery mode
            if sid in ["AB-01", "AB-08", "AB-09", "AB-10"]:
                data_class = "E"
                rationale = "급행 수수료(뇌물) 판별을 위한 주관적 법적 검토, 현장 금고 물리 대조 및 출장 목적 정성 평가는 범위 외"
                priority = "HOLD"
                action = "보류"
                if sid == "AB-01":
                    fields = ["expedite_service_invoices_text", "customs_broker_contracts"]
                    missing_reason = "해외 공무원 대상 소액 급행료(Facilitation Payment) 판별을 위한 주관적 법률 검토 영역"
                elif sid == "AB-08":
                    fields = ["petty_cash_receipts", "cash_box_reconciliations"]
                    missing_reason = "소액 현금 금고 장부 실물 대조 및 현장 부조리 감사를 위한 오프라인 실사 영역"
                elif sid == "AB-09":
                    fields = ["contract_compliance_performance_reports"]
                    missing_reason = "계약 즉시 지급된 수수료의 비즈니스 타당성에 대한 정성적 법률 검증 영역"
                elif sid == "AB-10":
                    fields = ["travel_itinerary_details_text", "official_meeting_agendas"]
                    missing_reason = "공무원 출장 지원 비용의 비즈니스 연관성에 대한 컴플라이언스 정성 판단 영역"
            elif sid in ["AB-02", "AB-04", "AB-05", "AB-06"]:
                data_class = "B"
                rationale = "GL 외에 정치적 노출 인물(PEP) 명단, 고객 관계도, 출장 한도 규정 등 보조 마스터 정보 매핑 필요"
                priority = "P2"
                action = "보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발"
                if sid == "AB-02":
                    fields = ["consultant_agreements_text", "pep_list_master", "amount"]
                    missing_reason = "보조 데이터 모델(정치적 노출 인물 - PEP 리스트 및 사외 자문 계약 원장) 부재"
                elif sid == "AB-04":
                    fields = ["amount", "attendees_count", "travel_entertainment_policy_limits"]
                    missing_reason = "보조 데이터 모델(인당 향응 한도 정보 및 고객 관계 매핑표) 부재"
                elif sid == "AB-05":
                    fields = ["amount", "employee_grade_travel_policy_limits"]
                    missing_reason = "보조 데이터 모델(출장 여비 한도 규정 테이블) 부재"
                elif sid == "AB-06":
                    fields = ["amount", "sales_agent_contract_commission_rate_master"]
                    missing_reason = "보조 데이터 모델(외부 대리점/에이전트 계약 요율표 마스터) 부재"
            elif sid in ["AB-03", "AB-07"]:
                data_class = "B"
                rationale = "GL 외에 임직원 특수관계 마스터 또는 단체 기부금/후원금 검증표 등 보조 설정 데이터 필요"
                priority = "P3"
                action = "보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발"
                if sid == "AB-03":
                    fields = ["amount", "related_parties_master", "charity_representatives_registry"]
                    missing_reason = "보조 데이터 모델(임직원 및 공직자 재단 관계 매핑 레지스트리) 부재"
                elif sid == "AB-07":
                    fields = ["amount", "sponsorship_policy_master", "political_contributions_rules"]
                    missing_reason = "보조 데이터 모델(기부금/후원금 화이트리스트 테이블) 부재"

        elif sid.startswith("AML"):
            # AML mode
            if sid in ["AML-01", "AML-02", "AML-04", "AML-05", "AML-06", "AML-08", "AML-09", "AML-10"]:
                data_class = "E"
                rationale = "창구 금융 현금 거래, 국외 세관 서류 분석, 통과 계좌 실시간 스크래핑, 부동산 포렌식 및 가상자산 주소 추적은 완전히 제품 범위 외"
                priority = "HOLD"
                action = "보류"
                if sid == "AML-01":
                    fields = ["cash_deposit_records", "atm_transaction_logs"]
                    missing_reason = "자금세탁 쪼개기(Structuring) 탐지를 위한 금융권 수준의 창구 거래 및 현금 집행 추적 범위 이탈"
                elif sid == "AML-02":
                    fields = ["international_customs_cargo_invoices", "shipping_freight_docs"]
                    missing_reason = "무역 기반 자금세탁(TBML) 검증을 위한 해외 세관 인보이스 및 선하증권 실물 대조 불가"
                elif sid == "AML-04":
                    fields = ["bank_remittance_flows_realtime"]
                    missing_reason = "통과 계좌(Pass-through) 실시간 잔액 감시 및 송수금 홀딩을 위한 은행 코어 시스템 연동 불가"
                elif sid == "AML-05":
                    fields = ["loan_ledger", "creditor_relationship_profiles"]
                    missing_reason = "사채/차입금 상환 자금의 실질 원천 추적을 위한 금융 정보 접근 불가 및 정성 분석 영역"
                elif sid == "AML-06":
                    fields = ["customer_vendor_bank_remittance_names"]
                    missing_reason = "제3자 대위변제 식별을 위한 송금 수취 대행사 계약 실물 정보 부재"
                elif sid == "AML-08":
                    fields = ["luxury_asset_valuation_records", "real_estate_escrow_flows"]
                    missing_reason = "부동산/미술품 등 실물 자산 통합을 통한 자금세탁 감지 범위 이탈"
                elif sid == "AML-09":
                    fields = ["subsidiary_intercompany_transfers_forensic"]
                    missing_reason = "계열사 간 복잡한 다단계 자금 세탁 구조에 대한 정밀 포렌식 감사 영역"
                elif sid == "AML-10":
                    fields = ["cryptocurrency_wallet_addresses", "threat_intelligence_feeds"]
                    missing_reason = "다크웹 거래 및 가상자산 지갑 주소 추적을 위한 외부 블록체인 인텔리전스 인프라 부재"
            elif sid in ["AML-03", "AML-07"]:
                data_class = "B"
                rationale = "GL 외에 페이퍼 컴퍼니 식별용 화이트리스트 및 FATF 고위험 국가 코드 테이블 매핑 필요"
                priority = "P2"
                action = "보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발"
                if sid == "AML-03":
                    fields = ["vendor_address_registry", "company_website_whitelist"]
                    missing_reason = "보조 데이터 모델(유령 회사 식별용 법인 등기부 주소지 데이터베이스) 부재"
                elif sid == "AML-07":
                    fields = ["entity_id (vendor)", "fatf_highrisk_country_blacklist"]
                    missing_reason = "보조 데이터 모델(FATF 고위험 국가 및 제재 국가 코드표) 부재"

        elif sid.startswith("CL"):
            if sid in ["CL-02", "CL-03", "CL-05", "CL-06", "CL-08", "CL-09"]:
                data_class = "E"
                rationale = "PII 파일 스캐닝, 포렌식 계열사 거래 검토, 노무상 불이익 조정 확인 및 SOX 설계 평가서는 회계 감사 범위 제외"
                priority = "HOLD"
                action = "보류"
                if sid == "CL-02":
                    fields = ["shared_drives_dlp_scan_logs"]
                    missing_reason = "비정형 데이터 드라이브 내 개인정보 누출(DLP) 검색 범위 이탈"
                elif sid == "CL-03":
                    fields = ["general_ledger_remittance_loops_forensic"]
                    missing_reason = "비즈니스 타당성 없는 자금 순환 거래에 대한 정성적 포렌식 감사 영역"
                elif sid == "CL-05":
                    fields = ["hr_performance_reviews_qualitative", "whistleblower_reports"]
                    missing_reason = "내부 고발자에 대한 인사 불이익 조치 판별을 위한 주관적 인사/노무 판단 영역"
                elif sid == "CL-06":
                    fields = ["customs_declaration_logs", "export_control_classification_numbers"]
                    missing_reason = "수출 규제 품목 분류 및 국가별 세관 통관 내역 대조 범위 이탈"
                elif sid == "CL-08":
                    fields = ["executives_personal_stock_trades", "inside_information_timelines"]
                    missing_reason = "임직원 개인 주식 거래 내역 및 미공개 정보 취급 대장 연동 불가능"
                elif sid == "CL-09":
                    fields = ["sox_control_testing_sheets_qualitative"]
                    missing_reason = "SOX 내부통제 설계/운영 효과성 평가에 대한 외부 회계사의 정성 테스트 영역"
            elif sid in ["CL-01", "CL-04", "CL-07"]:
                data_class = "B"
                rationale = "GL 외에 지역별 부패 지수 마스터, UN/OFAC 제재 대상 벤더 데이터베이스 및 경쟁업체 명단 매핑 필요"
                priority = "P2"
                action = "보조 마스터 데이터 매핑표 설계 및 업로드 기능 개발"
                if sid == "CL-01":
                    fields = ["amount", "country_risk_master"]
                    missing_reason = "보조 데이터 모델(부패 고위험 지역 국가 리스트 마스터) 부재"
                elif sid == "CL-04":
                    fields = ["entity_id (vendor)", "ofac_un_sanction_lists_master"]
                    missing_reason = "보조 데이터 모델(OFAC/UN 제재 명단 마스터 데이터베이스) 부재"
                elif sid == "CL-07":
                    fields = ["amount", "competitor_name_list_master"]
                    missing_reason = "보조 데이터 모델(동종 경쟁업체 및 특수 관계 리스트 마스터) 부재"
            elif sid == "CL-10":
                data_class = "D"
                rationale = "정부 인허가 유효성 검증을 위한 인허가 발급 정보 외부 정부기관 API 실시간 연동 필요"
                fields = ["business_license_expiry_dates", "government_permit_registry_api"]
                missing_reason = "정부 인허가 조회 시스템 및 외부 기관 유효 기간 실시간 API 연동 부재"
                action = "인허가 관리 외부 시스템 연계 개발"
                priority = "P3"

        elif sid.startswith("ES"):
            data_class = "E"
            rationale = "탄소배출 증빙 검토, 분쟁광물 공급망 추적, 아동 노동 보고서 및 오프라인 재해 대조는 제품 범위 이탈"
            priority = "HOLD"
            action = "보류 (ESG 비재무적 성과 및 ESG 실무 감사 영역)"
            if sid == "ES-01":
                fields = ["carbon_offset_certificate_metadata"]
                missing_reason = "탄소배출권 인증서 진위 여부 및 이중 사용 방지 정성 평가 범위 이탈"
            elif sid == "ES-02":
                fields = ["conflict_minerals_supply_chain_tracing_records"]
                missing_reason = "분쟁 광물(3TG) 공급망 추적 보고서 분석 및 현지 실사 감사 영역"
            elif sid == "ES-03":
                fields = ["factory_labor_audit_reports"]
                missing_reason = "공장 근로 아동 실태 조사 보고서 정성 분석 범위 이탈"
            elif sid == "ES-04":
                fields = ["toxic_waste_disposal_invoices", "production_mass_balance_reports"]
                missing_reason = "환경 오염 물질 배출량 실측 및 폐기 명세 대조 정성 감사 범위 이탈"
            elif sid == "ES-05":
                fields = ["contractor_labor_status_audit_sheets"]
                missing_reason = "도급 인력의 상근 상태 및 인사 분류 정성 감사 범위 이탈"
            elif sid == "ES-06":
                fields = ["petty_cash_receipts_medical_expense", "lost_time_injury_logs"]
                missing_reason = "사고 은폐 방지를 위한 오프라인 재해 현장 대조 및 사내 소액현금 수기 검토 영역"

    return data_class, rationale, fields, evidence, missing_reason, action, priority

# Connect to the roaming DB containing all 164 scenarios
db_path = r"C:\Users\user\AppData\Roaming\com.auditflow.app\audit_data_v4.db"
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT id, category, name, description FROM custom_scenarios ORDER BY id")
scenarios = c.fetchall()
conn.close()

print(f"Loaded {len(scenarios)} scenarios from database.")

# Populate metadata
rows_data = []
for sid, cat, name, desc in scenarios:
    data_class, rationale, fields, evidence, missing_reason, action, priority = get_scenario_metadata(sid, cat, name, desc)
    impl_status = "Implemented" if evidence != "N/A" else "Unimplemented"
    rows_data.append({
        "scenario_id": sid,
        "scenario_name": name,
        "current_registry_status": "Registered",
        "current_implementation_status": impl_status,
        "required_data_class": data_class,
        "required_data_rationale": rationale,
        "required_data_fields": ", ".join(fields),
        "implementation_evidence": evidence,
        "missing_data_reason": missing_reason,
        "recommended_action": action,
        "priority": priority,
        "category": cat,
        "description": desc
    })

# Count classes
counts = {"A": 0, "B": 0, "C": 0, "D": 0, "E": 0}
for row in rows_data:
    counts[row["required_data_class"]] += 1

print(f"Counts: {counts}")

# Write to CSV
csv_headers = [
    "scenario_id", "scenario_name", "current_registry_status", 
    "current_implementation_status", "required_data_class", 
    "required_data_rationale", "required_data_fields", "implementation_evidence", 
    "missing_data_reason", "recommended_action", "priority"
]

with open("scenario_data_requirement_matrix.csv", "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=csv_headers)
    writer.writeheader()
    for row in rows_data:
        filtered_row = {k: row[k] for k in csv_headers}
        writer.writerow(filtered_row)

print("Created scenario_data_requirement_matrix.csv")

# Write to MD
md_content = f"""# AuditFlow Scenario Data Requirement & Coverage Audit Matrix

본 문서는 AuditFlow 플랫폼에 등록된 **164개 감사 시나리오** 전체에 대한 데이터 요구사항 실사 및 구현 적격성 평가 매트릭스입니다. 실제 백엔드 소스코드 분석(`src-tauri/src/`) 및 애플리케이션 데이터베이스 조회를 바탕으로 도출되었습니다.

> [!IMPORTANT]
> **원칙 및 명시적 제한 사항 (Disclaimer)**
> 1. 이번 분석에서는 "**164개 시나리오 등록**", "**7개 실제 구현 확인**", "**나머지 시나리오 데이터 요구사항 분석 중**"의 사실만을 명확히 정의하며, "164개 시나리오 지원"과 같은 오인 가능성 있는 표현은 사용하지 않습니다.
> 2. 기존 코어 판정 엔진(`audit_engine.rs`, `compliance_judge.rs`, `flux_engine.rs`) 로직은 일절 수정하지 않고, 신규 룰 코드 구현도 진행하지 않은 상태에서의 순수 순밀도 실사 리포트입니다.

## 📊 데이터 요구사항 분류 기준 및 요약 카운트
- **A. GL-only**: {counts['A']}개 (GL의 date, vendor, amount, account만으로 판단 가능)
- **B. GL + Master Data**: {counts['B']}개 (GL 외 승인거래처/임직원 마스터 등 보조 마스터 정보 필요)
- **C. Additional Source Data**: {counts['C']}개 (은행 원천 거래내역 또는 재고수불부 등 추가 원천 데이터 필요)
- **D. ERP/API Required**: {counts['D']}개 (외부 API 또는 ERP 모듈 연동 없이는 검증 불가)
- **E. Hold/Out of Scope**: {counts['E']}개 (현재 제품 범위를 벗어나거나 법률/노무 판단 의존도가 높음)
- **Total**: {len(rows_data)}개

---

## 📅 Scenario Data Requirement Matrix

| Scenario ID | Scenario Name | Registry Status | Implementation Status | Data Class | Data Class Rationale | Required Data Fields | Evidence / Location | Missing Data Reason / Gap | Recommended Action | Priority |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- | :--- | :--- | :--- | :---: |
"""

for row in rows_data:
    fields_esc = row["required_data_fields"].replace("|", "\\|")
    evidence_esc = row["implementation_evidence"].replace("|", "\\|")
    reason_esc = row["missing_data_reason"].replace("|", "\\|")
    action_esc = row["recommended_action"].replace("|", "\\|")
    rationale_esc = row["required_data_rationale"].replace("|", "\\|")
    
    p_style = f"**{row['priority']}**" if row['priority'] in ['P0', 'P1'] else row['priority']
    impl_style = f"**{row['current_implementation_status']}**" if row['current_implementation_status'] == "Implemented" else row['current_implementation_status']
    class_style = f"**{row['required_data_class']}**" if row['required_data_class'] in ['A', 'B'] else row['required_data_class']

    md_content += f"| {row['scenario_id']} | {row['scenario_name']} | {row['current_registry_status']} | {impl_style} | {class_style} | {rationale_esc} | {fields_esc} | {evidence_esc} | {reason_esc} | {action_esc} | {p_style} |\n"

with open("scenario_data_requirement_matrix.md", "w", encoding="utf-8") as f:
    f.write(md_content)

print("Created scenario_data_requirement_matrix.md")

# Write implementation priority report
priority_counts = {"P0": 0, "P1": 0, "P2": 0, "P3": 0, "HOLD": 0}
for row in rows_data:
    priority_counts[row["priority"]] += 1

priority_content = f"""# AuditFlow Scenario Implementation Priority & Roadmap

본 문서는 **164개 감사 시나리오**에 대한 데이터 획득 난이도, 비즈니스 중요도, 그리고 실제 백엔드 구현 난이도를 종합 고려하여 수립한 차세대 감사 엔진 개발 로드맵 및 우선순위 리포트입니다.

## 🎯 1. 우선순위 요약 (Priority Classification Summary)

현재 등록된 164개 시나리오의 로드맵 배치 및 우선순위 통계입니다.

* **P0 (Sprint 8 우선 구현 후보)**: {priority_counts['P0']}개 ({priority_counts['P0']/164*100:.2f}%)
* **P1 (차순위 구현 대상 - 기존 연동 데이터 활용)**: {priority_counts['P1']}개 ({priority_counts['P1']/164*100:.2f}%)
* **P2 (중기 로드맵 - 마스터 데이터 및 추가 원천 적재)**: {priority_counts['P2']}개 ({priority_counts['P2']/164*100:.2f}%)
* **P3 (장기 로드맵 - ERP 연동 및 API 연계 필요)**: {priority_counts['P3']}개 ({priority_counts['P3']/164*100:.2f}%)
* **HOLD (제품 범위 제외 또는 보류)**: {priority_counts['HOLD']}개 ({priority_counts['HOLD']/164*100:.2f}%)

---

## 🚀 2. Sprint 8 우선 구현 대상 상세 분석 (P0 후보군)

Sprint 8에서 우선적으로 Rust 코어 엔진(`ledger_engine.rs`, `compliance_dd_flow.rs` 등)에 탐지 알고리즘을 설계하고 구현할 대상들입니다. 
데이터 획득 가능성 및 선행 작업 유무에 따라 **Sprint 8A (GL-only 즉시 구현)**와 **Sprint 8B (Master Data 선행 설계)** 두 그룹으로 분리하여 관리합니다.

### 2.1 Sprint 8A: GL-only 즉시 구현 후보 (7개)
이 시나리오들은 일반 전표(GL) 원장 데이터 구조 내에 존재하는 필드들(일자, 금액, 계정코드, 거래처, 적요 등)과 간단한 통계 계산 방식만으로 백엔드 판정 연산 루프를 추가하여 **즉시 구현이 가능**한 고부가가치 감사 항목들입니다.
법인카드 사용 상세 일시(주말/심야 실제 사용 시간대) 대조 데이터가 필수인 `EX-02` 등은 카드 승인 상세 데이터(Category C) 연동 필요로 인해 본 즉시 구현 대상에서 배제되었습니다.

"""

p0a_idx = 1
for row in rows_data:
    if row["priority"] == "P0" and row["scenario_id"] not in ["PR-09", "EX-02"]:
        priority_content += f"""#### {p0a_idx}. [{row['scenario_id']}] {row['scenario_name']}
- **감사 영역 (Category)**: {row['category']}
- **데이터 요구 등급 (Data Class)**: {row['required_data_class']}
- **등급 산정 근거**: {row['required_data_rationale']}
- **필수 데이터 필드**: `{row['required_data_fields']}`
- **미구현 상세 사유**: {row['missing_data_reason']}
- **비즈니스 위험 및 징후**: {row['description']}
- **개발 권장 액션 (Recommended Action)**: {row['recommended_action']}

---
"""
        p0a_idx += 1

priority_content += """
### 2.2 Sprint 8B: Master Data 선행 설계 후 구현 후보 (1개)
이 시나리오는 실질적 감사 통제를 위해 내부 승인 거래처 화이트리스트 마스터 정보가 대조군으로 선행 설계되어야 작동 가능합니다. Sprint 8에서는 실제 탐지 엔진 코딩 이전에 데이터 구조 정의와 스키마 설계 단계를 선행 완료합니다.

"""

for row in rows_data:
    if row["priority"] == "P0" and row["scenario_id"] == "PR-09":
        priority_content += f"""#### 1. [{row['scenario_id']}] {row['scenario_name']}
- **감사 영역 (Category)**: {row['category']}
- **데이터 요구 등급 (Data Class)**: {row['required_data_class']}
- **등급 산정 근거**: {row['required_data_rationale']}
- **필수 데이터 필드**: `{row['required_data_fields']}`
- **미구현 상세 사유**: {row['missing_data_reason']}
- **비즈니스 위험 및 징후**: {row['description']}
- **개발 권장 액션 (Recommended Action)**: {row['recommended_action']}
- **[Vendor Master 최소 스키마 설계 (Minimum Schema Design)]**
  거래처 신뢰도를 평가하고 미승인 거래를 방어하기 위한 필수 마스터 데이터 모델 규격입니다.
  
  | 필드명 (Field Name) | 데이터 타입 (Data Type) | 널 허용 (Nullable) | 설명 (Description) |
  | :--- | :--- | :---: | :--- |
  | **vendor_id** | VARCHAR(50) / PK | N | 거래처 고유 관리 식별 코드 |
  | **vendor_name** | VARCHAR(100) | N | 공식 법인명 / 사업자 상호명 |
  | **business_registration_no** | VARCHAR(20) | N | 사업자등록번호 (국세청 검증용 규격) |
  | **approval_status** | VARCHAR(20) | N | 거래 허가 상태 (Approved / Pending / Rejected) |
  | **approved_date** | TIMESTAMP | Y | 거래 승인 최종 일자 |
  | **approved_by** | VARCHAR(50) | Y | 결재 최종 승인자 ID |
  | **risk_level** | VARCHAR(10) | N | 신용/거래처 위험 등급 (Low / Medium / High) |
  | **related_party_flag** | INTEGER (BOOLEAN) | N | 내부 임직원 특수관계인 해당 여부 (0: False / 1: True) |
  | **restricted_vendor_flag** | INTEGER (BOOLEAN) | N | 제한 업종/불건전 가맹점 여부 (0: False / 1: True) |
  | **active_flag** | INTEGER (BOOLEAN) | N | 현재 거래 활성화 상태 여부 (0: Inactive / 1: Active) |

---
"""

priority_content += """
## 📈 3. P1 (차순위 구현 대상 - 7개 기구현 룰 포함)
기구현 확인된 7개 룰과 함께, GL 기반으로 즉시 탐지가 가능하지만 우선순위가 차순위인 룰 목록입니다. 기구현 룰에 대해서는 지속적인 기능 고도화와 오탐율(False Positive) 제거 작업이 진행됩니다.

| Scenario ID | Scenario Name | Category | Status | Required Data Fields | Recommended Action |
| :--- | :--- | :--- | :---: | :--- | :--- |
"""

for row in rows_data:
    if row["priority"] == "P1":
        priority_content += f"| {row['scenario_id']} | {row['scenario_name']} | {row['category']} | {row['current_implementation_status']} | {row['required_data_fields']} | {row['recommended_action']} |\n"

priority_content += """
## 🛠️ 4. P2 (중기 로드맵 - 마스터 및 추가 원천 데이터 확보 대상)
보조 마스터 데이터(임직원 정보, Approved Vendor List 등)의 업로드 DDL 및 UI 인터페이스를 구축하거나, SCM 재고 수불부, 급여대장, 은행 원천 거래장 등 추가 원천 파일 업로드 기능이 선행되어야 작동 가능한 룰입니다.

| Scenario ID | Scenario Name | Category | Data Class | Required Data Fields | Recommended Action |
| :--- | :--- | :--- | :---: | :--- | :--- |
"""

for row in rows_data:
    if row["priority"] == "P2":
        priority_content += f"| {row['scenario_id']} | {row['scenario_name']} | {row['category']} | {row['required_data_class']} | {row['required_data_fields']} | {row['recommended_action']} |\n"

priority_content += """
## 🔗 5. P3 (장기 로드맵 - 외부 시스템 API 및 ERP 연동 대상)
실시간 국세청 휴폐업 조회 API, 은행 계좌 실시간 스크래핑 연동, ERP 변경 이력 감사 로그 연동 등 인프라 시스템 연계가 필수적인 장기 검토 대상입니다.

| Scenario ID | Scenario Name | Category | Data Class | Required Data Fields | Recommended Action |
| :--- | :--- | :--- | :---: | :--- | :--- |
"""

for row in rows_data:
    if row["priority"] == "P3":
        priority_content += f"| {row['scenario_id']} | {row['scenario_name']} | {row['category']} | {row['required_data_class']} | {row['required_data_fields']} | {row['recommended_action']} |\n"

priority_content += """
## 🛑 6. HOLD (현재 제품 범위 외 - 보류 대상)
데이터 확보 난이도가 매우 높거나(예: 다크웹 모니터링, Ransomware Beacons, Rootkit 탐지 등 보안 도메인), 노동법/세무법/ESG 감사 등 정성적 컴플라이언스 및 법적 판단이 수반되는 영역으로, 현 AuditFlow의 GL 기반 비즈니스 감사 엔진 범위에서 제외됩니다.

| Scenario ID | Scenario Name | Category | Data Class | Required Data Fields | Reason for Hold |
| :--- | :--- | :--- | :---: | :--- | :--- |
"""

for row in rows_data:
    if row["priority"] == "HOLD":
        priority_content += f"| {row['scenario_id']} | {row['scenario_name']} | {row['category']} | {row['required_data_class']} | {row['required_data_fields']} | {row['missing_data_reason']} |\n"

with open("scenario_implementation_priority.md", "w", encoding="utf-8") as f:
    f.write(priority_content)

print("Created scenario_implementation_priority.md")
