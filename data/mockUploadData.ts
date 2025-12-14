import { MockUploadFile } from '../types';

export const MOCK_UPLOAD_FILES: MockUploadFile[] = [
  { 
    name: 'general_ledger_2023.xlsx', 
    type: 'Excel', 
    size: '15.2 MB', 
    category: 'FSC',
    content: `
"Journal_ID","Date","Account","Debit","Credit","Description","Entered_By","Approved_By"
"JE-20231105-014","2023-11-05","101001 - Cash","5000.00","","Regular Deposit","auto-proc","SYSTEM"
"JE-20231105-015","2023-11-05","505001 - Misc Expense","75200.00","","Urgent adjustment for Q3 marketing campaign overrun","chulsoo.kim","chulsoo.kim"
"JE-20231105-016","2023-11-05","101001 - Cash","","75200.00","To balance JE-20231105-015","chulsoo.kim","chulsoo.kim"
"JE-20231106-001","2023-11-06","401001 - Sales Revenue","","120000.00","Invoice INV-1001","auto-proc","SYSTEM"
... (15,234 more rows)
`
  },
  { 
    name: 'wire_transfer_log_Q4.csv', 
    type: 'CSV', 
    size: '2.1 MB', 
    category: 'TRE',
    content: `
"TransferID","Timestamp","Amount","Currency","Beneficiary","Requester_ID","Approver_ID"
"WT-231005-001","2023-10-05 10:15:21","25000.00","USD","Global Tech Inc.","E2045","E1002"
"WT-231007-005","2023-10-07 14:30:00","18000.00","USD","Innovate Solutions","E3001","E1002"
"WT-231009-002","2023-10-09 09:05:11","50000.00","USD","Zeta Supplies","E1023","E1023"
... (2,100 more rows)
`
  },
  { 
    name: 'corp_card_transactions_2023.xlsx', 
    type: 'Excel', 
    size: '8.5 MB', 
    category: 'EXP',
    content: `
"Transaction_ID","Employee_ID","Timestamp","Merchant_Name","Amount_KRW","Category"
"TXN001","E1023","2023-11-18 20:30:00","강남면옥","58000","음식점"
"TXN002","E1023","2023-11-18 22:15:00","CGV 강남","32000","여가"
"TXN003","E2045","2023-11-19 14:00:00","골프존파크 판교","150000","접대"
"TXN004","E3001","2023-11-17 23:50:00","상암 주유소","70000","교통"
... (8,543 more rows)
`
  },
  { 
    name: 'receipts_scans_nov.pdf', 
    type: 'PDF', 
    size: '25.7 MB', 
    category: 'EXP',
    content: `
[Simulated PDF Content]

-----------------------------------------
      ** 강남면옥 **
      (선릉점)
      사업자: 123-45-67890
      대표: 홍길동
-----------------------------------------
      주문일시: 2023-11-18 20:30
      
      갈비찜 (대) x 1 ........... 58,000
      -----------------------------
      합계: 58,000
      
      카드결제: 58,000
      승인번호: 12345678
-----------------------------------------

... (Thousands of other scanned receipt images)
`
  },
  { 
    name: 'sales_orders_2023.csv', 
    type: 'CSV', 
    size: '12.3 MB', 
    category: 'OTC',
    content: `
"Order_ID","Customer_ID","Date","Product_ID","Quantity","Unit_Price","Total_Price","Credit_Limit_Exceeded"
"SO-2023-001","CUST-001","2023-01-05","PROD-A",100,50.00,5000.00,"FALSE"
"SO-2023-002","CUST-002","2023-01-08","PROD-B",20,150.00,3000.00,"FALSE"
"SO-2023-003","CUST-003","2023-01-10","PROD-A",500,48.00,24000.00,"TRUE"
... (12,105 more rows)
`
  },
  { 
    name: 'vendor_master_updates.log', 
    type: 'LOG', 
    size: '500 KB', 
    category: 'STP',
    content: `
[2023-10-15 11:45:01] user:E4011 action:UPDATE vendor_id:V-0052 field:bank_account new_value:110-234-567890
[2023-10-15 11:45:30] user:E4011 action:APPROVE vendor_id:V-0052 change_id:CHG-9081
[2023-10-16 09:21:05] user:E2045 action:CREATE vendor_id:V-0078 name:NewBiz Partner
[2023-10-16 09:22:15] user:E1002 action:APPROVE vendor_id:V-0078 change_id:CHG-9082
`
  },
  { 
    name: 'alpha_components_contract.pdf', 
    type: 'PDF', 
    size: '1.8 MB', 
    category: 'STP',
    content: `
[Simulated PDF Content]

          공급 계약서 (Supply Agreement)

...
제 5조 (가격 및 대금 지급)
5.1 단가는 별첨 A에 따른다.
5.2 연간 총 구매액이 $1,000,000 (일백만 달러)를 초과하는 경우, 초과분에 대해 5%의 추가 할인을 적용한다.
...

별첨 A: 단가표
- Component X1: $100 / unit
- Component Y2: $150 / unit

PO Number: PO-NEXUS-20231020-088
Item: Component X1
Quantity: 1,200
Unit Price: $100
Total: $120,000
`
  },
  { 
    name: 'capex_approvals_h2.pdf', 
    type: 'PDF', 
    size: '5.6 MB', 
    category: 'FXA',
    content: `
[Simulated PDF Content]

          자본적 지출(CapEx) 품의서

- 프로젝트명: 신규 서버 증설
- 예상 비용: $150,000
- 신청 부서: IT 인프라팀
...
- 부서장 승인: [서명] (김철수)
- CFO 승인: [서명] (최영희)
- 이사회 승인: [서명] <<-- MISSING SIGNATURE -->>
`
  },
  { 
    name: 'inventory_adjustments.csv', 
    type: 'CSV', 
    size: '1.1 MB', 
    category: 'INV',
    content: `
"Item_ID","Date","Adjustment_Type","Quantity","Reason","Approver"
"PROD-C","2023-11-20","Write-off",-50,"Obsolete Stock","E1002"
"PROD-D","2023-11-21","Cycle Count",-5,"Count Mismatch","E1002"
"PROD-E","2023-11-22","Damage",-10,"Warehouse Accident","E1002"
`
  },
  { 
    name: 'employee_master_2023.xlsx', 
    type: 'Excel', 
    size: '3.4 MB', 
    category: 'HRE',
    content: `
"Employee_ID","Name","Department","Start_Date","Termination_Date"
"E1001","최영희","Finance","2018-03-01",""
"E1002","김철수","Finance","2019-05-10",""
"E5001","박지성","R&D","2020-01-15","2023-11-30"
... (3,102 more rows)
`
  },
  { 
    name: 'system_access_logs_dec.log', 
    type: 'LOG', 
    size: '55.2 MB', 
    category: 'SEC',
    content: `
[2023-12-01 10:00:05] user:E1002 action:LOGIN system:ERP status:SUCCESS
[2023-12-01 15:30:01] user:E5001 action:COPY src:/project_aurora/ dest:/media/usb0 size:2.5GB status:SUCCESS
[2023-12-02 09:05:11] user:E5001 action:LOGIN system:ERP status:FAILED reason:ACCOUNT_DISABLED
[2023-12-04 11:20:45] user:E5001 action:LOGIN system:ERP status:FAILED reason:ACCOUNT_DISABLED
... (many more logs)
`
  },
  { 
    name: 'dlp_alerts_q4.csv', 
    type: 'CSV', 
    size: '780 KB', 
    category: 'SEC',
    content: `
"Alert_ID","Timestamp","User_ID","Rule_Name","Action","Destination","File_Path","Size_Bytes"
"DLP-ALERT-001","2023-12-01 15:30:01","E5001","Confidential Data to USB","COPY","USB","C:/project_aurora/","2684354560"
"DLP-ALERT-002","2023-12-05 16:00:10","E1023","PII in Email","SEND","external","C:/temp/report.xlsx","12288"
`
  },
];
