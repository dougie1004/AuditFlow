
import { MockUploadFile } from '../types';

export const MOCK_UPLOAD_FILES: MockUploadFile[] = [
  { 
    id: 'file-je',
    name: 'Journal_Entry.csv', 
    type: 'CSV', 
    size: '1,915KB', 
    category: 'FSC',
    content: `"Journal_ID","Date","Account","Debit","Credit","Description","Entered_By","Approved_By"
"JE-20251105-014","2025-11-05","101001 - Cash","5000.00","","Regular Deposit","auto-proc","SYSTEM"
"GL-JE-20251105-015","2025-11-05","505001 - Misc Expense","75200.00","","Urgent adjustment for Q3 marketing","chulsoo.kim","chulsoo.kim"
"JE-20251105-016","2025-11-05","101001 - Cash","","75200.00","To balance JE-20251105-015","chulsoo.kim","chulsoo.kim"
"JE-20251106-001","2025-11-06","401001 - Sales Revenue","","120000.00","Invoice INV-1001","auto-proc","SYSTEM"
... (15,230 more rows)`
  },
  { 
    id: 'file-ap',
    name: 'AP_Invoice.csv', 
    type: 'CSV', 
    size: '522KB', 
    category: 'STP',
    content: `"InvoiceID","VendorID","Date","Amount","DueDate","Status"
"INV-2025-001","V-0078","2025-10-07","18000.00","2025-11-07","Paid"
"INV-2025-002","V-005","2025-01-12","1200.00","2025-02-12","Pending"
"INV-2025-003","V-0022","2025-10-22","120000.00","2025-11-22","Paid"
...`
  },
  { 
    id: 'file-payment',
    name: 'Payment.csv', 
    type: 'CSV', 
    size: '337KB', 
    category: 'TRE',
    content: `"PaymentID","InvoiceID","Date","Amount","Method","Beneficiary","Approver"
"PAY-001","INV-2025-001","2025-10-07","18000.00","Wire","NewBiz Partner","E1002"
"PAY-002","INV-2025-003","2025-10-25","120000.00","Wire","Alpha Components","E1002"
...`
  },
  { 
    id: 'file-po',
    name: 'Purchase_Order.csv', 
    type: 'CSV', 
    size: '190KB', 
    category: 'STP',
    content: `"PO_ID","VendorID","Date","TotalAmount","Status","Approver"
"PO-NEXUS-20251020-088","V-0022","2025-10-20","120000.00","Approved","E1002"
"PO-NEXUS-20251021-090","V-0078","2025-10-06","18000.00","Approved","E1002"
...`
  },
  { 
    id: 'file-ar',
    name: 'AR_Invoice.csv', 
    type: 'CSV', 
    size: '74KB', 
    category: 'OTC',
    content: `"InvoiceID","CustomerID","Date","Amount","DueDate"
"AR-2025-001","C-001","2025-01-15","5000.00","2025-02-15"
"AR-2025-002","C-003","2025-01-10","24000.00","2025-02-10"
...`
  },
  { 
    id: 'file-deposit',
    name: 'Deposit.csv', 
    type: 'CSV', 
    size: '52KB', 
    category: 'TRE',
    content: `"DepositID","Date","Amount","Bank","Account"
"DEP-001","2025-01-02","50000.00","Shinhan","110-123-456789"
...`
  },
  { 
    id: 'file-vendor',
    name: 'Vendor_Master.csv', 
    type: 'CSV', 
    size: '14KB', 
    category: 'STP',
    content: `"VendorID","Name","TaxID","Address","BankAccount","RegistrationDate"
"V-0078","NewBiz Partner","123-45-67890","서울시 강남구 테헤란로 427, 101호","110-123-456789","2025-10-06"
"V-0079","Alpha Supply","222-33-44444","경기도 판교로 55","220-456-789012","2020-01-01"
"V-0022","Alpha Components","888-99-11111","인천시 남동구 공단로 12","330-111-222222","2018-05-15"
...`
  },
  { 
    id: 'file-customer',
    name: 'Customer_Master.csv', 
    type: 'CSV', 
    size: '7KB', 
    category: 'OTC',
    content: `"CustomerID","Name","CreditLimit","Address"
"C-001","Global Tech","100000","Seoul, Korea"
"C-003","Omega Retail","50000","Busan, Korea"
...`
  },
  { 
    id: 'file-pending',
    name: 'Pending_Items.csv', 
    type: 'CSV', 
    size: '7KB', 
    category: 'FSC',
    content: `"ItemID","Date","Amount","Reason","Department"
"PEND-001","2025-12-01","1500.00","Missing Receipt","Sales"
...`
  },
  { 
    id: 'file-employee',
    name: 'Employee_Master.csv', 
    type: 'CSV', 
    size: '2KB', 
    category: 'HRE',
    content: `"EmployeeID","Name","Dept","Position","Address","JoinDate","TerminationDate"
"E1002","김철수","Finance","Manager","서울시 강남구 테헤란로 427, 101호","2019-05-10",""
"E1023","김민준","R&D","Researcher","서울시 강남구 테헤란로 427","2021-03-01",""
"E5001","박지성","R&D","Senior","경기도 분당구 정자로 15","2020-01-15","2025-11-30"
...`
  }
];
