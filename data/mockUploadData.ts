
import { MockUploadFile } from '../types';

export const MOCK_UPLOAD_FILES: MockUploadFile[] = [
  // --- Regulations & Policies (Unstructured) ---
  { 
    id: 'doc-ethics',
    name: 'Code_of_Ethics_2024.pdf', 
    type: 'PDF', 
    size: '1.2MB', 
    category: 'SEC',
    content: `[NEXUS CORP 윤리 강령]\n제1장 총칙\n...임직원은 업무와 관련하여 이해관계자로부터 금품, 향응, 편의를 수수해서는 안 된다...`
  },
  { 
    id: 'doc-purchase',
    name: 'Procurement_Policy_v3.pdf', 
    type: 'PDF', 
    size: '850KB', 
    category: 'STP',
    content: `[구매 규정]\n제 5조 (경쟁 입찰)\n1천만원 이상의 구매 계약은 반드시 3개 이상의 업체 견적을 비교하여 경쟁 입찰로 진행해야 한다...`
  },
  { 
    id: 'doc-sales',
    name: 'Sales_Recognition_Policy.pdf', 
    type: 'PDF', 
    size: '620KB', 
    category: 'OTC',
    content: `[매출 인식 규정]\n재화의 인도가 완료되고 수익 금액을 신뢰성 있게 측정할 수 있을 때 매출을 인식한다...`
  },
  { 
    id: 'doc-accounting',
    name: 'Accounting_Standard_Manual.pdf', 
    type: 'PDF', 
    size: '2.5MB', 
    category: 'FSC',
    content: `[회계 처리 기준]\n본 규정은 K-IFRS를 기반으로 작성되었으며...`
  },
  { 
    id: 'doc-entertainment',
    name: 'Entertainment_Expense_Policy.pdf', 
    type: 'PDF', 
    size: '450KB', 
    category: 'EXP',
    content: `[접대비 규정]\n1인당 5만원 초과 식대 집행 시 사전 품의 필수. 유흥업소 사용 절대 금지...`
  },
  { 
    id: 'doc-travel',
    name: 'Travel_Expense_Policy.pdf', 
    type: 'PDF', 
    size: '520KB', 
    category: 'EXP',
    content: `[여비 교통비 규정]\n해외 출장 시 숙박비 한도는 1박당 $200이며, 초과 시 사유서 제출...`
  },

  // --- Financial Data (Structured - 2 Years) ---
  { 
    id: 'file-bank-24-25',
    name: 'Bank_Transaction_2024_2025.csv', 
    type: 'CSV', 
    size: '15.4MB', 
    category: 'TRE',
    content: `Date,Bank,Account,Amount,Beneficiary,Description\n2024-01-02,Shinhan,110-xxx,5000000,Alpha Corp,Payment\n...`
  },
  { 
    id: 'file-je-24-25',
    name: 'Journal_Entry_2024_2025.csv', 
    type: 'CSV', 
    size: '48.2MB', 
    category: 'FSC',
    content: `Journal_ID,Date,Account,Debit,Credit,Description\nJE-20240101-001,2024-01-01,Cash,1000,0,Opening Balance\n...`
  },
  { 
    id: 'file-ap-24-25',
    name: 'AP_Invoice_2024_2025.csv', 
    type: 'CSV', 
    size: '12.5MB', 
    category: 'STP',
    content: `InvoiceID,VendorID,Date,Amount,Status\nINV-001,V-01,2024-01-05,5000,Paid\n...`
  },
  
  // --- Master Data ---
  { 
    id: 'file-vendor',
    name: 'Vendor_Master.csv', 
    type: 'CSV', 
    size: '14KB', 
    category: 'STP',
    content: `"VendorID","Name","TaxID","Address","BankAccount","RegistrationDate"
"V-0078","NewBiz Partner","123-45-67890","서울시 강남구 테헤란로 427, 101호","110-123-456789","2025-10-06"
"V-0079","Alpha Supply","222-33-44444","경기도 판교로 55","220-456-789012","2020-01-01"
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
...`
  },
  
  // --- Unstructured Communications ---
  { 
    id: 'file-email',
    name: 'Email_Archive_Finance_2024_2025.pst', 
    type: 'LOG', 
    size: '2.1GB', 
    category: 'SEC',
    content: `[System] Binary file. Contains email backup for Finance Dept.`
  }
];
