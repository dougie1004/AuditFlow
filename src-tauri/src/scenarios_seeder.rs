use rusqlite::{params, Connection};
use serde_json::json;

pub fn seed_master_scenarios(conn: &mut Connection) -> Result<(), String> {
    // 1. Delete old system master records
    let _ = conn.execute("DELETE FROM custom_scenarios WHERE origin_audit_type = '시스템 마스터'", []);

    let mut scenarios: Vec<(String, &str, &str, &str, &str, &str)> = Vec::new();

    macro_rules! p {
        ($id:expr, $cat:expr, $name:expr, $risk:expr, $desc:expr) => {
            scenarios.push(($id.to_string(), $cat, $name, $risk, $desc, ""));
        };
        ($id:expr, $cat:expr, $name:expr, $risk:expr, $desc:expr, $recom:expr) => {
            scenarios.push(($id.to_string(), $cat, $name, $risk, $desc, $recom));
        };
    }

    // --- Procurement (PR) 10 ---
    p!("PR-01".to_string(), "Procurement", "담합 의심 (Bid-rigging)", "High", "동일 IP 또는 유사 제안서 패턴을 가진 업체 식별.");
    p!("PR-02".to_string(), "Procurement", "품의 분할 (Split PO)", "Medium", "결재 한도를 회피하기 위해 단일 계약을 소액 PO로 분할.");
    p!("PR-03".to_string(), "Procurement", "시장가 격차 (Market Price Gap)", "High", "시장 기준가보다 현저히 높은 가격으로 구매.");
    p!("PR-04".to_string(), "Procurement", "Conflict of Interest", "High", "Vendor registered by employee's relative or friend.");
    p!("PR-05".to_string(), "Procurement", "Sole Source Overreliance", "Medium", "Excessive reliance on a single vendor without competitive bidding.");
    p!("PR-06".to_string(), "Procurement", "Zombie Vendor Payments", "High", "Payments to inactive or non-existent vendors.");
    p!("PR-07".to_string(), "Procurement", "Kickback Signal", "High", "Specially requested vendors with sudden volume spikes.");
    p!("PR-08".to_string(), "Procurement", "Contract Variation Abuse", "Medium", "Initial low bid followed by frequent price increases.");
    p!("PR-09".to_string(), "Procurement", "Unauthorized Vendor", "High", "Buying from vendors not in the Approved Vendor List (AVL).");
    p!("PR-10".to_string(), "Procurement", "Advance Payment Non-performance", "High", "Project stuck at 0% after advance payment.");

    // --- Sales/AR (SA) 10 ---
    p!("SA-01".to_string(), "Sales/AR", "Channel Stuffing", "High", "Sales concentration in the last 3 days of the quarter.");
    p!("SA-02".to_string(), "Sales/AR", "Unusual Returns", "High", "Massive returns immediately after quarter-end.");
    p!("SA-03".to_string(), "Sales/AR", "Credit Limit Override", "High", "Sales to customers exceeding credit limits.");
    p!("SA-04".to_string(), "Sales/AR", "AR Aging Manipulation", "High", "Refreshing old debts to avoid bad debt provisions.");
    p!("SA-05".to_string(), "Sales/AR", "Unauthorized Discounts", "Medium", "Manual rebates applied without proper workflow.");
    p!("SA-06".to_string(), "Sales/AR", "Circular Trading", "High", "A-B-C-A trade flows without economic substance.");
    p!("SA-07".to_string(), "Sales/AR", "Revenue Cut-off Error", "Medium", "Recognizing revenue before delivery or acceptance.");
    p!("SA-08".to_string(), "Sales/AR", "Duplicate Sales Recognition", "High", "Same SKU sold multiple times to different customers.");
    p!("SA-09".to_string(), "Sales/AR", "Customer Master Fraud", "High", "Sales spikes after customer master data changes.");
    p!("SA-10".to_string(), "Sales/AR", "Rebate Overcalculation", "Medium", "Rebate ratios significantly higher than company average.");

    // --- Inventory (IN) 10 ---
    p!("IN-01".to_string(), "Inventory", "Shrinkage Peak", "High", "Inventory loss rate exceeding 2.5% in specific centers.");
    p!("IN-02".to_string(), "Inventory", "Phantom Inventory", "High", "Inventory recorded in system but non-existent physically.");
    p!("IN-03".to_string(), "Inventory", "Obsolete Stock Concealment", "Medium", "Failure to write down slow-moving or obsolete stock.");
    p!("IN-04".to_string(), "Inventory", "Inventory Cycle Abuse", "Medium", "Manipulating counts during cycle counts.");
    p!("IN-05".to_string(), "Inventory", "Unauthorized Scrapping", "High", "Writing off usable items as scrap for personal gain.");
    p!("IN-06".to_string(), "Inventory", "Valuation Skew", "Medium", "Incorrect FIFO/Weighted average calculations to boost assets.");
    p!("IN-07".to_string(), "Inventory", "Loading Dock Weakness", "High", "Discrepancies in gate pass and physical exit.");
    p!("IN-08".to_string(), "Inventory", "Inter-company Transfer Loop", "Medium", "Inventory moving between branches without sales.");
    p!("IN-09".to_string(), "Inventory", "Sample Asset Leakage", "Medium", "Excessive sampling without return or tracking.");
    p!("IN-10".to_string(), "Inventory", "BOM Discrepancy", "High", "Material usage not matching Production BOM output.");

    // --- HR/Payroll (HR) 10 ---
    p!("HR-01".to_string(), "HR/Payroll", "Ghost Payroll Entry", "High", "Payments to terminated or non-existent staff.");
    p!("HR-02".to_string(), "HR/Payroll", "Overtime Fraud", "Medium", "Badge logs not matching overtime claims.");
    p!("HR-03".to_string(), "HR/Payroll", "Benefit Scoping", "Low", "Non-eligible staff receiving specialized allowances.");
    p!("HR-04".to_string(), "HR/Payroll", "Severance Manipulation", "High", "Backdated joining dates to boost severance pay.");
    p!("HR-05".to_string(), "HR/Payroll", "Ghost Training", "Medium", "Training expenses without attendee lists or certificates.");
    p!("HR-06".to_string(), "HR/Payroll", "Duplicate Benefit Payout", "Low", "Receiving the same performance award twice.");
    p!("HR-07".to_string(), "HR/Payroll", "Unauthorized Pay Raise", "High", "System salary update without HRBP approval record.");
    p!("HR-08".to_string(), "HR/Payroll", "Expat Housing Abuse", "Medium", "Rent exceeding regional limits for executives.");
    p!("HR-09".to_string(), "HR/Payroll", "Family Hiring Proxy", "High", "Hiring employee relatives for fake roles.");
    p!("HR-10".to_string(), "HR/Payroll", "Dossier Access Abuse", "High", "Unauthorized access to sensitive personal dossiers.");

    // --- Finance/Accounting (FA) 10 ---
    p!("FA-01".to_string(), "Finance/Accounting", "Inter-office Suspense", "High", "Suspense accounts not cleared for > 90 days.");
    p!("FA-02".to_string(), "Finance/Accounting", "Manual Journal Abuse", "High", "Postings at 11 PM or by unauthorized users.");
    p!("FA-03".to_string(), "Finance/Accounting", "FX Gain Shifting", "Medium", "Manipulating FX rates for inter-company settlements.");
    p!("FA-04".to_string(), "Finance/Accounting", "Expense Under-accrual", "High", "Delaying expense recognition to boost profit.");
    p!("FA-05".to_string(), "Finance/Accounting", "Tax Refund Leakage", "Medium", "VAT refund notifications not matched in books.");
    p!("FA-06".to_string(), "Finance/Accounting", "Asset Capitalization Bias", "Medium", "Postponing depreciation or over-capitalizing minor repairs.");
    p!("FA-07".to_string(), "Finance/Accounting", "Dividend Compliance", "High", "Dividends paid without requisite board approval.");
    p!("FA-08".to_string(), "Finance/Accounting", "Restricted Cash Leak", "High", "Using restricted deposit for general operations.");
    p!("FA-09".to_string(), "Finance/Accounting", "Related Party Omission", "High", "Inter-company transactions missing from disclosure.");
    p!("FA-10".to_string(), "Finance/Accounting", "Audit Trail Deletion", "High", "System logs deleted for key financial tables.");

    // --- Expense/Travel (EX) 10 ---
    p!("EX-01".to_string(), "Expense/Travel", "Spilling Receipt", "High", "Multiple receipts from same merchant in 10 mins.");
    p!("EX-02".to_string(), "Expense/Travel", "Weekend/Night Usage", "Medium", "Corporate card usage after 11 PM or on Sundays.");
    p!("EX-03".to_string(), "Expense/Travel", "Remote Area Travel", "High", "Usage in cities without business travel plans.");
    p!("EX-04".to_string(), "EX Sector", "Luxury Item Purchase", "High", "Purchasing luxury goods or jewelry on corporate card.");
    p!("EX-05".to_string(), "EX Sector", "Duplicate Airfare", "Medium", "Claiming same flight via card and reimbursement.");
    p!("EX-06".to_string(), "EX Sector", "Mileage Personal Gain", "Low", "Transferring corporate travel miles to personal account.");
    p!("EX-07".to_string(), "EX Sector", "No-show Refund Fraud", "High", "Personal receipt of refund from cancelled corporate travel.");
    p!("EX-08".to_string(), "EX Sector", "Hidden Entertainment", "Medium", "Booking entertainment as 'Training/Education'.");
    p!("EX-09".to_string(), "EX Sector", "Commuter Fuel Abuse", "Low", "Fuel claims during non-work hours for personal cars.");
    p!("EX-10".to_string(), "EX Sector", "Subscription Shadow IT", "Medium", "Recurring SaaS payments without IT approval.");

    // --- Production/Quality (PQ) 10 ---
    p!("PQ-01".to_string(), "Production/Quality", "Yield Manipulation", "High", "Over-reporting yield to mask production waste.");
    p!("PQ-02".to_string(), "Production/Quality", "Defect Concealment", "High", "Shipping known defective items to meet quotas.");
    p!("PQ-03".to_string(), "Production/Quality", "Maintenance Log Fraud", "Medium", "Maintenance logged without technician badge entry.");
    p!("PQ-04".to_string(), "Production/Quality", "Energy Usage Spike", "Medium", "Sudden energy jump without production increase.");
    p!("PQ-05".to_string(), "Production/Quality", "Non-spec Material Use", "High", "Using cheaper raw materials than specified in BOM.");
    p!("PQ-06".to_string(), "Production/Quality", "Safety Incident Omission", "High", "Insurance claims found without internal incident report.");
    p!("PQ-07".to_string(), "Production/Quality", "QA Stamp Override", "High", "Direct DB update of QA results bypassing lab system.");
    p!("PQ-08".to_string(), "Production/Quality", "Excessive Down-time", "Medium", "Reporting downtime to hide unauthorized production.");
    p!("PQ-09".to_string(), "Production/Quality", "Subcontractor Over-usage", "Medium", "Outsourcing work that could be done in-house.");
    p!("PQ-10".to_string(), "Production/Quality", "Storage Condition Breach", "Medium", "Temperature logs showing multiple threshold breaches.");

    // --- IT/Security (IT) 10 ---
    p!("IT-01".to_string(), "IT/Security", "Access Privilege Escalation", "High", "Temporary admin rights granted and not revoked.");
    p!("IT-02".to_string(), "IT/Security", "Shadow IT Usage", "High", "Unapproved SaaS apps storing PII / company data.");
    p!("IT-03".to_string(), "IT/Security", "Data Exfiltration Signal", "High", "Large downloads by resignation-intent employees.");
    p!("IT-04".to_string(), "IT/Security", "Ghost Access", "High", "Active accounts for terminated employees.");
    p!("IT-05".to_string(), "IT/Security", "VPN Access Anomaly", "High", "VPN logins from restricted/high-risk countries.");
    p!("IT-06".to_string(), "IT/Security", "Backup Non-compliance", "Medium", "Failure to perform restore tests for > 180 days.");
    p!("IT-07".to_string(), "IT/Security", "System Log Inactivity", "High", "No security logs generated for critical DB for 24h.");
    p!("IT-08".to_string(), "IT/Security", "Unpatched Vulnerability", "Medium", "Critical-rated vulnerabilities open for > 90 days.");
    p!("IT-09".to_string(), "IT/Security", "Shared Account Usage", "Medium", "Mass logins to one shared account from many IPs.");
    p!("IT-10".to_string(), "IT/Security", "Dev/Ops SoD Violation", "High", "Developer committing code and deploying to Prod.");

    // --- Compliance/Legal (CL) 10 ---
    p!("CL-01".to_string(), "Compliance/Legal", "FCPA - Success Fee", "High", "Large fees paid to agents in high-risk regions.");
    p!("CL-02".to_string(), "Compliance/Legal", "GDPR PII Leak", "High", "Unencrypted PII discovered in open shared drives.");
    p!("CL-03".to_string(), "Compliance/Legal", "AML - Round-tripping", "High", "Funds looping A-B-A without business reasons.");
    p!("CL-04".to_string(), "Compliance/Legal", "Sanctions Hit", "High", "Matching vendor name against OFAC/UN lists.");
    p!("CL-05".to_string(), "Compliance/Legal", "Whistleblower Retaliation", "High", "Negative performance review post-report.");
    p!("CL-06".to_string(), "Compliance/Legal", "Export Control Breach", "High", "Shipping restricted tech to non-approved nations.");
    p!("CL-07".to_string(), "Compliance/Legal", "Antitrust Meeting", "High", "Recurrent T&E with direct competitors.");
    p!("CL-08".to_string(), "Compliance/Legal", "Insider Trading Signal", "High", "Exec trades immediately prior to profit warning.");
    p!("CL-09".to_string(), "Compliance/Legal", "SOX Control Failure", "High", "Key control not performed for 12 consecutive months.");
    p!("CL-10".to_string(), "Compliance/Legal", "Permit Expiry", "Medium", "Operating business without valid license/permit.");

    // ---深化 Corporate Card (CC) 10 ---
    p!("CC-01".to_string(), "Corp Card", "Merchant Category Fraud", "High", "Payments at restricted MCC (Nightclub, Jewelry).");
    p!("CC-02".to_string(), "Corp Card", "Personal Grocery Expense", "Medium", "Bulk grocery orders at discount marts.");
    p!("CC-03".to_string(), "Corp Card", "Cash Withdrawal", "High", "ATM withdrawals from corporate credit cards.");
    p!("CC-04".to_string(), "Corp Card", "Insurance/Tax Mix", "Low", "Paying personal tax/fine on company card.");
    p!("CC-05".to_string(), "Corp Card", "Third-party Delivery", "Medium", "High-volume delivery to non-office address.");
    p!("CC-06".to_string(), "Corp Card", "Recurring Unvouched", "High", "Subscriptions without digital receipt upload.");
    p!("CC-07".to_string(), "Corp Card", "Flight Class Violation", "Medium", "Booking First Class when only Economy is allowed.");
    p!("CC-08".to_string(), "Corp Card", "Hotel Spoilage", "Medium", "Mini-bar/Spa expenses included in room bill.");
    p!("CC-09".to_string(), "Corp Card", "Gift Card Laundering", "High", "Purchasing rechargeable gift cards at CVS.");
    p!("CC-10".to_string(), "Corp Card", "Ghost Merchant", "High", "Usage at dormant or non-existent business license.");

    // --- Anti-Bribery / FCPA / UK Bribery Act (AB) ---
    p!("AB-01".to_string(), "Anti-Bribery", "Facilitation Payment", "High", "Frequent small payments to 'Expediting Service' or 'Customs Broker'.");
    p!("AB-02".to_string(), "Anti-Bribery", "Shadow Hiring", "High", "Hiring relatives of government officials (PEP) as consultants.");
    p!("AB-03".to_string(), "Anti-Bribery", "Charitable Conduit", "High", "Donations to charities personally linked to decision makers.");
    p!("AB-04".to_string(), "Anti-Bribery", "Excessive Hospitality", "Medium", "Entertainment expenses > $500/person for government clients.");
    p!("AB-05".to_string(), "Anti-Bribery", "Per Diem Abuse", "Medium", "Cash per diem paid to officials during site visits > policy limits.");
    p!("AB-06".to_string(), "Anti-Bribery", "Third-Party High Commission", "High", "Sales agent commission > 15% without clear deliverables.");
    p!("AB-07".to_string(), "Anti-Bribery", "Political Contribution Masking", "High", "Sponsorships that appear to be political funding.");
    p!("AB-08".to_string(), "Anti-Bribery", "Off-book Account", "High", "Use of 'Petty Cash' to pay for sensitive permits/licenses.");
    p!("AB-09".to_string(), "Anti-Bribery", "Success Fee Anomaly", "High", "Lump sum payment immediately after contract award.");
    p!("AB-10".to_string(), "Anti-Bribery", "Training Trip Junket", "High", "Covering travel for officials to non-business tourist destinations.");

    // --- Anti-Money Laundering (AML) ---
    p!("AML-01".to_string(), "AML", "Structuring (Smurfing)", "High", "Multiple cash deposits just under reporting threshold ($10k).");
    p!("AML-02".to_string(), "AML", "Trade-Based Laundering", "High", "Over-invoicing or under-invoicing goods to move value across borders.");
    p!("AML-03".to_string(), "AML", "Shell Company Invoice", "High", "Payments to vendors with PO Box address and no web presence.");
    p!("AML-04".to_string(), "AML", "Flow-Through Account", "High", "Funds received and immediately transferred out (Pass-through).");
    p!("AML-05".to_string(), "AML", "Early Repayment Anomaly", "Medium", "Loan accumulation followed by sudden lump-sum repayment from unknown source.");
    p!("AML-06".to_string(), "AML", "Third-Party Payer", "High", "Receiving payments from entity unrelated to the invoice/contract.");
    p!("AML-07".to_string(), "AML", "Jurisdiction High Risk", "High", "Transactions involving FATF blacklisted countries.");
    p!("AML-08".to_string(), "AML", "Integration Signal", "High", "Purchase of luxury assets (Real Estate/Art) with unclear funds.");
    p!("AML-09".to_string(), "AML", "Layering Pattern", "High", "Complex web of transfers between subsidiaries without logic.");
    p!("AML-10".to_string(), "AML", "Dark Web Interaction", "High", "Wallet addresses linked to known darknet markets.");

    // --- Advanced Revenue / Accounting (RV) ---
    p!("RV-01".to_string(), "Revenue/Accounting", "Bill and Hold Scheme", "High", "Invoicing for goods not yet shipped to meet target.");
    p!("RV-02".to_string(), "Revenue/Accounting", "Side Letter Agreement", "High", "Hidden terms allowing return of goods (Right of Return) ignoring rev-rec rules.");
    p!("RV-03".to_string(), "Revenue/Accounting", "Round Tripping", "High", "Selling to a funded partner who sells back (inflating revenue).");
    p!("RV-04".to_string(), "Revenue/Accounting", "Percentage of Completion Abuse", "Medium", "Aggressive milestone completion claiming to accelerate revenue.");
    p!("RV-05".to_string(), "Revenue/Accounting", "Cookie Jar Reserves", "High", "Over-accruing expenses in good years to smooth future earnings.");
    p!("RV-06".to_string(), "Revenue/Accounting", "Consignment as Sales", "Medium", "Booking revenue for goods sent to distributors on consignment.");
    p!("RV-07".to_string(), "Revenue/Accounting", "Premature Recognition", "High", "Booking revenue before acceptance criteria met (e.g., Installation).");
    p!("RV-08".to_string(), "Revenue/Accounting", "Gross vs Net Presentation", "Medium", "Reporting agent revenue as gross principal revenue.");
    p!("RV-09".to_string(), "Revenue/Accounting", "Barter Transaction", "Medium", "Non-monetary exchange recorded at inflated fair value.");
    p!("RV-10".to_string(), "Revenue/Accounting", "Related Party Pricing", "High", "Transfer pricing deviations not at arm's length.");

    // --- Supply Chain & Collusion (PC) ---
    p!("PC-01".to_string(), "Supply Chain", "입찰 로테이션 (Bid Rotation)", "High", "낙찰 업체가 특정 순서(A->B->A)로 순환되는 패턴.");
    p!("PC-02".to_string(), "Supply Chain", "유령 입찰 (Phantom Bids)", "High", "낙찰업체가 허위로 생성한 들러리 입찰 징후 식별.");
    p!("PC-03".to_string(), "Supply Chain", "설계 변경 남용 (Change Order)", "High", "저가 투찰 후 즉각적인 설계 변경을 통한 단가 상승.");
    p!("PC-04".to_string(), "Supply Chain", "Exclusive Distributor Mockery", "Medium", "Sole source justification letter copied from previous year.");
    p!("PC-05".to_string(), "Supply Chain", "Inventory Parking", "High", "Suppliers holding conflicting inventory records to hide obsolescence.");
    p!("PC-06".to_string(), "Supply Chain", "Product Substitution", "High", "Delivering lower grade specs than contracted/invoiced.");
    p!("PC-07".to_string(), "Supply Chain", "Kickback - Consultant", "High", "Consulting fees paid to entity linked to procurement officer.");
    p!("PC-08".to_string(), "Supply Chain", "Emergency Purchase Loop", "Medium", "Routine items purchased as 'Emergency' to bypass bidding.");

    // --- Tech & Cyber (ITX) ---
    p!("ITX-01".to_string(), "IT Security", "Rootkit Signal", "High", "System binaries modified timestamp mismatch.");
    p!("ITX-02".to_string(), "IT Security", "Unauthorized Port Forwarding", "High", "Internal host behaving as proxy.");
    p!("ITX-03".to_string(), "IT Security", "API Key Leakage", "High", "Hardcoded secrets found in public repo commits.");
    p!("ITX-04".to_string(), "IT Security", "Log Wiping", "High", "Security event logs cleared (EventID 1102).");
    p!("ITX-05".to_string(), "IT Security", "Ransomware Precursor", "High", "PsExec / CobaltStike beacon communication detected.");

    // --- ESG & Sustainability (ES) ---
    p!("ES-01".to_string(), "ESG", "Greenwashing - Carbon", "High", "Carbon offset certificates reused or invalid key.");
    p!("ES-02".to_string(), "ESG", "Conflict Minerals", "High", "Supply chain trace missing for 3TG (Tin, Tantalum, Tungsten, Gold).");
    p!("ES-03".to_string(), "ESG", "Child Labor Indicator", "High", "Factory audit age verification records missing.");
    p!("ES-04".to_string(), "ESG", "Toxic Waste Dumping", "High", "Disposal volume mismatch vs production mass balance.");
    p!("ES-05".to_string(), "ESG", "Diversity Quota Fraud", "Medium", "Categorizing contractors as full-time to meet diversity stats.");
    p!("ES-06".to_string(), "ESG", "Safety Accident Cover-up", "High", "Medical expenses paid via petty cash to hide 'Lost Time Injury'.");

    // --- Financial Integrity Master Class (FI) ---
    p!("FF-01".to_string(), "Financial Integrity", "Rapid Money Cycling (Ping-pong)", "Critical", "Detecting funds exiting the corporate account and returning via related parties within 24 hours.");
    p!("FF-02".to_string(), "Financial Integrity", "Lapping & Ledger Delay", "High", "Identifying 2+ day delays between bank inflow and ledger booking to cover previous fund gaps.");
    p!("FF-03".to_string(), "Financial Integrity", "Registered Vendor Mismatch", "Critical", "Booked as 'Corporate Vendor' but actual bank recipient is an individual personal account.");
    p!("FF-04".to_string(), "Financial Integrity", "Structured Threshold Monitor", "High", "Detecting multiple transactions of $9,900 just below the $10,000 reporting threshold.");
    p!("FF-05".to_string(), "Financial Integrity", "Inactive Project Account Drain", "High", "Large unexplained transfers from project accounts that have been inactive for > 12 months.");

    // --- Ledger-Only Mode Top 10 (LDG) ---
    p!("LDG-01".to_string(), "Ledger-Only", "고액 상위 1% 전표 리스트", "High", "금액 기준 상위 1%에 해당하는 전표 자동 추출.", "해당 전표의 승인 문서 및 계약서를 요청하세요.");
    p!("LDG-02".to_string(), "Ledger-Only", "라운드 금액 반복 패턴", "Medium", "100,000 / 1,000,000 등 라운드 숫자가 반복되는 전표 식별.", "해당 금액 기준 승인 한도 정책을 확인하세요.");
    p!("LDG-03".to_string(), "Ledger-Only", "동일 금액 반복 발생 (Short Interval)", "High", "동일 거래처에 대해 동일 금액이 수일 내 반복 발생.", "해당 기간 카드 승인 내역과 매칭하여 분할 결제 여부를 확인하세요.");
    p!("LDG-04".to_string(), "Ledger-Only", "주말 / 공휴일 고액 전표", "High", "비업무 시간대에 발생한 고액(500만원 이상) 전표.", "비상 승인 프로세스 존재 여부 및 주말 근무 기록을 확인하세요.");
    p!("LDG-05".to_string(), "Ledger-Only", "계정 사용 액티비티 변동 (Account Volatility)", "Medium", "전월 대비 사용 빈도가 300% 이상 급증한 계정 과목.", "해당 부서의 사업 계획 변경이나 예산 추가 전용 여부를 확인하세요.");
    p!("LDG-06".to_string(), "Ledger-Only", "특정 부서 집중 거래 (Departmental Outlier)", "Medium", "특정 벤더에 대해 특정 부서의 집행 비중이 90% 이상인 경우.", "해당 벤더와 부서 담당자 간의 유착 가능성을 검토하세요.");
    p!("LDG-07".to_string(), "Ledger-Only", "적요 키워드 위험 탐지", "High", "적요 내 '상품권', '자문료', '정산' 등 위험 키워드 포함.", "실제 수령자 증빙 및 자문 결과물 등의 실질 증거를 요청하세요.");
    p!("LDG-08".to_string(), "Ledger-Only", "승인 한도 경계선 거래 (Threshold Pattern)", "High", "전결 한도(예: 300만, 500만) 직전 금액(예: 299만)의 다수 발생.", "승인 권한 매트릭스(LoA)를 확인하고 고의적 우회 여부를 검토하세요.");
    p!("LDG-09".to_string(), "Ledger-Only", "신규 원장/거래처 급증 (New Vendor Spike)", "Medium", "등록된 지 1개월 미만인 거래처로의 고액 송금 신호.", "거래처 실재성 점검(사업자 등록증, 등기부등본 확인)을 수행하세요.");
    p!("LDG-10".to_string(), "Ledger-Only", "벤더 노출도 분석 (Vendor Concentration)", "High", "전체 매입 중 특정 소수 벤더에 대한 의존도 급증.", "독점 공급 계약의 정당성 및 경쟁 입찰 미실시 사유를 확인하세요.");

    let config = crate::config::get_config();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for (id, cat, name, risk, desc, recom) in scenarios {
        let rules = match cat {
            "Procurement" => json!({
                "logic": "Check for vendor IP matches, split PO patterns (multiple sums close to threshold), and market price deviations.",
                "keywords": ["bid", "tender", "rigging", "vendor", "IP", "contract"],
                "threshold": config.detection_thresholds.procurement,
                "auto_suggestion": recom
            }).to_string(),
            "Expense/Travel" | "EX Sector" => json!({
                "logic": "Detect weekend usage, late night transactions (22:00-05:00), and duplicate merchant receipts within 30 minutes.",
                "keywords": ["card", "receipt", "meal", "entertainment", "night", "weekend"],
                "threshold": config.detection_thresholds.expense,
                "auto_suggestion": recom
            }).to_string(),
            "Ledger-Only" => json!({
                "logic": desc,
                "keywords": ["ledger", "pattern", "statistical"],
                "auto_suggestion": recom
            }).to_string(),
            _ => json!({
                "logic": format!("Analyze data for {} risks specifically focusing on {} patterns.", cat, name),
                "keywords": name.to_lowercase().split_whitespace().collect::<Vec<_>>(),
                "auto_suggestion": recom
            }).to_string()
        };

        let prompt_template = format!(
            "Analyze the provided audit data for '{}' ({}). Look for patterns matching: {}. If found, extract details as JSON. Recommendation: {}",
            name, cat, desc, recom
        );

        let origin = if id.starts_with("LDG") { "Ledger-Only Case" } else { "시스템 마스터" };

        let _ = tx.execute(
            "INSERT OR IGNORE INTO custom_scenarios (id, category, name, risk_level, description, rules, ai_prompt_template, origin_audit_type, is_ai_generated) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![id, cat, name, risk, desc, rules, prompt_template, origin, 0]
        );
    }
    tx.commit().map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn test_master_scenarios_integrity() {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute(
            "CREATE TABLE custom_scenarios (
                id TEXT PRIMARY KEY, 
                category TEXT NOT NULL, 
                name TEXT NOT NULL, 
                risk_level TEXT NOT NULL, 
                description TEXT NOT NULL, 
                rules TEXT,
                ai_prompt_template TEXT,
                origin_audit_type TEXT, 
                is_ai_generated INTEGER DEFAULT 0
            )", 
            []
        ).unwrap();

        seed_master_scenarios(&mut conn).unwrap();
        
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM custom_scenarios", [], |r| r.get(0)).unwrap();
        println!(">>> [TEST] Seeded {} scenarios", count);
        
        assert!(count >= 150, "Expected at least 150 master scenarios, found {}", count);
        
        // Check for specific scenario presence
        let name: String = conn.query_row("SELECT name FROM custom_scenarios WHERE id = 'PR-01'", [], |r| r.get(0)).unwrap();
        assert_eq!(name, "담합 의심 (Bid-rigging)");

        // Check for rules content
        let rules: String = conn.query_row("SELECT rules FROM custom_scenarios WHERE id = 'EX-02'", [], |r| r.get(0)).unwrap();
        assert!(rules.contains("late night"), "EX-02 rules should contain late night detection logic");
    }
}
